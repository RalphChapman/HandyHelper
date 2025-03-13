import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import type { Booking, QuoteRequest, Testimonial } from "@shared/schema";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { FileText } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
      amount: "$19,050.00",
      file: "/invoices/HambyJobs.pdf",
    },
    {
      id: 2,
      name: "New Fence Invoice",
      date: "December 14, 2024",
      amount: "$11,800.00",
      file: "/invoices/HambyFence.pdf",
    },
  ];

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="quotes">Quote Requests</TabsTrigger>
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