import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  meta: string;
  change: number;
  icon?: string;
  color?: string;
}

export function KPICard({ label, value, meta, change, icon, color }: KPICardProps) {
  return (
    <Card className="bg-gradient-to-br border-border/50 hover:border-accent/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {value}
              </span>
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  change > 0
                    ? "text-green-500"
                    : change < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {change > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : change < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {Math.abs(change).toFixed(2)}%
              </span>
            </div>
          </div>
          {icon && <div className="text-2xl">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  );
}
