import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import multer from "multer";
import path from "path";
import express from "express";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertBookingSchema, insertTestimonialSchema, insertServiceProviderSchema, insertReviewSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification, sendBookingConfirmation, sendPasswordResetEmail } from "./utils/email";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { analyzeProjectDescription, estimateProjectCost } from "./utils/grok";
import { randomBytes } from "crypto";
import fs from "fs";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use absolute path that works in both dev and production
      const uploadDir = process.env.REPL_SLUG 
        ? path.join('/home/runner', process.env.REPL_SLUG, 'uploads')
        : path.join(process.cwd(), 'uploads');

      console.log('[API] Upload directory path:', uploadDir);
      console.log('[API] Environment:', {
        REPL_SLUG: process.env.REPL_SLUG,
        cwd: process.cwd(),
        absPath: uploadDir
      });

      // Ensure uploads directory exists with proper permissions
      if (!fs.existsSync(uploadDir)) {
        console.log('[API] Creating uploads directory');
        try {
          fs.mkdirSync(uploadDir, { recursive: true });
          console.log('[API] Created uploads directory successfully');
        } catch (error) {
          console.error('[API] Error creating uploads directory:', error);
          cb(error as Error, uploadDir);
          return;
        }
      }

      // Double-check directory permissions
      try {
        const stats = fs.statSync(uploadDir);
        console.log('[API] Directory permissions:', stats.mode.toString(8));

        // Verify directory is writable
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('[API] Uploads directory is writable');
      } catch (error) {
        console.error('[API] Directory permission error:', error);
        cb(error as Error, uploadDir);
        return;
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const safeName = Buffer.from(file.originalname).toString('base64url');
      const filename = `${file.fieldname}-${uniqueSuffix}-${safeName}${path.extname(file.originalname)}`;
      console.log('[API] Generated filename:', filename);
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    console.log('[API] Processing file upload:', file.originalname, 'mimetype:', file.mimetype);
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      console.log('[API] Rejected file:', file.originalname, '- not an image');
      cb(new Error("Please upload only images"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit per file
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

  // Set up static file serving for uploads
  const uploadDir = process.env.REPL_SLUG 
    ? path.join('/home/runner', process.env.REPL_SLUG, 'uploads')
    : path.join(process.cwd(), 'uploads');

  console.log('[API] Setting up static file serving from:', uploadDir);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('[API] Created uploads directory');
    } catch (error) {
      console.error('[API] Failed to create uploads directory:', error);
    }
  }

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // Add error handling middleware for file serving
  app.use("/uploads", (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[API] Error serving file:', err);
    res.status(500).json({ message: "Error serving file" });
  });


  // Remove existing password reset form route and replace with API-only endpoints
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      console.log("[API] Processing password reset with token");

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Verify token and get user
      const user = await storage.getUserByResetToken(token);
      console.log("[API] Token validation result:", user ? "Valid token" : "Invalid or expired token");

      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date(user.resetTokenExpiry) < new Date()) {
        console.log("[API] Reset token has expired");
        return res.status(400).json({ message: "Reset token has expired. Please request a new password reset." });
      }

      // Update password and clear reset token
      const hashedPassword = await hashPassword(newPassword);
      await storage.updatePasswordAndClearResetToken(user.id, hashedPassword);

      console.log("[API] Password reset successful for user:", user.id);
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("[API] Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("[API] Processing password reset request for email:", email);

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      console.log("[API] Attempting to set password reset token");
      const user = await storage.setPasswordResetToken(email, resetToken, resetTokenExpiry);

      if (!user) {
        console.log("[API] No user found with email:", email);
        // Don't reveal if email exists or not
        return res.json({ message: "If an account exists with that email, you will receive a password reset link" });
      }

      console.log("[API] Reset token set successfully for user:", user.id);

      try {
        // Send reset email
        await sendPasswordResetEmail(email, resetToken);
        console.log("[API] Reset email sent successfully");
      } catch (emailError) {
        console.error("[API] Failed to send reset email:", emailError);
        // Don't expose email sending errors to client
        return res.json({ message: "If an account exists with that email, you will receive a password reset link" });
      }

      res.json({ message: "If an account exists with that email, you will receive a password reset link" });
    } catch (error) {
      console.error("[API] Error processing forgot password request:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

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

      // Create the quote request with contact information
      const newQuoteRequest = await storage.createQuoteRequest({
        ...quoteRequest,
        contactInfo: {
          name: quoteRequest.name,
          email: quoteRequest.email,
          phone: quoteRequest.phone,
          address: quoteRequest.address
        }
      });

      // Send email notification
      try {
        console.log("[API] Sending email notification for quote request");
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

  app.post("/api/projects", upload.array("images", 10), async (req, res) => {
    try {
      console.log("[API] Creating new project with data:", {
        body: req.body,
        files: req.files ? req.files.map(file => ({
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size
        })) : 'No files uploaded'
      });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        console.log("[API] No images provided");
        return res.status(400).json({ message: "At least one image is required" });
      }

      // Create array of image URLs
      const imageUrls = files.map(file => `/uploads/${file.filename}`);

      // Validate service exists
      const service = await storage.getService(parseInt(req.body.serviceId));
      if (!service) {
        console.log(`[API] Service not found: ${req.body.serviceId}`);
        return res.status(404).json({ message: "Service not found" });
      }

      // Parse and validate the project date
      let projectDate: Date;
      try {
        projectDate = new Date(req.body.projectDate);
        if (isNaN(projectDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        console.error("[API] Invalid project date:", req.body.projectDate);
        return res.status(400).json({ message: "Invalid project date format" });
      }

      const projectData = {
        title: req.body.title,
        description: req.body.description,
        imageUrls,
        comment: req.body.comment,
        customerName: req.body.customerName,
        projectDate,
        serviceId: parseInt(req.body.serviceId)
      };

      console.log("[API] Creating project with data:", JSON.stringify(projectData, null, 2));

      try {
        const newProject = await storage.createProject(projectData);
        console.log(`[API] Successfully created project #${newProject.id}`);
        res.status(201).json(newProject);
      } catch (storageError) {
        console.error("[API] Storage error creating project:", storageError);
        if (storageError instanceof Error) {
          console.error("[API] Storage error stack:", storageError.stack);
        }
        throw storageError;
      }
    } catch (error) {
      console.error("[API] Error creating project:", error);
      if (error instanceof Error) {
        console.error("[API] Error stack:", error.stack);
      }
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
        return res.status(401).json({ message: "You must be logged in to leavea review" });
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

  app.post("/api/update-password", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("[API] Password update request for user:", req.user?.id);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        console.log("[API] Missing password fields");
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Verify current password      const user = await storage.getUser(req.user.id);
      if (!user) {
        console.log("[API] User not found:", req.user.id);
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        console.log("[API] Invalid current password for user:", req.user.id);
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user.id, hashedPassword);

      console.log("[API] Password updated successfully for user:", req.user?.id);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("[API] Error updating password:", error);
      res.status(500).json({ message: "Failed to update password", error: (error as Error).message });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      console.log("[API] Processing password reset request for email:", email);

      if (!email) {
        console.log("[API] Missing email in request");
        return res.status(40).json({ message: "Email is required" });
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      console.log("[API] Attempting to set password reset token");
      const user = await storage.setPasswordResetToken(email, resetToken, resetTokenExpiry);

      if (!user) {
        console.log("[API] No user found with email:", email);
        // Don't reveal if email exists or not
        return res.json({ message: "If an account exists with that email, you will receive a password reset link" });
      }

      console.log("[API] Reset token set successfully for user:", user.id);

      try {
        // Send reset email
        console.log("[API] Attempting to send password reset email");
        await sendPasswordResetEmail(email, resetToken);
        console.log("[API] Password reset email sent successfully");
      } catch (emailError) {
        console.error("[API] Error sending password reset email:", emailError);
        // If email fails, clear the reset token
        await storage.updatePasswordAndClearResetToken(user.id, user.password);
        throw emailError;
      }

      res.json({ message: "If an account exists with that email, you will receive a password reset link" });
    } catch (error) {
      console.error("[API] Error in forgot password:", error);
      if (error instanceof Error) {
        console.error("[API] Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });



  app.patch("/api/projects/:id", upload.array("images", 10), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`[API] Updating project ${projectId}`);
      console.log('[API] Request body:', req.body);
      console.log('[API] Files:', req.files);

      // Verify project exists
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        console.log(`[API] Project not found: ${projectId}`);
        return res.status(404).json({ message: "Project not found" });
      }

      // Parse and validate the project date
      let projectDate: Date;
      try {
        projectDate = new Date(req.body.projectDate);
        if (isNaN(projectDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        console.error("[API] Invalid project date:", req.body.projectDate);
        return res.status(400).json({ message: "Invalid project date format" });
      }

      const files = req.files as Express.Multer.File[];

      // Handle image URLs      let imageUrls = existingProject.imageUrls || [];

      // Add new image URLs if files were uploaded
      if (files && files.length > 0) {
        const newImageUrls = files.map(file => `/uploads/${file.filename}`);
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      console.log('[API] Image URLs to save:', imageUrls);

      const projectData = {
        title: req.body.title,
        description: req.body.description,
        imageUrls: imageUrls,
        comment: req.body.comment,
        customerName: req.body.customerName,
        projectDate: projectDate,
        serviceId: parseInt(req.body.serviceId)
      };

      console.log('[API] Project data for update:', JSON.stringify(projectData, null, 2));

      const updatedProject = await storage.updateProject(projectId, projectData);
      console.log(`[API] Successfully updated project #${updatedProject.id}`);
      res.json(updatedProject);
    } catch (error) {
      console.error("[API] Error updating project:", error);
      res.status(500).json({ message: "Failed to update project", error: (error as Error).message });
    }
  });

  app.delete("/api/projects/:id/images", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { imageUrl } = req.body;

      console.log(`[API] Deleting image from project ${projectId}:`, imageUrl);

      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log(`[API] Project not found: ${projectId}`);
        return res.status(404).json({ message: "Project not found" });
      }

      // Remove the image URL from the array
      const updatedImageUrls = project.imageUrls.filter(url => url !== imageUrl);

      // Update the project with the new image URLs
      const projectData = {
        ...project,
        imageUrls: updatedImageUrls,
      };

      try {
        // Delete the actual file from the uploads directory
        const filePath = `./uploads${imageUrl}`; 
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[API] Deleted file: ${filePath}`);
        }

        const updatedProject = await storage.updateProject(projectId, projectData);
        console.log(`[API] Successfully updated project #${updatedProject.id}`);
        res.json(updatedProject);
      } catch (storageError) {
        console.error("[API] Error updating project:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("[API] Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image", error: (error as Error).message });
    }
  });
}