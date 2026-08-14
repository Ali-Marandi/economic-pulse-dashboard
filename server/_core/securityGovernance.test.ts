import { describe, expect, it } from "vitest";
import { createAuditEnvelope, evaluateStepUp, verifyAuditEnvelope, type AssuranceEvidence } from "./securityGovernance";

const evidence: AssuranceEvidence = {
  subjectId: 7,
  organizationId: "org-risk",
  assuranceLevel: 3,
  authenticatedAt: new Date("2026-08-13T20:00:00.000Z"),
  method: "webauthn",
  userVerified: true,
  sessionIdHash: "session-hash",
};

describe("step-up MFA policy", () => {
  it("allows an ordinary permission without fresh assurance", () => {
    expect(evaluateStepUp("forecast.read", { subjectId: 7, organizationId: "org-risk" }, null).allowed).toBe(true);
  });

  it("requires WebAuthn and fresh AAL3 evidence for identity management", () => {
    const decision = evaluateStepUp("identity.manage", { subjectId: 7, organizationId: "org-risk" }, evidence, new Date("2026-08-13T20:04:00.000Z"));
    expect(decision.allowed).toBe(true);
  });

  it("rejects stale or weak evidence for a sensitive operation", () => {
    const stale = evaluateStepUp("identity.manage", { subjectId: 7, organizationId: "org-risk" }, evidence, new Date("2026-08-13T20:06:00.000Z"));
    const weak = evaluateStepUp("identity.manage", { subjectId: 7, organizationId: "org-risk" }, { ...evidence, assuranceLevel: 2 });
    expect(stale.reason).toBe("stale_assurance");
    expect(weak.reason).toBe("assurance_too_low");
  });

  it("binds assurance to the actor and organization", () => {
    expect(evaluateStepUp("identity.manage", { subjectId: 8, organizationId: "org-risk" }, evidence).reason).toBe("subject_mismatch");
    expect(evaluateStepUp("identity.manage", { subjectId: 7, organizationId: "other-org" }, evidence).reason).toBe("organization_mismatch");
  });
});

describe("audit envelopes", () => {
  it("redacts sensitive values before hashing evidence", () => {
    const envelope = createAuditEnvelope({
      organizationId: "org-risk",
      actorUserId: 7,
      action: "role.permission.updated",
      resourceType: "role",
      resourceId: "risk-approver",
      decision: "allow",
      reason: "fresh_webauthn",
      traceId: "trace-123",
      occurredAt: new Date("2026-08-13T20:00:00.000Z"),
      after: { permission: "scenario.approve", refreshToken: "should-not-appear" },
      assurance: { assuranceLevel: 3, method: "webauthn", userVerified: true, sessionIdHash: "hash" },
    }, "previous-hash");

    expect(envelope.previousEventHash).toBe("previous-hash");
    expect(envelope.afterHash).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyAuditEnvelope(envelope)).toEqual({ valid: true, failures: [] });
    expect(verifyAuditEnvelope({ ...envelope, action: "role.permission.deleted" }).failures).toContain("event_hash_mismatch");
  });
});
