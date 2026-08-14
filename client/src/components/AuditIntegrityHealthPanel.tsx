import { useState } from "react";
import { BadgeCheck, CircleAlert, Fingerprint, Link2, LockKeyhole, ScanSearch, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const integritySignals = [
  { label: "Latest verified window", value: "101–102", detail: "Two ordered audit events; predecessor link and event digests verified.", icon: <Link2 className="h-4 w-4 text-cyan-400" /> },
  { label: "Signed integrity anchor", value: "KMS key v3", detail: "Anchor payload binds organization, immutable sequence window and terminal event hash.", icon: <Fingerprint className="h-4 w-4 text-violet-400" /> },
  { label: "Separation-of-duties watch", value: "1 high finding", detail: "Connector administration combined with report export requires certification review.", icon: <CircleAlert className="h-4 w-4 text-rose-400" /> },
];

export function AuditIntegrityHealthPanel() {
  const [verificationViewed, setVerificationViewed] = useState(false);

  return (
    <section className="space-y-4" aria-label="Audit integrity health">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Audit Integrity Health</p>
          <h2 className="mt-1 text-xl font-bold">Evidence is verified in batches and checkpointed for review</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Operational preview of event-chain verification, signed anchors and high-risk access findings. Production values must originate from server-side audit workers and a configured KMS/HSM adapter.</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200"><BadgeCheck className="h-3.5 w-3.5" /> Integrity preview healthy</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Batch verifier status</CardTitle>
            <CardDescription className="mt-2">Every envelope must pass its own SHA-256 check and match the predecessor hash at its immutable sequence boundary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-5">
            {integritySignals.map((signal) => <div key={signal.label} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/10 p-3"><span className="rounded-md border border-border/60 bg-background p-2">{signal.icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{signal.label}</p><span className="font-mono text-xs text-foreground">{signal.value}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.detail}</p></div></div>)}
            <button type="button" onClick={() => setVerificationViewed(true)} className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100"><ScanSearch className="h-3.5 w-3.5" /> View verification boundary</button>
            {verificationViewed && <p className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs leading-relaxed text-cyan-100"><LockKeyhole className="mr-1 inline h-3.5 w-3.5" /> The client never signs or stores audit secrets. A backend worker verifies event payloads and predecessor links, then calls the configured KMS/HSM adapter to sign the anchor digest.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="border-b border-border/50 pb-4"><CardTitle className="flex items-center gap-2 text-base"><Fingerprint className="h-4 w-4 text-violet-400" /> Anchor control boundary</CardTitle><CardDescription className="mt-2">The signed checkpoint binds tenant, sequence range, event count, terminal hash and key version.</CardDescription></CardHeader>
          <CardContent className="space-y-3 pt-5">
            <ControlLine label="Key isolation" value="Backend KMS/HSM adapter" />
            <ControlLine label="Signature input" value="Canonical SHA-256 digest" />
            <ControlLine label="Rotation evidence" value="Key ID + algorithm in anchor" />
            <ControlLine label="Failure posture" value="Broken or degraded; never silently healthy" />
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-100"><CircleAlert className="mr-1 inline h-3.5 w-3.5" /> A missing, stale or invalid anchor must be escalated to the audit worker and SIEM. This preview cannot remediate or suppress an integrity failure.</div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ControlLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/10 px-3 py-2.5"><span className="text-xs text-muted-foreground">{label}</span><span className="text-right font-mono text-[11px] text-foreground">{value}</span></div>;
}
