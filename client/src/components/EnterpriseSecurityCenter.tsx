import { useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, ClipboardCheck, FileKey2, Fingerprint, LockKeyhole, ShieldAlert, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_PERMISSION_CATALOG, type RolePermission, validateRoleDraft } from "@/lib/customRolePolicy";

type AuditEvent = {
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  decision: "Allowed" | "Denied" | "System";
  trace: string;
  detail: string;
};

const auditEvents: AuditEvent[] = [
  { timestamp: "14:32:18", action: "step_up.required", actor: "A. Morgan", target: "role:ScenarioApprover", decision: "Denied", trace: "tr-87ac", detail: "Fresh WebAuthn verification required before critical role mutation." },
  { timestamp: "14:31:52", action: "role.change.requested", actor: "A. Morgan", target: "role:ScenarioApprover", decision: "Allowed", trace: "tr-87a9", detail: "Added scenario.approve; dual approval policy is pending." },
  { timestamp: "14:14:06", action: "stream.entitlement.checked", actor: "System", target: "BTC-USD", decision: "System", trace: "tr-86df", detail: "Public read-only feed permitted; no licensed-data entitlement used." },
  { timestamp: "13:48:21", action: "sso.connection.reviewed", actor: "R. Patel", target: "idp:contoso", decision: "Allowed", trace: "tr-861d", detail: "Issuer and JWKS metadata inspected; connection remains disabled pending approval." },
];

const riskStyle = {
  standard: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  sensitive: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const decisionStyle = {
  Allowed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Denied: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  System: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

export function EnterpriseSecurityCenter() {
  const [roleName, setRoleName] = useState("Market Data Steward");
  const [permissions, setPermissions] = useState<RolePermission[]>(["market.stream.read", "audit.read"]);
  const [previewRequested, setPreviewRequested] = useState(false);
  const validation = useMemo(() => validateRoleDraft(roleName, permissions), [roleName, permissions]);

  const togglePermission = (permission: RolePermission) => {
    setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
    setPreviewRequested(false);
  };

  const requestPolicyReview = () => {
    if (validation.valid) setPreviewRequested(true);
  };

  return (
    <section className="space-y-4" aria-label="Enterprise Security Center">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Enterprise Security Center</p>
          <h2 className="mt-1 text-xl font-bold">Identity governance that is reviewable by design</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Role policy, step-up assurance and audit evidence are shown together. This workspace previews guardrails; final grants remain server-enforced after IdP and managed backend configuration.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Guardrail preview active</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><UsersRound className="h-4 w-4 text-violet-400" /> Custom Role Builder</CardTitle><CardDescription className="mt-2">Build least-privilege roles from the approved permission catalogue.</CardDescription></div><span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-200"><UserRoundCheck className="h-3.5 w-3.5" /> Org scoped</span></div>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <label className="block text-sm font-medium">Role display name<input aria-label="Role display name" value={roleName} onChange={(event) => { setRoleName(event.target.value); setPreviewRequested(false); }} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring-2" /></label>
            <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assignable permissions</p><span className="text-xs text-muted-foreground">{permissions.length} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{ROLE_PERMISSION_CATALOG.map((permission) => { const selected = permissions.includes(permission.key); return <label key={permission.key} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-xs ${selected ? "border-cyan-400/50 bg-cyan-400/5" : "border-border/60 bg-muted/10"} ${!permission.assignable ? "opacity-55" : ""}`}><input type="checkbox" disabled={!permission.assignable} checked={selected} onChange={() => togglePermission(permission.key)} className="mt-0.5 accent-cyan-500" /><span className="min-w-0 flex-1"><span className="block font-medium text-foreground">{permission.label}</span><span className="mt-1 flex items-center gap-1"><code className="text-[10px] text-muted-foreground">{permission.key}</code><span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${riskStyle[permission.risk]}`}>{permission.risk}</span></span></span></label>; })}</div></div>
            <div className={`rounded-md border p-3 text-xs ${validation.valid ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}><div className="flex items-start gap-2">{validation.valid ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" /> : <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-400" />}<div><p className="font-medium">{validation.valid ? "Role policy is structurally valid" : "Role policy requires correction"}</p><p className="mt-1 text-muted-foreground">{validation.valid ? `${validation.requiresStepUp ? "Fresh MFA is required before submission." : "No MFA step-up is required for this draft."} ${validation.requiresDualApproval ? "A second approver is required because a critical permission is selected." : ""}` : validation.reasons.join(" ")}</p></div></div></div>
            <button type="button" disabled={!validation.valid} onClick={requestPolicyReview} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"><ClipboardCheck className="h-3.5 w-3.5" /> Request governed review</button>
            {previewRequested && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100"><Fingerprint className="mr-1 inline h-3.5 w-3.5" /> Preview created. The production workflow will require a server-validated step-up grant and, for critical permissions, an independent approver before applying the role.</div>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80"><CardHeader className="border-b border-border/50 pb-4"><CardTitle className="flex items-center gap-2 text-base"><Fingerprint className="h-4 w-4 text-cyan-400" /> Step-up MFA policy</CardTitle><CardDescription className="mt-2">Assurance must be fresh, user-verified and bound to the requested operation.</CardDescription></CardHeader><CardContent className="space-y-3 pt-5"><PolicyRow icon={<LockKeyhole className="h-4 w-4 text-emerald-400" />} title="Standard workspace" value="Session + permission" detail="Read and routine authoring actions" /><PolicyRow icon={<BadgeCheck className="h-4 w-4 text-amber-400" />} title="Sensitive action" value="AAL2 / ≤15 min" detail="Scenario approval and controlled export" /><PolicyRow icon={<Fingerprint className="h-4 w-4 text-rose-400" />} title="Critical identity change" value="WebAuthn / ≤5 min" detail="Role, IdP or connector administration" /><p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">A completed MFA event cannot become a general client-side bypass. The server binds the grant to actor, tenant, action, session hash, expiry and policy version, then consumes it once.</p></CardContent></Card>
          <Card className="border-border/50 bg-card/80"><CardHeader className="border-b border-border/50 pb-4"><CardTitle className="flex items-center gap-2 text-base"><FileKey2 className="h-4 w-4 text-amber-400" /> Audit evidence chain</CardTitle><CardDescription className="mt-2">Recent decisions retain actor, target, rationale and trace reference without storing secrets.</CardDescription></CardHeader><CardContent className="space-y-3 pt-5">{auditEvents.map((event) => <div key={event.trace} className="rounded-md border border-border/60 bg-muted/10 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-[11px] text-muted-foreground">{event.timestamp} · {event.trace}</p><p className="mt-1 text-sm font-medium">{event.action}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] ${decisionStyle[event.decision]}`}>{event.decision}</span></div><p className="mt-2 text-xs text-muted-foreground">{event.actor} → {event.target}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.detail}</p></div>)}<p className="border-t border-border/50 pt-3 text-xs text-muted-foreground">Production audit events are append-only, redacted and hash-linked; the current UI is a review model and not the authoritative record.</p></CardContent></Card>
        </div>
      </div>
    </section>
  );
}

function PolicyRow({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/10 p-3"><span className="rounded-md border border-border/60 bg-background p-2">{icon}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{title}</p><span className="font-mono text-xs text-foreground">{value}</span></div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>;
}
