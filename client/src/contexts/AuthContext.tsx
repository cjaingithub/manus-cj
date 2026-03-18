import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedUser = localStorage.getItem(
          process.env.VITE_USER_STORAGE_KEY || "hunter_user"
        );
        const storedAccessToken = localStorage.getItem(
          process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token"
        );
        const storedRefreshToken = localStorage.getItem(
          process.env.VITE_REFRESH_TOKEN_STORAGE_KEY || "hunter_refresh_token"
        );

        if (storedUser && storedAccessToken) {
          setUser(JSON.parse(storedUser));
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
        // Clear invalid auth data
        localStorage.removeItem(
          process.env.VITE_USER_STORAGE_KEY || "hunter_user"
        );
        localStorage.removeItem(
          process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token"
        );
        localStorage.removeItem(
          process.env.VITE_REFRESH_TOKEN_STORAGE_KEY || "hunter_refresh_token"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = (newUser: User, newAccessToken: string, newRefreshToken: string) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);

    // Persist to localStorage
    localStorage.setItem(
      process.env.VITE_USER_STORAGE_KEY || "hunter_user",
      JSON.stringify(newUser)
    );
    localStorage.setItem(
      process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token",
      newAccessToken
    );
    localStorage.setItem(
      process.env.VITE_REFRESH_TOKEN_STORAGE_KEY || "hunter_refresh_token",
      newRefreshToken
    );
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    // Clear localStorage
    localStorage.removeItem(
      process.env.VITE_USER_STORAGE_KEY || "hunter_user"
    );
    localStorage.removeItem(
      process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token"
    );
    localStorage.removeItem(
      process.env.VITE_REFRESH_TOKEN_STORAGE_KEY || "hunter_refresh_token"
    );
  };

  const updateAccessToken = (newAccessToken: string) => {
    setAccessToken(newAccessToken);
    localStorage.setItem(
      process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token",
      newAccessToken
    );
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    accessToken,
    refreshToken,
    login,
    logout,
    setUser,
    updateAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
