import { Service, InsertService, QuoteRequest, InsertQuoteRequest, Booking, InsertBooking, User, InsertUser, Testimonial, InsertTestimonial, ServiceProvider, InsertServiceProvider, Review, InsertReview } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { services, reviews } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Add password hashing function
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

interface Project {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  comment: string;
  customerName: string;
  date: string;
  serviceId: number;
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
  createProject(project: Omit<Project, 'id'>): Promise<Project>;

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
  private servicesId: number = 1;
  private quoteRequestsId: number = 1;
  private bookingsId: number = 1;
  private projectsId: number = 1;
  private usersId: number = 1;
  private testimonialsId: number = 1;
  private serviceProvidersId: number = 1;
  private reviewsId: number = 1;
  private initialized: boolean = false;
  public sessionStore: session.Store;

  private services: Map<number, Service> = new Map();
  private quoteRequests: Map<number, QuoteRequest> = new Map();
  private bookings: Map<number, Booking> = new Map();
  private projects: Map<number, Project> = new Map();
  private users: Map<number, User> = new Map();
  private testimonials: Map<number, Testimonial> = new Map();
  private serviceProviders: Map<number, ServiceProvider> = new Map();
  private reviews: Map<number, Review> = new Map();


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

    console.log("[Storage] Initializing MemStorage");

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
      const id = this.servicesId++;
      const newService = {
        id,
        ...service
      };
      this.services.set(id, newService);
      console.log(`[Storage] Added service: ${newService.name} with ID: ${newService.id}`);
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
      const id = this.projectsId++;
      const newProject = { id, ...project };
      this.projects.set(id, newProject);
      console.log(`[Storage] Added project: ${newProject.title} with ID: ${newProject.id}`);
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
      const id = this.testimonialsId++;
      const newTestimonial = { id, ...testimonial };
      this.testimonials.set(id, newTestimonial);
      console.log(`[Storage] Added testimonial from: ${newTestimonial.authorName}`);
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

    this.initialized = true;
    console.log(`[Storage] Initialization complete. Seeded ${this.services.size} services, ${this.projects.size} projects, ${this.testimonials.size} testimonials, and ${this.serviceProviders.size} service providers`);
  }


  async getServices(): Promise<Service[]> {
    if (!this.initialized) {
      console.log("[Storage] Storage not initialized, initializing now");
      await this.initialize();
    }

    console.log("[Storage] Getting all services");
    const services = Array.from(this.services.values());
    console.log(`[Storage] Found ${services.length} services`);
    return services;
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.servicesId++;
    const newService: Service = {
      id,
      ...service
    };
    this.services.set(id, newService);
    return newService;
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    const id = this.quoteRequestsId++;
    const newRequest: QuoteRequest = { id, ...request };
    this.quoteRequests.set(id, newRequest);
    return newRequest;
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return Array.from(this.quoteRequests.values());
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const id = this.bookingsId++;
    const newBooking: Booking = {
      id,
      ...booking,
      status: "pending",
      confirmed: false
    };
    this.bookings.set(id, newBooking);
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.clientEmail === email
    );
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      const updatedBooking = { ...booking, status };
      this.bookings.set(id, updatedBooking);
      return updatedBooking;
    }
    return undefined;
  }

  async getProjects(serviceId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      project => project.serviceId === serviceId
    );
  }

  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    const id = this.projectsId++;
    const newProject = { id, ...project };
    this.projects.set(id, newProject);
    console.log(`[Storage] Created new project: ${newProject.title} with ID: ${newProject.id}`);
    return newProject;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.usersId++;
    const newUser: User = {
      id,
      ...user,
      createdAt: new Date()
    };
    this.users.set(id, newUser);
    console.log(`[Storage] Created new user: ${newUser.username} with ID: ${newUser.id}`);
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username === username
    );
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const id = this.testimonialsId++;
    const newTestimonial: Testimonial = {
      id,
      ...testimonial,
      approved: false,
      createdAt: new Date()
    };
    this.testimonials.set(id, newTestimonial);
    console.log(`[Storage] Created new testimonial from: ${newTestimonial.authorName}`);
    return newTestimonial;
  }

  async getTestimonials(approved?: boolean): Promise<Testimonial[]> {
    const testimonials = Array.from(this.testimonials.values());
    if (approved !== undefined) {
      return testimonials.filter(t => t.approved === approved);
    }
    return testimonials;
  }

  async updateTestimonialApproval(id: number, approved: boolean): Promise<Testimonial | undefined> {
    const testimonial = this.testimonials.get(id);
    if (testimonial) {
      const updatedTestimonial = { ...testimonial, approved };
      this.testimonials.set(id, updatedTestimonial);
      console.log(`[Storage] Updated testimonial #${id} approval status to: ${approved}`);
      return updatedTestimonial;
    }
    return undefined;
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const id = this.serviceProvidersId++;
    const newProvider: ServiceProvider = {
      id,
      rating: 5,
      createdAt: new Date(),
      ...provider
    };
    this.serviceProviders.set(id, newProvider);
    console.log(`[Storage] Created new service provider: ${newProvider.name} with ID: ${newProvider.id}`);
    return newProvider;
  }

  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    return this.serviceProviders.get(id);
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values());
  }

  async getServiceProvidersForService(serviceId: number): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values()).filter(
      provider => provider.servicesOffered.includes(serviceId)
    );
  }

  async updateServiceProviderAvailability(id: number, availability: any): Promise<ServiceProvider | undefined> {
    const provider = this.serviceProviders.get(id);
    if (provider) {
      const updatedProvider = {
        ...provider,
        availabilitySchedule: availability
      };
      this.serviceProviders.set(id, updatedProvider);
      return updatedProvider;
    }
    return undefined;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values({
        ...review,
        verified: false,
        createdAt: new Date()
      })
      .returning();

    // Update service rating
    const serviceReviews = await this.getReviewsByService(review.serviceId);
    const averageRating = Math.round(
      serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length
    );

    await db
      .update(services)
      .set({ rating: averageRating })
      .where(eq(services.id, review.serviceId));

    return newReview;
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id));
    return review;
  }

  async getReviews(): Promise<Review[]> {
    return await db.select().from(reviews);
  }

  async getReviewsByService(serviceId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.serviceId, serviceId));
  }

  async getReviewsByUser(userId: number): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.userId, userId));
  }

  async updateReviewVerification(id: number, verified: boolean): Promise<Review | undefined> {
    const [updatedReview] = await db
      .update(reviews)
      .set({ verified })
      .where(eq(reviews.id, id))
      .returning();
    return updatedReview;
  }
}

// Initialize storage with database implementation
console.log("[Storage] Creating database storage instance");
export const storage = new DatabaseStorage();