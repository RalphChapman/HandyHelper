import { pgTable, text, serial, integer, varchar, timestamp, boolean, json, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  imageUrl: text("image_url").notNull(),
  rating: integer("rating").notNull().default(5),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  imageUrls: text("image_urls").array(), // Allow NULL values
  comment: text("comment").notNull(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  projectDate: timestamp("project_date", { mode: 'date', withTimezone: true }).notNull(),
  serviceId: integer("service_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  content: text("content").notNull(),
  authorName: varchar("author_name", { length: 100 }).notNull(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  // serviceName and analysis fields are not in the actual database
  // but we'll keep them in the schema extension for handling in code
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio").notNull(),
  specialties: text("specialties").array().notNull(),
  yearsOfExperience: integer("years_of_experience").notNull(),
  availabilitySchedule: json("availability_schedule").notNull(),
  rating: integer("rating").notNull().default(5),
  profileImage: text("profile_image"),
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  servicesOffered: integer("services_offered").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Customer Supplies table to track materials purchased for customers
export const supplies = pgTable("supplies", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price").notNull(),
  totalPrice: numeric("total_price").notNull(),
  purchaseDate: timestamp("purchase_date").notNull().defaultNow(),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  receiptImageUrl: text("receipt_image_url"),
  paid: boolean("paid").notNull().default(false),
  paymentDate: timestamp("payment_date"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertQuoteRequestSchema = createInsertSchema(quoteRequests)
  .omit({ id: true, email: true, phone: true })
  .extend({
    serviceId: z.coerce.number().int().positive(),
    serviceName: z.string().optional(),
    analysis: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => !!data.email || !!data.phone,
    {
      message: "At least one contact method (email or phone) is required",
      path: ["contactMethod"]
    }
  );
export const insertBookingSchema = createInsertSchema(bookings)
  .omit({ id: true, status: true, confirmed: true })
  .extend({
    serviceId: z.coerce.number().int().positive(),
    clientName: z.string().min(1, "Name is required"),
    clientEmail: z.string().email("Invalid email address"),
    clientPhone: z.string().min(10, "Phone number is required"),
    appointmentDate: z.string().transform((str) => new Date(str)),
    notes: z.string().nullable().optional(),
  });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, approved: true, createdAt: true });
export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({ id: true, rating: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews)
  .omit({ id: true, verified: true, createdAt: true })
  .extend({
    rating: z.number().min(1).max(5),
    review: z.string().min(10, "Review must be at least 10 characters long"),
  });
export const insertProjectSchema = createInsertSchema(projects)
  .omit({ id: true, createdAt: true })
  .extend({
    projectDate: z.string().transform((str) => new Date(str)),
    imageUrls: z.array(z.string()).optional(),
  });

export const insertSupplySchema = createInsertSchema(supplies)
  .omit({ id: true, createdAt: true })
  .extend({
    bookingId: z.number().int().positive().optional(),
    unitPrice: z.string().or(z.number()).transform(val => 
      typeof val === 'string' ? parseFloat(val) : val
    ),
    totalPrice: z.string().or(z.number()).transform(val => 
      typeof val === 'string' ? parseFloat(val) : val
    ),
    purchaseDate: z.string().transform(str => new Date(str)),
    paymentDate: z.string().transform(str => new Date(str)).optional().nullable(),
    paid: z.boolean().default(false),
    receiptImageUrl: z.string().optional().nullable(),
  });

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type QuoteRequest = typeof quoteRequests.$inferSelect;
export type InsertQuoteRequest = z.infer<typeof insertQuoteRequestSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;
export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Supply = typeof supplies.$inferSelect;
export type InsertSupply = z.infer<typeof insertSupplySchema>;