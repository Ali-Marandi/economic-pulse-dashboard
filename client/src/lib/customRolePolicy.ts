export type RolePermission =
  | "forecast.read"
  | "forecast.write"
  | "scenario.read"
  | "scenario.write"
  | "scenario.approve"
  | "market.stream.read"
  | "market.connector.manage"
  | "audit.read"
  | "report.export"
  | "member.manage"
  | "identity.manage"
  | "organization.manage";

export type PermissionDefinition = {
  key: RolePermission;
  label: string;
  risk: "standard" | "sensitive" | "critical";
  assignable: boolean;
};

export const ROLE_PERMISSION_CATALOG: PermissionDefinition[] = [
  { key: "forecast.read", label: "Read forecasts", risk: "standard", assignable: true },
  { key: "forecast.write", label: "Create and edit forecasts", risk: "standard", assignable: true },
  { key: "scenario.read", label: "Read scenarios", risk: "standard", assignable: true },
  { key: "scenario.write", label: "Create and edit scenarios", risk: "sensitive", assignable: true },
  { key: "scenario.approve", label: "Approve scenarios", risk: "sensitive", assignable: true },
  { key: "market.stream.read", label: "Read market streams", risk: "standard", assignable: true },
  { key: "market.connector.manage", label: "Manage market connectors", risk: "critical", assignable: true },
  { key: "audit.read", label: "Read audit evidence", risk: "sensitive", assignable: true },
  { key: "report.export", label: "Export reports", risk: "sensitive", assignable: true },
  { key: "member.manage", label: "Manage organization members", risk: "critical", assignable: true },
  { key: "identity.manage", label: "Manage SSO and identity", risk: "critical", assignable: false },
  { key: "organization.manage", label: "Manage organization settings", risk: "critical", assignable: false },
];

export type RoleDraftValidation = { valid: boolean; requiresStepUp: boolean; requiresDualApproval: boolean; reasons: string[] };

export function validateRoleDraft(name: string, permissions: RolePermission[]): RoleDraftValidation {
  const reasons: string[] = [];
  const selected = ROLE_PERMISSION_CATALOG.filter((item) => permissions.includes(item.key));
  if (!name.trim()) reasons.push("A role name is required.");
  if (selected.length === 0) reasons.push("Select at least one permission.");
  if (selected.some((item) => !item.assignable)) reasons.push("Platform-only permissions cannot be granted by a custom role.");
  const keys = new Set(permissions);
  if (keys.has("market.connector.manage") && keys.has("report.export")) reasons.push("Connector administration and report export require segregation-of-duties review.");
  const critical = selected.some((item) => item.risk === "critical");
  const sensitive = selected.some((item) => item.risk === "sensitive");
  return {
    valid: reasons.length === 0,
    requiresStepUp: critical || sensitive,
    requiresDualApproval: critical,
    reasons,
  };
}
