import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-in-production";
const JWT_EXPIRATION = "7d";
const REFRESH_TOKEN_EXPIRATION = "30d";

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthPayload {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
}

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokens(payload: AuthPayload): AuthToken {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiration time in seconds
  const expiresIn = Math.floor(
    (jwt.decode(accessToken) as any).exp - Date.now() / 1000
  );

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Register a new user with email and password
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: typeof users.$inferSelect; tokens: AuthToken } | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    const existingUser = existingUsers[0];

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const openId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(users).values({
      email,
      name,
      openId,
      loginMethod: "email",
      role: "user",
    });

    // Retrieve the created user
    const newUsers = await db.select().from(users).where(eq(users.openId, openId));
    const newUser = newUsers[0];

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Generate tokens
    const tokens = generateTokens({
      id: newUser.id,
      email: newUser.email || "",
      name: newUser.name || "",
      role: newUser.role,
    });

    return { user: newUser, tokens };
  } catch (error) {
    console.error("Registration error:", error);
    return null;
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: typeof users.$inferSelect; tokens: AuthToken } | null> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find user by email
    const foundUsers = await db.select().from(users).where(eq(users.email, email));
    const user = foundUsers[0];

    if (!user) {
      throw new Error("User not found");
    }

    // Note: In a real implementation, you would store password hash in the database
    // For now, we're using a simplified approach
    // In production, add a passwordHash field to users table

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
    });

    return { user, tokens };
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthToken | null> {
  try {
    const decoded = verifyToken(refreshToken);

    if (!decoded) {
      throw new Error("Invalid refresh token");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find user to ensure they still exist
    const foundUsers = await db.select().from(users).where(eq(users.id, decoded.id));
    const user = foundUsers[0];

    if (!user) {
      throw new Error("User not found");
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
    });

    return tokens;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // Minimum 8 characters, at least one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}
