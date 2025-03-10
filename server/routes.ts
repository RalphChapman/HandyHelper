import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import multer from "multer";
import path from "path";
import express from "express";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertBookingSchema, insertTestimonialSchema, insertServiceProviderSchema, insertReviewSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification, sendBookingConfirmation } from "./utils/email";
import { setupAuth } from "./auth";
import { analyzeProjectDescription, estimateProjectCost } from "./utils/grok";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload only images"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Admin privileges required." });
  }

  next();
};

export async function registerRoutes(app: Express) {
  // Initialize storage before registering routes
  await storage.initialize();

  // Set up authentication
  setupAuth(app);

  // Create uploads directory if it doesn't exist
  const fs = await import("fs");
  if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
  }

  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));

  // Testimonial routes
  app.post("/api/testimonials", async (req, res) => {
    try {
      console.log("[API] Creating new testimonial");
      const testimonial = insertTestimonialSchema.parse(req.body);
      const service = await storage.getService(testimonial.serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${testimonial.serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const newTestimonial = await storage.createTestimonial(testimonial);
      console.log(`[API] Successfully created testimonial from ${newTestimonial.authorName}`);
      res.status(201).json(newTestimonial);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid testimonial data:", error.errors);
        res.status(400).json({ message: "Invalid testimonial data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating testimonial:", error);
      res.status(500).json({ message: "Failed to create testimonial", error: (error as Error).message });
    }
  });

  app.get("/api/testimonials", async (req, res) => {
    try {
      const approved = req.query.approved === 'true' ? true : req.query.approved === 'false' ? false : undefined;
      console.log(`[API] Fetching testimonials${approved !== undefined ? ` (approved: ${approved})` : ''}`);
      const testimonials = await storage.getTestimonials(approved);
      console.log(`[API] Successfully fetched ${testimonials.length} testimonials`);
      res.json(testimonials);
    } catch (error) {
      console.error("[API] Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials", error: (error as Error).message });
    }
  });

  app.patch("/api/testimonials/:id/approve", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = req.body;
      console.log(`[API] Updating testimonial #${id} approval status to: ${approved}`);

      const updatedTestimonial = await storage.updateTestimonialApproval(id, approved);
      if (!updatedTestimonial) {
        console.log(`[API] Testimonial not found: ${id}`);
        res.status(404).json({ message: "Testimonial not found" });
        return;
      }

      console.log(`[API] Successfully updated testimonial #${id}`);
      res.json(updatedTestimonial);
    } catch (error) {
      console.error("[API] Error updating testimonial:", error);
      res.status(500).json({ message: "Failed to update testimonial", error: (error as Error).message });
    }
  });

  // Services routes
  app.get("/api/services", async (_req, res) => {
    try {
      console.log("[API] Fetching services");
      const services = await storage.getServices();
      console.log(`[API] Successfully fetched ${services.length} services`);
      res.json(services);
    } catch (error) {
      console.error("[API] Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services", error: (error as Error).message });
    }
  });

  // Quote requests routes
  app.post("/api/quote-requests", async (req, res) => {
    try {
      console.log("[API] Creating new quote request with data:", req.body);
      const quoteRequest = insertQuoteRequestSchema.parse(req.body);
      const service = await storage.getService(quoteRequest.serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${quoteRequest.serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const newQuoteRequest = await storage.createQuoteRequest(quoteRequest);

      // Send email notification
      try {
        console.log("[API] Sending email notification for quote request with data:", {
          ...newQuoteRequest,
          serviceName: service.name,
          email: quoteRequest.email,
          description: quoteRequest.description,
          analysis: req.body.analysis
        });

        await sendQuoteNotification({
          ...newQuoteRequest,
          serviceName: service.name,
          email: quoteRequest.email,
          description: quoteRequest.description,
          analysis: req.body.analysis
        });
        console.log("[API] Email notification sent successfully");
      } catch (emailError) {
        console.error("[API] Failed to send email notification:", emailError);
      }

      console.log(`[API] Successfully created quote request #${newQuoteRequest.id}`);
      res.status(201).json(newQuoteRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid quote request data:", error.errors);
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating quote request:", error);
      res.status(500).json({ message: "Failed to create quote request", error: (error as Error).message });
    }
  });

  app.get("/api/quote-requests", async (_req, res) => {
    try {
      console.log("[API] Fetching quote requests");
      const quoteRequests = await storage.getQuoteRequests();
      console.log(`[API] Successfully fetched ${quoteRequests.length} quote requests`);
      res.json(quoteRequests);
    } catch (error) {
      console.error("[API] Error fetching quote requests:", error);
      res.status(500).json({ message: "Failed to fetch quote requests", error: (error as Error).message });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      console.log("[API] Creating new booking with data:", req.body);
      const booking = insertBookingSchema.parse(req.body);
      const service = await storage.getService(booking.serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${booking.serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      // Create calendar event first to check for conflicts
      try {
        await createCalendarEvent({
          ...booking,
          serviceName: service.name
        });
      } catch (calendarError: any) {
        if (calendarError.message === 'Time slot is already booked') {
          res.status(409).json({ message: "This time slot is already booked. Please select a different time." });
          return;
        }
        console.error("[API] Calendar error:", calendarError);
        // Continue with booking creation even if calendar fails
      }

      const newBooking = await storage.createBooking(booking);
      console.log(`[API] Successfully created booking #${newBooking.id}`);

      // Send email confirmation
      try {
        await sendBookingConfirmation({
          ...newBooking,
          serviceName: service.name
        });
        console.log("[API] Booking confirmation email sent");
      } catch (emailError) {
        console.error("[API] Failed to send booking confirmation email:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json(newBooking);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid booking data:", error.errors);
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking", error: (error as Error).message });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      const email = req.query.email as string;
      console.log(`[API] Fetching bookings${email ? ` for email: ${email}` : ""}`);
      const bookings = email
        ? await storage.getBookingsByEmail(email)
        : await storage.getBookings();
      console.log(`[API] Successfully fetched ${bookings.length} bookings`);
      res.json(bookings);
    } catch (error) {
      console.error("[API] Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings", error: (error as Error).message });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const serviceId = parseInt(req.query.serviceId as string);
      console.log(`[API] Fetching projects for service ${serviceId}`);
      const projects = await storage.getProjects(serviceId);
      console.log(`[API] Successfully fetched ${projects.length} projects`);
      res.json(projects);
    } catch (error) {
      console.error("[API] Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: (error as Error).message });
    }
  });

  app.post("/api/projects", upload.single("image"), async (req, res) => {
    try {
      console.log("[API] Creating new project");
      const { title, description, comment, customerName, serviceId, date } = req.body;

      if (!req.file) {
        res.status(400).json({ message: "No image file uploaded" });
        return;
      }

      // Create the image URL
      const imageUrl = `/uploads/${req.file.filename}`;

      // Validate service exists
      const service = await storage.getService(parseInt(serviceId));
      if (!service) {
        console.log(`[API] Service not found: ${serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const project = {
        title,
        description,
        imageUrl,
        comment,
        customerName,
        date,
        serviceId: parseInt(serviceId)
      };

      const newProject = await storage.createProject(project);
      console.log(`[API] Successfully created project #${newProject.id}`);
      res.status(201).json(newProject);
    } catch (error) {
      console.error("[API] Error creating project:", error);
      res.status(500).json({ message: "Failed to create project", error: (error as Error).message });
    }
  });

  // Individual service route
  app.get("/api/services/:id", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`[API] Fetching service ${serviceId}`);
      const service = await storage.getService(serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      console.log(`[API] Successfully fetched service: ${service.name}`);
      res.json(service);
    } catch (error) {
      console.error("[API] Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service", error: (error as Error).message });
    }
  });

  // Service Provider routes
  app.post("/api/service-providers", async (req, res) => {
    try {
      console.log("[API] Creating new service provider");
      const provider = insertServiceProviderSchema.parse(req.body);
      const newProvider = await storage.createServiceProvider(provider);
      console.log(`[API] Successfully created service provider: ${newProvider.name}`);
      res.status(201).json(newProvider);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid service provider data:", error.errors);
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating service provider:", error);
      res.status(500).json({ message: "Failed to create service provider", error: (error as Error).message });
    }
  });

  app.get("/api/service-providers", async (_req, res) => {
    try {
      console.log("[API] Fetching service providers");
      const providers = await storage.getServiceProviders();
      console.log(`[API] Successfully fetched ${providers.length} service providers`);
      res.json(providers);
    } catch (error) {
      console.error("[API] Error fetching service providers:", error);
      res.status(500).json({ message: "Failed to fetch service providers", error: (error as Error).message });
    }
  });

  app.get("/api/service-providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API] Fetching service provider ${id}`);
      const provider = await storage.getServiceProvider(id);

      if (!provider) {
        console.log(`[API] Service provider not found: ${id}`);
        res.status(404).json({ message: "Service provider not found" });
        return;
      }

      console.log(`[API] Successfully fetched service provider: ${provider.name}`);
      res.json(provider);
    } catch (error) {
      console.error("[API] Error fetching service provider:", error);
      res.status(500).json({ message: "Failed to fetch service provider", error: (error as Error).message });
    }
  });

  app.get("/api/services/:id/providers", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`[API] Fetching service providers for service ${serviceId}`);
      const providers = await storage.getServiceProvidersForService(serviceId);
      console.log(`[API] Successfully fetched ${providers.length} service providers for service ${serviceId}`);
      res.json(providers);
    } catch (error) {
      console.error("[API] Error fetching service providers:", error);
      res.status(500).json({ message: "Failed to fetch service providers", error: (error as Error).message });
    }
  });

  // Review routes
  app.post("/api/reviews", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to leave a review" });
      }

      console.log("[API] Creating new review");
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        userId: req.user?.id
      });

      // Verify service exists
      const service = await storage.getService(reviewData.serviceId);
      if (!service) {
        console.log(`[API] Service not found: ${reviewData.serviceId}`);
        return res.status(404).json({ message: "Service not found" });
      }

      const newReview = await storage.createReview(reviewData);
      console.log(`[API] Successfully created review for service ${service.name}`);
      res.status(201).json(newReview);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[API] Invalid review data:", error.errors);
        res.status(400).json({ message: "Invalid review data", errors: error.errors });
        return;
      }
      console.error("[API] Error creating review:", error);
      res.status(500).json({ message: "Failed to create review", error: (error as Error).message });
    }
  });

  app.get("/api/reviews", async (req, res) => {
    try {
      console.log("[API] Fetching reviews");
      const reviews = await storage.getReviews();
      console.log(`[API] Successfully fetched ${reviews.length} reviews`);
      res.json(reviews);
    } catch (error) {
      console.error("[API] Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews", error: (error as Error).message });
    }
  });

  app.get("/api/services/:id/reviews", async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      console.log(`[API] Fetching reviews for service ${serviceId}`);
      const reviews = await storage.getReviewsByService(serviceId);
      console.log(`[API] Successfully fetched ${reviews.length} reviews for service ${serviceId}`);
      res.json(reviews);
    } catch (error) {
      console.error("[API] Error fetching service reviews:", error);
      res.status(500).json({ message: "Failed to fetch service reviews", error: (error as Error).message });
    }
  });

  app.patch("/api/reviews/:id/verify", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { verified } = req.body;
      console.log(`[API] Updating review #${id} verification status to: ${verified}`);

      const updatedReview = await storage.updateReviewVerification(id, verified);
      if (!updatedReview) {
        console.log(`[API] Review not found: ${id}`);
        res.status(404).json({ message: "Review not found" });
        return;
      }

      console.log(`[API] Successfully updated review #${id}`);
      res.json(updatedReview);
    } catch (error) {
      console.error("[API] Error updating review:", error);
      res.status(500).json({ message: "Failed to update review", error: (error as Error).message });
    }
  });

  // AI Analysis route
  app.post("/api/analyze-project", async (req, res) => {
    try {
      console.log("[API] Analyzing project description");
      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ message: "Project description is required" });
      }

      const analysis = await analyzeProjectDescription(description);
      console.log("[API] Successfully analyzed project description");
      res.json({ analysis });
    } catch (error) {
      console.error("[API] Error analyzing project:", error);
      res.status(500).json({ message: "Failed to analyze project", error: (error as Error).message });
    }
  });
  // Add this new route along with the existing AI analysis route
  app.post("/api/estimate-cost", async (req, res) => {
    try {
      console.log("[API] Estimating project cost");
      const { description, parameters } = req.body;

      if (!description) {
        return res.status(400).json({ message: "Project description is required" });
      }

      const estimate = await estimateProjectCost(description, parameters);
      console.log("[API] Successfully estimated project cost");
      res.json(estimate);
    } catch (error) {
      console.error("[API] Error estimating project cost:", error);
      res.status(500).json({ message: "Failed to estimate project cost", error: (error as Error).message });
    }
  });

}