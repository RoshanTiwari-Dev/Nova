import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

// --- Auth.js Tables ---

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    role: text("role").default("user").notNull(), // 'user' | 'admin'
    status: text("status").default("active").notNull(),
    preferences: jsonb("preferences").$type<{
      theme?: "light" | "dark" | "system";
      responseStyle?: "concise" | "detailed" | "beginner" | "advanced";
      customInstructions?: string;
      memory?: boolean;
    }>().default({
      theme: "dark",
      responseStyle: "detailed",
      customInstructions: "",
      memory: false,
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("users_created_at_idx").on(table.createdAt),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// --- Core NOVA Tables ---

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("conversations_user_id_idx").on(table.userId),
    createdAtIdx: index("conversations_created_at_idx").on(table.createdAt),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system'
    parts: jsonb("parts").$type<any>().notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    blobUrl: text("blob_url").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    size: integer("size").notNull(),
    status: text("status").default("uploaded").notNull(),
    extractedText: text("extracted_text"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("attachments_user_id_idx").on(table.userId),
    conversationIdIdx: index("attachments_conversation_id_idx").on(table.conversationId),
  })
);

export const codeProjects = pgTable(
  "code_projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: text("language").notNull(),
    files: jsonb("files").$type<Array<{ name: string; content: string }>>().notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("code_projects_user_id_idx").on(table.userId),
    createdAtIdx: index("code_projects_created_at_idx").on(table.createdAt),
  })
);

export const codeExecutions = pgTable(
  "code_executions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => codeProjects.id, {
      onDelete: "set null",
    }),
    language: text("language").notNull(),
    runtimeVersion: text("runtime_version"),
    status: text("status").notNull(),
    exitCode: integer("exit_code"),
    timeMs: integer("time_ms"),
    memoryKb: integer("memory_kb"),
    stdoutPreview: text("stdout_preview"),
    stderrPreview: text("stderr_preview"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("code_executions_user_id_idx").on(table.userId),
    createdAtIdx: index("code_executions_created_at_idx").on(table.createdAt),
  })
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    rating: text("rating").notNull(), // 'up' | 'down'
    comment: text("comment"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("feedback_user_id_idx").on(table.userId),
    messageIdIdx: index("feedback_message_id_idx").on(table.messageId),
  })
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'ai' | 'run'
    tokens: integer("tokens").default(0).notNull(),
    costEstimate: numeric("cost_estimate", { precision: 10, scale: 6 }).default("0"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("usage_records_user_id_idx").on(table.userId),
    createdAtIdx: index("usage_records_created_at_idx").on(table.createdAt),
  })
);

export const savedPrompts = pgTable(
  "saved_prompts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("saved_prompts_user_id_idx").on(table.userId),
  })
);
