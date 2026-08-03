import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import Macro from "./pages/Macro";
import Markets from "./pages/Markets";
import Reports from "./pages/Reports";

function Router() {
  return (
    <Switch>
      <Route path="/" nest>
        {() => (
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Overview} />
              <Route path="/macro" component={Macro} />
              <Route path="/markets" component={Markets} />
              <Route path="/reports" component={Reports} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
