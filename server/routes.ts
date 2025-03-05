import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertQuoteRequestSchema } from "@shared/schema";
import { ZodError } from "zod";

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
      res.status(201).json(newQuoteRequest);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
        return;
      }
      throw error;
    }
  });

  return createServer(app);
}
