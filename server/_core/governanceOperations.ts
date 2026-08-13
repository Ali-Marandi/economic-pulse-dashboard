import type { Permission } from "./authorization";
import type { AssuranceEvidence } from "./securityGovernance";

export type PrivilegedAccessRequest = {
  requestId: string;
  organizationId: string;
  subjectId: number;
  permission: Permission;
  justification: string;
  requestedMinutes: number;
  requestedAt: Date;
};

export type PrivilegedAccessDecision = {
  allowed: boolean;
  reason:
    | "permission_not_eligible"
    | "justification_required"
    | "duration_exceeds_policy"
    | "fresh_assurance_required"
    | "approval_required"
    | "eligible";
  requiresStepUp: boolean;
  requiresIndependentApproval: boolean;
  expiresAt: Date | null;
};

const PRIVILEGED_PERMISSIONS: readonly Permission[] = [
  "market.connector.manage",
  "member.manage",
  "identity.manage",
  "organization.manage",
];

const MAX_PRIVILEGED_MINUTES = 30;

/**
 * Produces a policy decision for just-in-time elevation. Issuance and durable
 * storage remain a backend concern; this pure policy function is testable and
 * intentionally rejects general-purpose elevation.
 */
export function evaluatePrivilegedAccess(
  request: PrivilegedAccessRequest,
  evidence: AssuranceEvidence | null,
  now = new Date(),
): PrivilegedAccessDecision {
  const requiresStepUp = true;
  const requiresIndependentApproval = true;
  if (!PRIVILEGED_PERMISSIONS.includes(request.permission)) {
    return { allowed: false, reason: "permission_not_eligible", requiresStepUp, requiresIndependentApproval, expiresAt: null };
  }
  if (request.justification.trim().length < 12) {
    return { allowed: false, reason: "justification_required", requiresStepUp, requiresIndependentApproval, expiresAt: null };
  }
  if (request.requestedMinutes < 1 || request.requestedMinutes > MAX_PRIVILEGED_MINUTES) {
    return { allowed: false, reason: "duration_exceeds_policy", requiresStepUp, requiresIndependentApproval, expiresAt: null };
  }
  const ageSeconds = evidence ? Math.max(0, (now.getTime() - evidence.authenticatedAt.getTime()) / 1000) : Number.POSITIVE_INFINITY;
  const evidenceMatches = evidence
    && evidence.subjectId === request.subjectId
    && evidence.organizationId === request.organizationId
    && evidence.assuranceLevel >= 3
    && evidence.method === "webauthn"
    && evidence.userVerified
    && ageSeconds <= 300;
  if (!evidenceMatches) {
    return { allowed: false, reason: "fresh_assurance_required", requiresStepUp, requiresIndependentApproval, expiresAt: null };
  }
  return {
    allowed: false,
    reason: "approval_required",
    requiresStepUp,
    requiresIndependentApproval,
    expiresAt: new Date(now.getTime() + request.requestedMinutes * 60_000),
  };
}

export type AccessReviewAssignment = {
  assignmentId: string;
  organizationId: string;
  subjectId: number;
  roleKey: string;
  permissionKeys: Permission[];
  assignedAt: Date;
  expiresAt: Date | null;
  lastCertifiedAt: Date | null;
};

export type AccessReviewFinding = {
  assignmentId: string;
  severity: "attention" | "high";
  reason: "certification_overdue" | "assignment_expired" | "toxic_permission_pair";
};

const TOXIC_PERMISSION_PAIRS: ReadonlyArray<readonly [Permission, Permission]> = [
  ["market.connector.manage", "report.export"],
  ["member.manage", "organization.manage"],
];

/**
 * Identifies expiring, uncertified, and separation-of-duties sensitive role
 * assignments before an access-certification campaign is sent to reviewers.
 */
export function inspectAccessReviewAssignments(
  assignments: readonly AccessReviewAssignment[],
  now = new Date(),
  maxCertificationAgeDays = 90,
): AccessReviewFinding[] {
  const staleAfterMs = maxCertificationAgeDays * 24 * 60 * 60 * 1000;
  return assignments.flatMap((assignment) => {
    const findings: AccessReviewFinding[] = [];
    if (assignment.expiresAt && assignment.expiresAt.getTime() <= now.getTime()) {
      findings.push({ assignmentId: assignment.assignmentId, severity: "high", reason: "assignment_expired" });
    }
    const certificationAnchor = assignment.lastCertifiedAt ?? assignment.assignedAt;
    if (now.getTime() - certificationAnchor.getTime() > staleAfterMs) {
      findings.push({ assignmentId: assignment.assignmentId, severity: "attention", reason: "certification_overdue" });
    }
    const granted = new Set(assignment.permissionKeys);
    if (TOXIC_PERMISSION_PAIRS.some(([left, right]) => granted.has(left) && granted.has(right))) {
      findings.push({ assignmentId: assignment.assignmentId, severity: "high", reason: "toxic_permission_pair" });
    }
    return findings;
  });
}
