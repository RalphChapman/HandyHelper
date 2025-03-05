import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <Link href={`/quote?service=${service.id}`}>
          <Button className="w-full">Request Quote</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
