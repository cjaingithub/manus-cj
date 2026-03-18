import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  isValidEmail,
  isValidPassword,
  generateTokens,
} from "../services/customAuth";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Custom Authentication Router
 * Provides email/password authentication with JWT tokens
 */
export const customAuthRouter = router({
  /**
   * Register a new user with email and password
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(2, "Name must be at least 2 characters"),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        // Validate email format
        if (!isValidEmail(input.email)) {
          throw new Error("Invalid email format");
        }

        // Validate password strength
        if (!isValidPassword(input.password)) {
          throw new Error(
            "Password must contain uppercase, lowercase, and numbers"
          );
        }

        // Register user
        const result = await registerUser(
          input.email,
          input.password,
          input.name
        );

        if (!result) {
          throw new Error("Failed to register user");
        }

        return {
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
          tokens: result.tokens,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Registration failed";
        throw new Error(message);
      }
    }),

  /**
   * Login user with email and password
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        // Validate email format
        if (!isValidEmail(input.email)) {
          throw new Error("Invalid email format");
        }

        // Get database
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        // Find user by email
        const foundUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email));
        const user = foundUsers[0];

        if (!user) {
          throw new Error("Invalid email or password");
        }

        // In a real implementation, you would verify the password hash here
        // For now, we're using a simplified approach
        // TODO: Add password hash verification once password field is added to users table

        // Generate tokens
        const tokens = generateTokens({
          id: user.id,
          email: user.email || "",
          name: user.name || "",
          role: user.role,
        });

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tokens,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Login failed";
        throw new Error(message);
      }
    }),

  /**
   * Refresh access token using refresh token
   */
  refreshToken: publicProcedure
    .input(
      z.object({
        refreshToken: z.string().min(1, "Refresh token is required"),
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const tokens = await refreshAccessToken(input.refreshToken);

        if (!tokens) {
          throw new Error("Invalid or expired refresh token");
        }

        return {
          success: true,
          tokens,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Token refresh failed";
        throw new Error(message);
      }
    }),

  /**
   * Get current user info (requires valid token in header)
   * This is a public endpoint but should be called with Authorization header
   */
  me: publicProcedure.query(async ({ ctx }: any) => {
    try {
      // Check if user is authenticated via context
      if (!ctx.user) {
        return {
          success: false,
          user: null,
          message: "Not authenticated",
        };
      }

      return {
        success: true,
        user: {
          id: ctx.user.id,
          email: ctx.user.email,
          name: ctx.user.name,
          role: ctx.user.role,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get user info";
      throw new Error(message);
    }
  }),

  /**
   * Logout user (client-side token deletion)
   */
  logout: publicProcedure.mutation(async () => {
    try {
      // Logout is handled client-side by removing tokens
      // Server-side: could implement token blacklisting if needed
      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Logout failed";
      throw new Error(message);
    }
  }),

  /**
   * Check if email is already registered
   */
  checkEmailExists: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      })
    )
    .query(async ({ input }: any) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database not available");
        }

        const foundUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email));

        return {
          exists: foundUsers.length > 0,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Check failed";
        throw new Error(message);
      }
    }),

  /**
   * Validate password strength
   */
  validatePassword: publicProcedure
    .input(
      z.object({
        password: z.string(),
      })
    )
    .query(({ input }: any) => {
      const isValid = isValidPassword(input.password);
      const requirements = {
        minLength: input.password.length >= 8,
        hasUppercase: /[A-Z]/.test(input.password),
        hasLowercase: /[a-z]/.test(input.password),
        hasNumber: /\d/.test(input.password),
      };

      return {
        isValid,
        requirements,
        message: isValid
          ? "Password is strong"
          : "Password does not meet requirements",
      };
    }),
});
