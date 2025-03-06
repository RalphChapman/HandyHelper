import { Service, InsertService, QuoteRequest, InsertQuoteRequest, Booking, InsertBooking, User, InsertUser, Testimonial, InsertTestimonial } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  // Add initialize method to interface
  initialize(): Promise<void>;

  // Session store
  sessionStore: session.Store;

  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  // Quote Requests
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequests(): Promise<QuoteRequest[]>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookings(): Promise<Booking[]>;
  getBookingsByEmail(email: string): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string): Promise<Booking | undefined>;

  // Projects
  getProjects(serviceId: number): Promise<Project[]>;
  createProject(project: Omit<Project, 'id'>): Promise<Project>;

  // Users
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  // Testimonials
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  getTestimonials(approved?: boolean): Promise<Testimonial[]>;
  updateTestimonialApproval(id: number, approved: boolean): Promise<Testimonial | undefined>;
}

export class MemStorage implements IStorage {
  private services: Map<number, Service>;
  private quoteRequests: Map<number, QuoteRequest>;
  private bookings: Map<number, Booking>;
  private projects: Map<number, Project>;
  private users: Map<number, User>;
  private testimonials: Map<number, Testimonial>;
  private servicesId: number;
  private quoteRequestsId: number;
  private bookingsId: number;
  private projectsId: number;
  private usersId: number;
  private testimonialsId: number;
  private initialized: boolean;
  public sessionStore: session.Store;

  constructor() {
    console.log("[Storage] Creating new MemStorage instance");
    this.services = new Map();
    this.quoteRequests = new Map();
    this.bookings = new Map();
    this.projects = new Map();
    this.users = new Map();
    this.testimonials = new Map();
    this.servicesId = 1;
    this.quoteRequestsId = 1;
    this.bookingsId = 1;
    this.projectsId = 1;
    this.usersId = 1;
    this.testimonialsId = 1;
    this.initialized = false;
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

    // Create admin user
    console.log("[Storage] Creating admin user");
    await this.createUser({
      username: "admin",
      password: "admin123", // This should be hashed in auth.ts
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
        description: "Professional fence painting/repair and patio installations. Expert craftsmanship for all your outdoor structure needs.",
        category: "Landscaping",
        imageUrl: "https://images.unsplash.com/photo-1602491453631-e2a5ad90a131",
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

    this.initialized = true;
    console.log(`[Storage] Initialization complete. Seeded ${this.services.size} services, ${this.projects.size} projects, and ${this.testimonials.size} testimonials`);
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
      ...booking
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
}

// Initialize storage
console.log("[Storage] Creating storage instance");
export const storage = new MemStorage();