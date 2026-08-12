import { Activity, CheckCircle2, Database, ShieldCheck, Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const statusItems = [
  { label: "Data freshness", value: "38 sec", icon: Activity, tone: "text-emerald-500" },
  { label: "Source coverage", value: "96.4%", icon: Database, tone: "text-cyan-500" },
  { label: "Sync status", value: "Healthy", icon: Wifi, tone: "text-emerald-500" },
  { label: "Signal confidence", value: "High", icon: ShieldCheck, tone: "text-violet-500" },
];

export function EnterpriseStatusBar() {
  return (
    <Card className="border-border/60 bg-card/70 shadow-sm backdrop-blur">
      <CardContent className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 md:p-4">
        {statusItems.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
            <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-foreground">{value}</p>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-label="Verified" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
