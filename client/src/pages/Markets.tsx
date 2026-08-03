import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Star } from "lucide-react";
import { useState } from "react";
import { ChartWrapper } from "@/components/ChartWrapper";

// Market data structure
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
};

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const data = values.map((v, i) => ({ x: i, y: v }));
  return (
    <ResponsiveContainer width={80} height={28}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="y"
          stroke={positive ? "hsl(var(--chart-1))" : "hsl(0 84.2% 60.2%)"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MarketRow({ item, onWatchlist }: { item: any; onWatchlist?: boolean }) {
  const isPositive = item.change > 0;
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 hover:bg-muted/50 transition-colors group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{item.symbol}</p>
        <p className="text-xs text-muted-foreground truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right min-w-[80px]">
          <p className="font-semibold text-sm text-foreground">{item.price}</p>
        </div>
        <div className="text-right min-w-[60px]">
          <p
            className={`text-sm font-semibold flex items-center justify-end gap-1 ${
              isPositive ? "text-green-500" : "text-red-500"
            }`}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}{item.change}%
          </p>
        </div>
        <div className="min-w-[90px]">
          <Sparkline values={item.trend} positive={isPositive} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Markets() {
  const [activeTab, setActiveTab] = useState("FX");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Market Watch</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time market data and price movements
        </p>
      </div>

      <ChartWrapper title="Global Markets" subtitle="Real-time market data and price movements">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="FX">FX</TabsTrigger>
              <TabsTrigger value="Equities">Equities</TabsTrigger>
              <TabsTrigger value="Commodities">Commodities</TabsTrigger>
              <TabsTrigger value="Rates">Rates</TabsTrigger>
            </TabsList>

            {(["FX", "Equities", "Commodities", "Rates"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                {/* Table Header */}
                <div className="flex items-center justify-between py-2 px-4 border-b border-border/50 bg-muted/30">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Instrument</p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Price</p>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Chg %</p>
                    </div>
                    <div className="min-w-[90px]">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Trend</p>
                    </div>
                    <div className="min-w-[40px]" />
                  </div>
                </div>

                {/* Rows */}
                {marketData[tab].map((item) => (
                  <MarketRow key={item.symbol} item={item} />
                ))}
              </TabsContent>
            ))}
          </Tabs>
      </ChartWrapper>

      {/* Market Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Gainers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-foreground">NDX</span>
                <span className="text-green-500 float-right">+0.61%</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">XAG</span>
                <span className="text-green-500 float-right">+0.73%</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">BRENT</span>
                <span className="text-green-500 float-right">+0.54%</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Losers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-foreground">VIX</span>
                <span className="text-red-500 float-right">-1.82%</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">HG</span>
                <span className="text-red-500 float-right">-0.31%</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">USDJPY</span>
                <span className="text-red-500 float-right">-0.28%</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Most Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold text-foreground">EURUSD</span>
                <span className="text-muted-foreground float-right">High Volume</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">SPX</span>
                <span className="text-muted-foreground float-right">High Volume</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold text-foreground">US10Y</span>
                <span className="text-muted-foreground float-right">High Volume</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
