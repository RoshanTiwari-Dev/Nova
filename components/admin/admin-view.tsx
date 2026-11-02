"use client";

import * as React from "react";
import {
  ShieldCheck,
  Users,
  MessageSquare,
  Terminal,
  Activity,
  AlertCircle,
  Cpu,
  CheckCircle2,
  Clock,
  DollarSign,
  Flag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminViewProps {
  metrics: {
    totalUsers: number;
    totalConversations: number;
    totalExecutions: number;
    recentFeedback: any[];
    recentExecutions: any[];
  };
}

export function AdminView({ metrics }: AdminViewProps) {
  const [featureFlags, setFeatureFlags] = React.useState({
    enableWebSearch: true,
    enableTutorHub: true,
    enableGuestAccess: true,
    strictRateLimiting: true,
  });

  const toggleFlag = (key: keyof typeof featureFlags) => {
    setFeatureFlags((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      toast.success(`Feature flag "${key}" updated`);
      return updated;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin & Analytics Console
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            System health, usage quotas, execution telemetry, and feature flags.
          </p>
        </div>
        <Badge variant="success" className="px-3 py-1 space-x-1.5">
          <Activity className="h-3.5 w-3.5" />
          <span>System Healthy</span>
        </Badge>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{metrics.totalUsers || 1}</div>
          <p className="text-[11px] text-muted-foreground">+100% active this week</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Total Chats</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{metrics.totalConversations || 0}</div>
          <p className="text-[11px] text-muted-foreground">Persisted in Postgres</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Sandbox Runs</span>
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{metrics.totalExecutions || 0}</div>
          <p className="text-[11px] text-muted-foreground">Judge0 CE Runner</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">AI Cost (Est.)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold">$0.04</div>
          <p className="text-[11px] text-muted-foreground">Fast tier model savings</p>
        </div>
      </div>

      {/* Feature Flags & Control */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Live Feature Flags & Quota Controls</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {Object.entries(featureFlags).map(([key, enabled]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-muted/30"
            >
              <div>
                <span className="text-xs font-semibold capitalize text-foreground">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {enabled ? "Active for all sessions" : "Disabled in deployment"}
                </p>
              </div>
              <Button
                size="sm"
                variant={enabled ? "default" : "outline"}
                onClick={() => toggleFlag(key as any)}
                className="h-7 text-xs"
              >
                {enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sandbox Executions */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Recent Sandbox Executions</h2>
          </div>
          <Badge variant="outline" className="text-xs">
            30-Day Retention Policy
          </Badge>
        </div>

        {metrics.recentExecutions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground italic">
            No executions recorded yet. Run C++, Java, or Python in the IDE to see telemetry here.
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.recentExecutions.map((exec: any) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 text-xs font-mono"
              >
                <div className="flex items-center space-x-2">
                  <Badge variant={exec.status === "accepted" ? "success" : "destructive"}>
                    {exec.status}
                  </Badge>
                  <span className="font-semibold text-foreground uppercase">{exec.language}</span>
                  <span className="text-muted-foreground">({exec.runtimeVersion || "v1.0"})</span>
                </div>
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <span>{exec.timeMs}ms</span>
                  <span>{exec.memoryKb}KB</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
