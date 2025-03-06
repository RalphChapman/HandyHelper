import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/hooks/use-auth";
import Home from "@/pages/home";
import Services from "@/pages/services";
import Projects from "@/pages/projects";
import Quote from "@/pages/quote";
import Book from "@/pages/book";
import Dashboard from "@/pages/dashboard";
import Auth from "@/pages/auth";
import NotFound from "@/pages/not-found";
import Provider from "@/pages/provider";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navigation />
        <main>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services" component={Services} />
            <Route path="/services/:serviceId/projects" component={Projects} />
            <Route path="/providers/:providerId" component={Provider} />
            <Route path="/quote" component={Quote} />
            <Route path="/book" component={Book} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/auth" component={Auth} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}