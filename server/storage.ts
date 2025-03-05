import { Service, InsertService, QuoteRequest, InsertQuoteRequest } from "@shared/schema";

export interface IStorage {
  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  // Quote Requests
  createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest>;
  getQuoteRequests(): Promise<QuoteRequest[]>;
}

export class MemStorage implements IStorage {
  private services: Map<number, Service>;
  private quoteRequests: Map<number, QuoteRequest>;
  private servicesId: number;
  private quoteRequestsId: number;

  constructor() {
    this.services = new Map();
    this.quoteRequests = new Map();
    this.servicesId = 1;
    this.quoteRequestsId = 1;

    // Seed initial services
    const initialServices: InsertService[] = [
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
      }
    ];

    initialServices.forEach(service => this.createService(service));
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.servicesId++;
    const newService = { ...service, id };
    this.services.set(id, newService);
    return newService;
  }

  async createQuoteRequest(request: InsertQuoteRequest): Promise<QuoteRequest> {
    const id = this.quoteRequestsId++;
    const newRequest = { ...request, id };
    this.quoteRequests.set(id, newRequest);
    return newRequest;
  }

  async getQuoteRequests(): Promise<QuoteRequest[]> {
    return Array.from(this.quoteRequests.values());
  }
}

export const storage = new MemStorage();