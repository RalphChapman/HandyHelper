import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ImageIcon, Loader2, Calendar, Edit, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { ReviewForm } from "@/components/review-form";
import { ReviewsSection } from "@/components/reviews-section";

// Project form schema and component...
const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageFiles: z
    .any()
    .optional()
    .refine(
      (files) => {
        if (!files) return true;
        return files instanceof FileList && files.length > 0;
      },
      "Please select at least one image"
    ),
  comment: z.string().min(1, "Please share your experience"),
  customerName: z.string().min(1, "Name is required"),
  projectDate: z.date({
    required_error: "Please select a project date",
  }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const ProjectForm = ({ isEdit = false, onSubmit, form, selectedProject = null, deleteImageMutation }: {
  isEdit?: boolean;
  onSubmit: any;
  form: any;
  selectedProject?: Project | null;
  deleteImageMutation?: any;
}) => {
  const { toast } = useToast();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(URL.revokeObjectURL);
    };
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Cleanup old preview URLs
    previewUrls.forEach(URL.revokeObjectURL);

    // Create new preview URLs and update state
    const newUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setPreviewUrls(newUrls);

    // Update form value
    form.setValue('imageFiles', files, { shouldValidate: true });
  }, [form, previewUrls]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="imageFiles"
          render={({ field: { ref, ...field } }) => (
            <FormItem>
              <FormLabel>{isEdit ? "Add More Images" : "Project Images"}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  {...field}
                  ref={ref}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </FormControl>

              {/* Show existing images in edit mode */}
              {isEdit && selectedProject?.imageUrls?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Current Images:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProject.imageUrls.map((url, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <img
                          src={url.startsWith('/') ? url : `/uploads/${url}`}
                          alt={`Current ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            if (selectedProject.imageUrls.length <= 1) {
                              toast({
                                title: "Error",
                                description: "Cannot delete the last image. Projects must have at least one image.",
                                variant: "destructive",
                              });
                              return;
                            }
                            deleteImageMutation?.mutate({
                              projectId: selectedProject.id,
                              imageUrl: url,
                            });
                          }}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show selected image previews */}
              {previewUrls.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Selected Images:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {previewUrls.map((url, index) => (
                      <img
                        key={`preview-${index}`}
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              <FormMessage />
            </FormItem>
          )}
        />

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
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Updating..." : "Submitting..."}
              </>
            ) : (
              isEdit ? "Update Project" : "Submit Project"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

const ImageDisplay = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Handle both blob URLs and server paths
  const imageSrc = src.startsWith('blob:') ? src : src.startsWith('/') ? src : `/uploads/${src}`;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        console.error('Image load error:', { src: imageSrc });
        setError(true);
      }}
    />
  );
};

const ImageGallery = ({ images }: { images: string[] }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const nextImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex((selectedImageIndex + 1) % images.length);
  };

  const previousImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {images.map((url, index) => (
          <div
            key={index}
            className="relative cursor-pointer group"
            onClick={() => setSelectedImageIndex(index)}
          >
            <ImageDisplay
              src={url}
              alt={`Project Image ${index + 1}`}
              className="w-full h-32 object-cover rounded-md transition-opacity group-hover:opacity-90"
            />
          </div>
        ))}
      </div>

      <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            {selectedImageIndex !== null && (
              <>
                <div className="relative aspect-video">
                  <ImageDisplay
                    src={images[selectedImageIndex]}
                    alt={`Project Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="absolute inset-y-0 left-0 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full px-2 hover:bg-black/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      previousImage();
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                </div>

                <div className="absolute inset-y-0 right-0 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full px-2 hover:bg-black/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <span className="bg-black/50 text-white px-2 py-1 rounded-md text-sm">
                    {selectedImageIndex + 1} / {images.length}
                  </span>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

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


export default function Projects() {
  const params = useParams();
  const serviceId = parseInt(params.serviceId as string);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();

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

  const updateProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues & { id: number }) => {
      const formData = new FormData();
      formData.append("id", data.id.toString());
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("comment", data.comment);
      formData.append("customerName", data.customerName);
      formData.append("serviceId", serviceId.toString());
      formData.append("projectDate", data.projectDate.toISOString());

      if (data.imageFiles && data.imageFiles.length > 0) {
        Array.from(data.imageFiles).forEach((file) => {
          formData.append("images", file);
        });
      }

      const response = await fetch(`/api/projects/${data.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to update project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", serviceId] });
      toast({
        title: "Success",
        description: "Project updated successfully!",
      });
      setSelectedProject(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ projectId, imageUrl }: { projectId: number; imageUrl: string }) => {
      const response = await fetch(`/api/projects/${projectId}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Failed to delete image");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", serviceId] });
      toast({
        title: "Success",
        description: "Image deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive",
      });
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

  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: selectedProject
      ? {
          title: selectedProject.title,
          description: selectedProject.description,
          comment: selectedProject.comment,
          customerName: selectedProject.customerName,
          projectDate: new Date(selectedProject.projectDate),
        }
      : undefined,
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

      if (data.imageFiles) {
        Array.from(data.imageFiles).forEach((file) => {
          formData.append("images", file);
        });
      }

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
      queryClient.invalidateQueries({ queryKey: ["/api/projects", serviceId] });
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

  async function onEditSubmit(data: ProjectFormValues) {
    if (!selectedProject) return;

    await updateProjectMutation.mutateAsync({
      ...data,
      id: selectedProject.id,
    });
  }


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
              <ProjectForm onSubmit={onSubmit} form={form} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Recent Projects</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {projects?.map((project) => (
                <div key={project.id} className="overflow-hidden rounded-lg shadow-lg">
                  {project.imageUrls && project.imageUrls.length > 0 && (
                    <div className="p-2">
                      <ImageGallery images={project.imageUrls} />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{project.title}</h3>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedProject(project);
                              editForm.reset({
                                title: project.title,
                                description: project.description,
                                comment: project.comment,
                                customerName: project.customerName,
                                projectDate: new Date(project.projectDate),
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Project</DialogTitle>
                          </DialogHeader>
                          <ProjectForm
                            isEdit
                            onSubmit={onEditSubmit}
                            form={editForm}
                            selectedProject={selectedProject}
                            deleteImageMutation={deleteImageMutation}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
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
                <Link href="/auth" className="inline-block mt-2 text-primary hover:underline">
                  Login or Register
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