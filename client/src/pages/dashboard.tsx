import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import type { Booking, QuoteRequest } from "@shared/schema";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { 
    data: bookings, 
    isLoading: bookingsLoading,
    isError: bookingsError,
    error: bookingsErrorData
  } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { 
    data: quotes, 
    isLoading: quotesLoading,
    isError: quotesError,
    error: quotesErrorData
  } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  // Error component
  const ErrorDisplay = ({ message }: { message: string }) => (
    <Card className="bg-red-50">
      <CardContent className="p-6 flex items-center gap-2 text-red-700">
        <AlertCircle className="h-5 w-5" />
        <p>{message}</p>
      </CardContent>
    </Card>
  );

  // Loading component
  const LoadingDisplay = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
            <div className="space-y-3">
              <div className="h-4 w-[200px] bg-slate-200 rounded"></div>
              <div className="h-4 w-[150px] bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Handle global errors
  if (bookingsError && quotesError) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <ErrorDisplay message="Failed to load dashboard data. Please try again later." />
        </div>
      </div>
    );
  }

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
              {bookingsError ? (
                <ErrorDisplay message="Failed to load bookings. Please try again later." />
              ) : bookingsLoading ? (
                <LoadingDisplay />
              ) : bookings?.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No bookings found.
                  </CardContent>
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
                        <p className="flex items-center gap-2">
                          <span className="font-semibold">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                            booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </p>
                        <p><span className="font-semibold">Name:</span> {booking.clientName}</p>
                        <p><span className="font-semibold">Phone:</span> {booking.clientPhone}</p>
                        {booking.notes && (
                          <p><span className="font-semibold">Notes:</span> {booking.notes}</p>
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
              {quotesError ? (
                <ErrorDisplay message="Failed to load quote requests. Please try again later." />
              ) : quotesLoading ? (
                <LoadingDisplay />
              ) : quotes?.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No quote requests found.
                  </CardContent>
                </Card>
              ) : (
                quotes?.map((quote) => (
                  <Card key={quote.id}>
                    <CardHeader>
                      <CardTitle>Quote Request #{quote.id}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><span className="font-semibold">Service ID:</span> {quote.serviceId}</p>
                        <p><span className="font-semibold">Name:</span> {quote.name}</p>
                        <p><span className="font-semibold">Phone:</span> {quote.phone}</p>
                        <p><span className="font-semibold">Address:</span> {quote.address}</p>
                        <p><span className="font-semibold">Description:</span> {quote.description}</p>
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