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
import { createCalendarEvent } from "./utils/calendar";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use the existing uploads directory
      const uploadDir = '/home/runner/workspace/uploads';
      console.log('[API] Upload attempt:', {
        directory: uploadDir,
        originalname: file.originalname,
        mimetype: file.mimetype,
        env: process.env.NODE_ENV,
        directoryExists: fs.existsSync(uploadDir),
        directoryStats: fs.existsSync(uploadDir) ? fs.statSync(uploadDir) : null,
        processInfo: {
          uid: process.getuid?.(),
          gid: process.getgid?.(),
          cwd: process.cwd()
        }
      });

      // First verify directory exists and is writable
      try {
        fs.accessSync(uploadDir, fs.constants.F_OK | fs.constants.W_OK);
        console.log('[API] Verified upload directory access:', uploadDir);

        // Try writing a test file to verify actual write permissions
        const testFile = path.join(uploadDir, '.test-' + Date.now());
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('[API] Successfully verified write permissions');

        cb(null, uploadDir);
      } catch (error) {
        console.error('[API] Upload directory access error:', error);
        console.error('[API] Current process user:', process.getuid?.());
        cb(new Error(`Upload directory ${uploadDir} is not accessible or writable: ${error.message}`));
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
      console.log('[API] Generated filename:', {
        filename,
        originalname: file.originalname,
        extension: ext
      });
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    console.log('[API] Processing upload:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('[API] Rejected file:', file.originalname, '- invalid type:', file.mimetype);
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Add error handling middleware for multer errors
const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API] File upload error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${error.message}` });
  }

  // Handle other types of errors
  if (error.message.includes('Upload directory')) {
    return res.status(500).json({ message: 'Server storage error. Please try again later.' });
  }

  next(error);
};

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
  const uploadDir = '/home/runner/workspace/uploads';

  console.log('[API] Setting up static file serving from:', uploadDir);


  // Serve uploaded files with detailed logging
  app.use("/uploads", express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      console.log('[API] Serving file:', {
        path: filePath,
        requestedFile: path.basename(filePath),
        exists: fs.existsSync(filePath)
      });

      // Set proper MIME types for images
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      } else if (ext === '.webp') {
        res.setHeader('Content-Type', 'image/webp');
      }

      // Add cache control headers
      res.setHeader('Cache-Control', 'public, max-age=31536000');

      // Log response headers for debugging
      console.log('[API] Response headers:', res.getHeaders());
    }
  }));

  // Add error handling for file serving
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
      console.log("[API] Creating new booking with raw data:", req.body);

      // Parse and validate the booking data
      let booking;
      try {
        booking = insertBookingSchema.parse(req.body);
        console.log("[API] Validated booking data:", booking);
      } catch (parseError) {
        console.error("[API] Schema validation error:", parseError);
        return res.status(400).json({
          message: "Invalid booking data",
          errors: parseError instanceof Error ? parseError.message : "Unknown validation error"
        });
      }

      // Verify service exists
      const service = await storage.getService(booking.serviceId);
      if (!service) {
        console.log(`[API] Service not found: ${booking.serviceId}`);
        return res.status(404).json({ message: "Service not found" });
      }

      // Create the booking with explicit data mapping
      try {
        const bookingData = {
          serviceId: booking.serviceId,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          appointmentDate: booking.appointmentDate,
          notes: booking.notes || null,
          status: "pending",
          confirmed: false
        };

        console.log("[API] Attempting to create booking with data:", bookingData);
        const newBooking = await storage.createBooking(bookingData);
        console.log(`[API] Successfully created booking #${newBooking.id}`);

        // Try to create calendar event (but don't fail if calendar fails)
        try {
          await createCalendarEvent({
            ...newBooking,
            serviceName: service.name
          });
          console.log("[API] Calendar event created successfully");
        } catch (calendarError) {
          console.error("[API] Calendar error:", calendarError);
        }

        // Send email confirmation
        try {
          await sendBookingConfirmation({
            ...newBooking,
            serviceName: service.name
          });
          console.log("[API] Booking confirmation email sent");
        } catch (emailError) {
          console.error("[API] Failed to send booking confirmation email:", emailError);
        }

        return res.status(201).json(newBooking);
      } catch (storageError) {
        console.error("[API] Storage error creating booking:", storageError);
        throw storageError;
      }
    } catch (error) {
      console.error("[API] Error in booking creation:", error);
      if (error instanceof Error) {
        console.error("[API] Full error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      return res.status(500).json({
        message: "Failed to create booking",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  app.post("/api/projects", upload.array("images", 10), handleUploadError, async (req, res) => {
    try {
      console.log("[API] Creating new project");
      console.log('[API] Environment details:', {
        NODE_ENV: process.env.NODE_ENV,
        cwd: process.cwd(),
        uploadDir: '/home/runner/workspace/uploads',
        uid: process.getuid?.(),
        gid: process.getgid?.()
      });

      console.log('[API] Request details:', {
        body: req.body,
        files: req.files ?
          (req.files as Express.Multer.File[]).map(f => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            filename: f.filename,
            path: f.path,
            size: f.size,
            exists: fs.existsSync(f.path),
            stats: fs.existsSync(f.path) ? fs.statSync(f.path) : null,
            directoryListing: fs.readdirSync(path.dirname(f.path))
          }))
          : 'No files uploaded'
      });

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        console.log("[API] No images provided");
        return res.status(400).json({ message: "At least one image is required" });
      }

      // Create array of image URLs with verification
      const imageUrls = [];
      for (const file of files) {
        const relativeUrl = `/uploads/${file.filename}`;

        // Verify file was saved successfully and is readable
        try {
          fs.accessSync(file.path, fs.constants.F_OK | fs.constants.R_OK);
          const stats = fs.statSync(file.path);
          console.log('[API] Verified uploaded file:', {
            path: file.path,
            size: stats.size,
            permissions: stats.mode.toString(8),
            directory: path.dirname(file.path),
            directoryContents: fs.readdirSync(path.dirname(file.path))
          });
          imageUrls.push(relativeUrl);
        } catch (error) {
          console.error('[API] Failed to verify uploaded file:', {
            path: file.path,
            error: error.message,
            stackTrace: error.stack
          });
          return res.status(500).json({
            message: "Failed to save uploaded file",
            error: `File ${file.filename} was not saved properly: ${error.message}`
          });
        }
      }

      const projectData = {
        title: req.body.title,
        description: req.body.description,
        imageUrls,
        comment: req.body.comment,
        customerName: req.body.customerName,
        projectDate: new Date(req.body.projectDate),
        serviceId: parseInt(req.body.serviceId)
      };

      console.log('[API] Creating project with data:', JSON.stringify(projectData, null, 2));

      const newProject = await storage.createProject(projectData);
      console.log('[API] Successfully created project:', {
        id: newProject.id,
        imageUrls: newProject.imageUrls,
        uploadedFiles: imageUrls
      });

      res.status(201).json(newProject);
    } catch (error) {
      console.error("[API] Error creating project:", {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      res.status(500).json({ message: "Failed to create project", error: error.message });
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
        return res.status(404).json({ message: ""User not found" });
      }

      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        console.log("[API] Invalid current password for user:", req.user.id);
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);      await storage.updateUserPassword(req.user.id,hashedPassword);

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
  app.patch("/api/projects/:id", upload.array("images", 10), handleUploadError, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`[API] Updating project ${projectId}`);
      console.log`[API] Request body:', req.body);
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
        const filePath = path.resolve(process.cwd(), 'uploads', path.basename(imageUrl));
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
  // Routes should not start their own server - this is handled by index.ts
  // Add diagnostic endpoint for uploads directory
  app.get("/api/diagnostics/uploads", isAdmin, async (req, res) => {
    try {
      const uploadDir = '/home/runner/workspace/uploads';
      console.log('[API] Running upload directory diagnostics');

      const diagnostics = {
        directory: {
          path: uploadDir,
          exists: fs.existsSync(uploadDir),
          stats: fs.existsSync(uploadDir) ? fs.statSync(uploadDir) : null,
          permissions: fs.existsSync(uploadDir) ? fs.statSync(uploadDir).mode.toString(8) : null
        },
        process: {
          uid: process.getuid?.(),
          gid: process.getgid?.(),
          cwd: process.cwd(),
          env: process.env.NODE_ENV
        },
        files: [] as any[]
      };

      // Test write permissions
      try {
        const testFile = path.join(uploadDir, '.test-write-' + Date.now());
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        diagnostics.directory.writeable = true;
      } catch (error) {
        console.error('[API] Write test failed:', error);
        diagnostics.directory.writeable = false;
        diagnostics.directory.writeError = error.message;
      }

      // List all files in directory
      if (diagnostics.directory.exists) {
        try {
          const files = fs.readdirSync(uploadDir);
          diagnostics.files = files.map(filename => {
            const filePath = path.join(uploadDir, filename);
            try {
              const stats = fs.statSync(filePath);
              return {
                name: filename,
                path: filePath,
                size: stats.size,
                permissions: stats.mode.toString(8),
                created: stats.birthtime,
                modified: stats.mtime,
                readable: true,
                error: null
              };
            } catch (error) {
              return {
                name: filename,
                path: filePath,
                error: error.message,
                readable: false
              };
            }
          });
        } catch (error) {
          console.error('[API] Error reading directory:', error);
          diagnostics.readError = error.message;
        }
      }

      console.log('[API] Upload directory diagnostics:', JSON.stringify(diagnostics, null, 2));
      res.json(diagnostics);
    } catch (error) {
      console.error('[API] Error running diagnostics:', error);
      res.status(500).json({ message: "Failed to run diagnostics", error: error.message });
    }
  });

}