import { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, BrainCircuit, CheckCircle2, Copy, Info, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ForecastInputs = {
  inflation: number;
  policyRate: number;
  financialConditions: number;
  energyVolatility: number;
};

const defaultInputs: ForecastInputs = {
  inflation: 3.1,
  policyRate: 4.25,
  financialConditions: 58,
  energyVolatility: 36,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ForecastStudioPanel() {
  const [inputs, setInputs] = useState<ForecastInputs>(defaultInputs);
  const [horizon, setHorizon] = useState<1 | 3 | 6>(3);
  const [briefCopied, setBriefCopied] = useState(false);

  const forecast = useMemo(() => {
    const inflationPressure = clamp((inputs.inflation - 2) * 15, 0, 34);
    const ratePressure = clamp((inputs.policyRate - 2.5) * 10, 0, 24);
    const conditionsPressure = clamp((inputs.financialConditions - 45) * 0.85, 0, 22);
    const energyPressure = clamp((inputs.energyVolatility - 20) * 0.7, 0, 16);
    const riskIndex = Math.round(clamp(18 + inflationPressure + ratePressure + conditionsPressure + energyPressure, 0, 100));
    const horizonAdjustment = horizon === 1 ? 0 : horizon === 3 ? 3 : 7;
    const downsideProbability = Math.round(clamp(16 + riskIndex * 0.48 + horizonAdjustment, 12, 78));
    const upsideProbability = Math.round(clamp(30 - riskIndex * 0.18 - horizonAdjustment / 2, 8, 34));
    const baseProbability = 100 - downsideProbability - upsideProbability;
    const centralGrowth = 2.8 - riskIndex * 0.024 - horizonAdjustment * 0.03;
    const confidence = Math.round(clamp(90 - Math.abs(inputs.inflation - 2) * 4 - Math.abs(inputs.policyRate - 3) * 2 - horizonAdjustment, 54, 91));
    const drivers = [
      { label: "Inflation persistence", contribution: Math.round(inflationPressure), direction: "Downside" as const, detail: "Higher-than-neutral inflation increases the probability of restrictive policy." },
      { label: "Policy-rate transmission", contribution: Math.round(ratePressure), direction: "Downside" as const, detail: "The policy-rate input is translated into a financial-conditions drag." },
      { label: "Financial conditions", contribution: Math.round(conditionsPressure), direction: "Downside" as const, detail: "Tighter conditions lower the central planning path and widen uncertainty." },
      { label: "Energy volatility", contribution: Math.round(energyPressure), direction: "Downside" as const, detail: "Volatility widens the downside distribution rather than changing a quoted market forecast." },
    ].sort((a, b) => b.contribution - a.contribution);

    return {
      riskIndex,
      downsideProbability,
      baseProbability,
      upsideProbability,
      centralGrowth,
      confidence,
      drivers,
      range: {
        downside: centralGrowth - 1.25 - horizonAdjustment * 0.05,
        upside: centralGrowth + 0.85 - horizonAdjustment * 0.02,
      },
    };
  }, [horizon, inputs]);

  const updateInput = (field: keyof ForecastInputs, value: number) => {
    setInputs((current) => ({ ...current, [field]: value }));
  };

  const copyForecastBrief = async () => {
    const text = [
      `Economic Pulse Planning Forecast — ${horizon}-month horizon`,
      `Regime-risk index: ${forecast.riskIndex}/100; model confidence: ${forecast.confidence}%.`,
      `Central planning path: ${forecast.centralGrowth.toFixed(1)}%; scenario range: ${forecast.range.downside.toFixed(1)}% to ${forecast.range.upside.toFixed(1)}%.`,
      `Scenario probabilities: downside ${forecast.downsideProbability}%, base ${forecast.baseProbability}%, upside ${forecast.upsideProbability}%.`,
      `Primary model drivers: ${forecast.drivers.slice(0, 2).map((driver) => driver.label).join("; ")}.`,
      "This is an explainable scenario-planning simulation, not a market forecast or investment recommendation.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setBriefCopied(true);
      window.setTimeout(() => setBriefCopied(false), 1800);
    } catch {
      setBriefCopied(false);
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]" aria-label="Forecast studio">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-cyan-400" /> Forecast studio</CardTitle>
              <CardDescription className="mt-2">Explainable scenario planning with explicit drivers, uncertainty, and a local model record.</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300"><ShieldCheck className="h-3.5 w-3.5" /> EP-Forecast 0.1</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <ModelMetric label="Risk regime" value={`${forecast.riskIndex}/100`} accent="text-amber-300" />
            <ModelMetric label="Confidence" value={`${forecast.confidence}%`} accent="text-emerald-300" />
            <ModelMetric label="Model basis" value="Scenario inputs" accent="text-cyan-300" />
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-cyan-400" /> The current model is deliberately transparent: it transforms the inputs below into a planning distribution and exposes every input contribution. A managed AI forecaster can be added behind the same review workflow after an approved server-side provider connection is configured.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ForecastSlider label="Inflation input" value={inputs.inflation} min={0} max={8} step={0.1} suffix="%" onChange={(value) => updateInput("inflation", value)} />
            <ForecastSlider label="Policy rate input" value={inputs.policyRate} min={0} max={10} step={0.25} suffix="%" onChange={(value) => updateInput("policyRate", value)} />
            <ForecastSlider label="Financial-conditions index" value={inputs.financialConditions} min={20} max={90} step={1} suffix=" / 100" onChange={(value) => updateInput("financialConditions", value)} />
            <ForecastSlider label="Energy-volatility index" value={inputs.energyVolatility} min={0} max={100} step={1} suffix=" / 100" onChange={(value) => updateInput("energyVolatility", value)} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">Planning horizon</p><span className="text-xs text-muted-foreground">Changing the horizon widens uncertainty and lowers confidence.</span></div>
            <div className="grid grid-cols-3 gap-2">{([1, 3, 6] as const).map((option) => <button key={option} type="button" onClick={() => setHorizon(option)} className={`rounded-md border px-3 py-2 text-sm font-medium ${horizon === option ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>{option} month{option > 1 ? "s" : ""}</button>)}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-violet-400" /> Forecast distribution</CardTitle>
          <CardDescription className="mt-2">Planning-path probabilities, never presented as a live market consensus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Central planning path</p>
            <div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-bold text-violet-200">{forecast.centralGrowth.toFixed(1)}%</p><span className="mb-1 text-xs text-muted-foreground">{horizon}-month scenario horizon</span></div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Illustrative planning range: {forecast.range.downside.toFixed(1)}% to {forecast.range.upside.toFixed(1)}%. The range reflects the scenario inputs and model uncertainty only.</p>
          </div>

          <ProbabilityRow label="Downside" value={forecast.downsideProbability} tone="rose" icon={<ArrowDownRight className="h-3.5 w-3.5" />} />
          <ProbabilityRow label="Base case" value={forecast.baseProbability} tone="cyan" icon={<Activity className="h-3.5 w-3.5" />} />
          <ProbabilityRow label="Upside" value={forecast.upsideProbability} tone="emerald" icon={<ArrowUpRight className="h-3.5 w-3.5" />} />

          <button type="button" onClick={copyForecastBrief} className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/40">{briefCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}{briefCopied ? "Forecast brief copied" : "Copy planning brief"}</button>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 xl:col-span-2">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4 text-amber-400" /> Explainability and model control record</CardTitle>
              <CardDescription className="mt-2">Driver attribution, release metadata, and review requirements for forecast consumers.</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300"><Info className="h-3.5 w-3.5" /> Analyst review required</span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {forecast.drivers.map((driver) => <div key={driver.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{driver.label}</span><span className="text-muted-foreground">{driver.contribution}% risk contribution</span></div><Progress value={driver.contribution} className="h-2" /><p className="mt-1 text-xs text-muted-foreground">{driver.detail}</p></div>)}
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Model card</p>
            <dl className="mt-4 space-y-3 text-sm"><ModelRow label="Version" value="EP-Forecast 0.1" /><ModelRow label="Execution" value="Local planning simulation" /><ModelRow label="Inputs" value="4 observable macro controls" /><ModelRow label="Output" value="Scenario distribution and range" /><ModelRow label="Governance" value="Human review before decision use" /></dl>
            <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">This module does not call an external AI service or present synthetic outputs as market data. Future AI models should run behind a server-side gateway, preserve prompt/model lineage, and retain approval evidence.</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ModelMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-semibold ${accent}`}>{value}</p></div>;
}

function ModelRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>;
}

function ForecastSlider({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="block space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><span className="font-mono text-xs text-muted-foreground">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span></div><input aria-label={label} className="h-2 w-full cursor-pointer accent-cyan-500" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ProbabilityRow({ label, value, tone, icon }: { label: string; value: number; tone: "rose" | "cyan" | "emerald"; icon: React.ReactNode }) {
  const toneClass = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-cyan-300";
  return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className={`flex items-center gap-1.5 font-medium ${toneClass}`}>{icon}{label}</span><span className="font-medium">{value}%</span></div><Progress value={value} className="h-2" /></div>;
}
