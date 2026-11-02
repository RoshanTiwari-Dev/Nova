"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { Sparkles, Terminal, Code2, ArrowRight, Github, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    setIsLoading(true);
    try {
      await signIn("credentials", {
        email,
        name: name || email.split("@")[0],
        callbackUrl: "/chat",
      });
    } catch (err) {
      toast.error("Failed to sign in");
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("credentials", {
        email: "developer@novacode.dev",
        name: "NOVA Developer",
        callbackUrl: "/chat",
      });
    } catch {
      toast.error("Quick sign in failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
        {/* Brand */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-lg shadow-primary/30 mb-2">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to NOVA</h1>
          <p className="text-sm text-muted-foreground">Your AI coding companion and cloud sandbox</p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-6">
          <div className="flex items-center space-x-1.5 p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Streaming Chat</span>
          </div>
          <div className="flex items-center space-x-1.5 p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>C++, Java, Python</span>
          </div>
          <div className="flex items-center space-x-1.5 p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>AI Diff Review</span>
          </div>
          <div className="flex items-center space-x-1.5 p-2 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Learning Hub</span>
          </div>
        </div>

        {/* Quick Demo Access Button */}
        <Button
          onClick={handleQuickDemoLogin}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-white font-medium shadow-md mb-4 py-2.5"
        >
          <span>Continue as Developer (1-Click)</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase tracking-wider">
            Or sign in with email
          </span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        {/* Form Login */}
        <form onSubmit={handleCredentialsLogin} className="space-y-3">
          <div>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="text-sm"
            />
          </div>
          <div>
            <Input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="text-sm"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={isLoading}
            className="w-full justify-center text-sm font-medium"
          >
            <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Sign in with Email</span>
          </Button>
        </form>

        {/* OAuth Buttons */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => signIn("github", { callbackUrl: "/chat" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Github className="h-4 w-4 mr-1.5" />
            GitHub
          </Button>
          <span className="text-muted-foreground">•</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => signIn("google", { callbackUrl: "/chat" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Google
          </Button>
        </div>
      </div>
    </div>
  );
}
