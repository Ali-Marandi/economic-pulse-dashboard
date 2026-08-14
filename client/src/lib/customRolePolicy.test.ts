import { describe, expect, it } from "vitest";
import { validateRoleDraft } from "./customRolePolicy";

describe("custom role policy", () => {
  it("accepts an ordinary least-privilege role", () => {
    const result = validateRoleDraft("Market observer", ["market.stream.read", "audit.read"]);
    expect(result.valid).toBe(true);
    expect(result.requiresStepUp).toBe(true);
    expect(result.requiresDualApproval).toBe(false);
  });

  it("blocks platform-only identity permissions from a tenant custom role", () => {
    const result = validateRoleDraft("Identity owner", ["identity.manage"]);
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toContain("Platform-only");
  });

  it("requires segregation-of-duties review for connector control plus exports", () => {
    const result = validateRoleDraft("Data owner", ["market.connector.manage", "report.export"]);
    expect(result.valid).toBe(false);
    expect(result.requiresDualApproval).toBe(true);
  });
});
