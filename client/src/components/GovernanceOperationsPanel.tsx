import { useMemo, useState } from "react";
import { AlarmClockCheck, BadgeAlert, CheckCircle2, ClipboardCheck, FileSearch2, ShieldEllipsis, TimerReset, UserRoundCog } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewFinding = {
  subject: string;
  assignment: string;
  severity: "Attention" | "High";
  reason: string;
};

const campaignFindings: ReviewFinding[] = [
  { subject: "Data Operations", assignment: "DataOperator", severity: "High", reason: "Connector administration combined with report export requires separation-of-duties review." },
  { subject: "Scenario Review", assignment: "ScenarioApprover", severity: "Attention", reason: "Quarterly certification is due before the next scenario approval cycle." },
  { subject: "Identity Support", assignment: "EmergencyIdentityAdmin", severity: "High", reason: "Just-in-time grant expires in 14 minutes and requires independent closure evidence." },
];

const severityStyle = {
  Attention: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  High: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

export function GovernanceOperationsPanel() {
  const [campaignGenerated, setCampaignGenerated] = useState(false);
  const [elevationRequested, setElevationRequested] = useState(false);
  const highFindings = useMemo(() => campaignFindings.filter((finding) => finding.severity === "High").length, []);

  return (
    <section className="space-y-4" aria-label="Governance Operations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Governance Operations</p>
          <h2 className="mt-1 text-xl font-bold">Privileged access becomes time-bound and reviewable</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Campaign preview for access certification and just-in-time elevation. Production approval, grant issuance, revocation and audit persistence remain server-enforced.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200"><FileSearch2 className="h-3.5 w-3.5" /> Review campaign preview</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-4 w-4 text-violet-400" /> Quarterly Access Certification</CardTitle><CardDescription className="mt-2">Policy inspection detects assignments that are stale, expired or incompatible with separation-of-duties guardrails.</CardDescription></div><span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200"><BadgeAlert className="h-3.5 w-3.5" /> {highFindings} high</span></div>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {campaignFindings.map((finding) => <div key={`${finding.subject}-${finding.assignment}`} className="rounded-md border border-border/60 bg-muted/10 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{finding.subject}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">role:{finding.assignment}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityStyle[finding.severity]}`}>{finding.severity}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{finding.reason}</p></div>)}
            <button type="button" onClick={() => setCampaignGenerated(true)} className="inline-flex items-center gap-2 rounded-md bg-violet-500 px-3 py-2 text-xs font-semibold text-white"><FileSearch2 className="h-3.5 w-3.5" /> Generate reviewer packet</button>
            {campaignGenerated && <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Preview packet prepared: reviewers must attest, revoke or escalate each assignment; the production workflow writes a signed audit decision.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="border-b border-border/50 pb-4"><CardTitle className="flex items-center gap-2 text-base"><ShieldEllipsis className="h-4 w-4 text-cyan-400" /> Just-in-time privileged access</CardTitle><CardDescription className="mt-2">Critical permissions never become standing access by default.</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-5">
            <PolicyItem icon={<TimerReset className="h-4 w-4 text-cyan-400" />} title="Maximum grant duration" value="30 minutes" detail="Grant expires automatically and cannot be used outside the approved permission scope." />
            <PolicyItem icon={<UserRoundCog className="h-4 w-4 text-rose-400" />} title="Assurance threshold" value="AAL3 WebAuthn" detail="Fresh, user-verified evidence must bind to the same actor and organization." />
            <PolicyItem icon={<AlarmClockCheck className="h-4 w-4 text-amber-400" />} title="Approval boundary" value="Independent approver" detail="A second actor must approve critical elevation before the backend can issue a grant." />
            <button type="button" onClick={() => setElevationRequested(true)} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100"><ShieldEllipsis className="h-3.5 w-3.5" /> Request time-bound elevation</button>
            {elevationRequested && <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100"><BadgeAlert className="mr-1 inline h-3.5 w-3.5" /> Preview request is pending server-side WebAuthn validation, justification review and independent approval. No client-side elevation is granted.</p>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PolicyItem({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/10 p-3"><span className="rounded-md border border-border/60 bg-background p-2">{icon}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{title}</p><span className="font-mono text-xs text-foreground">{value}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div></div>;
}
