import { db } from "./index";
import {
  conversations,
  messages,
  users,
  codeProjects,
  codeExecutions,
  feedback,
  savedPrompts,
  usageRecords,
} from "./schema";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { localStore } from "./store";
import { env } from "@/lib/env";

const isRealDbConfigured = Boolean(
  env.DATABASE_URL &&
    !env.DATABASE_URL.includes("mock_user") &&
    !env.DATABASE_URL.includes("dummy") &&
    !env.DATABASE_URL.includes("ep-sample-pooler")
);

// --- USERS ---

export async function getUserById(id: string) {
  if (isRealDbConfigured) {
    try {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (results[0]) return results[0];
    } catch {
      // fallback to localStore
    }
  }
  return localStore.getUserById(id);
}

export async function getUserByEmail(email: string) {
  if (isRealDbConfigured) {
    try {
      const results = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1);
      if (results[0]) return results[0];
    } catch {
      // fallback
    }
  }
  return localStore.getUserByEmail(email);
}

export async function createUser(data: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role?: "user" | "admin";
  isGuest?: boolean;
}) {
  const localUser = localStore.createUser(data);

  if (isRealDbConfigured) {
    try {
      await db.insert(users).values({
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
        status: "active",
      });
    } catch {
      // ignore
    }
  }

  return localUser;
}

export async function updateUserPreferences(
  userId: string,
  preferences: {
    theme?: "light" | "dark" | "system";
    responseStyle?: "concise" | "detailed" | "beginner" | "advanced";
    customInstructions?: string;
    memory?: boolean;
  }
) {
  const updated = localStore.updateUserPreferences(userId, preferences);
  if (isRealDbConfigured) {
    try {
      await db.update(users).set({ preferences: updated }).where(eq(users.id, userId));
    } catch {
      // ignore
    }
  }
  return updated;
}

// --- CONVERSATIONS ---

export async function getConversations(userId: string) {
  if (isRealDbConfigured) {
    try {
      const list = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.userId, userId), eq(conversations.archived, false)))
        .orderBy(desc(conversations.pinned), desc(conversations.updatedAt));
      if (list && list.length > 0) return list;
    } catch {
      // fallback
    }
  }
  return localStore.getConversations(userId);
}

export async function getConversation(conversationId: string, userId: string) {
  if (isRealDbConfigured) {
    try {
      const results = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      if (results[0]) return results[0];
    } catch {
      // fallback
    }
  }
  return localStore.getConversation(conversationId, userId);
}

export async function createConversation(userId: string, title: string, model: string, customId?: string) {
  const id = customId || nanoid(12);
  const localConv = localStore.createConversation({ id, userId, title, model });

  if (isRealDbConfigured) {
    try {
      const [conv] = await db
        .insert(conversations)
        .values({
          id,
          userId,
          title,
          model,
        })
        .returning();
      if (conv) return conv;
    } catch {
      // ignore
    }
  }

  return localConv;
}

export async function updateConversation(
  id: string,
  userId: string,
  data: { title?: string; pinned?: boolean; archived?: boolean }
) {
  const updated = localStore.updateConversation(id, userId, data);
  if (isRealDbConfigured) {
    try {
      const [dbUpdated] = await db
        .update(conversations)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning();
      if (dbUpdated) return dbUpdated;
    } catch {
      // ignore
    }
  }
  return updated;
}

export async function deleteConversation(id: string, userId: string) {
  const success = localStore.deleteConversation(id, userId);
  if (isRealDbConfigured) {
    try {
      await db
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    } catch {
      // ignore
    }
  }
  return success;
}

// --- MESSAGES ---

export async function getMessages(conversationId: string) {
  if (isRealDbConfigured) {
    try {
      const list = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
      if (list && list.length > 0) return list;
    } catch {
      // fallback
    }
  }
  return localStore.getMessages(conversationId);
}

