"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Github,
  Mail,
  Lock,
  User,
  CheckCircle2,
  UserCheck,
  Compass,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/chat",
      });

      if (res?.error) {
        toast.error(res.error);
        setIsLoading(false);
      } else {
        toast.success("Signed in successfully!");
        router.push("/chat");
        router.refresh();
      }
    } catch {
      toast.error("An error occurred during sign in");
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error?.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully! Logging you in...");

      // Automatically sign in the newly registered user
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/chat",
      });

      if (signInRes?.error) {
        toast.info("Account registered! Please sign in with your password.");
        setTab("login");
        setIsLoading(false);
      } else {
        router.push("/chat");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create account");
      setIsLoading(false);
    }
  };

  // Handle Guest Login
  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        isGuest: "true",
        name: "Guest User",
        redirect: false,
        callbackUrl: "/chat",
      });

      if (res?.error) {
        toast.error("Could not start guest session");
        setIsLoading(false);
      } else {
        toast.success("Entering NOVA in Guest Mode!");
        router.push("/chat");
        router.refresh();
      }
    } catch {
      toast.error("Guest access error");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/85 backdrop-blur-xl p-7 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-lg shadow-primary/30 mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to NOVA</h1>
          <p className="text-xs text-muted-foreground">Your AI coding companion and cloud execution sandbox</p>
        </div>

        {/* Guest Mode Hero Card */}
        <div className="mb-6 p-3.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/60 transition-colors">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5">
                <Compass className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Try NOVA Without Signing Up</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Instant access to AI chat and live multi-language code execution.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="w-full mt-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-medium text-xs shadow-sm py-2"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UserCheck className="h-3.5 w-3.5 mr-1.5" />}
            <span>Continue as Guest</span>
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Or Account Access
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Tabs: Sign In / Register */}
        <div className="flex rounded-xl bg-muted/60 p-1 mb-5 border border-border">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Register (New User)
          </button>
        </div>

        {/* Tab 1: Sign In */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-xs font-medium py-2.5 mt-2"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              <span>Sign In with Credentials</span>
            </Button>
          </form>
        )}

        {/* Tab 2: Register */}
        {tab === "register" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full text-xs font-medium py-2.5 mt-2"
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              <span>Create Account & Sign In</span>
            </Button>
          </form>
        )}

        {/* Feature Pills */}
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
            <span>Chatbot & Run Code</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
            <span>Past Chat History Saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
