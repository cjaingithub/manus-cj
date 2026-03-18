import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

export function ProtectedRoute({
  children,
  requiredRole = "user",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      navigate("/login", { replace: true });
    } else if (
      !isLoading &&
      isAuthenticated &&
      requiredRole === "admin" &&
      user?.role !== "admin"
    ) {
      // Redirect to home if user doesn't have required role
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, user, requiredRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole === "admin" && user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
