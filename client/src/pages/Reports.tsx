import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Printer, TrendingUp } from "lucide-react";

type ReportKind = "Daily" | "Weekly";
type ReportRecord = { id: string; title: string; date: string; type: ReportKind; content: string };

const snapshotRows = [
  ["CPI", "3.1%", "-0.2 pp", "Latest release"],
  ["Policy rate", "4.25%", "0.0 pp", "Current target"],
  ["USD Index", "104.2", "+0.37%", "Market close"],
  ["Brent crude", "$82.40", "+0.54%", "Market close"],
];

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date());
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadText(suggestedName: string, content: string, type: string) {
  const file = new Blob([content], { type });
  const href = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = suggestedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}

async function saveTextExport(suggestedName: string, content: string, extension: string, mimeType: string) {
  if (window.economicPulseDesktop) {
    const saved = await window.economicPulseDesktop.saveTextFile({ suggestedName, extension, content });
    if (saved.ok) return { ok: true, destination: "Saved through the native Windows dialog." };
    if (saved.canceled) return { ok: false, destination: "Save canceled." };
    return { ok: false, destination: saved.reason ?? "Unable to save the export." };
  }
  downloadText(suggestedName, content, mimeType);
  return { ok: true, destination: "Downloaded to the browser's default folder." };
}

function buildReport(kind: ReportKind) {
  const date = todayLabel();
  const period = kind === "Daily" ? "today's session" : "the current five-session window";
  const headline = kind === "Daily" ? "Daily Market Summary" : "Weekly Macro Analysis";
  const rows = snapshotRows.map(([metric, value, change, source]) => `- ${metric}: ${value} (${change}; ${source})`).join("\n");

  return {
    title: `${headline} — ${date}`,
    content: [
      "Economic Pulse",
      headline,
      `Prepared: ${date}`,
      "",
      "Executive summary",
      `This briefing summarizes ${period}. Values are a workstation snapshot and should be validated against approved data sources before external distribution or investment decisions.`,
      "",
      "Macro and market snapshot",
      rows,
      "",
      "Governance note",
      "This report is generated from the current local workspace. It is an analytical aid, not investment advice, a forecast, or a substitute for analyst review.",
    ].join("\n"),
  };
}

