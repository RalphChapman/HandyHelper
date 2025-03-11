import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User } from "@shared/schema";

// Extend Express.User to include our User type
declare global {
  namespace Express {
    // Use interface merging instead of extension to avoid recursive reference
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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };

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

        // Remove password from user object before serializing
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
      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      console.error("[Auth] Deserialization error:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      console.log("[Auth] Registration attempt:", req.body);
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

      // Remove password before sending response
      const { password: _, ...userWithoutPassword } = user;

      // Log the user in after registration
      req.login(userWithoutPassword, (err) => {
        if (err) {
          console.error("[Auth] Login after registration failed:", err);
          return res.status(500).json({ message: "Failed to login after registration" });
        }
        console.log("[Auth] Registration and login successful:", user.id);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
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

  app.post("/api/logout", (req, res) => {
    const userId = req.user?.id;
    console.log("[Auth] Logout request for user:", userId);
    req.logout(() => {
      console.log("[Auth] Logout successful for user:", userId);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("[Auth] Unauthenticated user session");
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log("[Auth] User session verified:", req.user?.id);
    res.json(req.user);
  });
}