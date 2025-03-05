import { Service, InsertService, QuoteRequest, InsertQuoteRequest, Booking, InsertBooking } from "@shared/schema";

export interface IStorage {
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
}

export class MemStorage implements IStorage {
  private services: Map<number, Service>;
  private quoteRequests: Map<number, QuoteRequest>;
  private bookings: Map<number, Booking>;
  private servicesId: number;
  private quoteRequestsId: number;
  private bookingsId: number;

  constructor() {
    this.services = new Map();
    this.quoteRequests = new Map();
    this.bookings = new Map();
    this.servicesId = 1;
    this.quoteRequestsId = 1;
    this.bookingsId = 1;

    // Seed initial services
    const initialServices = [
      {
        name: "General Home Maintenance",
        description: "Comprehensive home maintenance and repairs including door repairs, window maintenance, gutter cleaning, small fixes, and other miscellaneous tasks to keep your home in top condition.",
        category: "General Repairs",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/home-repair-2236667-1873278.png",
        rating: 5,
        review: "Ralph is our go-to handyman for all home repairs. He's fixed everything from sticky doors to loose gutters. His versatility and reliability are outstanding!",
        reviewAuthor: "Robert Chen"
      },
      {
        name: "Plumbing Repairs",
        description: "Expert plumbing services including leak repairs, pipe maintenance, and fixture installations.",
        category: "Plumbing",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/plumbing-repair-2236660-1873271.png",
        rating: 5,
        review: "Ralph fixed our leaky faucet and replaced some old pipes. He was professional, quick, and the price was very reasonable. Highly recommend!",
        reviewAuthor: "Sarah Johnson"
      },
      {
        name: "Electrical Work",
        description: "Professional electrical services including wiring, lighting installation, and electrical repairs.",
        category: "Electrical",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/electrical-repair-2236662-1873273.png",
        rating: 5,
        review: "Outstanding electrical work! Ralph rewired our entire garage and installed new lighting. His expertise as an electrical engineer really shows.",
        reviewAuthor: "Mike Peters"
      },
      {
        name: "Carpentry",
        description: "Custom carpentry solutions including furniture repair, cabinet installation, and woodworking.",
        category: "Carpentry",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/carpentry-tools-2236663-1873274.png",
        rating: 5,
        review: "The custom shelving Ralph built for our home office is beautiful. His attention to detail and craftsmanship is exceptional.",
        reviewAuthor: "Emily Wilson"
      },
      {
        name: "Outdoor Solutions",
        description: "Professional fence painting/repair and patio installations. Expert craftsmanship for all your outdoor structure needs.",
        category: "Landscaping",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/landscape-2236664-1873275.png",
        rating: 5,
        review: "Ralph repaired and repainted our old fence, and installed a beautiful new patio. The quality of work is outstanding!",
        reviewAuthor: "David Thompson"
      },
      {
        name: "Interior Painting",
        description: "Professional interior painting services with attention to detail and clean, precise work.",
        category: "Painting",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/paint-roller-2236665-1873276.png",
        rating: 5,
        review: "Excellent paint job throughout our house. Ralph's prep work and attention to detail made all the difference.",
        reviewAuthor: "Jennifer Martinez"
      },
      {
        name: "Sheetrock Repair",
        description: "Expert drywall and sheetrock repair services, from small patches to complete wall restoration.",
        category: "General Repairs",
        imageUrl: "https://cdn.iconscout.com/icon/premium/png-256-thumb/wall-repair-2236666-1873277.png",
        rating: 5,
        review: "Ralph did an amazing job repairing our damaged walls. You can't even tell where the repairs were made!",
        reviewAuthor: "Michael Anderson"
      }
    ];

    initialServices.forEach(service => {
      const id = this.servicesId++;
      const newService: Service = { id, ...service };
      this.services.set(id, newService);
    });
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.servicesId++;
    const newService: Service = { id, ...service };
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
      status: booking.status || "pending",
      notes: booking.notes || null,
      confirmed: booking.confirmed || false
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
}

export const storage = new MemStorage();