import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Phone } from "lucide-react";
import { Link } from "wouter";
import type { ServiceProvider } from "@shared/schema";

interface ProviderCardProps {
  provider: ServiceProvider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <img
            src={provider.profileImage || "https://via.placeholder.com/400"}
            alt={provider.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardTitle className="mt-4">{provider.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-2">
          {Array.from({ length: provider.rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-4">{provider.bio}</p>

        <div className="flex items-center space-x-2 text-gray-600 mb-4">
          <Phone className="w-4 h-4" />
          <span className="text-sm">{provider.contactPhone}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {provider.specialties.slice(0, 3).map((specialty, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
            >
              {specialty}
            </span>
          ))}
        </div>

        <Link href={`/providers/${provider.id}`}>
          <Button className="w-full">View Profile</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
