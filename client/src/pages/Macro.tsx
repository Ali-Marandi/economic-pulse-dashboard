import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useState } from "react";
import { ChartWrapper } from "@/components/ChartWrapper";

// Sample macro data
const macroData = [
  { month: "Jan", pmi: 52.8, cpi: 3.4, yield: 4.1 },
  { month: "Feb", pmi: 53.4, cpi: 3.3, yield: 4.2 },
  { month: "Mar", pmi: 54.1, cpi: 3.2, yield: 4.5 },
  { month: "Apr", pmi: 53.6, cpi: 3.2, yield: 4.6 },
  { month: "May", pmi: 54.3, cpi: 3.1, yield: 4.3 },
  { month: "Jun", pmi: 55.1, cpi: 3.2, yield: 4.2 },
  { month: "Jul", pmi: 54.5, cpi: 3.1, yield: 4.1 },
  { month: "Aug", pmi: 53.9, cpi: 3.0, yield: 4.3 },
  { month: "Sep", pmi: 54.4, cpi: 3.2, yield: 4.4 },
  { month: "Oct", pmi: 53.2, cpi: 3.1, yield: 4.3 },
  { month: "Nov", pmi: 54.1, cpi: 3.0, yield: 4.2 },
  { month: "Dec", pmi: 54.6, cpi: 3.1, yield: 4.25 },
];

export default function Macro() {
  const [range, setRange] = useState("1Y");
  const [activeSeries, setActiveSeries] = useState({
    pmi: true,
    cpi: true,
    yield: true,
  });

  const getVisibleData = () => {
    const rangeMap: Record<string, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };
    const months = rangeMap[range] || 12;
    return macroData.slice(-months);
  };

  const visibleData = getVisibleData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Global Macro Indicators</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor key economic indicators and trends
        </p>
      </div>

      {/* Main Chart */}
      <ChartWrapper
        title="Global Macro Momentum"
        subtitle="PMI, CPI YoY, and 10Y Yield trends"
        actions={
          <div className="flex gap-2">
            {["1M", "3M", "6M", "1Y"].map((r) => (
              <Button
                key={r}
                variant={range === r ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(r)}
                className="text-xs"
              >
                {r}
              </Button>
            ))}
          </div>
        }
      >
          {/* Series Toggle */}
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { key: "pmi", label: "Global PMI Composite", color: "hsl(var(--chart-1))" },
              { key: "cpi", label: "CPI YoY %", color: "hsl(var(--chart-2))" },
              { key: "yield", label: "10Y Global Yield %", color: "hsl(var(--chart-3))" },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() =>
                  setActiveSeries((prev) => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof prev],
                  }))
                }
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${
                  activeSeries[key as keyof typeof activeSeries]
                    ? "bg-accent/20 text-foreground"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: color,
                    opacity: activeSeries[key as keyof typeof activeSeries] ? 1 : 0.3,
                  }}
                />
                {label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={visibleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
              {activeSeries.pmi && (
                <Line
                  type="monotone"
                  dataKey="pmi"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  name="PMI"
                />
              )}
              {activeSeries.cpi && (
                <Line
                  type="monotone"
                  dataKey="cpi"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  name="CPI"
                />
              )}
              {activeSeries.yield && (
                <Line
                  type="monotone"
                  dataKey="yield"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  dot={false}
                  name="10Y Yield"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
      </ChartWrapper>

      {/* Indicator Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Global PMI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-foreground">54.6</p>
              <p className="text-xs text-muted-foreground">
                Latest: December 2024
              </p>
              <p className="text-xs text-green-500">↑ 0.5 from previous month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">CPI YoY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-foreground">3.1%</p>
              <p className="text-xs text-muted-foreground">
                Latest: December 2024
              </p>
              <p className="text-xs text-red-500">↓ 0.1% from previous month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">10Y Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-foreground">4.25%</p>
              <p className="text-xs text-muted-foreground">
                Latest: December 2024
              </p>
              <p className="text-xs text-green-500">↑ 0.05% from previous month</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