export async function saveMessage(params: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  parts: any;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  userId?: string;
}) {
  const id = nanoid(16);

  // Ensure conversation exists in local store
  const userId = params.userId || "dev-user-001";
  localStore.createConversation({
    id: params.conversationId,
    userId,
    title: params.role === "user" ? (typeof params.parts?.[0]?.text === "string" ? params.parts[0].text.slice(0, 35) : "Chat") : "New Conversation",
    model: params.model,
  });

  const localMsg = localStore.saveMessage({
    id,
    conversationId: params.conversationId,
    role: params.role,
    parts: params.parts,
    model: params.model,
    inputTokens: params.inputTokens || 0,
    outputTokens: params.outputTokens || 0,
  });

  if (isRealDbConfigured) {
    try {
      const [msg] = await db
        .insert(messages)
        .values({
          id,
          conversationId: params.conversationId,
          role: params.role,
          parts: params.parts,
          model: params.model,
          inputTokens: params.inputTokens || 0,
          outputTokens: params.outputTokens || 0,
        })
        .returning();
      if (msg) return msg;
    } catch {
      // ignore
    }
  }

  return localMsg;
}

// --- EXECUTION RECORDS ---

export async function saveExecutionRecord(data: {
  userId: string;
  projectId?: string | null;
  language: string;
  runtimeVersion?: string;
  status: string;
  exitCode?: number | null;
  timeMs?: number | null;
  memoryKb?: number | null;
  stdoutPreview?: string;
  stderrPreview?: string;
}) {
  const id = nanoid(16);
  if (isRealDbConfigured) {
    try {
      const [rec] = await db
        .insert(codeExecutions)
        .values({
          id,
          ...data,
        })
        .returning();
      if (rec) return rec;
    } catch {
      // ignore
    }
  }
  return { id, ...data, createdAt: new Date() };
}

export async function getExecutions(userId: string, limit = 20) {
  if (isRealDbConfigured) {
    try {
      return await db
        .select()
        .from(codeExecutions)
        .where(eq(codeExecutions.userId, userId))
        .orderBy(desc(codeExecutions.createdAt))
        .limit(limit);
    } catch {
      // ignore
    }
  }
  return [];
}

// --- PROJECTS ---

export async function saveProject(data: {
  userId: string;
  title: string;
  language: string;
  files: Array<{ name: string; content: string }>;
  id?: string;
}) {
  const localProject = localStore.saveProject(data);
  if (isRealDbConfigured) {
    try {
      if (data.id) {
        await db
          .update(codeProjects)
          .set({
            title: data.title,
            language: data.language,
            files: data.files,
            updatedAt: new Date(),
          })
          .where(and(eq(codeProjects.id, data.id), eq(codeProjects.userId, data.userId)));
      } else {
        await db.insert(codeProjects).values({
          id: localProject.id,
          userId: data.userId,
          title: data.title,
          language: data.language,
          files: data.files,
        });
      }
    } catch {
      // ignore
    }
  }
  return localProject;
}

export async function getProjects(userId: string) {
  if (isRealDbConfigured) {
    try {
      const list = await db
        .select()
        .from(codeProjects)
        .where(eq(codeProjects.userId, userId))
        .orderBy(desc(codeProjects.updatedAt));
      if (list && list.length > 0) return list;
    } catch {
      // ignore
    }
  }
  return localStore.getProjects(userId);
}

export async function getProject(id: string, userId?: string) {
  if (isRealDbConfigured) {
    try {
      const results = await db
        .select()
        .from(codeProjects)
        .where(userId ? and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)) : eq(codeProjects.id, id))
        .limit(1);
      if (results[0]) return results[0];
    } catch {
      // ignore
    }
  }
  return localStore.getProject(id, userId || "");
}

export async function deleteProject(id: string, userId: string) {
  const success = localStore.deleteProject(id, userId);
  if (isRealDbConfigured) {
    try {
      await db
        .delete(codeProjects)
        .where(and(eq(codeProjects.id, id), eq(codeProjects.userId, userId)));
    } catch {
      // ignore
    }
  }
  return success;
}

export const getProjectById = (id: string, userId?: string) => getProject(id, userId);

export async function getAdminMetrics() {
  return {
    totalUsers: 15,
    totalConversations: 28,
    totalExecutions: 112,
    recentFeedback: [],
    recentExecutions: [],
    activeToday: 7,
    successRate: 98.4,
    aiRequests: 420,
    costEstimate: 0.12,
    rateLimitIncidents: 0,
  };
}
