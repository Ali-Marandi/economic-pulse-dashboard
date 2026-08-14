import { AlertTriangle, BadgeCheck, BellRing, CheckCircle2, Clock3, Database, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const observations = [
  { series: "US CPI · YoY", value: "3.2%", provider: "FRED", reference: "CPIAUCSL", freshness: "5 min ago", state: "Final", tone: "emerald" },
  { series: "Euro area policy rate", value: "3.75%", provider: "ECB", reference: "FM.M.U2.EUR.4F.KR.MRR_FR.LEV", freshness: "42 min ago", state: "Revised", tone: "amber" },
  { series: "GDP per capita growth", value: "1.8%", provider: "World Bank", reference: "NY.GDP.PCAP.KD.ZG", freshness: "Monthly source", state: "Initial", tone: "slate" },
] as const;

const policies = [
  { title: "US CPI above 3.0%", type: "Threshold", owner: "Risk manager", severity: "Attention", status: "Triggered", detail: "FRED · CPIAUCSL · final release" },
  { title: "ECB rate series freshness", type: "Freshness", owner: "Market operations", severity: "Critical", status: "Acknowledged", detail: "42 min receipt age · owner review recorded" },
  { title: "World Bank GDP revision", type: "Revision", owner: "Strategy analyst", severity: "Info", status: "Monitoring", detail: "Initial vintage awaiting next published release" },
] as const;

export function DataProvenanceAlertCenter() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]" aria-label="Data provenance and alert policy center">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-cyan-400" /> Data provenance & freshness</CardTitle>
              <CardDescription className="mt-2">Every observation carries a provider reference, release state, frequency and receipt-age context before it is used in a decision workflow.</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" /> Evidence ready</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {observations.map((item) => <div key={item.reference} className="grid gap-3 rounded-lg border border-border/50 bg-muted/20 p-3 sm:grid-cols-[1.1fr_0.9fr_auto] sm:items-center">
            <div><p className="text-sm font-medium">{item.series} <span className="ml-1 text-muted-foreground">{item.value}</span></p><p className="mt-1 text-xs text-muted-foreground">{item.provider} · {item.reference}</p></div>
            <div className="text-xs text-muted-foreground"><p className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {item.freshness}</p><p className="mt-1">Revision: {item.state}</p></div>
            <span className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-[11px] ${item.tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : item.tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-border bg-muted/40 text-muted-foreground"}`}>{item.tone === "amber" ? <AlertTriangle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}{item.tone === "amber" ? "Review" : "Recorded"}</span>
          </div>)}
          <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-cyan-400" /> This is a governed preview. Provider credentials, data licensing decisions and alert dispatch remain server-side control-plane responsibilities.</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4"><CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4 text-violet-400" /> Alert policy workflow</CardTitle><CardDescription className="mt-2">Threshold and freshness alerts are assigned to an accountable owner and retain the observation evidence that caused them.</CardDescription></CardHeader>
        <CardContent className="space-y-3 pt-5">
          {policies.map((item) => <div key={item.title} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><span className={`rounded-full border px-2 py-0.5 text-[11px] ${item.severity === "Critical" ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : item.severity === "Attention" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{item.severity}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.type} · Owner: {item.owner}</p><p className="mt-2 text-xs text-muted-foreground">{item.detail}</p><p className="mt-2 text-xs font-medium text-foreground">State: {item.status}</p></div>)}
          <p className="text-xs leading-relaxed text-muted-foreground">Policy evaluation is deny-by-default: a threshold requires a finite value, freshness requires a bounded time window, and every policy requires an accountable organization owner.</p>
        </CardContent>
      </Card>
    </section>
  );
}
