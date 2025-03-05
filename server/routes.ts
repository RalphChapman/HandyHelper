import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema, insertBookingSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sendQuoteNotification } from "./utils/email";

export async function registerRoutes(app: Express) {
  app.get("/api/services", async (_req, res) => {
    const services = await storage.getServices();
    res.json(services);
  });

  app.get("/api/services/:id", async (req, res) => {
    const service = await storage.getService(Number(req.params.id));
    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }
    res.json(service);
  });

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
        // Continue processing even if email fails
      }

      res.status(201).json(newQuoteRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      throw error;
    }
  });

  // Get all quote requests
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
      throw error;
    }
  });

  app.get("/api/bookings", async (req, res) => {
    const email = req.query.email as string;
    try {
      const bookings = email
        ? await storage.getBookingsByEmail(email)
        : await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(Number(req.params.id));
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }
    res.json(booking);
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    const { status } = req.body;
    try {
      const booking = await storage.updateBookingStatus(Number(req.params.id), status);
      if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  return createServer(app);
}