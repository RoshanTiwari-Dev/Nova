"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Code2,
  GraduationCap,
  Settings,
  ShieldCheck,
  Plus,
  Trash2,
  Pin,
  Moon,
  Sun,
  Menu,
  X,
  Sparkles,
  Terminal,
  LogOut,
  ChevronRight,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ConversationItem {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: string;
}

export function Sidebar({ user }: { user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [conversations, setConversations] = React.useState<ConversationItem[]>([]);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const loadConversations = React.useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    loadConversations();
    const handleUpdate = () => loadConversations();
    window.addEventListener("nova:conversation-updated", handleUpdate);
    return () => window.removeEventListener("nova:conversation-updated", handleUpdate);
  }, [loadConversations, pathname]);

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation", model: "openai/gpt-oss-120b" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/chat/${data.conversation.id}`);
        setMobileOpen(false);
      }
    } catch {
      router.push("/chat");
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        toast.success("Conversation deleted");
        if (pathname.includes(id)) {
          router.push("/chat");
        }
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, id: string, currentPin: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !currentPin }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, pinned: !currentPin } : c))
        );
      }
    } catch {
      toast.error("Failed to pin conversation");
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedList = filteredConversations.filter((c) => c.pinned);
  const recentList = filteredConversations.filter((c) => !c.pinned);

  const navLinks = [
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
    { href: "/ide", label: "Compiler / IDE", icon: Code2 },
    { href: "/learn", label: "Learning Hub", icon: GraduationCap },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (user?.role === "admin") {
    navLinks.push({ href: "/admin", label: "Admin Console", icon: ShieldCheck });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link href="/chat" className="flex items-center space-x-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold tracking-tight text-lg text-foreground">NOVA</span>
              <Badge variant="subtle" className="text-[10px] px-1.5 py-0 h-4">
                v1.0
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-none">Your AI coding companion</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="p-3 space-y-1">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start space-x-2 shadow-sm font-medium mb-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </Button>

        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary opacity-80" />}
            </Link>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background/50 pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* History Lists */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {pinnedList.length > 0 && (
          <div>
            <div className="flex items-center space-x-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
              <Pin className="h-3 w-3 text-primary" />
              <span>Pinned</span>
            </div>
            <div className="space-y-0.5">
              {pinnedList.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                    pathname === `/chat/${conv.id}`
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Link
                    href={`/chat/${conv.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="truncate flex-1 pr-2"
                  >
                    {conv.title}
                  </Link>
                  <div className="hidden group-hover:flex items-center space-x-1">
                    <button
                      onClick={(e) => handleTogglePin(e, conv.id, conv.pinned)}
                      className="p-0.5 text-muted-foreground hover:text-primary"
                      title="Unpin"
                    >
                      <Pin className="h-3 w-3 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
            Recent Chats
          </div>
          {recentList.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground italic">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentList.slice(0, 25).map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                    pathname === `/chat/${conv.id}`
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Link
                    href={`/chat/${conv.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="truncate flex-1 pr-2"
                  >
                    {conv.title}
                  </Link>
                  <div className="hidden group-hover:flex items-center space-x-1">
                    <button
                      onClick={(e) => handleTogglePin(e, conv.id, conv.pinned)}
                      className="p-0.5 text-muted-foreground hover:text-primary"
                      title="Pin conversation"
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User & Theme Footer */}
      <div className="p-3 border-t border-border bg-card/60 space-y-2">
        {user?.isGuest && (
          <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500 flex items-center justify-between">
            <span className="font-medium">Guest Mode</span>
            <Link href="/login" className="font-semibold underline hover:text-amber-400">
              Register to Save
            </Link>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
              {user?.name?.[0] || "U"}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold truncate leading-none text-foreground">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate leading-none mt-1">
                {user?.email || "Signed in"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1 text-muted-foreground hover:text-foreground"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/chat" className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm tracking-tight">NOVA</span>
        </Link>
        <Button size="iconSm" variant="subtle" onClick={handleNewChat} title="New chat">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
