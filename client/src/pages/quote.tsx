import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertQuoteRequestSchema, type Service, type InsertQuoteRequest } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { useAuth } from "@/hooks/use-auth";

function extractLocationFromAddress(address: string): string {
  try {
    if (!address) return "Charleston, South Carolina";
    const match = address.match(/([^,]+),\s*([A-Z]{2})/);
    return match ? `${match[1].trim()}, ${match[2]}` : "Charleston, South Carolina";
  } catch (error) {
    console.error('Error parsing address:', error);
    return "Charleston, South Carolina";
  }
}

export default function Quote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedService = searchParams.get("service");
  const prefilledName = searchParams.get("name");
  const prefilledEmail = searchParams.get("email");
  const prefilledPhone = searchParams.get("phone");
  const prefilledAddress = searchParams.get("address");
  const [analysis, setAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/services");
      const data = await response.json();
      return data;
    }
  });

  const form = useForm<InsertQuoteRequest>({
    resolver: zodResolver(insertQuoteRequestSchema),
    defaultValues: {
      serviceId: preselectedService ? parseInt(preselectedService, 10) : undefined,
      name: prefilledName || user?.username || "",
      email: prefilledEmail || user?.email || "",
      phone: prefilledPhone || "",
      description: "",
      address: prefilledAddress || "",
    },
  });

  useEffect(() => {
    // Set default service to "general" if available
    if (services && !preselectedService) {
      const generalService = services.find(s => 
        s.name.toLowerCase().includes('general')
      );
      if (generalService) {
        form.setValue("serviceId", generalService.id);
      }
    }
    // Handle preselected service if provided
    else if (services && preselectedService) {
      const serviceId = parseInt(preselectedService, 10);
      const service = services.find(s => s.id === serviceId);
      if (service) {
        form.setValue("serviceId", serviceId);
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

  async function onSubmit(data: InsertQuoteRequest) {
    setIsSubmitting(true);
    try {
      // Don't include serviceName as it's not in the database structure
      const response = await apiRequest("POST", "/api/quote-requests", {
        ...data,
        analysis,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Request a Quote</h1>
        <p className="text-gray-600 mb-8">
          Get instant project analysis and cost estimates for your home improvement needs. Our AI-powered system 
          will analyze your project details and provide immediate insights, followed by a detailed quote from our team.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(value) => {
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue)) {
                        field.onChange(numValue);
                      }
                    }}
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
                    <Textarea 
                      {...field} 
                      className="min-h-[100px]" 
                      placeholder="Tell me a little about what project you would like to get more details about..."
                    />
                  </FormControl>
                  <FormMessage />
                  {!field.value && 
                    <p className="text-sm text-amber-600 mt-1">
                      Please describe your project to receive an AI-powered analysis. The more details you provide, the more accurate our estimate will be.
                    </p>
                  }
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
                    <span className="text-sm text-gray-500">Click to get immediate AI analysis of your project</span>
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
              <span className="text-sm text-gray-500">Get a detailed cost estimate and find local service providers</span>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}