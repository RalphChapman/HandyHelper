import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { insertBookingSchema, type Service } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Business hours: 9 AM to 5 PM
const BUSINESS_HOURS = Array.from({ length: 9 }, (_, i) => i + 9); // 9 to 17 (5 PM)

export default function Book() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedService = searchParams.get("service");
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
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      serviceId: 19, // General Home Maintenance
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      appointmentDate: new Date().toISOString(),
      notes: null,
    },
  });

  // Generate available time slots for the selected date
  const getTimeSlots = (selectedDate: Date) => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    return BUSINESS_HOURS.map(hour => {
      const timeSlot = new Date(selectedDate);
      timeSlot.setHours(hour, 0, 0, 0);

      // If it's today, disable past time slots
      const isPast = isToday && timeSlot < today;

      return {
        time: timeSlot,
        label: format(timeSlot, "h:mm a"),
        disabled: isPast
      };
    });
  };

  const selectedDate = new Date(form.watch("appointmentDate"));
  const timeSlots = getTimeSlots(selectedDate);

  async function onSubmit(formData: any) {
    setIsSubmitting(true);
    try {
      console.log("Raw form data:", formData);

      const bookingData = {
        serviceId: Number(formData.serviceId),
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        appointmentDate: formData.appointmentDate,
        notes: formData.notes === "" ? null : formData.notes,
      };

      console.log("Sanitized booking data:", bookingData);

      const response = await apiRequest("POST", "/api/bookings", bookingData);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Server response:", data);
        throw new Error(data.message || `Failed to submit booking: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "Success",
        description: "We'll confirm your appointment soon!",
      });
      setLocation("/");
    } catch (error: any) {
      console.error("Booking submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book a Service</h1>

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
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Date</FormLabel>
                  <div className="space-y-4">
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={new Date(field.value)}
                        onSelect={(date) => {
                          if (date) {
                            // Preserve the time when changing date
                            const newDate = new Date(date);
                            const currentDate = new Date(field.value);
                            newDate.setHours(currentDate.getHours());
                            field.onChange(newDate.toISOString());
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </FormControl>

                    {/* Time Slots */}
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map(({ time, label, disabled }) => (
                        <Button
                          key={label}
                          type="button"
                          variant={time.getTime() === new Date(field.value).getTime() ? "default" : "outline"}
                          className="w-full"
                          disabled={disabled}
                          onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setHours(time.getHours(), 0, 0, 0);
                            field.onChange(newDate.toISOString());
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientName"
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
              name="clientEmail"
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
              name="clientPhone"
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking Appointment...
                </>
              ) : (
                'Book Appointment'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}