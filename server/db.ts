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

// Create connection pool with error handling
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20 // Maximum pool size
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to database');
    client.release();
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
}

// Initialize connection test
testConnection().catch(console.error);

// Initialize Drizzle with the pool and schema
export const db = drizzle({ client: pool, schema });