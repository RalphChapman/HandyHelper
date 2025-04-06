import path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  Service,
  QuoteRequest,
  Booking,
  User,
  Testimonial,
  ServiceProvider,
  Review,
  Project,
  Supply,
  InsertService,
  InsertQuoteRequest,
  InsertBooking,
  InsertUser,
  InsertTestimonial,
  InsertServiceProvider,
  InsertReview,
  InsertProject,
  InsertSupply,
  bookings,
  quoteRequests,
  services,
  testimonials,
  serviceProviders,
  reviews,
  users,
  projects,
  supplies
} from "@shared/schema";
import { db } from "./db";
import { hashPassword, comparePasswords } from "./auth"; // Import auth functions to ensure consistent hashing

export interface IStorage {
  initialize(): Promise<void>;
  sessionStore: session.Store;
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequests(): Promise<QuoteRequest[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookings(): Promise<Booking[]>;
  getBookingsByEmail(email: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;
  getProjects(serviceId: number): Promise<Project[]>;
  createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  getTestimonials(approved?: boolean): Promise<Testimonial[]>;
  updateTestimonialApproval(id: number, approved: boolean): Promise<Testimonial | undefined>;
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;
  getServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProvidersForService(serviceId: number): Promise<ServiceProvider[]>;
  updateServiceProviderAvailability(id: number, availability: any): Promise<ServiceProvider | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getReviews(): Promise<Review[]>;
  getReviewsByService(serviceId: number): Promise<Review[]>;
  getReviewsByUser(userId: number): Promise<Review[]>;
  updateReviewVerification(id: number, verified: boolean): Promise<Review | undefined>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(): Promise<User[]>;
  validateUserCredentials(username: string, password: string): Promise<User | undefined>;
  updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined>;
  // Add new methods for password reset
  setPasswordResetToken(email: string, resetToken: string, resetTokenExpiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updatePasswordAndClearResetToken(id: number, hashedPassword: string): Promise<User | undefined>;
  getProject(id: number): Promise<Project | undefined>;
  updateProject(id: number, projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
  
  // Customer Supplies related methods
  getSupplies(): Promise<Supply[]>;
  getSuppliesByClient(clientName: string): Promise<Supply[]>;
  getSupply(id: number): Promise<Supply | undefined>;
  createSupply(supply: InsertSupply): Promise<Supply>;
  updateSupply(id: number, supplyData: Partial<Supply>): Promise<Supply | undefined>;
  deleteSupply(id: number): Promise<boolean>;
  updateSupplyPaymentStatus(id: number, paid: boolean, paymentMethod?: string): Promise<Supply | undefined>;
}

export class DatabaseStorage implements IStorage {
  private initialized: boolean = false;
  public sessionStore: session.Store;

  // Initial services data
  private readonly initialServices: InsertService[] = [
    {
      name: "General Home Maintenance",
      description: "Comprehensive home maintenance and repairs including door repairs, window maintenance, gutter cleaning, small fixes, and other miscellaneous tasks to keep your home in top condition.",
      category: "General Repairs",
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      priceRange: "$75 - $200",
      duration: "1-4 hours",
      rating: 4.9
    },
    {
      name: "Landscaping",
      description: "Professional landscaping services including tree trimming, lawn maintenance, garden design, planting, irrigation, and general outdoor maintenance for beautiful, sustainable outdoor spaces.",
      category: "Outdoor",
      imageUrl: "https://images.unsplash.com/photo-1558904541-efa843a96f01?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      priceRange: "$200 - $2000",
      duration: "2 hours - 3 days",
      rating: 4.8
    },
    {
      name: "Plumbing Services",
      description: "Comprehensive plumbing services including repairs, installation, maintenance, drain cleaning, water heater services, and emergency plumbing for residential properties.",
      category: "Plumbing",
      imageUrl: "https://images.unsplash.com/photo-1606818614583-a5664bfe144a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      priceRange: "$100 - $500",
      duration: "1-8 hours",
      rating: 4.7
    },
    {
      name: "Fence Installation",
      description: "Expert fence installation services for both residential and commercial properties. Wood, vinyl, aluminum, or chain-link fences - all professionally installed with high-quality materials.",
      category: "Outdoor",
      imageUrl: "https://images.unsplash.com/photo-1626250775550-ba4be7fcc120?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1935&q=80",
      priceRange: "$1500 - $6000",
      duration: "1-3 days",
      rating: 4.9
    }
  ];

  constructor() {
    const MemoryStoreSession = MemoryStore(session);
    this.sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if services table is empty
      const existingServices = await db.select().from(services);
      if (existingServices.length === 0) {
        console.log("Initializing database with default services...");
        
        // Insert default services
        for (const service of this.initialServices) {
          await db.insert(services).values(service);
        }
        
        console.log("Default services created successfully");
      } else {
        console.log("Database already contains services, skipping initialization");
      }

      // Check if admin user exists
      const adminUser = await this.getUserByUsername('admin');
      if (!adminUser) {
        console.log("Creating default admin user...");
        
        // Use bcrypt directly for the default admin user to ensure it works
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log("Admin password hashed with bcrypt format:", hashedPassword.substring(0, 7) + "...");
        
        // Create admin user
        await this.createUser({
          username: 'admin',
          password: hashedPassword,
          email: 'admin@handypro.com',
          role: 'admin'
        });
        
        console.log("Default admin user created successfully with bcrypt password");
      } else {
        console.log("Admin user already exists, skipping creation");
      }

      this.initialized = true;
      console.log("Database storage initialization completed");
    } catch (error) {
      console.error("Failed to initialize database storage:", error);
      throw error;
    }
  }

  async getServices(): Promise<Service[]> {
    try {
      const allServices = await db.select().from(services);
      return allServices;
    } catch (error) {
      console.error("Error fetching services:", error);
      throw error;
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      return service;
    } catch (error) {
      console.error(`Error fetching service ${id}:`, error);
      throw error;
    }
  }

  async createService(service: InsertService): Promise<Service> {
    try {
      const [createdService] = await db.insert(services).values(service).returning();
      return createdService;
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    try {
      const [createdRequest] = await db
        .insert(quoteRequests)
        .values({ ...request })
        .returning();
      return createdRequest;
    } catch (error) {
      console.error("Error creating quote request:", error);
      throw error;
    }
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    try {
      console.log('[Storage] Fetching all quote requests');
      const allRequests = await db
        .select()
        .from(quoteRequests)
        .orderBy(quoteRequests.id, 'desc');
      console.log(`[Storage] Found ${allRequests.length} quote requests`);
      return allRequests;
    } catch (error) {
      console.error("[Storage] Error fetching quote requests:", error);
      throw error;
    }
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      console.log('Creating booking:', booking);
      const [createdBooking] = await db
        .insert(bookings)
        .values({ 
          ...booking, 
          status: booking.status || 'scheduled' 
        })
        .returning();
      
      console.log('Booking created successfully:', createdBooking);
      return createdBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    try {
      console.log('Fetching booking:', id);
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, id));
      
      console.log('Booking fetch result:', booking);
      return booking;
    } catch (error) {
      console.error(`Error fetching booking ${id}:`, error);
      throw error;
    }
  }

  async getBookings(): Promise<Booking[]> {
    try {
      console.log('[Storage] Fetching all bookings');
      const allBookings = await db
        .select()
        .from(bookings)
        .orderBy(bookings.appointmentDate, 'desc');
      
      console.log(`[Storage] Found ${allBookings.length} bookings`);
      return allBookings;
    } catch (error) {
      console.error('[Storage] Error fetching bookings:', error);
      throw error;
    }
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    try {
      console.log('[Storage] Fetching bookings for email:', email);
      const userBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.clientEmail, email))
        .orderBy(bookings.appointmentDate, 'desc');
      
      console.log(`[Storage] Found ${userBookings.length} bookings for ${email}`);
      return userBookings;
    } catch (error) {
      console.error(`[Storage] Error fetching bookings for ${email}:`, error);
      throw error;
    }
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    try {
      console.log('Updating booking status:', id, status);
      const [updatedBooking] = await db
        .update(bookings)
        .set({ status })
        .where(eq(bookings.id, id))
        .returning();
      
      console.log('Booking status updated:', updatedBooking);
      return updatedBooking;
    } catch (error) {
      console.error(`Error updating booking ${id} status:`, error);
      throw error;
    }
  }

