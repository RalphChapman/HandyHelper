import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertQuoteRequestSchema, type Service } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useAuth } from "@/hooks/use-auth";

// Helper function to extract city and state from address
function extractLocationFromAddress(address: string): string {
  try {
    if (!address) return "Charleston, South Carolina";

    // Split address by commas
    const parts = address.split(',').map(part => part.trim());

    // Address format is typically: "Street, City, State ZIP"
    if (parts.length >= 2) {
      // Get state and ZIP from last part
      const stateZipPart = parts[parts.length - 1].trim().split(' ');
      const state = stateZipPart[0]; // State abbreviation

      // Get city from second to last part
      const city = parts[parts.length - 2].trim();

      return `${city}, ${state}`;
    }

    return "Charleston, South Carolina";
  } catch (error) {
    console.error('Error parsing address:', error);
    return "Charleston, South Carolina";
  }
}

export default function Quote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user info for pre-filling
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedService = searchParams.get("service");
  const prefilledName = searchParams.get("name");
  const prefilledEmail = searchParams.get("email");
  const prefilledPhone = searchParams.get("phone");
  const prefilledAddress = searchParams.get("address");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services");
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
      return response.json();
    }
  });

  const form = useForm({
    resolver: zodResolver(insertQuoteRequestSchema),
    defaultValues: {
      serviceId: undefined,
      name: prefilledName || user?.username || "",
      email: prefilledEmail || user?.email || "",
      phone: prefilledPhone || "",
      description: "",
      address: prefilledAddress || "",
    },
  });

  useEffect(() => {
    if (services && preselectedService) {
      const service = services.find(s => s.id === parseInt(preselectedService));
      if (service) {
        form.setValue("serviceId", service.id);
      }
    } else if (services && !form.getValues("serviceId")) {
      const generalService = services.find(service =>
        service.name.toLowerCase() === "general home maintenance"
      );
      if (generalService) {
        form.setValue("serviceId", generalService.id);
      }
    }
  }, [services, form, preselectedService]);

  async function analyzeProject() {
    const description = form.getValues("description");
    const address = form.getValues("address");

    if (!description) {
      toast({
        title: "Error",
        description: "Please enter a project description first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Extract location from address if available, otherwise use default
      const location = extractLocationFromAddress(address);

      const response = await apiRequest("POST", "/api/analyze-project", {
        description,
        address,
        location
      });

      if (!response.ok) {
        throw new Error("Failed to analyze project");
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onSubmit(data: any) {
    setIsSubmitting(true);
    try {
      const service = services?.find(s => s.id === data.serviceId);
      const response = await apiRequest("POST", "/api/quote-requests", {
        ...data,
        serviceName: service?.name,
        analysis,
        contactInfo: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit quote request');
      }

      toast({
        title: "Quote request submitted",
        description: "We'll get back to you soon!",
      });
      setLocation("/");
    } catch (error: any) {
      console.error("Quote submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit quote request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Request a Quote</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value}
                      onChange={field.onChange}
                      onError={(error) => {
                        toast({
                          title: "Address Verification Error",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      onClick={analyzeProject}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze Project'
                      )}
                    </Button>
                    <span className="text-sm text-gray-500">This will display the analysis results below</span>
                  </div>
                </FormItem>
              )}
            />

            {analysis && (
              <div className="rounded-lg border bg-card p-4 text-card-foreground">
                <h3 className="font-semibold mb-2">Project Analysis</h3>
                <p className="text-sm whitespace-pre-wrap">{analysis}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" className="w-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quote Request'
                )}
              </Button>
              <span className="text-sm text-gray-500">This will analyze and email the results to you</span>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}