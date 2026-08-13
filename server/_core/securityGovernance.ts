import { createHash } from "node:crypto";
import type { Permission } from "./authorization";

export type AssuranceLevel = 1 | 2 | 3;

export type AssuranceEvidence = {
  subjectId: number;
  organizationId: string;
  assuranceLevel: AssuranceLevel;
  authenticatedAt: Date;
  method: "webauthn" | "idp-mfa" | "totp";
  userVerified: boolean;
  sessionIdHash: string;
};

export type StepUpPolicy = {
  operation: string;
  requiredAssurance: AssuranceLevel;
  maxAgeSeconds: number;
  requireUserVerification: boolean;
  allowedMethods: readonly AssuranceEvidence["method"][];
};

export const STEP_UP_POLICIES: Record<Permission, StepUpPolicy | null> = {
  "watchlist.read": null,
  "watchlist.write": null,
  "alert.read": null,
  "alert.write": null,
  "scenario.read": null,
  "scenario.write": null,
  "scenario.approve": {
    operation: "scenario.approve",
    requiredAssurance: 2,
    maxAgeSeconds: 900,
    requireUserVerification: true,
    allowedMethods: ["webauthn", "idp-mfa"],
  },
  "forecast.read": null,
  "forecast.write": null,
  "market.stream.read": null,
  "market.connector.manage": {
    operation: "market.connector.manage",
    requiredAssurance: 2,
    maxAgeSeconds: 300,
    requireUserVerification: true,
    allowedMethods: ["webauthn", "idp-mfa"],
  },
  "audit.read": null,
  "report.export": {
    operation: "report.export",
    requiredAssurance: 2,
    maxAgeSeconds: 900,
    requireUserVerification: true,
    allowedMethods: ["webauthn", "idp-mfa"],
  },
  "member.manage": {
    operation: "member.manage",
    requiredAssurance: 2,
    maxAgeSeconds: 300,
    requireUserVerification: true,
    allowedMethods: ["webauthn", "idp-mfa"],
  },
  "identity.manage": {
    operation: "identity.manage",
    requiredAssurance: 3,
    maxAgeSeconds: 300,
    requireUserVerification: true,
    allowedMethods: ["webauthn"],
  },
  "organization.manage": {
    operation: "organization.manage",
    requiredAssurance: 3,
    maxAgeSeconds: 300,
    requireUserVerification: true,
    allowedMethods: ["webauthn"],
  },
};

export type StepUpDecision = {
  allowed: boolean;
  reason: "not_required" | "missing_evidence" | "subject_mismatch" | "organization_mismatch" | "assurance_too_low" | "stale_assurance" | "user_verification_required" | "method_not_allowed";
  policy: StepUpPolicy | null;
};

export function evaluateStepUp(
  permission: Permission,
  expected: { subjectId: number; organizationId: string },
  evidence: AssuranceEvidence | null,
  now = new Date(),
): StepUpDecision {
  const policy = STEP_UP_POLICIES[permission];
  if (!policy) return { allowed: true, reason: "not_required", policy: null };
  if (!evidence) return { allowed: false, reason: "missing_evidence", policy };
  if (evidence.subjectId !== expected.subjectId) return { allowed: false, reason: "subject_mismatch", policy };
  if (evidence.organizationId !== expected.organizationId) return { allowed: false, reason: "organization_mismatch", policy };
  if (evidence.assuranceLevel < policy.requiredAssurance) return { allowed: false, reason: "assurance_too_low", policy };
  if (!policy.allowedMethods.includes(evidence.method)) return { allowed: false, reason: "method_not_allowed", policy };
  if (policy.requireUserVerification && !evidence.userVerified) return { allowed: false, reason: "user_verification_required", policy };
  const ageSeconds = Math.max(0, (now.getTime() - evidence.authenticatedAt.getTime()) / 1000);
  if (ageSeconds > policy.maxAgeSeconds) return { allowed: false, reason: "stale_assurance", policy };
  return { allowed: true, reason: "not_required", policy };
}

export type AuditEvidence = {
  organizationId: string;
  actorUserId: number | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  decision: "allow" | "deny" | "system";
  reason: string;
  traceId: string;
  occurredAt: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  assurance?: Pick<AssuranceEvidence, "assuranceLevel" | "method" | "userVerified" | "sessionIdHash">;
};

export type AuditEnvelope = AuditEvidence & {
  beforeHash: string | null;
  afterHash: string | null;
  eventHash: string;
  previousEventHash: string | null;
};

const sensitiveKeyPattern = /password|secret|token|authorization|cookie|codeVerifier|refresh/i;

export function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
    key,
    sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactAuditValue(nested),
  ]));
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

export function createAuditEnvelope(event: AuditEvidence, previousEventHash: string | null): AuditEnvelope {
  const before = event.before ? redactAuditValue(event.before) as Record<string, unknown> : undefined;
  const after = event.after ? redactAuditValue(event.after) as Record<string, unknown> : undefined;
  const normalized = {
    ...event,
    occurredAt: event.occurredAt.toISOString(),
    before,
    after,
    previousEventHash,
  };
  return {
    ...event,
    beforeHash: before ? digest(before) : null,
    afterHash: after ? digest(after) : null,
    previousEventHash,
    eventHash: digest(normalized),
  };
}
