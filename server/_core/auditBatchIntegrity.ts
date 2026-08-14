import {
  digestAuditValue,
  verifyAuditEnvelope,
  type AuditEnvelope,
  type AuditEnvelopeVerification,
} from "./securityGovernance";

export type SequencedAuditEnvelope = AuditEnvelope & {
  sequence: number;
};

export type AuditBatchFailureReason =
  | "empty_batch"
  | "organization_mismatch"
  | "sequence_not_strictly_increasing"
  | "before_hash_mismatch"
  | "after_hash_mismatch"
  | "event_hash_mismatch"
  | "chain_link_mismatch";

export type AuditBatchFailure = {
  sequence: number | null;
  reason: AuditBatchFailureReason;
  expected?: string | null;
  actual?: string | null;
};

export type AuditBatchVerification = {
  valid: boolean;
  organizationId: string;
  firstSequence: number | null;
  lastSequence: number | null;
  initialEventHash: string | null;
  terminalEventHash: string | null;
  eventCount: number;
  failures: AuditBatchFailure[];
};

export type AuditBatchInput = {
  organizationId: string;
  events: readonly SequencedAuditEnvelope[];
  expectedPreviousEventHash: string | null;
};

function envelopeFailures(
  sequence: number,
  verification: AuditEnvelopeVerification,
): AuditBatchFailure[] {
  return verification.failures.map((reason) => ({ sequence, reason }));
}

/**
 * Verifies each envelope and the predecessor link across a deterministically
 * ordered organization-scoped batch. Persistence, scheduling and retries live
 * outside this pure policy module.
 */
export function verifyAuditBatch(input: AuditBatchInput): AuditBatchVerification {
  const { organizationId, events, expectedPreviousEventHash } = input;
  const failures: AuditBatchFailure[] = [];
  if (events.length === 0) {
    failures.push({ sequence: null, reason: "empty_batch" });
  }

  let expectedLink = expectedPreviousEventHash;
  let previousSequence: number | null = null;
  for (const event of events) {
    if (event.organizationId !== organizationId) {
      failures.push({ sequence: event.sequence, reason: "organization_mismatch" });
    }
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || (previousSequence !== null && event.sequence <= previousSequence)) {
      failures.push({ sequence: event.sequence, reason: "sequence_not_strictly_increasing" });
    }

    failures.push(...envelopeFailures(event.sequence, verifyAuditEnvelope(event)));
    if (event.previousEventHash !== expectedLink) {
      failures.push({
        sequence: event.sequence,
        reason: "chain_link_mismatch",
        expected: expectedLink,
        actual: event.previousEventHash,
      });
    }
    expectedLink = event.eventHash;
    previousSequence = event.sequence;
  }

  const first = events[0] ?? null;
  const last = events.at(-1) ?? null;
  return {
    valid: failures.length === 0,
    organizationId,
    firstSequence: first?.sequence ?? null,
    lastSequence: last?.sequence ?? null,
    initialEventHash: first?.eventHash ?? null,
    terminalEventHash: last?.eventHash ?? null,
    eventCount: events.length,
    failures,
  };
}

export type AuditAnchorAlgorithm = "RSASSA_PSS_SHA_256" | "ECDSA_SHA_256";

export type AuditAnchorSigner = {
  signDigest(input: {
    keyId: string;
    algorithm: AuditAnchorAlgorithm;
    digestHex: string;
  }): Promise<string>;
  verifyDigest(input: {
    keyId: string;
    algorithm: AuditAnchorAlgorithm;
    digestHex: string;
    signature: string;
  }): Promise<boolean>;
};

export type AuditAnchorPayload = {
  anchorVersion: 1;
  organizationId: string;
  firstSequence: number;
  lastSequence: number;
  eventCount: number;
  initialEventHash: string;
  terminalEventHash: string;
  previousAnchorHash: string | null;
  anchoredAt: string;
  keyId: string;
  algorithm: AuditAnchorAlgorithm;
};

export type AuditAnchor = AuditAnchorPayload & {
  payloadDigest: string;
  signature: string;
  anchorHash: string;
};

export type AuditAnchorVerification = {
  valid: boolean;
  failures: Array<"payload_digest_mismatch" | "anchor_hash_mismatch" | "signature_invalid">;
};

function anchorPayloadFrom(anchor: AuditAnchor): AuditAnchorPayload {
  return {
    anchorVersion: anchor.anchorVersion,
    organizationId: anchor.organizationId,
    firstSequence: anchor.firstSequence,
    lastSequence: anchor.lastSequence,
    eventCount: anchor.eventCount,
    initialEventHash: anchor.initialEventHash,
    terminalEventHash: anchor.terminalEventHash,
    previousAnchorHash: anchor.previousAnchorHash,
    anchoredAt: anchor.anchoredAt,
    keyId: anchor.keyId,
    algorithm: anchor.algorithm,
  };
}

