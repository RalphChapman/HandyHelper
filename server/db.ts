import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless driver
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please add this as a secret in your deployment configuration.",
  );
}

// Create connection pool with error handling and retry logic
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  retryDelay: 1000, // Time between retries
  maxRetries: 3 // Maximum number of retries
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  // Don't exit the process, just log the error
  console.error('Database connection error occurred, will attempt to reconnect');
});

// Test database connection
async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to database');
      client.release();
      return;
    } catch (error) {
      console.error(`Error connecting to the database (${retries} retries left):`, error);
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Initialize connection test
testConnection().catch(error => {
  console.error('Failed to establish database connection after retries:', error);
});

// Initialize Drizzle with the pool and schema
export const db = drizzle({ client: pool, schema });