  async getProjects(serviceId: number): Promise<Project[]> {
    try {
      console.log('[Storage] Fetching projects for service:', serviceId);
      
      const serviceProjects = await db
        .select()
        .from(projects)
        .where(serviceId > 0 ? eq(projects.serviceId, serviceId) : undefined)
        .orderBy(projects.createdAt, 'desc');
      
      console.log(`[Storage] Found ${serviceProjects.length} projects for service ${serviceId}`);
      return serviceProjects;
    } catch (error) {
      console.error(`[Storage] Error fetching projects for service ${serviceId}:`, error);
      throw error;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    try {
      console.log('Creating project:', project);
      
      // Map project data to database columns using snake_case
      const projectData = {
        title: project.title,
        description: project.description,
        image_urls: project.imageUrls,
        customer_name: project.customerName,
        project_date: new Date(project.projectDate),
        service_id: project.serviceId,
        comment: project.comment
      };
      
      const [createdProject] = await db
        .insert(projects)
        .values({
          ...projectData,
          created_at: new Date()
        })
        .returning();
      
      // Map back to camelCase for the API
      const mappedProject: Project = {
        id: createdProject.id,
        title: createdProject.title,
        description: createdProject.description,
        imageUrls: createdProject.image_urls,
        customerName: createdProject.customer_name,
        projectDate: createdProject.project_date,
        serviceId: createdProject.service_id,
        comment: createdProject.comment,
        createdAt: createdProject.created_at
      };
      
      console.log('Project created successfully:', mappedProject);
      return mappedProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log('[Storage] Creating user:', { ...user, password: '[REDACTED]' });
      
      // Check if username already exists
      const existingUser = await this.getUserByUsername(user.username);
      if (existingUser) {
        throw new Error(`Username ${user.username} already exists`);
      }
      
      // Use bcrypt directly for consistent password hashing
      // (skip hashPassword to avoid scrypt format issues)
      let hashedPassword;
      try {
        const bcrypt = require('bcrypt');
        hashedPassword = await bcrypt.hash(user.password, 10);
        console.log('[Storage] Password hashed with bcrypt format:', hashedPassword.substring(0, 7) + "...");
      } catch (error) {
        console.error('[Storage] Error hashing password with bcrypt, falling back to scrypt:', error);
        hashedPassword = await hashPassword(user.password);
      }
      
      const [createdUser] = await db
        .insert(users)
        .values({
          ...user,
          password: hashedPassword,
          createdAt: new Date()
        })
        .returning();
      
      console.log('[Storage] User created successfully:', { id: createdUser.id, username: createdUser.username });
      
      // Remove password from the returned user
      const { password, ...userWithoutPassword } = createdUser;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('[Storage] Error creating user:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      console.log('[Storage] Fetching user:', id);
      const [user] = await db.select().from(users).where(eq(users.id, id));
      
      if (user) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      console.log('[Storage] Fetching user by username:', username);
      const [user] = await db.select().from(users).where(eq(users.username, username));
      
      if (user) {
        // Do NOT remove password here as it's needed for authentication
        return user;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error fetching user by username ${username}:`, error);
      throw error;
    }
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    try {
      console.log('[Storage] Creating testimonial');
      const [createdTestimonial] = await db
        .insert(testimonials)
        .values({
          ...testimonial,
          approved: false,
          createdAt: new Date()
        })
        .returning();
      
      console.log('[Storage] Testimonial created successfully');
      return createdTestimonial;
    } catch (error) {
      console.error('[Storage] Error creating testimonial:', error);
      throw error;
    }
  }

  async getTestimonials(approved?: boolean): Promise<Testimonial[]> {
    try {
      console.log('[Storage] Fetching testimonials, approved filter:', approved);
      
      let query = db.select().from(testimonials);
      
      if (approved !== undefined) {
        query = query.where(eq(testimonials.approved, approved));
      }
      
      const allTestimonials = await query.orderBy(testimonials.createdAt, 'desc');
      console.log(`[Storage] Found ${allTestimonials.length} testimonials`);
      
      return allTestimonials;
    } catch (error) {
      console.error('[Storage] Error fetching testimonials:', error);
      throw error;
    }
  }

  async updateTestimonialApproval(id: number, approved: boolean): Promise<Testimonial | undefined> {
    try {
      console.log(`[Storage] Updating testimonial ${id} approval status to: ${approved}`);
      const [updatedTestimonial] = await db
        .update(testimonials)
        .set({ approved })
        .where(eq(testimonials.id, id))
        .returning();
      
      console.log('[Storage] Testimonial approval updated successfully');
      return updatedTestimonial;
    } catch (error) {
      console.error(`[Storage] Error updating testimonial ${id} approval:`, error);
      throw error;
    }
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    try {
      console.log('[Storage] Creating service provider');
      const [createdProvider] = await db
        .insert(serviceProviders)
        .values({
          ...provider,
          rating: 0,
          createdAt: new Date()
        })
        .returning();
      
      console.log('[Storage] Service provider created successfully');
      return createdProvider;
    } catch (error) {
      console.error('[Storage] Error creating service provider:', error);
      throw error;
    }
  }

  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    try {
      console.log(`[Storage] Fetching service provider: ${id}`);
      const [provider] = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.id, id));
      
      console.log('[Storage] Service provider fetch result:', provider ? 'Found' : 'Not found');
      return provider;
    } catch (error) {
      console.error(`[Storage] Error fetching service provider ${id}:`, error);
      throw error;
    }
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    try {
      console.log('[Storage] Fetching all service providers');
      const allProviders = await db
        .select()
        .from(serviceProviders)
        .orderBy(serviceProviders.name, 'asc');
      
      console.log(`[Storage] Found ${allProviders.length} service providers`);
      return allProviders;
    } catch (error) {
      console.error('[Storage] Error fetching service providers:', error);
      throw error;
    }
  }

  async getServiceProvidersForService(serviceId: number): Promise<ServiceProvider[]> {
    try {
      console.log(`[Storage] Fetching service providers for service: ${serviceId}`);
      const providers = await db
        .select()
        .from(serviceProviders)
        .where(eq(serviceProviders.serviceId, serviceId))
        .orderBy(serviceProviders.rating, 'desc');
      
      console.log(`[Storage] Found ${providers.length} service providers for service ${serviceId}`);
      return providers;
    } catch (error) {
      console.error(`[Storage] Error fetching service providers for service ${serviceId}:`, error);
      throw error;
    }
  }

  async updateServiceProviderAvailability(id: number, availability: any): Promise<ServiceProvider | undefined> {
    try {
      console.log(`[Storage] Updating service provider ${id} availability`);
      const [updatedProvider] = await db
        .update(serviceProviders)
        .set({ availability })
        .where(eq(serviceProviders.id, id))
        .returning();
      
      console.log('[Storage] Service provider availability updated successfully');
      return updatedProvider;
    } catch (error) {
      console.error(`[Storage] Error updating service provider ${id} availability:`, error);
      throw error;
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      console.log('[Storage] Creating review');
      const [createdReview] = await db
        .insert(reviews)
        .values({
          ...review,
          verified: false,
          createdAt: new Date()
        })
        .returning();
      
      console.log('[Storage] Review created successfully');
      return createdReview;
    } catch (error) {
      console.error('[Storage] Error creating review:', error);
      throw error;
    }
  }

  async getReview(id: number): Promise<Review | undefined> {
    try {
      console.log(`[Storage] Fetching review: ${id}`);
      const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
      console.log('[Storage] Review fetch result:', review ? 'Found' : 'Not found');
      return review;
    } catch (error) {
      console.error(`[Storage] Error fetching review ${id}:`, error);
      throw error;
    }
  }

  async getReviews(): Promise<Review[]> {
    try {
      console.log('[Storage] Fetching all reviews');
      const allReviews = await db
        .select()
        .from(reviews)
        .orderBy(reviews.createdAt, 'desc');
      
      console.log(`[Storage] Found ${allReviews.length} reviews`);
      return allReviews;
    } catch (error) {
      console.error('[Storage] Error fetching reviews:', error);
      throw error;
    }
  }

  async getReviewsByService(serviceId: number): Promise<Review[]> {
    try {
      console.log(`[Storage] Fetching reviews for service: ${serviceId}`);
      const serviceReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.serviceId, serviceId))
        .orderBy(reviews.createdAt, 'desc');
      
      console.log(`[Storage] Found ${serviceReviews.length} reviews for service ${serviceId}`);
      return serviceReviews;
    } catch (error) {
      console.error(`[Storage] Error fetching reviews for service ${serviceId}:`, error);
      throw error;
    }
  }

  async getReviewsByUser(userId: number): Promise<Review[]> {
    try {
      console.log(`[Storage] Fetching reviews by user: ${userId}`);
      const userReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.userId, userId))
        .orderBy(reviews.createdAt, 'desc');
      
      console.log(`[Storage] Found ${userReviews.length} reviews by user ${userId}`);
      return userReviews;
    } catch (error) {
      console.error(`[Storage] Error fetching reviews by user ${userId}:`, error);
      throw error;
    }
  }

  async updateReviewVerification(id: number, verified: boolean): Promise<Review | undefined> {
    try {
      console.log(`[Storage] Updating review ${id} verification status to: ${verified}`);
      const [updatedReview] = await db
        .update(reviews)
        .set({ verified })
        .where(eq(reviews.id, id))
        .returning();
      
      console.log('[Storage] Review verification updated successfully');
      return updatedReview;
    } catch (error) {
      console.error(`[Storage] Error updating review ${id} verification:`, error);
      throw error;
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      console.log('[Storage] Updating user:', id);
      
      // If password is being updated, hash it with bcrypt
      if (data.password) {
        try {
          const bcrypt = require('bcrypt');
          data.password = await bcrypt.hash(data.password, 10);
          console.log('[Storage] Password hashed with bcrypt for user update');
        } catch (error) {
          console.error('[Storage] Error using bcrypt for password update, falling back to scrypt:', error);
          data.password = await hashPassword(data.password);
        }
      }
      
      const [updatedUser] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      
      console.log('[Storage] User updated successfully');
      
      if (updatedUser) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error updating user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log('[Storage] Deleting user:', id);
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      const success = result.length > 0;
      console.log(`[Storage] User deletion ${success ? 'successful' : 'failed'}`);
      return success;
    } catch (error) {
      console.error(`[Storage] Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async listUsers(): Promise<User[]> {
    try {
      console.log('[Storage] Fetching all users');
      const allUsers = await db.select().from(users);
      
      // Remove passwords from all users
      const usersWithoutPasswords = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });
      
      console.log(`[Storage] Found ${usersWithoutPasswords.length} users`);
      return usersWithoutPasswords;
    } catch (error) {
      console.error('[Storage] Error fetching users:', error);
      throw error;
    }
  }

  async validateUserCredentials(username: string, password: string): Promise<User | undefined> {
    try {
      console.log('[Storage] Validating credentials for user:', username);
      
      // Get user with password (getUserByUsername doesn't filter it out)
      const user = await this.getUserByUsername(username);
      
      if (!user) {
        console.log(`[Storage] User ${username} not found`);
        return undefined;
      }
      
      // Compare passwords using the same method as auth.ts
      try {
        const passwordValid = await comparePasswords(password, user.password);
        
        if (!passwordValid) {
          console.log(`[Storage] Password invalid for user ${username}`);
          return undefined;
        }
      } catch (err) {
        console.error(`[Storage] Password comparison error:`, err);
        return undefined;
      }
      
      console.log(`[Storage] Credentials valid for user ${username}`);
      
      // Remove password from the returned user
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      console.error(`[Storage] Error validating credentials for ${username}:`, error);
      throw error;
    }
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<User | undefined> {
    try {
      console.log(`[Storage] Updating password for user ${id}`);
      
      const [updatedUser] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, id))
        .returning();
      
      console.log('[Storage] Password updated successfully');
      
      if (updatedUser) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error updating password for user ${id}:`, error);
      throw error;
    }
  }

  async setPasswordResetToken(email: string, resetToken: string, resetTokenExpiry: Date): Promise<User | undefined> {
    try {
      console.log(`[Storage] Setting password reset token for email: ${email}`);
      
      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        console.log(`[Storage] User with email ${email} not found`);
        return undefined;
      }
      
      // Update user with reset token
      const [updatedUser] = await db
        .update(users)
        .set({
          resetToken,
          resetTokenExpiry
        })
        .where(eq(users.id, user.id))
        .returning();
      
      console.log(`[Storage] Reset token set for user ${user.id}`);
      
      if (updatedUser) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error setting reset token for ${email}:`, error);
      throw error;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      console.log('[Storage] Finding user by reset token');
      
      // Find user with valid token (not expired)
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.resetToken, token),
            // Token is not expired
            // @ts-ignore
            users.resetTokenExpiry > new Date()
          )
        );
      
