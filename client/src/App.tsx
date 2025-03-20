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
import UploadTest from "@/pages/upload-test";
import NotFound from "@/pages/not-found";

export default function App() {
  const [location] = useLocation();
  const { trackPageView } = useAnalytics();

  // Initialize GA on mount - we only initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      console.log('[Analytics] Google Analytics initialization verified');
    } else {
      console.warn('[Analytics] Google Analytics not available');
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (location) {
      console.log('[Analytics] Page changed:', location);
      // For GA4, we want to explicitly set the page_title and page_location
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_path: location,
        page_location: window.location.href,
        send_to: 'G-8Z36SFYZBB'
      });
      
      // Also track using our custom method
      trackPageView(location);
    }
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
            <Route path="/upload-test" component={UploadTest} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}