import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, ChartNoAxesCombined, CircleDot, CloudCog, DatabaseZap, Gauge, Radio, RefreshCw, ShieldCheck, TimerReset, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createStreamTelemetry,
  formatDuration,
  formatRatio,
  recordConnectionAttempt,
  recordConnectionOpen,
  recordDisconnect,
  recordInvalidMessage,
  recordQuote,
  recordSubscriptionAcknowledgement,
  recordSubscriptionRequest,
  summarizeStreamTelemetry,
  type StreamStatus,
  type StreamTelemetry,
} from "@/lib/marketStreamTelemetry";

type Quote = { productId: string; price: number; providerTime: string; receivedAt: number; volume?: number };

const FEED_URL = "wss://ws-feed.exchange.coinbase.com";
const PRODUCTS = ["BTC-USD", "ETH-USD"] as const;
const STALE_QUOTE_THRESHOLD_MS = 15_000;
const formatPrice = (value?: number) => value === undefined ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 2 : 4 }).format(value);

export function MarketStreamPanel() {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [telemetry, setTelemetry] = useState<StreamTelemetry>(() => createStreamTelemetry());
  const [now, setNow] = useState(() => Date.now());
  const [retryDelayMs, setRetryDelayMs] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const telemetryRef = useRef<StreamTelemetry>(telemetry);

  const commitTelemetry = (next: StreamTelemetry) => {
    telemetryRef.current = next;
    setTelemetry(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    const scheduleReconnect = () => {
      const exponent = Math.min(reconnectAttemptRef.current, 5);
      reconnectAttemptRef.current += 1;
      const delay = Math.min(30_000, 1_000 * 2 ** exponent) + Math.round(Math.random() * 500);
      setRetryDelayMs(delay);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (!active) return;
      setStatus("connecting");
      setRetryDelayMs(null);
      commitTelemetry(recordConnectionAttempt(telemetryRef.current));
      const socket = new WebSocket(FEED_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        commitTelemetry(recordConnectionOpen(telemetryRef.current));
        commitTelemetry(recordSubscriptionRequest(telemetryRef.current));
        socket.send(JSON.stringify({ type: "subscribe", product_ids: PRODUCTS, channels: ["ticker"] }));
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data) as { type?: string; product_id?: string; price?: string; time?: string; last_size?: string };
          if (message.type === "subscriptions") {
            commitTelemetry(recordSubscriptionAcknowledgement(telemetryRef.current));
            return;
          }
          if (message.type !== "ticker") return;
          if (!message.product_id || !message.price || !PRODUCTS.includes(message.product_id as (typeof PRODUCTS)[number])) {
            commitTelemetry(recordInvalidMessage(telemetryRef.current));
            return;
          }

          const receivedAt = Date.now();
          const quote: Quote = {
            productId: message.product_id,
            price: Number(message.price),
            providerTime: message.time ?? new Date(receivedAt).toISOString(),
            receivedAt,
            volume: message.last_size ? Number(message.last_size) : undefined,
          };
          if (!Number.isFinite(quote.price)) {
            commitTelemetry(recordInvalidMessage(telemetryRef.current));
            return;
          }

          const result = recordQuote(telemetryRef.current, {
            productId: quote.productId,
            price: quote.price,
            providerTime: quote.providerTime,
            size: quote.volume,
          }, receivedAt);
          commitTelemetry(result.telemetry);

          if (result.classification === "accepted") {
            setQuotes((current) => ({ ...current, [quote.productId]: quote }));
            reconnectAttemptRef.current = 0;
            setStatus("live");
          }
        } catch {
          commitTelemetry(recordInvalidMessage(telemetryRef.current));
          setStatus((current) => current === "live" ? "degraded" : current);
        }
      };

      socket.onerror = () => {
        if (active) setStatus("degraded");
      };

      socket.onclose = () => {
        if (!active) return;
        if (socketRef.current === socket) socketRef.current = null;
        commitTelemetry(recordDisconnect(telemetryRef.current));
        setStatus("offline");
        scheduleReconnect();
      };
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [retryNonce]);

  const snapshot = useMemo(() => summarizeStreamTelemetry(telemetry, status, now), [telemetry, status, now]);
  const quoteIsStale = snapshot.quoteStalenessMs !== null && snapshot.quoteStalenessMs > STALE_QUOTE_THRESHOLD_MS;

  const statusCopy = useMemo(() => {
    if (status === "live" && !quoteIsStale) return { label: "Live public feed", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", icon: <Wifi className="h-3.5 w-3.5" /> };
    if (status === "live" && quoteIsStale) return { label: "Stale quote", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (status === "connecting") return { label: "Connecting", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> };
    if (status === "degraded") return { label: "Degraded feed", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    return { label: retryDelayMs === null ? "Reconnecting" : `Backoff ${formatDuration(retryDelayMs)}`, className: "border-rose-500/30 bg-rose-500/10 text-rose-300", icon: <WifiOff className="h-3.5 w-3.5" /> };
  }, [quoteIsStale, retryDelayMs, status]);

  const reconnect = () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      setRetryNonce((current) => current + 1);
      return;
    }
    socketRef.current?.close();
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]" aria-label="Real-time market data">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-emerald-400" /> Live market stream</CardTitle>
              <CardDescription className="mt-2">Read-only public market data with provenance, state visibility, and bounded local reliability telemetry.</CardDescription>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusCopy.className}`}>{statusCopy.icon}{statusCopy.label}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCTS.map((product) => {
              const quote = quotes[product];
              const productStaleness = quote ? Math.max(0, now - quote.receivedAt) : null;
              return <div key={product} className="rounded-lg border border-border/50 bg-muted/20 p-4"><div className="flex items-center justify-between"><p className="font-medium">{product.replace("-", " / ")}</p><CircleDot className={`h-4 w-4 ${quote && (!productStaleness || productStaleness <= STALE_QUOTE_THRESHOLD_MS) ? "text-emerald-400" : "text-muted-foreground"}`} /></div><p className="mt-2 text-2xl font-bold">{formatPrice(quote?.price)}</p><p className="mt-1 text-xs text-muted-foreground">{quote ? `Receipt age ${formatDuration(productStaleness)}` : "Awaiting first quote"}</p></div>;
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StreamMetric label="Source" value="Coinbase Exchange" detail="Public market data" />
            <StreamMetric label="Subscription acknowledgement" value={formatRatio(snapshot.subscriptionAcknowledgementRate)} detail={`${telemetry.subscriptionAcknowledgements}/${telemetry.subscriptionRequests || 0} observed`} />
            <StreamMetric label="Quote freshness" value={formatDuration(snapshot.quoteStalenessMs)} detail={`Desktop threshold: ${formatDuration(STALE_QUOTE_THRESHOLD_MS)}`} />
            <StreamMetric label="Readiness" value={formatDuration(snapshot.timeToFirstQuoteMs)} detail="Open to first valid quote" />
            <StreamMetric label="p95 recovery" value={formatDuration(snapshot.p95RecoveryMs)} detail={`${telemetry.disconnects} disconnect(s) observed`} />
            <StreamMetric label="Quality incidents" value={formatRatio(snapshot.dataQualityIncidentRate)} detail={`${telemetry.duplicateMessages + telemetry.outOfOrderMessages} duplicate/order event(s)`} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <span><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-400" /> The public feed is market-data only; no trading or account permission is requested.</span>
            <button type="button" onClick={reconnect} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /> Reconnect</button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><CloudCog className="h-4 w-4 text-cyan-400" /> Enterprise connector control plane</CardTitle>
          <CardDescription className="mt-2">Provider boundaries are explicit: credentials never belong in the desktop renderer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <ConnectorRow title="Public market data feed" detail="Active client-side WebSocket for non-account market data; quality and freshness are visible locally." state="Active" tone="emerald" icon={<Wifi className="h-4 w-4" />} />
          <ConnectorRow title="Finnhub streaming gateway" detail="Reserved for server-side API-key storage, entitlement checks, symbol allowlists, normalized events, and gateway-side SLOs." state="Key required" tone="amber" icon={<DatabaseZap className="h-4 w-4" />} />
          <ConnectorRow title="Licensed data-provider gateway" detail="Reserved for organization-approved providers and data-license controls; no provider key is configured in this workspace." state="Not configured" tone="slate" icon={<ShieldCheck className="h-4 w-4" />} />
          <p className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">For production equities, FX, rates, or news streams, the managed gateway must enforce organization entitlement, rate limits, source timestamps and audit correlation before relaying a normalized read-only stream to the desktop product.</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 xl:col-span-2">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4 text-violet-400" /> Stream reliability control loop</CardTitle><CardDescription className="mt-2">The interface distinguishes an open socket from a ready, fresh and policy-compliant market-data service.</CardDescription></div><span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-300"><ChartNoAxesCombined className="h-3.5 w-3.5" /> Local session SLI</span></div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
          <Guardrail title="Availability & recovery" detail={`Connection success ${formatRatio(snapshot.connectionSuccessRate)}; session live ratio ${formatRatio(snapshot.connectedRatio)}; bounded exponential backoff with jitter limits reconnect storms.`} icon={<TimerReset className="h-4 w-4" />} />
          <Guardrail title="Freshness & lineage" detail="Each displayed quote holds product, provider timestamp and desktop receipt time. Receipt age is explicit; server-side clocks must calculate true provider-to-gateway lag." icon={<Activity className="h-4 w-4" />} />
          <Guardrail title="Quality & isolation" detail={`Invalid-message rate ${formatRatio(snapshot.invalidMessageRate)}. Duplicate or out-of-order payloads cannot replace the displayed accepted quote, and ticks cannot mutate forecast inputs.`} icon={<ShieldCheck className="h-4 w-4" />} />
        </CardContent>
      </Card>
    </section>
  );
}

function StreamMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground" title={detail}>{detail}</p></div>;
}

function ConnectorRow({ title, detail, state, tone, icon }: { title: string; detail: string; state: string; tone: "emerald" | "amber" | "slate"; icon: React.ReactNode }) {
  const toneClass = tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-border bg-muted/30 text-muted-foreground";
  return <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"><span className="mt-0.5 text-cyan-400">{icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{title}</p><span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneClass}`}>{state}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div></div>;
}

function Guardrail({ title, detail, icon }: { title: string; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-4"><div className="flex items-center gap-2 text-cyan-400">{icon}<p className="text-sm font-semibold text-foreground">{title}</p></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}