      console.log(`[Storage] User by reset token: ${user ? 'Found' : 'Not found'}`);
      
      if (user) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error('[Storage] Error finding user by reset token:', error);
      throw error;
    }
  }

  async updatePasswordAndClearResetToken(id: number, password: string): Promise<User | undefined> {
    try {
      console.log(`[Storage] Updating password and clearing reset token for user ${id}`);
      
      // Hash the password with bcrypt before storing it
      let hashedPassword;
      try {
        const bcrypt = require('bcrypt');
        hashedPassword = await bcrypt.hash(password, 10);
        console.log('[Storage] Password hashed with bcrypt for reset:', hashedPassword.substring(0, 7) + "...");
      } catch (error) {
        console.error('[Storage] Error using bcrypt for password reset, falling back to scrypt:', error);
        hashedPassword = await hashPassword(password);
      }
      
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, id))
        .returning();
      
      console.log('[Storage] Password updated and reset token cleared successfully');
      
      if (updatedUser) {
        // Remove password from the returned user
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword as User;
      }
      
      return undefined;
    } catch (error) {
      console.error(`[Storage] Error updating password and clearing reset token for user ${id}:`, error);
      throw error;
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    try {
      console.log('[Storage] Fetching project:', id);
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      
      if (project) {
        // Map from snake_case to camelCase
        const mappedProject: Project = {
          id: project.id,
          title: project.title,
          description: project.description,
          imageUrls: project.image_urls,
          customerName: project.customer_name,
          projectDate: project.project_date,
          serviceId: project.service_id,
          comment: project.comment,
          createdAt: project.created_at
        };
        
        console.log('[Storage] Project found:', mappedProject);
        return mappedProject;
      }
      
      console.log('[Storage] Project not found');
      return undefined;
    } catch (error) {
      console.error('[Storage] Error fetching project:', error);
      throw error;
    }
  }

  async updateProject(id: number, projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    try {
      console.log('[Storage] Updating project:', id);
      console.log('[Storage] Update data:', JSON.stringify(projectData, null, 2));

      // First check if project exists
      const existingProject = await this.getProject(id);
      if (!existingProject) {
        throw new Error(`Project with ID ${id} not found`);
      }

      // Create update data with snake_case column names
      const updateData = {
        title: projectData.title,
        description: projectData.description,
        image_urls: projectData.imageUrls,
        comment: projectData.comment,
        customer_name: projectData.customerName,
        project_date: new Date(projectData.projectDate),
        service_id: projectData.serviceId
      };

      console.log('[Storage] Final update data:', JSON.stringify(updateData, null, 2));

      // Update the project
      const [updatedProject] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, id))
        .returning();

      if (!updatedProject) {
        throw new Error(`Failed to update project ${id}`);
      }

      console.log('[Storage] Project updated successfully:', updatedProject);
      return updatedProject;
    } catch (error) {
      console.error('[Storage] Error updating project:', error);
      throw error;
    }
  }

  // Customer Supplies methods implementation
  async getSupplies(): Promise<Supply[]> {
    try {
      console.log("[Storage] Fetching all supplies");
      const allSupplies = await db
        .select()
        .from(supplies)
        .orderBy(supplies.createdAt, 'desc');
      console.log(`[Storage] Found ${allSupplies.length} supplies`);
      return allSupplies;
    } catch (error) {
      console.error("[Storage] Error fetching supplies:", error);
      throw error;
    }
  }

  async getSuppliesByClient(clientName: string): Promise<Supply[]> {
    try {
      console.log(`[Storage] Fetching supplies for client: ${clientName}`);
      const clientSupplies = await db
        .select()
        .from(supplies)
        .where(eq(supplies.clientName, clientName))
        .orderBy(supplies.createdAt, 'desc');
      console.log(`[Storage] Found ${clientSupplies.length} supplies for client ${clientName}`);
      return clientSupplies;
    } catch (error) {
      console.error(`[Storage] Error fetching supplies for client ${clientName}:`, error);
      throw error;
    }
  }

  async getSupply(id: number): Promise<Supply | undefined> {
    try {
      console.log(`[Storage] Fetching supply with ID: ${id}`);
      const [supply] = await db.select().from(supplies).where(eq(supplies.id, id));
      console.log(`[Storage] Supply fetch result: ${supply ? "Found" : "Not found"}`);
      return supply;
    } catch (error) {
      console.error(`[Storage] Error fetching supply with ID ${id}:`, error);
      throw error;
    }
  }

  async createSupply(supply: InsertSupply): Promise<Supply> {
    try {
      console.log("[Storage] Creating new supply:", supply);
      
      // Calculate total price if not provided
      if (!supply.totalPrice && supply.unitPrice && supply.quantity) {
        supply.totalPrice = Number(supply.unitPrice) * Number(supply.quantity);
      }
      
      const [newSupply] = await db
        .insert(supplies)
        .values({
          ...supply,
          purchaseDate: new Date(supply.purchaseDate),
          paymentDate: supply.paymentDate ? new Date(supply.paymentDate) : null,
          createdAt: new Date()
        })
        .returning();
      
      console.log(`[Storage] Created new supply with ID: ${newSupply.id}`);
      return newSupply;
    } catch (error) {
      console.error("[Storage] Error creating supply:", error);
      throw error;
    }
  }

  async updateSupply(id: number, supplyData: Partial<Supply>): Promise<Supply | undefined> {
    try {
      console.log(`[Storage] Updating supply with ID: ${id}`, supplyData);
      
      // If changing unit price or quantity, recalculate total price
      if ((supplyData.unitPrice || supplyData.quantity) && !supplyData.totalPrice) {
        const [currentSupply] = await db.select().from(supplies).where(eq(supplies.id, id));
        if (currentSupply) {
          const unitPrice = supplyData.unitPrice !== undefined ? Number(supplyData.unitPrice) : Number(currentSupply.unitPrice);
          const quantity = supplyData.quantity !== undefined ? Number(supplyData.quantity) : Number(currentSupply.quantity);
          supplyData.totalPrice = unitPrice * quantity;
        }
      }
      
      // Convert dates if provided
      if (supplyData.purchaseDate) {
        supplyData.purchaseDate = new Date(supplyData.purchaseDate);
      }
      
      if (supplyData.paymentDate) {
        supplyData.paymentDate = new Date(supplyData.paymentDate);
      }
      
      const [updatedSupply] = await db
        .update(supplies)
        .set(supplyData)
        .where(eq(supplies.id, id))
        .returning();
      
      console.log(`[Storage] Supply update result: ${updatedSupply ? "Success" : "Failed"}`);
      return updatedSupply;
    } catch (error) {
      console.error(`[Storage] Error updating supply with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteSupply(id: number): Promise<boolean> {
    try {
      console.log(`[Storage] Deleting supply with ID: ${id}`);
      const result = await db.delete(supplies).where(eq(supplies.id, id)).returning();
      const success = result.length > 0;
      console.log(`[Storage] Supply deletion result: ${success ? "Success" : "Failed"}`);
      return success;
    } catch (error) {
      console.error(`[Storage] Error deleting supply with ID ${id}:`, error);
      throw error;
    }
  }

  async updateSupplyPaymentStatus(id: number, paid: boolean, paymentMethod?: string): Promise<Supply | undefined> {
    try {
      console.log(`[Storage] Updating supply ID ${id} payment status to: ${paid ? "Paid" : "Unpaid"}`);
      
      const updateData: Partial<Supply> = { 
        paid,
        paymentDate: paid ? new Date() : null
      };
      
      if (paid && paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }
      
      const [updatedSupply] = await db
        .update(supplies)
        .set(updateData)
        .where(eq(supplies.id, id))
        .returning();
      
      console.log(`[Storage] Supply payment status update result: ${updatedSupply ? "Success" : "Failed"}`);
      return updatedSupply;
    } catch (error) {
      console.error(`[Storage] Error updating supply payment status for ID ${id}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();