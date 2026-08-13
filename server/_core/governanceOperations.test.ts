import { describe, expect, it } from "vitest";
import { evaluatePrivilegedAccess, inspectAccessReviewAssignments } from "./governanceOperations";

const now = new Date("2026-08-14T12:00:00.000Z");
const evidence = {
  subjectId: 7,
  organizationId: "org-risk",
  assuranceLevel: 3 as const,
  authenticatedAt: new Date("2026-08-14T11:58:00.000Z"),
  method: "webauthn" as const,
  userVerified: true,
  sessionIdHash: "session-hash",
};

describe("privileged access governance", () => {
  it("requires a fresh AAL3 WebAuthn assurance event before privileged elevation", () => {
    const result = evaluatePrivilegedAccess({
      requestId: "jit-1",
      organizationId: "org-risk",
      subjectId: 7,
      permission: "identity.manage",
      justification: "Rotate the enterprise identity provider certificate.",
      requestedMinutes: 15,
      requestedAt: now,
    }, evidence, now);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("approval_required");
    expect(result.expiresAt?.toISOString()).toBe("2026-08-14T12:15:00.000Z");
  });

  it("rejects stale assurance and overly long elevation windows", () => {
    const stale = evaluatePrivilegedAccess({
      requestId: "jit-2",
      organizationId: "org-risk",
      subjectId: 7,
      permission: "organization.manage",
      justification: "Review organization control plane settings.",
      requestedMinutes: 15,
      requestedAt: now,
    }, { ...evidence, authenticatedAt: new Date("2026-08-14T11:54:00.000Z") }, now);
    const tooLong = evaluatePrivilegedAccess({
      requestId: "jit-3",
      organizationId: "org-risk",
      subjectId: 7,
      permission: "organization.manage",
      justification: "Review organization control plane settings.",
      requestedMinutes: 31,
      requestedAt: now,
    }, evidence, now);
    expect(stale.reason).toBe("fresh_assurance_required");
    expect(tooLong.reason).toBe("duration_exceeds_policy");
  });
});

describe("access review inspection", () => {
  it("flags expired, uncertified and toxic role assignments", () => {
    const findings = inspectAccessReviewAssignments([{
      assignmentId: "assignment-1",
      organizationId: "org-risk",
      subjectId: 7,
      roleKey: "DataOperator",
      permissionKeys: ["market.connector.manage", "report.export"],
      assignedAt: new Date("2026-04-01T00:00:00.000Z"),
      expiresAt: new Date("2026-08-13T12:00:00.000Z"),
      lastCertifiedAt: null,
    }], now);
    expect(findings.map((finding) => finding.reason)).toEqual([
      "assignment_expired",
      "certification_overdue",
      "toxic_permission_pair",
    ]);
  });
});
