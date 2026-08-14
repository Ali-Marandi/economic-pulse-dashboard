import type { User } from "../../drizzle/schema";

/**
 * Stable permission vocabulary. Roles are a convenience for assigning these
 * permissions; server procedures must always authorize against a permission.
 */
export const PERMISSIONS = [
  "watchlist.read",
  "watchlist.write",
  "alert.read",
  "alert.write",
  "scenario.read",
  "scenario.write",
  "scenario.approve",
  "forecast.read",
  "forecast.write",
  "market.stream.read",
  "market.connector.manage",
  "audit.read",
  "report.export",
  "member.manage",
  "identity.manage",
  "organization.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type EnterpriseRole = "OrgAdmin" | "RiskManager" | "Analyst" | "Viewer" | "Auditor" | "StreamOperator";

const ENTERPRISE_ROLE_PERMISSIONS: Record<EnterpriseRole, readonly Permission[]> = {
  OrgAdmin: PERMISSIONS,
  RiskManager: ["scenario.read", "scenario.write", "scenario.approve", "forecast.read", "forecast.write", "market.stream.read", "audit.read", "report.export"],
  Analyst: ["watchlist.read", "watchlist.write", "alert.read", "alert.write", "scenario.read", "scenario.write", "forecast.read", "forecast.write", "market.stream.read"],
  Viewer: ["watchlist.read", "alert.read", "scenario.read", "forecast.read", "market.stream.read"],
  Auditor: ["scenario.read", "forecast.read", "market.stream.read", "audit.read", "report.export"],
  StreamOperator: ["market.stream.read", "market.connector.manage", "audit.read"],
};

/**
 * Transitional map while existing accounts still have a global user/admin
 * column. The next migration replaces this with organization membership roles.
 */
const LEGACY_ROLE_PERMISSIONS: Record<User["role"], readonly Permission[]> = {
  user: ENTERPRISE_ROLE_PERMISSIONS.Analyst,
  admin: PERMISSIONS,
};

export function permissionsForEnterpriseRoles(roles: readonly EnterpriseRole[]): Set<Permission> {
  return new Set(roles.flatMap((role) => ENTERPRISE_ROLE_PERMISSIONS[role]));
}

export function canCurrentUser(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return LEGACY_ROLE_PERMISSIONS[user.role].includes(permission);
}

export function hasEnterprisePermission(roles: readonly EnterpriseRole[], permission: Permission): boolean {
  return permissionsForEnterpriseRoles(roles).has(permission);
}

export function isKnownPermission(permission: string): permission is Permission {
  return (PERMISSIONS as readonly string[]).includes(permission);
}
