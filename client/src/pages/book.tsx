import { useState, useEffect } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm({
    resolver: zodResolver(insertBookingSchema),
    defaultValues: {
      serviceId: 19, // General Home Maintenance
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      appointmentDate: new Date().toISOString(),
      notes: "",
    },
  });
  
  // Get the currently selected date from the form
  const selectedDate = new Date(form.watch("appointmentDate"));

  // Fetch available time slots from the server
  const { data: availableTimeSlotsResponse = [], isLoading: timeSlotsLoading, refetch: refetchTimeSlots } = useQuery<any>({
    queryKey: ["/api/calendar/available-slots", selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateString = selectedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const response = await fetch(`/api/calendar/available-slots?date=${dateString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available time slots');
      }
      const data = await response.json();
      return data;
    },
    enabled: true,
  });
  
  // Extract time slots from the response (handling both array and object formats)
  const availableTimeSlots = Array.isArray(availableTimeSlotsResponse) 
    ? availableTimeSlotsResponse 
    : (availableTimeSlotsResponse?.slots || []);

  // Generate formatted time slots from the available slots
  const getTimeSlots = (slots: Date[], date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    // If no slots are available from the API, fall back to business hours
    if (!slots || slots.length === 0) {
      return BUSINESS_HOURS.map(hour => {
        const timeSlot = new Date(date);
        timeSlot.setHours(hour, 0, 0, 0);
        
        // If it's today, disable past time slots
        const isPast = isToday && timeSlot < today;
        
        return {
          time: timeSlot,
          label: format(timeSlot, "h:mm a"),
          disabled: isPast
        };
      });
    }
    
    // Format the available slots from the API
    return slots.map(slot => {
      const timeSlot = new Date(slot);
      // If it's today, disable past time slots
      const isPast = isToday && timeSlot < today;
      
      return {
        time: timeSlot,
        label: format(timeSlot, "h:mm a"),
        disabled: isPast
      };
    });
  };

  const timeSlots = getTimeSlots(availableTimeSlots, selectedDate);
  
  // When the selected date changes, refetch the available slots
  useEffect(() => {
    if (selectedDate) {
      refetchTimeSlots();
    }
  }, [selectedDate, refetchTimeSlots]);

  async function onSubmit(formData: any) {
    setIsSubmitting(true);
    try {
      // Ensure serviceId is a number
      const bookingData = {
        ...formData,
        serviceId: Number(formData.serviceId),
        // Ensure notes is empty string if null
        notes: formData.notes || "",
        // Ensure appointmentDate is ISO string
        appointmentDate: new Date(formData.appointmentDate).toISOString()
      };

      console.log("Submitting booking data:", bookingData);

      const response = await apiRequest("POST", "/api/bookings", bookingData);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to submit booking: ${response.status} ${response.statusText}`);
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
                            newDate.setMinutes(0);
                            newDate.setSeconds(0);
                            newDate.setMilliseconds(0);
                            field.onChange(newDate.toISOString());
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </FormControl>

                    {/* Time Slots */}
                    <div className="space-y-4">
                      {timeSlotsLoading ? (
                        <div className="text-center p-6">
                          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2 text-primary" />
                          <p className="text-muted-foreground">Checking calendar availability...</p>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center p-6 border rounded-md bg-muted/20">
                          <p className="text-muted-foreground">No available time slots for this date. Please select another date.</p>
                        </div>
                      ) : (
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
                      )}
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