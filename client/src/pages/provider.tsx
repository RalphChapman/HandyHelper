import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ServiceProvider, Service } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Star, Phone, Mail, Clock } from "lucide-react";

export default function ServiceProviderProfile() {
  const params = useParams();
  const providerId = parseInt(params.providerId as string);

  const { data: provider, isLoading: providerLoading } = useQuery<ServiceProvider>({
    queryKey: ["/api/service-providers", providerId],
    queryFn: async () => {
      const response = await fetch(`/api/service-providers/${providerId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch provider: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!provider,
  });

  if (providerLoading || servicesLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <Skeleton className="h-64 w-full mb-4" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-red-600">Service Provider Not Found</h1>
          <Link href="/services">
            <Button variant="link" className="mt-4">
              Return to Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const providerServices = services?.filter(service => 
    provider.servicesOffered.includes(service.id)
  );

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <div className="w-full aspect-square rounded-lg overflow-hidden mb-4">
                  <img
                    src={provider.profileImage || "https://via.placeholder.com/400"}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardTitle>{provider.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-yellow-400">
                    {Array.from({ length: provider.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{provider.yearsOfExperience} years of experience</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{provider.contactPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Bio */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{provider.bio}</p>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Specialties:</h4>
                  <div className="flex flex-wrap gap-2">
                    {provider.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {providerServices?.map((service) => (
                    <Link key={service.id} href={`/services/${service.id}/projects`}>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <h3 className="font-semibold mb-2">{service.name}</h3>
                        <p className="text-sm text-gray-600">{service.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Availability Schedule */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(provider.availabilitySchedule).map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="capitalize">{day}</span>
                      <span className="text-gray-600">{hours.join(", ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
