import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import type { Booking, QuoteRequest } from "@shared/schema";

export default function Dashboard() {
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="quotes">Quote Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <div className="grid gap-6">
              {bookingsLoading ? (
                <Card>
                  <CardContent className="p-6">Loading bookings...</CardContent>
                </Card>
              ) : bookings?.length === 0 ? (
                <Card>
                  <CardContent className="p-6">No bookings found.</CardContent>
                </Card>
              ) : (
                bookings?.map((booking) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <CardTitle>
                        Appointment on {format(new Date(booking.appointmentDate), "PPP 'at' p")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Status:</strong> {booking.status}</p>
                        <p><strong>Name:</strong> {booking.clientName}</p>
                        <p><strong>Phone:</strong> {booking.clientPhone}</p>
                        {booking.notes && (
                          <p><strong>Notes:</strong> {booking.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="quotes">
            <div className="grid gap-6">
              {quotesLoading ? (
                <Card>
                  <CardContent className="p-6">Loading quotes...</CardContent>
                </Card>
              ) : quotes?.length === 0 ? (
                <Card>
                  <CardContent className="p-6">No quote requests found.</CardContent>
                </Card>
              ) : (
                quotes?.map((quote) => (
                  <Card key={quote.id}>
                    <CardHeader>
                      <CardTitle>Quote Request #{quote.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Service:</strong> {quote.serviceId}</p>
                        <p><strong>Name:</strong> {quote.name}</p>
                        <p><strong>Phone:</strong> {quote.phone}</p>
                        <p><strong>Address:</strong> {quote.address}</p>
                        <p><strong>Description:</strong> {quote.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
