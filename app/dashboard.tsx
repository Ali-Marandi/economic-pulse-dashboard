"use client";

import { useMemo, useState } from "react";

const series = {
  pmi: [52.8, 53.4, 54.1, 53.6, 54.3, 55.1, 54.5, 53.9, 54.4, 53.2, 54.1, 54.6],
  cpi: [3.4, 3.3, 3.2, 3.2, 3.1, 3.2, 3.1, 3.0, 3.2, 3.1, 3.0, 3.1],
  yield: [4.1, 4.2, 4.5, 4.6, 4.3, 4.2, 4.1, 4.3, 4.4, 4.3, 4.2, 4.25],
};

const months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const marketData = {
  FX: [
    { symbol: "EURUSD", name: "Euro / US Dollar", price: "1.0784", change: 0.42, trend: [3, 5, 4, 7, 6, 8, 9] },
    { symbol: "USDJPY", name: "US Dollar / Japanese Yen", price: "157.32", change: -0.28, trend: [8, 7, 9, 6, 5, 4, 3] },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", price: "1.2746", change: 0.31, trend: [3, 4, 4, 6, 7, 8, 9] },
    { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", price: "0.6671", change: -0.18, trend: [8, 9, 7, 6, 6, 4, 3] },
    { symbol: "DXY", name: "US Dollar Index", price: "104.20", change: 0.37, trend: [3, 4, 5, 5, 7, 8, 9] },
  ],
  Equities: [
    { symbol: "SPX", name: "S&P 500", price: "5,482.87", change: 0.25, trend: [3, 4, 3, 6, 7, 7, 9] },
    { symbol: "NDX", name: "Nasdaq 100", price: "19,700.43", change: 0.61, trend: [2, 4, 5, 5, 8, 7, 10] },
    { symbol: "STOXX", name: "Euro Stoxx 50", price: "4,885.20", change: -0.14, trend: [9, 8, 7, 8, 6, 5, 4] },
    { symbol: "N225", name: "Nikkei 225", price: "39,583.08", change: 0.47, trend: [3, 5, 4, 6, 8, 7, 9] },
    { symbol: "VIX", name: "Volatility Index", price: "12.44", change: -1.82, trend: [9, 8, 8, 6, 7, 4, 3] },
  ],
  Commodities: [
    { symbol: "BRENT", name: "Brent Crude", price: "$82.40", change: 0.54, trend: [3, 4, 6, 5, 7, 8, 9] },
    { symbol: "WTI", name: "WTI Crude", price: "$78.12", change: 0.38, trend: [4, 3, 5, 6, 6, 8, 9] },
    { symbol: "XAU", name: "Gold Spot", price: "$2,327.60", change: -0.22, trend: [9, 8, 7, 8, 5, 4, 3] },
    { symbol: "XAG", name: "Silver Spot", price: "$29.18", change: 0.73, trend: [2, 4, 3, 6, 7, 8, 10] },
    { symbol: "HG", name: "Copper", price: "$4.37", change: -0.31, trend: [9, 7, 8, 6, 5, 4, 3] },
  ],
  Rates: [
    { symbol: "US2Y", name: "US Treasury 2Y", price: "4.73%", change: 0.02, trend: [4, 4, 5, 6, 6, 7, 8] },
    { symbol: "US10Y", name: "US Treasury 10Y", price: "4.25%", change: -0.03, trend: [8, 8, 7, 6, 5, 5, 4] },
    { symbol: "DE10Y", name: "German Bund 10Y", price: "2.46%", change: -0.01, trend: [8, 7, 7, 6, 6, 5, 4] },
    { symbol: "GB10Y", name: "UK Gilt 10Y", price: "4.17%", change: 0.04, trend: [3, 4, 5, 5, 7, 8, 9] },
    { symbol: "JP10Y", name: "Japan JGB 10Y", price: "1.05%", change: 0.01, trend: [3, 3, 4, 5, 6, 7, 8] },
  ],
} as const;

function linePath(values: number[], min: number, max: number, width = 820, height = 250) {
  return values
    .map((value, index) => {
      const x = 30 + (index / (values.length - 1)) * (width - 60);
      const y = 18 + (1 - (value - min) / (max - min)) * (height - 44);
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  return (
    <svg className="sparkline" viewBox="0 0 90 28" role="img" aria-label={`${positive ? "Positive" : "Negative"} one-day trend`}>
      <path d={linePath(values, 0, 12, 90, 28)} className={positive ? "positive-stroke" : "negative-stroke"} />
    </svg>
  );
}

export default function EconomicDashboard() {
  const [range, setRange] = useState("1Y");
  const [activeSeries, setActiveSeries] = useState({ pmi: true, cpi: true, yield: true });
  const [updated, setUpdated] = useState("09:42 UTC");
  const [refreshing, setRefreshing] = useState(false);
  const [marketTab, setMarketTab] = useState("FX");

  const visiblePoints = useMemo(() => (range === "3M" ? 4 : range === "6M" ? 7 : 12), [range]);

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => {
      setUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }));
      setRefreshing(false);
    }, 650);
  }

  const kpis = [
    { label: "CPI", value: "3.1%", meta: "YoY · latest release", accent: "blue", icon: "↗" },
    { label: "Policy Rate", value: "4.25%", meta: "Current target", accent: "teal", icon: "⌂" },
    { label: "USD Index", value: "104.2", meta: "DXY · live", accent: "cyan", icon: "$" },
    { label: "Brent", value: "$82.40", meta: "USD / bbl", accent: "blue", icon: "◊" },
  ];

  return (
    <main className="dashboard-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <div className="brand">ECONOMIC <span>PULSE</span></div>
        <div className="navlinks">
          {["Overview", "Macro", "Markets", "Reports"].map((item) => (
            <button key={item} className={item === "Overview" ? "active" : ""}>{item}</button>
          ))}
        </div>
        <div className="livebar">
          <span className="live-dot" /> <strong>LIVE</strong>
          <span className="divider" />
          <span>Updated {updated}</span>
          <button className="refresh" onClick={refresh} disabled={refreshing}>
            <span className={refreshing ? "spin" : ""}>↻</span> {refreshing ? "Refreshing" : "Refresh data"}
          </button>
        </div>
      </nav>

      <section className="kpi-grid" aria-label="Key economic indicators">
        {kpis.map((kpi) => (
          <article className={`panel kpi ${kpi.accent}`} key={kpi.label}>
            <div className="kpi-icon">{kpi.icon}</div>
            <div><p>{kpi.label}</p><h2>{kpi.value}</h2><small>{kpi.meta}</small></div>
          </article>
        ))}
      </section>

      <section className="primary-grid">
        <article className="panel chart-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">GLOBAL ACTIVITY</p>
              <h1>Global Macro Momentum</h1>
            </div>
            <div className="ranges" aria-label="Chart range">
              {["3M", "6M", "1Y"].map((item) => (
                <button key={item} className={range === item ? "selected" : ""} onClick={() => setRange(item)}>{item}</button>
              ))}
            </div>
          </header>
          <div className="legend">
            {[
              ["pmi", "Global PMI Composite", "blue"],
              ["cpi", "CPI YoY %", "cyan"],
              ["yield", "10Y Global Yield %", "teal"],
            ].map(([key, label, color]) => (
              <button
                key={key}
                aria-pressed={activeSeries[key as keyof typeof activeSeries]}
                onClick={() => setActiveSeries((state) => ({ ...state, [key]: !state[key as keyof typeof state] }))}
                className={!activeSeries[key as keyof typeof activeSeries] ? "muted" : ""}
              >
                <span className={`legend-dot ${color}`} />{label}
              </button>
            ))}
          </div>
          <div className="chart-wrap">
            <svg viewBox="0 0 820 250" className="macro-chart" role="img" aria-label="Global PMI, CPI, and government yield trends">
              <defs>
                <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity=".25" />
                  <stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[40, 85, 130, 175, 220].map((y) => <line key={y} x1="30" x2="790" y1={y} y2={y} className="gridline" />)}
              {activeSeries.pmi && <path d={linePath(series.pmi.slice(-visiblePoints), 48, 57)} className="line pmi-line" />}
              {activeSeries.cpi && <path d={linePath(series.cpi.slice(-visiblePoints), 2.6, 3.8)} className="line cpi-line" />}
              {activeSeries.yield && <path d={linePath(series.yield.slice(-visiblePoints), 3.6, 4.9)} className="line yield-line" />}
            </svg>
            <div className="xlabels">{months.slice(-visiblePoints).map((month) => <span key={month}>{month}</span>)}</div>
          </div>
          <footer className="source-row"><span>Sources: World Bank · OECD · FRED-compatible adapters</span><span>Illustrative values · UTC</span></footer>
        </article>

        <article className="panel movers-panel">
          <header className="panel-header"><div><p className="eyebrow">MARKETS</p><h2>Market movers</h2></div><button className="text-action">View all</button></header>
          <div className="market-tabs">
            {["FX", "Equities", "Commodities", "Rates"].map((tab) => (
              <button key={tab} className={marketTab === tab ? "selected" : ""} onClick={() => setMarketTab(tab)}>{tab}</button>
            ))}
          </div>
          <div className="mover-head"><span>Instrument</span><span>Price</span><span>Chg %</span><span>Trend</span></div>
          <div className="mover-list">
            {marketData[marketTab as keyof typeof marketData].map((item) => (
              <button className="mover-row" key={item.symbol}>
                <span><strong>{item.symbol}</strong><small>{item.name}</small></span>
                <span>{item.price}</span>
                <span className={item.change > 0 ? "positive-text" : "negative-text"}>{item.change > 0 ? "+" : ""}{item.change}%</span>
                <Sparkline values={item.trend} positive={item.change > 0} />
              </button>
            ))}
          </div>
          <footer className="source-row"><span>1D change</span><span>Live simulation</span></footer>
        </article>
      </section>
    </main>
  );
}
