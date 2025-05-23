import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import type { Service } from "@shared/schema";
import { useState } from "react";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="w-full h-48 overflow-hidden rounded-t-lg">
          <Link href={`/services/${service.id}/projects`}>
            {!imageError ? (
              <img
                src={service.imageUrl}
                alt={service.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </Link>
        </div>
        <CardTitle className="mt-4">{service.name}</CardTitle>
        <CardDescription>{service.category}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{service.description}</p>

        {/* Rating Stars */}
        <div className="flex items-center mb-4">
          {Array.from({ length: service.rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>

        <div className="flex gap-2">
          <Link href={`/services/${service.id}/projects`}>
            <Button variant="outline" className="flex-1">View Projects</Button>
          </Link>
          <Link href={`/quote?service=${service.id}`}>
            <Button className="flex-1">Request Quote</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}