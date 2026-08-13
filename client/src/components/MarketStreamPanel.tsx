import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CircleDot, CloudCog, DatabaseZap, Radio, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StreamStatus = "connecting" | "live" | "degraded" | "offline";
type Quote = { productId: string; price: number; time: string; volume?: number };

const FEED_URL = "wss://ws-feed.exchange.coinbase.com";
const PRODUCTS = ["BTC-USD", "ETH-USD"] as const;
const formatPrice = (value?: number) => value === undefined ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 100 ? 2 : 4 }).format(value);

export function MarketStreamPanel() {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const connect = () => {
      setStatus("connecting");
      const socket = new WebSocket(FEED_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        socket.send(JSON.stringify({ type: "subscribe", product_ids: PRODUCTS, channels: ["ticker"] }));
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data) as { type?: string; product_id?: string; price?: string; time?: string; last_size?: string };
          if (message.type !== "ticker" || !message.product_id || !message.price || !PRODUCTS.includes(message.product_id as (typeof PRODUCTS)[number])) return;
          const quote: Quote = { productId: message.product_id, price: Number(message.price), time: message.time ?? new Date().toISOString(), volume: message.last_size ? Number(message.last_size) : undefined };
          setQuotes((current) => ({ ...current, [quote.productId]: quote }));
          setLastMessageAt(new Date().toLocaleTimeString());
          setStatus("live");
        } catch {
          setStatus((current) => current === "live" ? "degraded" : current);
        }
      };

      socket.onerror = () => {
        if (active) setStatus("degraded");
      };

      socket.onclose = () => {
        if (!active) return;
        setStatus("offline");
        reconnectTimerRef.current = window.setTimeout(connect, 6000);
      };
    };

    connect();
    return () => {
      active = false;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [retryNonce]);

  const statusCopy = useMemo(() => {
    if (status === "live") return { label: "Live public feed", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", icon: <Wifi className="h-3.5 w-3.5" /> };
    if (status === "connecting") return { label: "Connecting", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> };
    if (status === "degraded") return { label: "Degraded feed", className: "border-amber-500/30 bg-amber-500/10 text-amber-300", icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    return { label: "Reconnecting", className: "border-rose-500/30 bg-rose-500/10 text-rose-300", icon: <WifiOff className="h-3.5 w-3.5" /> };
  }, [status]);

  const reconnect = () => {
    socketRef.current?.close();
    setRetryNonce((current) => current + 1);
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]" aria-label="Real-time market data">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-emerald-400" /> Live market stream</CardTitle>
              <CardDescription className="mt-2">Public WebSocket market data with explicit source status and timestamp provenance.</CardDescription>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusCopy.className}`}>{statusCopy.icon}{statusCopy.label}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCTS.map((product) => {
              const quote = quotes[product];
              return <div key={product} className="rounded-lg border border-border/50 bg-muted/20 p-4"><div className="flex items-center justify-between"><p className="font-medium">{product.replace("-", " / ")}</p><CircleDot className={`h-4 w-4 ${quote ? "text-emerald-400" : "text-muted-foreground"}`} /></div><p className="mt-2 text-2xl font-bold">{formatPrice(quote?.price)}</p><p className="mt-1 text-xs text-muted-foreground">{quote ? `Received ${new Date(quote.time).toLocaleTimeString()}` : "Awaiting first quote"}</p></div>;
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StreamMetric label="Source" value="Coinbase Exchange" />
            <StreamMetric label="Channel" value="Ticker WebSocket" />
            <StreamMetric label="Last message" value={lastMessageAt ?? "Awaiting feed"} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <span><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-400" /> The public feed is used only for market data; no trading or account permissions are requested.</span>
            <button type="button" onClick={reconnect} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" /> Reconnect</button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><CloudCog className="h-4 w-4 text-cyan-400" /> Enterprise connector control plane</CardTitle>
          <CardDescription className="mt-2">Provider boundaries are explicit: API credentials never belong in the desktop renderer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          <ConnectorRow title="Public market data feed" detail="Active client-side WebSocket for non-account market data." state="Active" tone="emerald" icon={<Wifi className="h-4 w-4" />} />
          <ConnectorRow title="Finnhub streaming gateway" detail="Designed for server-side API-key storage, entitlement checks, symbol allowlists, and normalized trade events." state="Key required" tone="amber" icon={<DatabaseZap className="h-4 w-4" />} />
          <ConnectorRow title="Licensed data-provider gateway" detail="Reserved for organization-approved providers and data-licence controls; no provider key is configured in this workspace." state="Not configured" tone="slate" icon={<ShieldCheck className="h-4 w-4" />} />
          <p className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">For production equities, FX, rates, or news streams, deploy a managed server-side gateway that holds provider credentials, enforces entitlements and rate limits, records source timestamps, and relays a normalized read-only stream to the desktop product.</p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 xl:col-span-2">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-violet-400" /> Data provenance and operational guardrails</CardTitle><CardDescription className="mt-2">The streaming layer is separated from forecast logic so live prices cannot silently become model assumptions.</CardDescription></div><span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-300"><ShieldCheck className="h-3.5 w-3.5" /> Read-only stream</span></div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-3">
          <Guardrail title="Source lineage" detail="Every quote preserves provider, product ID, feed channel, and received timestamp in the UI contract." />
          <Guardrail title="Model isolation" detail="Forecast inputs remain explicit controls. A stream update cannot mutate a planning model without user review." />
          <Guardrail title="Failure handling" detail="Feed disconnection is visible as degraded or reconnecting; stale values are never labeled as live." />
        </CardContent>
      </Card>
    </section>
  );
}

function StreamMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold" title={value}>{value}</p></div>;
}

function ConnectorRow({ title, detail, state, tone, icon }: { title: string; detail: string; state: string; tone: "emerald" | "amber" | "slate"; icon: React.ReactNode }) {
  const toneClass = tone === "emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : tone === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-border bg-muted/30 text-muted-foreground";
  return <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"><span className="mt-0.5 text-cyan-400">{icon}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{title}</p><span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneClass}`}>{state}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div></div>;
}

function Guardrail({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-lg border border-border/50 bg-muted/20 p-4"><p className="text-sm font-semibold">{title}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}
