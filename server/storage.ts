import { 
  services, testimonials, reviews, projects, 
  type Service, type InsertService, 
  type QuoteRequest, type InsertQuoteRequest,
  type Booking, type InsertBooking,
  type User, type InsertUser,
  type Testimonial, type InsertTestimonial,
  type ServiceProvider, type InsertServiceProvider,
  type Review, type InsertReview,
  type Project, type InsertProject,
  users,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq, asc, desc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

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
      imageUrl: "https://images.unsplash.com/photo-1581783898377-1c85bf937427",
      rating: 5
    },
    {
      name: "Plumbing Repairs",
      description: "Expert plumbing services including leak repairs, pipe maintenance, and fixture installations.",
      category: "Plumbing",
      imageUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39",
      rating: 5
    },
    {
      name: "Electrical Work",
      description: "Professional electrical services including wiring, lighting installation, and electrical repairs.",
      category: "Electrical",
      imageUrl: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4",
      rating: 5
    }
  ];

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("[Storage] Already initialized, skipping");
      return;
    }

    console.log("[Storage] Initializing storage");

    try {
      // Insert initial services
      console.log("[Storage] Seeding initial services");
      for (const service of this.initialServices) {
        try {
          console.log("[Storage] Creating service:", service.name);
          const [newService] = await db.insert(services).values(service).returning();
          console.log(`[Storage] Successfully created service: ${newService.name} with ID: ${newService.id}`);
        } catch (error) {
          console.error(`[Storage] Failed to create service ${service.name}:`, error);
          throw error;
        }
      }

      this.initialized = true;
      console.log("[Storage] Initialization complete");
    } catch (error) {
      console.error("[Storage] Initialization failed:", error);
      throw error;
    }
  }

  async getServices(): Promise<Service[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log("[Storage] Getting all services");
    const allServices = await db.select().from(services);
    console.log(`[Storage] Found ${allServices.length} services`);
    return allServices;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [foundService] = await db.select().from(services).where(eq(services.id, id));
    return foundService;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    const [newRequest] = await db.insert(QuoteRequest).values(request).returning();
    return newRequest;
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return await db.select().from(QuoteRequest);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(Booking).values({...booking, status: "pending", confirmed: false}).returning();
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(Booking).where(eq(Booking.id, id));
    return booking;
  }

  async getBookings(): Promise<Booking[]> {
    return await db.select().from(Booking);
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    return await db.select().from(Booking).where(eq(Booking.clientEmail, email));
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const [updatedBooking] = await db.update(Booking).set({status}).where(eq(Booking.id, id)).returning();
    return updatedBooking;
  }

  async getProjects(serviceId: number): Promise<Project[]> {
    try {
      console.log(`Fetching projects for service ${serviceId}`);
      const serviceProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.serviceId, serviceId))
        .orderBy(projects.createdAt, 'desc');

      console.log(`Found ${serviceProjects.length} projects for service ${serviceId}`);
      return serviceProjects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    try {
      console.log('Creating project:', project);
      const [newProject] = await db
        .insert(projects)
        .values({
          ...project,
          createdAt: new Date()
        })
        .returning();

      console.log('Project created successfully:', newProject);
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(User).values({...user, createdAt: new Date()}).returning();
    console.log(`[Storage] Created new user: ${newUser.username} with ID: ${newUser.id}`);
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(User).where(eq(User.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(User).where(eq(User.username, username));
    return user;
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    try {
      console.log('Creating testimonial:', testimonial);
      const [newTestimonial] = await db
        .insert(testimonials)
        .values({
          ...testimonial,
          approved: false,
          createdAt: new Date()
        })
        .returning();

      console.log('Testimonial created successfully:', newTestimonial);
      return newTestimonial;
    } catch (error) {
      console.error('Error creating testimonial:', error);
      throw error;
    }
  }

  async getTestimonials(approved?: boolean): Promise<Testimonial[]> {
    try {
      console.log(`Fetching testimonials${approved !== undefined ? ` (approved: ${approved})` : ''}`);
      let query = db.select().from(testimonials);

      if (approved !== undefined) {
        query = query.where(eq(testimonials.approved, approved));
      }

      const results = await query;
      console.log(`Found ${results.length} testimonials`);
      return results;
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      throw error;
    }
  }

  async updateTestimonialApproval(id: number, approved: boolean): Promise<Testimonial | undefined> {
    try {
      console.log(`Updating testimonial #${id} approval status to: ${approved}`);
      const [updatedTestimonial] = await db
        .update(testimonials)
        .set({ approved })
        .where(eq(testimonials.id, id))
        .returning();

      console.log('Testimonial approval updated:', updatedTestimonial);
      return updatedTestimonial;
    } catch (error) {
      console.error('Error updating testimonial approval:', error);
      throw error;
    }
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const [newProvider] = await db.insert(ServiceProvider).values({...provider, rating: 5, createdAt: new Date()}).returning();
    console.log(`[Storage] Created new service provider: ${newProvider.name} with ID: ${newProvider.id}`);
    return newProvider;
  }

  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(ServiceProvider).where(eq(ServiceProvider.id, id));
    return provider;
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    return await db.select().from(ServiceProvider);
  }

  async getServiceProvidersForService(serviceId: number): Promise<ServiceProvider[]> {
    return await db.select().from(ServiceProvider).where(
      eq(ServiceProvider.servicesOffered, serviceId)
    );
  }

  async updateServiceProviderAvailability(id: number, availability: any): Promise<ServiceProvider | undefined> {
    const [updatedProvider] = await db.update(ServiceProvider).set({availabilitySchedule: availability}).where(eq(ServiceProvider.id, id)).returning();
    return updatedProvider;
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      console.log('Creating review:', review);
      // First verify that the service exists
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, review.serviceId));

      if (!service) {
        throw new Error(`Service with ID ${review.serviceId} not found`);
      }

      // Create the review
      const [newReview] = await db
        .insert(reviews)
        .values({
          ...review,
          verified: false,
          createdAt: new Date()
        })
        .returning();

      console.log('Review created successfully:', newReview);

      // Update service rating
      try {
        const serviceReviews = await this.getReviewsByService(review.serviceId);
        const averageRating = Math.round(
          serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length
        );

        await db
          .update(services)
          .set({ rating: averageRating })
          .where(eq(services.id, review.serviceId));

        console.log('Service rating updated successfully');
      } catch (error) {
        console.error('Error updating service rating:', error);
        // Don't throw here, as the review was still created successfully
      }

      return newReview;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  async getReview(id: number): Promise<Review | undefined> {
    try {
      console.log('Fetching review:', id);
      const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, id));

      console.log('Review fetch result:', review);
      return review;
    } catch (error) {
      console.error('Error fetching review:', error);
      throw error;
    }
  }

  async getReviews(): Promise<Review[]> {
    try {
      console.log('Fetching all reviews');
      const allReviews = await db.select().from(reviews);
      console.log('Found reviews:', allReviews.length);
      return allReviews;
    } catch (error) {
      console.error('Error fetching all reviews:', error);
      throw error;
    }
  }

  async getReviewsByService(serviceId: number): Promise<Review[]> {
    try {
      console.log('Fetching reviews for service:', serviceId);
      // First verify that the service exists
      const [service] = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId));

      if (!service) {
        throw new Error(`Service with ID ${serviceId} not found`);
      }

      const serviceReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.serviceId, serviceId))
        .orderBy(reviews.createdAt, 'desc');

      console.log('Found service reviews:', serviceReviews.length);
      return serviceReviews;
    } catch (error) {
      console.error('Error fetching service reviews:', error);
      throw error;
    }
  }

  async getReviewsByUser(userId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId));
  }

  async updateReviewVerification(id: number, verified: boolean): Promise<Review | undefined> {
    try {
      console.log(`Updating review verification for ID ${id} to ${verified}`);
      const [updatedReview] = await db
        .update(reviews)
        .set({ verified })
        .where(eq(reviews.id, id))
        .returning();

      console.log('Review verification updated:', updatedReview);
      return updatedReview;
    } catch (error) {
      console.error('Error updating review verification:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();