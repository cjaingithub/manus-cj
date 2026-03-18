import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface RegisterProps {
  onSuccess?: () => void;
}

export function Register({ onSuccess }: RegisterProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  // Validate password strength
  const validatePasswordMutation = trpc.customAuth.validatePassword.useQuery(
    { password },
    { enabled: password.length > 0 }
  );

  const registerMutation = trpc.customAuth.register.useMutation({
    onSuccess: (data) => {
      // Store tokens in localStorage
      localStorage.setItem(
        process.env.VITE_TOKEN_STORAGE_KEY || "hunter_auth_token",
        data.tokens.accessToken
      );
      localStorage.setItem(
        process.env.VITE_REFRESH_TOKEN_STORAGE_KEY || "hunter_refresh_token",
        data.tokens.refreshToken
      );
      localStorage.setItem(
        process.env.VITE_USER_STORAGE_KEY || "hunter_user",
        JSON.stringify(data.user)
      );

      // Call success callback or navigate
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/", { replace: true });
      }
    },
    onError: (error) => {
      setError(error.message || "Registration failed. Please try again.");
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!validatePasswordMutation.data?.isValid) {
      setError("Password does not meet requirements");
      setIsLoading(false);
      return;
    }

    try {
      await registerMutation.mutateAsync({ name, email, password });
    } catch (err) {
      // Error is handled by mutation onError
    }
  };

  const passwordRequirements = validatePasswordMutation.data?.requirements || {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Sign up for Hunter Agent Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              {password && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    {passwordRequirements.minLength ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordRequirements.hasUppercase ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>One uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordRequirements.hasLowercase ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>One lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {passwordRequirements.hasNumber ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>One number</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !validatePasswordMutation.data?.isValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
