import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Service } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface Project {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  comment: string;
  customerName: string;
  date: string;
  serviceId: number;
}

export default function Projects() {
  const params = useParams();
  const serviceId = parseInt(params.serviceId as string);

  const { data: service, isLoading: serviceLoading } = useQuery<Service>({
    queryKey: ["/api/services", serviceId],
    queryFn: async () => {
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch service: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", serviceId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?serviceId=${serviceId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      return response.json();
    },
  });

  if (serviceLoading || projectsLoading) {
    return (
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{service?.name} Projects</h1>
        <p className="text-gray-600 mb-8">Customer projects and testimonials</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((project) => (
            <div key={project.id} className="overflow-hidden rounded-lg shadow-lg">
              <div className="relative h-64">
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 italic mb-2">"{project.comment}"</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">{project.customerName}</span>
                    <span className="text-gray-500">{project.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
