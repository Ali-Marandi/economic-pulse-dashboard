import { describe, expect, it } from "vitest";
import { canCurrentUser, hasEnterprisePermission, isKnownPermission, permissionsForEnterpriseRoles } from "./authorization";

describe("enterprise authorization foundation", () => {
  it("denies access when no authenticated principal exists", () => {
    expect(canCurrentUser(null, "alert.write")).toBe(false);
  });

  it("keeps ordinary legacy users within analyst-level permissions", () => {
    const user = { role: "user" } as Parameters<typeof canCurrentUser>[0];
    expect(canCurrentUser(user, "forecast.write")).toBe(true);
    expect(canCurrentUser(user, "organization.manage")).toBe(false);
    expect(canCurrentUser(user, "identity.manage")).toBe(false);
  });

  it("grants platform administrators the transitional full permission set", () => {
    const admin = { role: "admin" } as Parameters<typeof canCurrentUser>[0];
    expect(canCurrentUser(admin, "organization.manage")).toBe(true);
    expect(canCurrentUser(admin, "market.connector.manage")).toBe(true);
  });

  it("uses explicit enterprise role mappings for future organization memberships", () => {
    expect(hasEnterprisePermission(["RiskManager"], "scenario.approve")).toBe(true);
    expect(hasEnterprisePermission(["Viewer"], "scenario.approve")).toBe(false);
    expect(permissionsForEnterpriseRoles(["Auditor"]).has("audit.read")).toBe(true);
    expect(isKnownPermission("market.stream.read")).toBe(true);
    expect(isKnownPermission("unknown.permission")).toBe(false);
  });
});
