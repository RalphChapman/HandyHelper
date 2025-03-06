import type { Express } from "express";
import multer from "multer";
import path from "path";
import express from "express";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertBookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification } from "./utils/email";
import { setupAuth } from "./auth";

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
      console.log("[API] Creating new quote request");
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
        console.log("[API] Sending email notification for quote request");
        await sendQuoteNotification({
          ...newQuoteRequest,
          serviceName: service.name
        });
      } catch (emailError) {
        console.error("[API] Failed to send email notification:", emailError);
        //Consider logging the error more robustly, perhaps to a dedicated error logging service.
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
      console.log("[API] Creating new booking");
      const booking = insertBookingSchema.parse(req.body);
      const service = await storage.getService(booking.serviceId);

      if (!service) {
        console.log(`[API] Service not found: ${booking.serviceId}`);
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const newBooking = await storage.createBooking(booking);
      console.log(`[API] Successfully created booking #${newBooking.id}`);
      res.json(newBooking);
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
}