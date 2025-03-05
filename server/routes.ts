import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertBookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification } from "./utils/email";

export async function registerRoutes(app: Express) {
  // Services routes
  app.get("/api/services", async (_req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Quote requests routes
  app.post("/api/quote-requests", async (req, res) => {
    try {
      const quoteRequest = insertQuoteRequestSchema.parse(req.body);
      const service = await storage.getService(quoteRequest.serviceId);

      if (!service) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const newQuoteRequest = await storage.createQuoteRequest(quoteRequest);

      // Send email notification
      try {
        await sendQuoteNotification({
          ...newQuoteRequest,
          serviceName: service.name
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      res.status(201).json(newQuoteRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      res.status(500).json({ message: "Failed to create quote request" });
    }
  });

  app.get("/api/quote-requests", async (_req, res) => {
    try {
      const quoteRequests = await storage.getQuoteRequests();
      res.json(quoteRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quote requests" });
    }
  });

  // Booking routes
  app.post("/api/bookings", async (req, res) => {
    try {
      const booking = insertBookingSchema.parse(req.body);
      const service = await storage.getService(booking.serviceId);

      if (!service) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const newBooking = await storage.createBooking(booking);
      res.status(201).json(newBooking);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid booking data", errors: error.errors });
        return;
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      const email = req.query.email as string;
      const bookings = email
        ? await storage.getBookingsByEmail(email)
        : await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  return createServer(app);
}