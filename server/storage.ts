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

  // Service Provider methods
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;
  getServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProvidersForService(serviceId: number): Promise<ServiceProvider[]>;
  updateServiceProviderAvailability(id: number, availability: any): Promise<ServiceProvider | undefined>;

  // Review methods
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

    console.log("[Storage] Initializing database storage");

    // Only seed data in development mode
    if (process.env.NODE_ENV !== 'production') {
      await this.seedData();
    }

    this.initialized = true;
    console.log(`[Storage] Initialization complete.`);
  }

  private async seedData(): Promise<void> {
    console.log("[Storage] Seeding initial data");

    // Create admin user with hashed password
    console.log("[Storage] Creating admin user");
    const hashedPassword = await hashPassword("admin123");
    await this.createUser({
      username: "admin",
      password: hashedPassword,
      email: "admin@example.com",
      role: "admin"
    });

    // Seed initial services
    const initialServices = [
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
      },
      {
        name: "Carpentry",
        description: "Custom carpentry solutions including furniture repair, cabinet installation, and woodworking.",
        category: "Carpentry",
        imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c",
        rating: 5
      },
      {
        name: "Interior Projects",
        description: "Expert interior renovation services including professional painting, drywall/sheetrock repair, and finish trim work. Our attention to detail ensures seamless repairs and beautiful finishes for your home.",
        category: "Interior",
        imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
        rating: 5
      },
      {
        name: "Outdoor Solutions",
        description: "Professional deck construction, fence painting/repair and patio installations. Expert craftsmanship for all your outdoor structure needs.",
        category: "Landscaping",
        imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
        rating: 5
      },
    ];

    console.log("[Storage] Seeding initial services");
    for (const service of initialServices) {
      const newService = {
        ...service
      };
      await db.insert(services).values(newService).returning();
      console.log(`[Storage] Added service: ${newService.name}`);
    }

    // Add sample projects
    const sampleProjects = [
      {
        title: "Kitchen Renovation",
        description: "Complete kitchen remodel with custom cabinets",
        imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba",
        comment: "Ralph transformed our outdated kitchen into a modern masterpiece. The attention to detail was incredible.",
        customerName: "Jennifer Smith",
        date: "February 2024",
        serviceId: 1
      },
      {
        title: "Bathroom Update",
        description: "Modern bathroom renovation with custom tiling",
        imageUrl: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14",
        comment: "The bathroom looks amazing! Ralph's tile work is absolutely perfect.",
        customerName: "Michael Brown",
        date: "January 2024",
        serviceId: 1
      },
      {
        title: "Electrical System Upgrade",
        description: "Complete house rewiring and panel upgrade",
        imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e",
        comment: "Professional work from start to finish. Everything was done to code and looks great.",
        customerName: "Sarah Wilson",
        date: "March 2024",
        serviceId: 3
      }
    ];

    console.log("[Storage] Seeding sample projects");
    for (const project of sampleProjects) {
      await this.createProject({...project, createdAt: new Date()});
      console.log(`[Storage] Added project: ${project.title}`);
    }

    // Add initial testimonials
    const initialTestimonials = [
      {
        serviceId: 1,
        content: "Ralph is our go-to handyman for all home repairs. He's fixed everything from sticky doors to loose gutters. His versatility and reliability are outstanding!",
        authorName: "Robert Chen",
        approved: true,
        createdAt: new Date()
      },
      {
        serviceId: 2,
        content: "Ralph fixed our leaky faucet and replaced some old pipes. He was professional, quick, and the price was very reasonable. Highly recommend!",
        authorName: "Sarah Johnson",
        approved: true,
        createdAt: new Date()
      }
    ];

    console.log("[Storage] Seeding initial testimonials");
    for (const testimonial of initialTestimonials) {
      await this.createTestimonial(testimonial);
      console.log(`[Storage] Added testimonial from: ${testimonial.authorName}`);
    }

    // Add initial service providers
    console.log("[Storage] Seeding initial service providers");
    const initialServiceProviders = [
      {
        userId: 1,
        name: "John Smith",
        bio: "Master carpenter with 15 years of experience in custom woodworking and home renovations. Specializing in custom cabinetry and built-ins.",
        specialties: ["Custom Carpentry", "Cabinet Installation", "Wood Restoration"],
        yearsOfExperience: 15,
        availabilitySchedule: {
          monday: ["9:00-17:00"],
          tuesday: ["9:00-17:00"],
          wednesday: ["9:00-17:00"],
          thursday: ["9:00-17:00"],
          friday: ["9:00-17:00"]
        },
        profileImage: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40",
        contactPhone: "843-555-0123",
        servicesOffered: [1, 4] // General Home Maintenance and Carpentry
      },
      {
        userId: 1,
        name: "Michael Rodriguez",
        bio: "Licensed electrician with expertise in residential and commercial electrical systems. Certified in modern smart home installations.",
        specialties: ["Electrical Repairs", "Smart Home Installation", "Lighting Systems"],
        yearsOfExperience: 12,
        availabilitySchedule: {
          monday: ["8:00-16:00"],
          tuesday: ["8:00-16:00"],
          wednesday: ["8:00-16:00"],
          thursday: ["8:00-16:00"],
          friday: ["8:00-16:00"]
        },
        profileImage: "https://images.unsplash.com/photo-1556157382-97eda2d62296",
        contactPhone: "843-555-0124",
        servicesOffered: [3] // Electrical Work
      }
    ];

    for (const provider of initialServiceProviders) {
      await this.createServiceProvider(provider);
      console.log(`[Storage] Added service provider: ${provider.name}`);
    }
  }

  async getServices(): Promise<Service[]> {
    if (!this.initialized) {
      console.log("[Storage] Storage not initialized, initializing now");
      await this.initialize();
    }

    console.log("[Storage] Getting all services");
    const services = await db.select().from(services);
    console.log(`[Storage] Found ${services.length} services`);
    return services;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
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