export async function createAuditAnchor(input: {
  batch: AuditBatchVerification;
  previousAnchorHash: string | null;
  keyId: string;
  algorithm: AuditAnchorAlgorithm;
  signer: AuditAnchorSigner;
  anchoredAt?: Date;
}): Promise<AuditAnchor> {
  if (!input.batch.valid || input.batch.firstSequence === null || input.batch.lastSequence === null || !input.batch.initialEventHash || !input.batch.terminalEventHash) {
    throw new Error("Cannot anchor an invalid or empty audit batch.");
  }

  const payload: AuditAnchorPayload = {
    anchorVersion: 1,
    organizationId: input.batch.organizationId,
    firstSequence: input.batch.firstSequence,
    lastSequence: input.batch.lastSequence,
    eventCount: input.batch.eventCount,
    initialEventHash: input.batch.initialEventHash,
    terminalEventHash: input.batch.terminalEventHash,
    previousAnchorHash: input.previousAnchorHash,
    anchoredAt: (input.anchoredAt ?? new Date()).toISOString(),
    keyId: input.keyId,
    algorithm: input.algorithm,
  };
  const payloadDigest = digestAuditValue(payload);
  const signature = await input.signer.signDigest({ keyId: payload.keyId, algorithm: payload.algorithm, digestHex: payloadDigest });
  const anchorHash = digestAuditValue({ ...payload, payloadDigest, signature });
  return { ...payload, payloadDigest, signature, anchorHash };
}

export async function verifyAuditAnchor(
  anchor: AuditAnchor,
  signer: AuditAnchorSigner,
): Promise<AuditAnchorVerification> {
  const failures: AuditAnchorVerification["failures"] = [];
  const payload = anchorPayloadFrom(anchor);
  const payloadDigest = digestAuditValue(payload);
  if (payloadDigest !== anchor.payloadDigest) failures.push("payload_digest_mismatch");
  const anchorHash = digestAuditValue({ ...payload, payloadDigest: anchor.payloadDigest, signature: anchor.signature });
  if (anchorHash !== anchor.anchorHash) failures.push("anchor_hash_mismatch");

  const signatureValid = await signer.verifyDigest({
    keyId: anchor.keyId,
    algorithm: anchor.algorithm,
    digestHex: anchor.payloadDigest,
    signature: anchor.signature,
  });
  if (!signatureValid) failures.push("signature_invalid");
  return { valid: failures.length === 0, failures };
}

export type AuditIntegrityHealth = {
  status: "healthy" | "degraded" | "broken";
  reasons: Array<"batch_invalid" | "anchor_missing" | "anchor_invalid" | "anchor_stale" | "unanchored_events">;
  anchorAgeSeconds: number | null;
  unanchoredEvents: number;
};

/**
 * Converts cryptographic integrity evidence into an operational SOC/compliance
 * signal. It never changes grants or audit data.
 */
export function evaluateAuditIntegrityHealth(input: {
  batch: AuditBatchVerification;
  anchor: AuditAnchor | null;
  anchorVerification: AuditAnchorVerification | null;
  now?: Date;
  maxAnchorAgeSeconds?: number;
  maxUnanchoredEvents?: number;
}): AuditIntegrityHealth {
  const now = input.now ?? new Date();
  const maxAnchorAgeSeconds = input.maxAnchorAgeSeconds ?? 900;
  const maxUnanchoredEvents = input.maxUnanchoredEvents ?? 0;
  const reasons: AuditIntegrityHealth["reasons"] = [];
  if (!input.batch.valid) reasons.push("batch_invalid");
  if (!input.anchor) reasons.push("anchor_missing");
  if (input.anchor && input.anchorVerification && !input.anchorVerification.valid) reasons.push("anchor_invalid");

  const anchorAgeSeconds = input.anchor
    ? Math.max(0, (now.getTime() - new Date(input.anchor.anchoredAt).getTime()) / 1000)
    : null;
  if (anchorAgeSeconds !== null && anchorAgeSeconds > maxAnchorAgeSeconds) reasons.push("anchor_stale");

  const unanchoredEvents = input.anchor && input.batch.lastSequence !== null
    ? Math.max(0, input.batch.lastSequence - input.anchor.lastSequence)
    : input.batch.eventCount;
  if (unanchoredEvents > maxUnanchoredEvents) reasons.push("unanchored_events");

  const status = reasons.some((reason) => reason === "batch_invalid" || reason === "anchor_invalid")
    ? "broken"
    : reasons.length > 0
      ? "degraded"
      : "healthy";
  return { status, reasons, anchorAgeSeconds, unanchoredEvents };
}
