import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import type { Booking, QuoteRequest, Testimonial, Supply } from "@shared/schema";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { FileText, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false);
  const [filterClient, setFilterClient] = useState("");

  // Supply form schema
  const supplyFormSchema = z.object({
    clientName: z.string().min(1, "Client name is required"),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
    totalPrice: z.coerce.number(),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    invoiceNumber: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  });

  type SupplyFormValues = z.infer<typeof supplyFormSchema>;

  // Initialize form
  const form = useForm<SupplyFormValues>({
    resolver: zodResolver(supplyFormSchema),
    defaultValues: {
      clientName: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      purchaseDate: format(new Date(), "yyyy-MM-dd"),
      invoiceNumber: "",
      notes: "",
    },
  });

  // Watch quantity and unit price for calculating total price
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  // Update total price when quantity or unit price changes
  form.setValue("totalPrice", quantity * unitPrice);

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: quotes } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
    enabled: isAdmin,
  });
  
  // Query supplies
  const { data: supplies, isLoading } = useQuery<Supply[]>({
    queryKey: ["/api/supplies"],
    throwOnError: false,
  });

  // Query filtered supplies
  const { data: filteredSupplies, isLoading: isLoadingFiltered } = useQuery<Supply[]>({
    queryKey: ["/api/supplies/client", filterClient],
    queryFn: () => apiRequest<Supply[]>(`/api/supplies/client`, {
      method: "GET",
      headers: {
        'Client-Name': encodeURIComponent(filterClient)
      }
    }),
    enabled: !!filterClient && filterClient.trim().length > 0,
    throwOnError: false,
  });

  // Create supply mutation
  const createSupplyMutation = useMutation({
    mutationFn: (data: SupplyFormValues) => {
      return apiRequest<Supply>("/api/supplies", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Supply added",
        description: "The supply has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      if (filterClient && filterClient.trim() !== '') {
        queryClient.invalidateQueries({ queryKey: ["/api/supplies/client", filterClient] });
      }
      setIsAddSupplyOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add supply: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update payment status mutation
  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ id, paid, paymentMethod }: { id: number; paid: boolean; paymentMethod?: string }) => {
      return apiRequest<Supply>(`/api/supplies/${id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ paid, paymentMethod }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment status updated",
        description: "The payment status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/supplies"] });
      if (filterClient && filterClient.trim() !== '') {
        queryClient.invalidateQueries({ queryKey: ["/api/supplies/client", filterClient] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission
  function onSubmit(data: SupplyFormValues) {
    createSupplyMutation.mutate(data);
  }

  // Handle marking as paid
  function handleMarkAsPaid(supply: Supply) {
    updatePaymentStatusMutation.mutate({
      id: supply.id,
      paid: true,
      paymentMethod: "Credit Card",
    });
  }

  // Handle marking as unpaid
  function handleMarkAsUnpaid(supply: Supply) {
    updatePaymentStatusMutation.mutate({
      id: supply.id,
      paid: false,
    });
  }

  // Get display data
  const displaySupplies = filterClient && filterClient.trim() !== '' && filteredSupplies ? filteredSupplies : supplies;
  const displayLoading = filterClient && filterClient.trim() !== '' ? isLoadingFiltered : isLoading;

  const approveTestimonialMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: number; approved: boolean }) => {
      const response = await fetch(`/api/testimonials/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!response.ok) throw new Error("Failed to update testimonial");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
  });

  const sampleInvoices = [
    {
      id: 1,
      name: "Projects Invoice",
      date: "February 28, 2025",
      amount: "$17,500.00",
      file: "/invoices/SampleInvoice1.pdf",
    },
    {
      id: 2,
      name: "New Fence Invoice",
      date: "December 14, 2024",
      amount: "$11,800.00",
      file: "/invoices/SampleInvoice2.pdf",
    },
    {
      id: 3,
      name: "Miscellanious Projects Invoice",
      date: "February 22, 2025",
      amount: "$410.00",
      file: "/invoices/INV-000001.pdf",
    },
  ];

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="supplies">Supplies</TabsTrigger>
            {/* Bookings and Quotes tabs hidden as requested */}
            {/* <TabsTrigger value="bookings">My Bookings</TabsTrigger> */}
            {/* <TabsTrigger value="quotes">Quote Requests</TabsTrigger> */}
            {isAdmin && (
              <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            )}
            <TabsTrigger value="security">Security Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <div className="grid gap-6">
              {sampleInvoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{invoice.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="ml-4"
                      >
                        <a
                          href={invoice.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          View PDF
                        </a>
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>Date: {invoice.date}</p>
                      <p>Amount: {invoice.amount}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="supplies">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Client Supplies</h2>
                <p className="text-gray-500">Track materials purchased for client projects</p>
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <Input
                    placeholder="Filter by client name"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-64"
                  />
                  {filterClient && (
                    <Button
                      variant="ghost"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setFilterClient("")}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <Button onClick={() => setIsAddSupplyOpen(true)}>
                  Add New Supply
                </Button>
              </div>
            </div>
            
            <Card>
              <CardContent className="p-0">
                {displayLoading ? (
                  <div className="p-4 text-center">Loading supplies...</div>
                ) : !displaySupplies?.length ? (
                  <div className="p-8 text-center text-gray-500">
                    No supplies found. Add a new supply to get started.
                  </div>
                ) : (
                  <div className="divide-y">
                    {displaySupplies.map((supply) => (
                      <div key={supply.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">
                              {supply.description}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              Client: {supply.clientName}
                            </p>
                          </div>
                          <Badge
                            variant={supply.paid ? "default" : "outline"}
                            className={supply.paid ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                          >
                            {supply.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <p className="text-gray-500">Quantity</p>
                            <p className="font-medium">{supply.quantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Unit Price</p>
                            <p className="font-medium">${supply.unitPrice}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total Price</p>
                            <p className="font-medium">${supply.totalPrice}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Purchase Date</p>
                            <p className="font-medium">{format(new Date(supply.purchaseDate), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        
                        {supply.notes && (
                          <div className="mt-3">
                            <p className="text-gray-500 text-sm">Notes</p>
                            <p className="text-sm">{supply.notes}</p>
                          </div>
                        )}
                        
                        <div className="mt-4 flex gap-2 justify-end">
                          {supply.paid ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsUnpaid(supply)}
                              disabled={updatePaymentStatusMutation.isPending}
                            >
                              Mark as Unpaid
                            </Button>
                          ) : (
                            <Button 
                              size="sm"
                              onClick={() => handleMarkAsPaid(supply)}
                              disabled={updatePaymentStatusMutation.isPending}
                              className="flex items-center gap-1"
                            >
                              <DollarSign className="h-4 w-4" /> Mark as Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Dialog open={isAddSupplyOpen} onOpenChange={setIsAddSupplyOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Supply</DialogTitle>
                  <DialogDescription>
                    Enter the details of the supplies purchased for a client's project.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter client name" />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter supply description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="1"
                                placeholder="Enter quantity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price ($)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="totalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              disabled
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter invoice number" />
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
                          <FormLabel>Notes (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter additional notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddSupplyOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={createSupplyMutation.isPending}
                      >
                        {createSupplyMutation.isPending ? "Saving..." : "Save Supply"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Bookings TabContent hidden as requested but kept intact for future restoration */}
          {/* 
          <TabsContent value="bookings">
            <div className="grid gap-6">
              {!bookings?.length ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No bookings found
                  </CardContent>
                </Card>
              ) : (
                bookings?.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle>
                        Appointment on{" "}
                        {format(
                          new Date(booking.appointmentDate),
                          "PPP 'at' p",
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p>Status: {booking.status}</p>
                        <p>Name: {booking.clientName}</p>
                        <p>Phone: {booking.clientPhone}</p>
                        {booking.notes && <p>Notes: {booking.notes}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          */}

          {/* Quotes TabContent hidden as requested but kept intact for future restoration */}
          {/*
          <TabsContent value="quotes">
            <div className="grid gap-6">
              {!quotes?.length ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No quote requests found
                  </CardContent>
                </Card>
              ) : (
                quotes?.map((quote) => (
                  <Card key={quote.id}>
                    <CardHeader>
                      <CardTitle>Quote Request #{quote.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold">Service Details</h3>
                          <p>
                            Service:{" "}
                            {quote.serviceName || `ID: ${quote.serviceId}`}
                          </p>
                          <p>Description: {quote.description}</p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-semibold">Contact Information</h3>
                          <p>Name: {quote.name}</p>
                          <p>Email: {quote.email}</p>
                          <p>Phone: {quote.phone}</p>
                          <p>Address: {quote.address}</p>
                        </div>

                        {quote.analysis && (
                          <div className="space-y-2">
                            <h3 className="font-semibold">Project Analysis</h3>
                            <p className="text-sm text-gray-600">
                              {quote.analysis}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          */}

          {isAdmin && (
            <TabsContent value="testimonials">
              <div className="grid gap-6">
                {!testimonials?.length ? (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No testimonials found
                    </CardContent>
                  </Card>
                ) : (
                  testimonials?.map((testimonial) => (
                    <Card key={testimonial.id}>
                      <CardHeader>
                        <CardTitle>
                          Testimonial from {testimonial.authorName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-gray-600">{testimonial.content}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              Status:{" "}
                              {testimonial.approved ? "Approved" : "Pending"}
                            </p>
                            <Button
                              variant={
                                testimonial.approved ? "outline" : "default"
                              }
                              onClick={() =>
                                approveTestimonialMutation.mutate({
                                  id: testimonial.id,
                                  approved: !testimonial.approved,
                                })
                              }
                              disabled={approveTestimonialMutation.isPending}
                            >
                              {testimonial.approved ? "Unapprove" : "Approve"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <UpdatePasswordForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
