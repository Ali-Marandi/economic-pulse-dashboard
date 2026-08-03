import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Calendar } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate and download market reports
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 hover:border-accent/50 transition-all cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Daily Market Summary</CardTitle>
                <p className="text-xs text-muted-foreground mt-2">
                  Comprehensive overview of today's market movements
                </p>
              </div>
              <FileText className="h-8 w-8 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:border-accent/50 transition-all cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Weekly Analysis</CardTitle>
                <p className="text-xs text-muted-foreground mt-2">
                  Detailed analysis of weekly trends and patterns
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                title: "Market Summary - December 15, 2024",
                date: "Dec 15, 2024",
                type: "Daily",
              },
              {
                title: "Weekly Analysis - Week 50",
                date: "Dec 13, 2024",
                type: "Weekly",
              },
              {
                title: "Market Summary - December 14, 2024",
                date: "Dec 14, 2024",
                type: "Daily",
              },
              {
                title: "Monthly Overview - November 2024",
                date: "Dec 1, 2024",
                type: "Monthly",
              },
            ].map((report, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.date} · {report.type}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Export Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button className="w-full justify-start gap-2" variant="outline">
              <Download className="h-4 w-4" />
              Export as PDF
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Download className="h-4 w-4" />
              Export as CSV
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Download className="h-4 w-4" />
              Export as Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
