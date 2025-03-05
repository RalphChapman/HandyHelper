import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Link } from "wouter";
import type { Service } from "@shared/schema";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-t-lg">
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-24 h-24 object-contain"
          />
        </div>
        <CardTitle className="mt-4">{service.name}</CardTitle>
        <CardDescription>{service.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{service.description}</p>

        {/* Rating Stars */}
        <div className="flex items-center mb-2">
          {Array.from({ length: service.rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        {/* Customer Review */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm italic text-gray-600 mb-2">"{service.review}"</p>
          <p className="text-sm font-medium text-gray-700">- {service.reviewAuthor}</p>
        </div>

        <Link href={`/quote?service=${service.id}`}>
          <Button className="w-full">Request Quote</Button>
        </Link>
      </CardContent>
    </Card>
  );
}