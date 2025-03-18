import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { useEffect } from "react";
import Home from "@/pages/home";
import Services from "@/pages/services";
import Projects from "@/pages/projects";
import Quote from "@/pages/quote";
import Book from "@/pages/book";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

export default function App() {
  const [location] = useLocation();
  const { trackPageView } = useAnalytics();

  // Track page views
  useEffect(() => {
    trackPageView(location);
  }, [location, trackPageView]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navigation />
        <main>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services" component={Services} />
            <Route path="/services/:serviceId/projects" component={Projects} />
            <Route path="/quote" component={Quote} />
            <Route path="/book" component={Book} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/auth" component={Auth} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}