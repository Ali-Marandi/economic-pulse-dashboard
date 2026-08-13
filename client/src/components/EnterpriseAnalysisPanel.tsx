import { useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, BrainCircuit, CheckCircle2, Copy, Gauge, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const driverDefinitions = [
  { key: "inflation", label: "Inflation surprise", base: 0.42, color: "bg-rose-500", description: "CPI is running above the policy comfort zone." },
  { key: "rates", label: "Policy-rate pressure", base: 0.31, color: "bg-amber-500", description: "Restrictive rates are tightening financial conditions." },
  { key: "fx", label: "FX momentum", base: 0.18, color: "bg-cyan-500", description: "Currency momentum is providing a modest offset." },
  { key: "energy", label: "Energy volatility", base: 0.26, color: "bg-violet-500", description: "Energy prices are adding uncertainty to the outlook." },
] as const;

type Scenario = { id: string; name: string; inflation: number; rates: number; fx: number; energy: number; source?: "preset" | "workspace" };

const scenarioPresets: Scenario[] = [
  { id: "baseline", name: "Baseline outlook", inflation: 0.4, rates: 0.25, fx: 0, energy: 3, source: "preset" },
  { id: "oil-shock", name: "Energy supply shock", inflation: 1.6, rates: 0.75, fx: -2, energy: 24, source: "preset" },
  { id: "currency-stress", name: "Currency stress", inflation: 1.1, rates: 1, fx: -8, energy: 9, source: "preset" },
];

const defaultScenario: Scenario = { id: "workspace", name: "Custom macro shock", inflation: 1.2, rates: 0.75, fx: -3, energy: 12, source: "workspace" };
const storageKey = "economic-pulse-scenario-library";

function loadSavedScenarios(): Scenario[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function EnterpriseAnalysisPanel() {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario);
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>(loadSavedScenarios);
  const [briefCopied, setBriefCopied] = useState(false);

  const analysis = useMemo(() => {
    const stressScore = Math.min(100, Math.max(0, 48 + scenario.inflation * 11 + scenario.rates * 9 - scenario.fx * 2 + scenario.energy * 0.55));
    const impact = (stressScore - 50) * 0.08;
    const confidence = Math.round(91 - Math.abs(scenario.fx) * 1.4 - scenario.energy * 0.18);
    const contributions = driverDefinitions.map((driver) => {
      const adjustment = driver.key === "inflation" ? scenario.inflation * 0.06 : driver.key === "rates" ? scenario.rates * 0.05 : driver.key === "fx" ? Math.abs(scenario.fx) * 0.025 : scenario.energy * 0.012;
      return { ...driver, score: Math.min(100, Math.round(driver.base * 100 + adjustment * 100)) };
    });
    const escalation = stressScore >= 75 ? "Escalate to risk committee" : stressScore >= 60 ? "Analyst review required" : "Monitor in standard cadence";
    return { stressScore: Math.round(stressScore), impact, confidence: Math.max(55, confidence), contributions, escalation };
  }, [scenario]);

  const updateScenario = (field: keyof Omit<Scenario, "id" | "name" | "source">, value: number) => {
    setScenario((current) => ({ ...current, [field]: value, source: "workspace" }));
  };

  const applyScenario = (next: Scenario) => setScenario({ ...next, source: next.source ?? "workspace" });

  const saveScenario = () => {
    const saved = { ...scenario, id: `saved-${Date.now()}`, source: "workspace" as const };
    const next = [saved, ...savedScenarios.filter((item) => item.name !== saved.name)].slice(0, 8);
    setSavedScenarios(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const resetScenario = () => setScenario(defaultScenario);

  const copyBrief = async () => {
    const impactDirection = analysis.impact > 0 ? "downside" : "upside";
    const brief = [
      `Economic Pulse Scenario Brief — ${scenario.name}`,
      `Stress index: ${analysis.stressScore}/100 (${analysis.escalation}).`,
      `Directional GDP impact: ${impactDirection} ${Math.abs(analysis.impact).toFixed(1)}%.`,
      `Primary drivers: ${analysis.contributions.slice(0, 2).map((item) => `${item.label} (${item.score}%)`).join("; ")}.`,
      `Model confidence: ${analysis.confidence}%. Outputs are planning estimates and require analyst review.`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(brief);
      setBriefCopied(true);
      window.setTimeout(() => setBriefCopied(false), 1800);
    } catch {
      setBriefCopied(false);
    }
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
            <Metric label="Signal" value="Elevated" />
            <Metric label="Confidence" value={`${analysis.confidence}%`} />
            <Metric label="Model version" value="EP-XAI 1.0" />
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

      <Card className="border-border/50 bg-card/80 xl:col-span-2">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="h-4 w-4 text-violet-400" /> Scenario library and risk governance</CardTitle>
              <CardDescription className="mt-2">Apply governed playbooks, preserve a local workspace library, and produce a review-ready executive brief.</CardDescription>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${analysis.stressScore >= 75 ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : analysis.stressScore >= 60 ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}><AlertTriangle className="h-3.5 w-3.5" /> {analysis.escalation}</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <label className="block text-sm font-medium">Working scenario name<input aria-label="Working scenario name" className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring-2" value={scenario.name} onChange={(event) => setScenario((current) => ({ ...current, name: event.target.value, source: "workspace" }))} /></label>
            <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Governed playbooks</p><div className="flex flex-wrap gap-2">{scenarioPresets.map((preset) => <button key={preset.id} type="button" onClick={() => applyScenario(preset)} className={`rounded-md border px-3 py-2 text-xs transition-colors ${scenario.name === preset.name ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>{preset.name}</button>)}</div></div>
            {savedScenarios.length > 0 && <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved workspace scenarios</p><div className="flex flex-wrap gap-2">{savedScenarios.map((saved) => <button key={saved.id} type="button" onClick={() => applyScenario(saved)} className="rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-violet-200 hover:bg-violet-500/15">{saved.name}</button>)}</div></div>}
            <div className="flex flex-wrap gap-2"><button type="button" onClick={saveScenario} className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"><Save className="h-3.5 w-3.5" /> Save to workspace</button><button type="button" onClick={resetScenario} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40"><RotateCcw className="h-3.5 w-3.5" /> Reset</button></div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Executive briefing output</p><p className="mt-1 text-base font-semibold">{scenario.name}</p></div><button type="button" onClick={copyBrief} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-background">{briefCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}{briefCopied ? "Copied" : "Copy brief"}</button></div>
            <dl className="mt-4 space-y-3 text-sm"><BriefRow label="Escalation" value={analysis.escalation} /><BriefRow label="Primary driver" value={`${analysis.contributions[0].label} (${analysis.contributions[0].score}%)`} /><BriefRow label="Review confidence" value={`${analysis.confidence}%`} /></dl>
            <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">Saved scenarios are stored locally in this desktop workspace. Enterprise multi-user approval, immutable audit retention, and team-level distribution require a managed backend in the next product phase.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function ScenarioSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="block space-y-2"><div className="flex items-center justify-between text-sm"><span>{label}</span><span className="font-mono text-xs text-muted-foreground">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span></div><input aria-label={label} className="h-2 w-full cursor-pointer accent-cyan-500" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
