export type ObservationFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type RevisionState = "initial" | "revised" | "final";
export type AlertCondition = "above" | "below" | "stale";
export type AlertSeverity = "info" | "attention" | "critical";

export type ProvenancedObservation = {
  organizationId: string;
  seriesKey: string;
  value: number;
  unit: string;
  frequency: ObservationFrequency;
  sourceProvider: "FRED" | "WorldBank" | "ECB" | "approved_provider";
  sourceReference: string;
  observedAt: Date;
  ingestedAt: Date;
  revisionState: RevisionState;
};

export type AlertPolicyDraft = {
  policyId: string;
  organizationId: string;
  seriesKey: string;
  condition: AlertCondition;
  threshold: number | null;
  staleAfterMinutes: number | null;
  ownerSubjectId: number;
  severity: AlertSeverity;
  enabled: boolean;
};

export type AlertPolicyValidation = {
  valid: boolean;
  reasons: string[];
};

export type AlertEvaluation = {
  triggered: boolean;
  reason: "threshold_above" | "threshold_below" | "freshness_breach" | "not_triggered" | "invalid_observation";
  evaluatedAt: Date;
  evidence: {
    organizationId: string;
    seriesKey: string;
    policyId: string;
    sourceProvider: ProvenancedObservation["sourceProvider"];
    sourceReference: string;
    observedAt: string;
    ingestedAt: string;
    revisionState: RevisionState;
  } | null;
};

const MAX_STALENESS_MINUTES = 60 * 24 * 31;

export function validateAlertPolicyDraft(policy: AlertPolicyDraft): AlertPolicyValidation {
  const reasons: string[] = [];
  if (!policy.policyId.trim()) reasons.push("A policy identifier is required.");
  if (!policy.organizationId.trim()) reasons.push("An organization is required.");
  if (!policy.seriesKey.trim()) reasons.push("A series key is required.");
  if (!Number.isInteger(policy.ownerSubjectId) || policy.ownerSubjectId <= 0) reasons.push("An accountable policy owner is required.");
  if ((policy.condition === "above" || policy.condition === "below") && !Number.isFinite(policy.threshold)) {
    reasons.push("Threshold conditions require a finite threshold.");
  }
  if (policy.condition === "stale") {
    if (!Number.isInteger(policy.staleAfterMinutes) || !policy.staleAfterMinutes || policy.staleAfterMinutes < 1 || policy.staleAfterMinutes > MAX_STALENESS_MINUTES) {
      reasons.push("Staleness policies require a bounded expiry between 1 minute and 31 days.");
    }
  }
  return { valid: reasons.length === 0, reasons };
}

export function validateObservationProvenance(observation: ProvenancedObservation): string[] {
  const reasons: string[] = [];
  if (!observation.organizationId.trim()) reasons.push("Observation organization is required.");
  if (!observation.seriesKey.trim()) reasons.push("Observation series key is required.");
  if (!Number.isFinite(observation.value)) reasons.push("Observation value must be finite.");
  if (!observation.unit.trim()) reasons.push("Observation unit is required.");
  if (!observation.sourceReference.trim()) reasons.push("Source reference is required for provenance.");
  if (observation.observedAt.getTime() > observation.ingestedAt.getTime()) reasons.push("Observation cannot be ingested before it is observed.");
  return reasons;
}

export function evaluateAlertPolicy(
  policy: AlertPolicyDraft,
  observation: ProvenancedObservation,
  now = new Date(),
): AlertEvaluation {
  const policyValidation = validateAlertPolicyDraft(policy);
  const observationValidation = validateObservationProvenance(observation);
  if (!policyValidation.valid || observationValidation.length > 0 || policy.organizationId !== observation.organizationId || policy.seriesKey !== observation.seriesKey) {
    return { triggered: false, reason: "invalid_observation", evaluatedAt: now, evidence: null };
  }

  const evidence = {
    organizationId: observation.organizationId,
    seriesKey: observation.seriesKey,
    policyId: policy.policyId,
    sourceProvider: observation.sourceProvider,
    sourceReference: observation.sourceReference,
    observedAt: observation.observedAt.toISOString(),
    ingestedAt: observation.ingestedAt.toISOString(),
    revisionState: observation.revisionState,
  } as const;

  if (!policy.enabled) return { triggered: false, reason: "not_triggered", evaluatedAt: now, evidence };
  if (policy.condition === "above") return { triggered: observation.value > (policy.threshold as number), reason: observation.value > (policy.threshold as number) ? "threshold_above" : "not_triggered", evaluatedAt: now, evidence };
  if (policy.condition === "below") return { triggered: observation.value < (policy.threshold as number), reason: observation.value < (policy.threshold as number) ? "threshold_below" : "not_triggered", evaluatedAt: now, evidence };

  const ageMinutes = Math.max(0, (now.getTime() - observation.ingestedAt.getTime()) / 60_000);
  return { triggered: ageMinutes > (policy.staleAfterMinutes as number), reason: ageMinutes > (policy.staleAfterMinutes as number) ? "freshness_breach" : "not_triggered", evaluatedAt: now, evidence };
}
