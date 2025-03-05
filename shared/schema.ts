import { pgTable, text, serial, integer, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  imageUrl: text("image_url").notNull(),
  rating: integer("rating").notNull().default(5),
  review: text("review").notNull().default(""),
  reviewAuthor: varchar("review_author", { length: 100 }).notNull().default(""),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  confirmed: boolean("confirmed").notNull().default(false),
});

export const quoteRequests = pgTable("quote_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  serviceId: integer("service_id").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true });

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;