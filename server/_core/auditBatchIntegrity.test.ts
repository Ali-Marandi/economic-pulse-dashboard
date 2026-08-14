import { describe, expect, it } from "vitest";
import { createAuditEnvelope } from "./securityGovernance";
import {
  createAuditAnchor,
  evaluateAuditIntegrityHealth,
  verifyAuditAnchor,
  verifyAuditBatch,
  type AuditAnchorSigner,
} from "./auditBatchIntegrity";

const signer: AuditAnchorSigner = {
  async signDigest({ keyId, algorithm, digestHex }) {
    return `sig:${keyId}:${algorithm}:${digestHex}`;
  },
  async verifyDigest({ keyId, algorithm, digestHex, signature }) {
    return signature === `sig:${keyId}:${algorithm}:${digestHex}`;
  },
};

function event(action: string, previousEventHash: string | null, occurredAt: string) {
  return createAuditEnvelope({
    organizationId: "org-risk",
    actorUserId: 7,
    action,
    resourceType: "role",
    resourceId: "risk-approver",
    decision: "allow",
    reason: "policy-approved",
    traceId: `trace-${action}`,
    occurredAt: new Date(occurredAt),
    after: { permission: "scenario.approve" },
  }, previousEventHash);
}

function validEvents() {
  const first = event("role.created", "genesis-hash", "2026-08-14T12:00:00.000Z");
  const second = event("role.permission.updated", first.eventHash, "2026-08-14T12:01:00.000Z");
  return [
    { ...first, sequence: 101 },
    { ...second, sequence: 102 },
  ];
}

describe("batch audit integrity", () => {
  it("verifies ordered, organization-bound and linked envelopes", () => {
    const batch = verifyAuditBatch({
      organizationId: "org-risk",
      events: validEvents(),
      expectedPreviousEventHash: "genesis-hash",
    });
    expect(batch).toMatchObject({
      valid: true,
      firstSequence: 101,
      lastSequence: 102,
      eventCount: 2,
      failures: [],
    });
    expect(batch.terminalEventHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports link and sequencing failures without stopping at the first finding", () => {
    const [first] = validEvents();
    const relinked = event("role.permission.updated", "forged-predecessor", "2026-08-14T12:01:00.000Z");
    const batch = verifyAuditBatch({
      organizationId: "org-risk",
      events: [first, { ...relinked, sequence: 101 }],
      expectedPreviousEventHash: "genesis-hash",
    });
    expect(batch.valid).toBe(false);
    expect(batch.failures.map((failure) => failure.reason)).toEqual([
      "sequence_not_strictly_increasing",
      "chain_link_mismatch",
    ]);
  });

  it("rejects cross-organization events even when their own envelope is valid", () => {
    const [first, second] = validEvents();
    const crossTenant = { ...second, organizationId: "org-other" };
    const batch = verifyAuditBatch({
      organizationId: "org-risk",
      events: [first, crossTenant],
      expectedPreviousEventHash: "genesis-hash",
    });
    expect(batch.valid).toBe(false);
    expect(batch.failures.map((failure) => failure.reason)).toContain("organization_mismatch");
    expect(batch.failures.map((failure) => failure.reason)).toContain("event_hash_mismatch");
  });

  it("creates and verifies an organization- and window-bound KMS/HSM anchor", async () => {
    const batch = verifyAuditBatch({
      organizationId: "org-risk",
      events: validEvents(),
      expectedPreviousEventHash: "genesis-hash",
    });
    const anchor = await createAuditAnchor({
      batch,
      previousAnchorHash: "anchor-previous",
      keyId: "kms://audit-key/versions/3",
      algorithm: "RSASSA_PSS_SHA_256",
      signer,
      anchoredAt: new Date("2026-08-14T12:02:00.000Z"),
    });
    expect(anchor.anchorHash).toMatch(/^[a-f0-9]{64}$/);
    await expect(verifyAuditAnchor(anchor, signer)).resolves.toEqual({ valid: true, failures: [] });

    const tampered = { ...anchor, terminalEventHash: "f".repeat(64) };
    const result = await verifyAuditAnchor(tampered, signer);
    expect(result.valid).toBe(false);
    expect(result.failures).toContain("payload_digest_mismatch");
    expect(result.failures).toContain("anchor_hash_mismatch");
  });

  it("surfaces healthy, degraded and broken operational integrity states", async () => {
    const batch = verifyAuditBatch({
      organizationId: "org-risk",
      events: validEvents(),
      expectedPreviousEventHash: "genesis-hash",
    });
    const anchor = await createAuditAnchor({
      batch,
      previousAnchorHash: null,
      keyId: "kms://audit-key/versions/3",
      algorithm: "ECDSA_SHA_256",
      signer,
      anchoredAt: new Date("2026-08-14T12:02:00.000Z"),
    });
    const validAnchor = await verifyAuditAnchor(anchor, signer);
    expect(evaluateAuditIntegrityHealth({
      batch,
      anchor,
      anchorVerification: validAnchor,
      now: new Date("2026-08-14T12:03:00.000Z"),
    }).status).toBe("healthy");

    expect(evaluateAuditIntegrityHealth({
      batch,
      anchor,
      anchorVerification: validAnchor,
      now: new Date("2026-08-14T12:30:00.000Z"),
    }).status).toBe("degraded");

    expect(evaluateAuditIntegrityHealth({
      batch: { ...batch, valid: false, failures: [{ sequence: 102, reason: "chain_link_mismatch" }] },
      anchor,
      anchorVerification: validAnchor,
      now: new Date("2026-08-14T12:03:00.000Z"),
    }).status).toBe("broken");
  });
});
