import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Service } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Loader2, Calendar } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { ReviewsSection } from "@/components/reviews-section";
import { useAuth } from "@/hooks/use-auth";
import { useState } from 'react';
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Project {
  id: number;
  title: string;
  description: string;
  imageUrls: string[];
  comment: string;
  customerName: string;
  projectDate: Date;
  serviceId: number;
}

const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageFiles: z.instanceof(FileList).refine((files) => files.length > 0, "Please select at least one image"),
  comment: z.string().min(1, "Please share your experience"),
  customerName: z.string().min(1, "Name is required"),
  projectDate: z.date({
    required_error: "Please select a project date",
  }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function Projects() {
  const params = useParams();
  const serviceId = parseInt(params.serviceId as string);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
      const data = await response.json();
      return data.map((project: any) => ({
        ...project,
        projectDate: project.projectDate ? new Date(project.projectDate) : null,
      }));
    },
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      description: "",
      comment: "",
      customerName: "",
      projectDate: new Date(),
    },
  });

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("comment", data.comment);
      formData.append("customerName", data.customerName);
      formData.append("serviceId", serviceId.toString());
      formData.append("projectDate", data.projectDate.toISOString());

      // Append all selected files
      Array.from(data.imageFiles).forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit project");
      }

      toast({
        title: "Success",
        description: "Your project has been submitted successfully!",
      });
      form.reset();
      setPreviewUrls([]);
    } catch (error: any) {
      console.error("Project submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle file preview
  const handleFileChange = (files: FileList | null) => {
    if (files) {
      const urls = Array.from(files).map(file => URL.createObjectURL(file));
      setPreviewUrls(urls);
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{service?.name} Projects</h1>
            <p className="text-gray-600">Customer projects and testimonials</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>Share Your Project</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Share Your Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Project Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Project Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageFiles"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Project Images</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                onChange(e.target.files);
                                handleFileChange(e.target.files);
                              }}
                              {...field}
                              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            {previewUrls.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {previewUrls.map((url, index) => (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Experience</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="sticky bottom-0 bg-background pt-4">
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Project"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Recent Projects</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {projects?.map((project) => (
                <div key={project.id} className="overflow-hidden rounded-lg shadow-lg">
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {project.imageUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${project.title} - Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    ))}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600 italic mb-2">"{project.comment}"</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{project.customerName}</span>
                        <span className="text-gray-500">
                          {project.projectDate ? format(project.projectDate, "PPP") : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
            {user ? (
              <div className="mb-8">
                <ReviewForm serviceId={serviceId} />
              </div>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">Please log in to leave a review</p>
                <Link href="/auth">
                  <Button variant="link" className="mt-2">
                    Login or Register
                  </Button>
                </Link>
              </div>
            )}
            <ReviewsSection serviceId={serviceId} />
          </div>
        </div>
      </div>
    </div>
  );
}