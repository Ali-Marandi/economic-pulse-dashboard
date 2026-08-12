import { useMemo, useState } from "react";
import { AlertTriangle, BrainCircuit, Gauge, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const driverDefinitions = [
  { key: "inflation", label: "Inflation surprise", base: 0.42, color: "bg-rose-500", description: "CPI is running above the policy comfort zone." },
  { key: "rates", label: "Policy-rate pressure", base: 0.31, color: "bg-amber-500", description: "Restrictive rates are tightening financial conditions." },
  { key: "fx", label: "FX momentum", base: 0.18, color: "bg-cyan-500", description: "Currency momentum is providing a modest offset." },
  { key: "energy", label: "Energy volatility", base: 0.26, color: "bg-violet-500", description: "Energy prices are adding uncertainty to the outlook." },
] as const;

type Scenario = { name: string; inflation: number; rates: number; fx: number; energy: number };

export function EnterpriseAnalysisPanel() {
  const [scenario, setScenario] = useState<Scenario>({
    name: "Custom macro shock",
    inflation: 1.2,
    rates: 0.75,
    fx: -3,
    energy: 12,
  });

  const analysis = useMemo(() => {
    const stressScore = Math.min(100, Math.max(0, 48 + scenario.inflation * 11 + scenario.rates * 9 - scenario.fx * 2 + scenario.energy * 0.55));
    const impact = (stressScore - 50) * 0.08;
    const confidence = Math.round(91 - Math.abs(scenario.fx) * 1.4 - scenario.energy * 0.18);
    const contributions = driverDefinitions.map((driver) => {
      const adjustment = driver.key === "inflation" ? scenario.inflation * 0.06 : driver.key === "rates" ? scenario.rates * 0.05 : driver.key === "fx" ? Math.abs(scenario.fx) * 0.025 : scenario.energy * 0.012;
      return { ...driver, score: Math.min(100, Math.round(driver.base * 100 + adjustment * 100)) };
    });
    return { stressScore: Math.round(stressScore), impact, confidence: Math.max(55, confidence), contributions };
  }, [scenario]);

  const updateScenario = (field: keyof Omit<Scenario, "name">, value: number) => {
    setScenario((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]" aria-label="Enterprise analysis">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-cyan-400" /> Explainable signal analysis</CardTitle>
              <CardDescription className="mt-2">Transparent driver attribution for the current macro risk signal.</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> Auditable</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Signal</p><p className="mt-1 text-xl font-semibold">Elevated</p></div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Confidence</p><p className="mt-1 text-xl font-semibold">{analysis.confidence}%</p></div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Model version</p><p className="mt-1 text-xl font-semibold">EP-XAI 1.0</p></div>
          </div>
          <div className="space-y-4">
            {analysis.contributions.map((driver) => (
              <div key={driver.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{driver.label}</span><span className="text-muted-foreground">{driver.score}% contribution</span></div>
                <Progress value={driver.score} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">{driver.description}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-relaxed text-muted-foreground"><Sparkles className="mr-1 inline h-3.5 w-3.5 text-cyan-400" /> Explanation is generated from observable inputs and stored driver weights; every score is designed to be reviewable before it is used in a decision workflow.</div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4 text-amber-400" /> Macro stress testing</CardTitle>
          <CardDescription className="mt-2">Test a controlled shock before publishing a scenario brief.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3"><div><p className="text-xs text-muted-foreground">Scenario</p><p className="font-semibold">{scenario.name}</p></div><Gauge className="h-5 w-5 text-amber-400" /></div>
          <ScenarioSlider label="Inflation shock" value={scenario.inflation} min={0} max={4} step={0.1} suffix=" pp" onChange={(value) => updateScenario("inflation", value)} />
          <ScenarioSlider label="Policy-rate shock" value={scenario.rates} min={0} max={2} step={0.05} suffix=" pp" onChange={(value) => updateScenario("rates", value)} />
          <ScenarioSlider label="FX move" value={scenario.fx} min={-10} max={10} step={1} suffix="%" onChange={(value) => updateScenario("fx", value)} />
          <ScenarioSlider label="Energy shock" value={scenario.energy} min={0} max={40} step={1} suffix="%" onChange={(value) => updateScenario("energy", value)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"><p className="text-xs text-muted-foreground">Stress index</p><p className="mt-1 text-2xl font-bold text-amber-300">{analysis.stressScore}/100</p></div>
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3"><p className="text-xs text-muted-foreground">Estimated GDP impact</p><p className="mt-1 text-2xl font-bold text-rose-300">{analysis.impact > 0 ? "-" : "+"}{Math.abs(analysis.impact).toFixed(1)}%</p></div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs leading-relaxed text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> Scenario outputs are directional estimates for planning and require analyst review; they are not forecasts or investment advice.</div>
        </CardContent>
      </Card>
    </section>
  );
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-2"><div className="flex items-center justify-between text-sm"><span>{label}</span><span className="font-mono text-xs text-muted-foreground">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span></div><input aria-label={label} className="h-2 w-full cursor-pointer accent-cyan-500" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
  );
}
