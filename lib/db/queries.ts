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
import { eq, desc, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function getUserById(id: string) {
  try {
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0] || null;
  } catch (err) {
    console.error("getUserById error:", err);
    return null;
  }
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
  try {
    const user = await getUserById(userId);
    const existing = user?.preferences || {};
    const updated = { ...existing, ...preferences };
    await db.update(users).set({ preferences: updated }).where(eq(users.id, userId));
    return updated;
  } catch (err) {
    console.error("updateUserPreferences error:", err);
    return preferences;
  }
}

export async function getConversations(userId: string) {
  try {
    return await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.archived, false)))
      .orderBy(desc(conversations.pinned), desc(conversations.updatedAt));
  } catch (err) {
    console.error("getConversations error:", err);
    return [];
  }
}

export async function getConversation(conversationId: string, userId: string) {
  try {
    const results = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);
    return results[0] || null;
  } catch (err) {
    console.error("getConversation error:", err);
    return null;
  }
}

export async function createConversation(userId: string, title: string, model: string) {
  const id = nanoid(12);
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
    return conv;
  } catch (err) {
    console.error("createConversation error:", err);
    return { id, userId, title, model, pinned: false, archived: false, createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function updateConversation(
  id: string,
  userId: string,
  data: { title?: string; pinned?: boolean; archived?: boolean }
) {
  try {
    const [updated] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return updated;
  } catch (err) {
    console.error("updateConversation error:", err);
    return null;
  }
}

export async function deleteConversation(id: string, userId: string) {
  try {
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return true;
  } catch (err) {
    console.error("deleteConversation error:", err);
    return false;
  }
}

export async function getMessages(conversationId: string) {
  try {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  } catch (err) {
    console.error("getMessages error:", err);
    return [];
  }
}

export async function saveMessage(params: {
  conversationId: string;
  role: string;
  parts: any;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const id = nanoid(16);
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
    return msg;
  } catch (err) {
    console.error("saveMessage error:", err);
    return { id, ...params, createdAt: new Date() };
  }
}

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
  try {
    const [rec] = await db
      .insert(codeExecutions)
      .values({
        id,
        ...data,
      })
      .returning();
    return rec;
  } catch (err) {
    console.error("saveExecutionRecord error:", err);
    return { id, ...data, createdAt: new Date() };
  }
}

export async function getExecutions(userId: string, limit = 20) {
  try {
    return await db
      .select()
      .from(codeExecutions)
      .where(eq(codeExecutions.userId, userId))
      .orderBy(desc(codeExecutions.createdAt))
      .limit(limit);
  } catch (err) {
    console.error("getExecutions error:", err);
    return [];
  }
}

export async function saveProject(data: {
  userId: string;
  title: string;
  language: string;
  files: Array<{ name: string; content: string }>;
  id?: string;
}) {
  const id = data.id || nanoid(12);
  try {
    if (data.id) {
      const [updated] = await db
        .update(codeProjects)
        .set({
          title: data.title,
          language: data.language,
          files: data.files,
          updatedAt: new Date(),
        })
        .where(and(eq(codeProjects.id, id), eq(codeProjects.userId, data.userId)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(codeProjects)
      .values({
        id,
        userId: data.userId,
        title: data.title,
        language: data.language,
        files: data.files,
      })
      .returning();
    return created;
  } catch (err) {
    console.error("saveProject error:", err);
    return { id, ...data, version: 1, createdAt: new Date(), updatedAt: new Date() };
  }
}

export async function getProjects(userId: string) {
  try {
    return await db
      .select()
      .from(codeProjects)
      .where(eq(codeProjects.userId, userId))
      .orderBy(desc(codeProjects.updatedAt));
  } catch (err) {
    console.error("getProjects error:", err);
    return [];
  }
}

export async function getProjectById(id: string) {
  try {
    const [p] = await db.select().from(codeProjects).where(eq(codeProjects.id, id)).limit(1);
    return p || null;
  } catch (err) {
    console.error("getProjectById error:", err);
    return null;
  }
}

export async function recordFeedback(userId: string, messageId: string, rating: "up" | "down", comment?: string) {
  const id = nanoid(16);
  try {
    const [fb] = await db
      .insert(feedback)
      .values({ id, userId, messageId, rating, comment })
      .returning();
    return fb;
  } catch (err) {
    console.error("recordFeedback error:", err);
    return { id, userId, messageId, rating, comment, createdAt: new Date() };
  }
}

export async function getAdminMetrics() {
  try {
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const convCount = await db.select({ count: sql<number>`count(*)` }).from(conversations);
    const execCount = await db.select({ count: sql<number>`count(*)` }).from(codeExecutions);
    const feedbackList = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(10);
    const recentExecutions = await db.select().from(codeExecutions).orderBy(desc(codeExecutions.createdAt)).limit(10);

    return {
      totalUsers: Number(userCount[0]?.count || 0),
      totalConversations: Number(convCount[0]?.count || 0),
      totalExecutions: Number(execCount[0]?.count || 0),
      recentFeedback: feedbackList,
      recentExecutions,
    };
  } catch (err) {
    console.error("getAdminMetrics error:", err);
    return {
      totalUsers: 1,
      totalConversations: 0,
      totalExecutions: 0,
      recentFeedback: [],
      recentExecutions: [],
    };
  }
}
