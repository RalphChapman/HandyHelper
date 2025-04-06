import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User } from "@shared/schema";
import bcrypt from "bcrypt";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  console.log('[Auth] Comparing passwords, hash format:', stored.startsWith('$2') ? 'bcrypt' : 'scrypt');
  
  // Check if it's a bcrypt hash (starts with $2a$, $2b$ or $2y$)
  if (stored.startsWith('$2')) {
    // Handle bcrypt password using the imported bcrypt module
    try {
      const isValid = await bcrypt.compare(supplied, stored);
      console.log('[Auth] bcrypt comparison result:', isValid);
      return isValid;
    } catch (error) {
      console.error('[Auth] Error using bcrypt:', error);
      throw error;
    }
  } else {
    // Handle scrypt password (our format with salt)
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error('[Auth] Invalid password format, no salt found:', stored);
      return false;
    }
    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const isValid = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log('[Auth] scrypt comparison result:', isValid);
      return isValid;
    } catch (error) {
      console.error('[Auth] Error in scrypt comparison:', error);
      return false;
    }
  }
}

export function setupAuth(app: Express) {
  console.log("[Auth] Setting up authentication...");

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    }
  };

  console.log("[Auth] Session settings configured:", {
    secure: sessionSettings.cookie?.secure,
    maxAge: sessionSettings.cookie?.maxAge
  });

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("[Auth] Attempting login for user:", username);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          console.log("[Auth] User not found:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          console.log("[Auth] Invalid password for user:", username);
          return done(null, false, { message: "Invalid username or password" });
        }

        const { password: _, ...userWithoutPassword } = user;
        console.log("[Auth] Login successful for user:", username);
        return done(null, userWithoutPassword);
      } catch (error) {
        console.error("[Auth] Login error:", error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log("[Auth] Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("[Auth] Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("[Auth] User not found during deserialization:", id);
        return done(null, false);
      }
      const { password: _, ...userWithoutPassword } = user;
      console.log("[Auth] User deserialized successfully:", id);
      done(null, userWithoutPassword);
    } catch (error) {
      console.error("[Auth] Deserialization error:", error);
      done(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    console.log("[Auth] Login request received:", req.body.username);

    // Set proper content type for response
    res.setHeader('Content-Type', 'application/json');

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        console.error("[Auth] Authentication error:", err);
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        console.log("[Auth] Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("[Auth] Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        console.log("[Auth] Login successful:", user.id);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("[Auth] Registration attempt:", req.body);
      // Set proper content type for response
      res.setHeader('Content-Type', 'application/json');
      
      const { username, password, email } = req.body;

      if (!username || !password || !email) {
        console.log("[Auth] Registration failed: Missing required fields");
        return res.status(400).json({ message: "All fields are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("[Auth] Registration failed: Username exists:", username);
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      console.log("[Auth] Creating new user with hashed password");

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role: "user"
      });

      console.log("[Auth] User created successfully:", user.id);

      const { password: _, ...userWithoutPassword } = user;

      req.login(userWithoutPassword, (err) => {
        if (err) {
          console.error("[Auth] Login after registration failed:", err);
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        console.log("[Auth] Registration and login successful:", user.id);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = req.user?.id;
    console.log("[Auth] Logout request for user:", userId);
    // Set proper content type for response
    res.setHeader('Content-Type', 'application/json');
    
    req.logout(() => {
      console.log("[Auth] Logout successful for user:", userId);
      res.status(200).json({ success: true });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    console.log("[Auth] User session check:", {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user?.id
    });

    if (!req.isAuthenticated()) {
      console.log("[Auth] Unauthenticated user session");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log("[Auth] User session verified:", req.user?.id);
    res.json(req.user);
  });

  console.log("[Auth] Authentication setup complete");
}