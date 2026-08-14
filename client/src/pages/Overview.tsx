import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { KPICard } from "@/components/KPICard";
import { ChartWrapper } from "@/components/ChartWrapper";
import { EnterpriseStatusBar } from "@/components/EnterpriseStatusBar";
import { EnterpriseAnalysisPanel } from "@/components/EnterpriseAnalysisPanel";
import { ForecastStudioPanel } from "@/components/ForecastStudioPanel";
import { MarketStreamPanel } from "@/components/MarketStreamPanel";
import { EnterpriseSecurityCenter } from "@/components/EnterpriseSecurityCenter";
import { GovernanceOperationsPanel } from "@/components/GovernanceOperationsPanel";
import { AuditIntegrityHealthPanel } from "@/components/AuditIntegrityHealthPanel";
import { DataProvenanceAlertCenter } from "@/components/DataProvenanceAlertCenter";

// Sample data for KPI cards
const kpiData = [
  {
    label: "CPI",
    value: "3.1%",
    meta: "YoY · latest release",
    change: -0.2,
    icon: "📊",
    color: "from-cyan-500 to-blue-500",
  },
  {
    label: "Policy Rate",
    value: "4.25%",
    meta: "Current target",
    change: 0.0,
    icon: "📈",
    color: "from-blue-500 to-purple-500",
  },
  {
    label: "USD Index",
    value: "104.2",
    meta: "DXY · live",
    change: 0.37,
    icon: "💵",
    color: "from-purple-500 to-pink-500",
  },
  {
    label: "Brent Crude",
    value: "$82.40",
    meta: "USD / bbl",
    change: 0.54,
    icon: "🛢️",
    color: "from-pink-500 to-red-500",
  },
];

// Sample market data for recent activity
const recentMarketData = [
  { time: "09:00", eurusd: 1.0780, usdjpy: 157.25, gbpusd: 1.2740 },
  { time: "10:00", eurusd: 1.0782, usdjpy: 157.30, gbpusd: 1.2742 },
  { time: "11:00", eurusd: 1.0785, usdjpy: 157.32, gbpusd: 1.2745 },
  { time: "12:00", eurusd: 1.0784, usdjpy: 157.28, gbpusd: 1.2746 },
  { time: "13:00", eurusd: 1.0786, usdjpy: 157.35, gbpusd: 1.2748 },
];

export default function Overview() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdate(new Date().toLocaleTimeString());
      setRefreshing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Economic Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {lastUpdate}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <EnterpriseStatusBar />

      <EnterpriseAnalysisPanel />

      <ForecastStudioPanel />

      <MarketStreamPanel />

      <EnterpriseSecurityCenter />

      <GovernanceOperationsPanel />

      <AuditIntegrityHealthPanel />

      <DataProvenanceAlertCenter />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            meta={kpi.meta}
            change={kpi.change}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Market Activity Chart */}
      <ChartWrapper title="Market Activity (24h)" subtitle="Real-time market movements">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={recentMarketData}>
              <defs>
                <linearGradient id="colorEurUsd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="eurusd"
                stroke="hsl(var(--accent))"
                fillOpacity={1}
                fill="url(#colorEurUsd)"
                name="EUR/USD"
              />
            </AreaChart>
          </ResponsiveContainer>
      </ChartWrapper>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Market Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-foreground">LIVE</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Mover</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">
              EURUSD <span className="text-green-500">+0.42%</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Volatility</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">
              VIX <span className="text-red-500">-1.82%</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