export default function Reports() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to create a local analyst-ready export.");
  const date = useMemo(todayLabel, []);

  const generateReport = async (kind: ReportKind) => {
    const actionId = `report-${kind}`;
    setBusyAction(actionId);
    try {
      const report = buildReport(kind);
      const result = await saveTextExport(
        `economic-pulse-${kind.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.txt`,
        report.content,
        ".txt",
        "text/plain;charset=utf-8",
      );
      setStatus(result.destination);
      if (result.ok) {
        setReports((current) => [
          { id: `${kind}-${Date.now()}`, title: report.title, date, type: kind, content: report.content },
          ...current,
        ].slice(0, 8));
      }
    } catch {
      setStatus("The report could not be generated. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const exportCsv = async () => {
    setBusyAction("csv");
    try {
      const content = [
        ["Metric", "Current value", "Change", "Source"].map(csvEscape).join(","),
        ...snapshotRows.map((row) => row.map(csvEscape).join(",")),
      ].join("\n");
      const result = await saveTextExport(`economic-pulse-snapshot-${new Date().toISOString().slice(0, 10)}.csv`, content, ".csv", "text/csv;charset=utf-8");
      setStatus(result.destination);
    } catch {
      setStatus("The CSV export could not be created.");
    } finally {
      setBusyAction(null);
    }
  };

  const exportExcel = async () => {
    setBusyAction("excel");
    try {
      const rows = snapshotRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
      const content = `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr><th>Metric</th><th>Current value</th><th>Change</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      const result = await saveTextExport(`economic-pulse-snapshot-${new Date().toISOString().slice(0, 10)}.xls`, content, ".xls", "application/vnd.ms-excel");
      setStatus(result.ok ? "Excel-compatible workbook created. Review it before sharing externally." : result.destination);
    } catch {
      setStatus("The Excel-compatible export could not be created.");
    } finally {
      setBusyAction(null);
    }
  };

  const exportPdf = async () => {
    setBusyAction("pdf");
    try {
      if (window.economicPulseDesktop) {
        const result = await window.economicPulseDesktop.exportPdf(`economic-pulse-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`);
        setStatus(result.ok ? "PDF saved through the native Windows dialog." : result.canceled ? "Save canceled." : result.reason ?? "The PDF could not be created.");
      } else {
        window.print();
        setStatus("The print dialog has opened. Select “Save as PDF” to create a PDF.");
      }
    } catch {
      setStatus("The PDF could not be created.");
    } finally {
      setBusyAction(null);
    }
  };

  const downloadPrevious = async (report: ReportRecord) => {
    setBusyAction(report.id);
    try {
      const result = await saveTextExport(`${report.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`, report.content, ".txt", "text/plain;charset=utf-8");
      setStatus(result.destination);
    } finally {
      setBusyAction(null);
    }
  };

  const actionLabel = (action: string, label: string) => busyAction === action ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><Download className="h-4 w-4" /> {label}</>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">Desktop research workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Produce local, review-ready exports from the current dashboard snapshot.</p>
        </div>
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100">Workspace date: {date}</div>
      </header>

      <p role="status" className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{status}</p>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Report generation">
        <Card className="border-border/50 transition-colors hover:border-cyan-400/40">
          <CardHeader>
            <div className="flex items-start justify-between gap-4"><div><CardTitle className="text-lg">Daily Market Summary</CardTitle><CardDescription className="mt-2">A concise market and macro snapshot for today’s decision workflow.</CardDescription></div><FileText className="h-8 w-8 shrink-0 text-cyan-400" /></div>
          </CardHeader>
          <CardContent><Button className="w-full gap-2" onClick={() => void generateReport("Daily")} disabled={busyAction !== null}>{actionLabel("report-Daily", "Generate local report")}</Button></CardContent>
        </Card>
        <Card className="border-border/50 transition-colors hover:border-violet-400/40">
          <CardHeader>
            <div className="flex items-start justify-between gap-4"><div><CardTitle className="text-lg">Weekly Macro Analysis</CardTitle><CardDescription className="mt-2">A structured recap of the current five-session macro risk context.</CardDescription></div><TrendingUp className="h-8 w-8 shrink-0 text-violet-400" /></div>
          </CardHeader>
          <CardContent><Button className="w-full gap-2" onClick={() => void generateReport("Weekly")} disabled={busyAction !== null}>{actionLabel("report-Weekly", "Generate local report")}</Button></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]" aria-label="Local export options">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-400" /> Snapshot export</CardTitle><CardDescription>Save the current visible indicator snapshot in a format appropriate for local review.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Button className="gap-2" variant="outline" onClick={() => void exportPdf()} disabled={busyAction !== null}>{busyAction === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} PDF</Button>
            <Button className="gap-2" variant="outline" onClick={() => void exportCsv()} disabled={busyAction !== null}>{busyAction === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV</Button>
            <Button className="gap-2" variant="outline" onClick={() => void exportExcel()} disabled={busyAction !== null}>{busyAction === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Excel-compatible</Button>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Review boundary</CardTitle></CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">Exports are created locally. Validate sources, assumptions, and approvals before circulation; the application does not treat generated output as investment advice.</CardContent>
        </Card>
      </section>

      <Card className="border-border/50">
        <CardHeader><CardTitle>Reports generated in this session</CardTitle><CardDescription>Recent items remain available while this dashboard session is open.</CardDescription></CardHeader>
        <CardContent>
          {reports.length === 0 ? <p className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">No reports have been generated in this session.</p> : <div className="space-y-3">{reports.map((report) => <div key={report.id} className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-cyan-400" /><div><p className="text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.date} · {report.type} · Local workspace</p></div></div><Button variant="ghost" size="sm" className="gap-2" onClick={() => void downloadPrevious(report)} disabled={busyAction !== null}>{busyAction === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Save again</Button></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
