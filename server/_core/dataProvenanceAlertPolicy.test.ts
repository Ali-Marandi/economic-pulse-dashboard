import { describe, expect, it } from "vitest";
import { evaluateAlertPolicy, validateAlertPolicyDraft, validateObservationProvenance, type AlertPolicyDraft, type ProvenancedObservation } from "./dataProvenanceAlertPolicy";

const observation: ProvenancedObservation = {
  organizationId: "org-1",
  seriesKey: "US.CPI.YOY",
  value: 3.2,
  unit: "percent",
  frequency: "monthly",
  sourceProvider: "FRED",
  sourceReference: "CPIAUCSL",
  observedAt: new Date("2026-08-01T12:00:00.000Z"),
  ingestedAt: new Date("2026-08-01T12:05:00.000Z"),
  revisionState: "final",
};

const policy: AlertPolicyDraft = {
  policyId: "policy-cpi-high",
  organizationId: "org-1",
  seriesKey: "US.CPI.YOY",
  condition: "above",
  threshold: 3,
  staleAfterMinutes: null,
  ownerSubjectId: 42,
  severity: "attention",
  enabled: true,
};

describe("data provenance and alert policy", () => {
  it("requires threshold or bounded staleness settings and an accountable owner", () => {
    expect(validateAlertPolicyDraft({ ...policy, threshold: null }).valid).toBe(false);
    expect(validateAlertPolicyDraft({ ...policy, condition: "stale", threshold: null, staleAfterMinutes: 0 }).valid).toBe(false);
    expect(validateAlertPolicyDraft({ ...policy, ownerSubjectId: 0 }).valid).toBe(false);
  });

  it("triggers a threshold alert and preserves source evidence", () => {
    const result = evaluateAlertPolicy(policy, observation, new Date("2026-08-01T12:10:00.000Z"));
    expect(result).toMatchObject({ triggered: true, reason: "threshold_above" });
    expect(result.evidence).toMatchObject({ sourceProvider: "FRED", sourceReference: "CPIAUCSL", revisionState: "final", policyId: "policy-cpi-high" });
  });

  it("triggers freshness policies only after the configured freshness window", () => {
    const freshnessPolicy: AlertPolicyDraft = { ...policy, policyId: "policy-cpi-freshness", condition: "stale", threshold: null, staleAfterMinutes: 15 };
    expect(evaluateAlertPolicy(freshnessPolicy, observation, new Date("2026-08-01T12:19:59.000Z")).reason).toBe("not_triggered");
    expect(evaluateAlertPolicy(freshnessPolicy, observation, new Date("2026-08-01T12:20:01.000Z")).reason).toBe("freshness_breach");
  });

  it("rejects observations without provenance or with impossible time ordering", () => {
    expect(validateObservationProvenance({ ...observation, sourceReference: "" })).toContain("Source reference is required for provenance.");
    const invalid = { ...observation, observedAt: new Date("2026-08-02T12:00:00.000Z") };
    expect(evaluateAlertPolicy(policy, invalid).reason).toBe("invalid_observation");
  });
});
