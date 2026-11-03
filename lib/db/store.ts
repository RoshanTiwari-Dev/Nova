import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

interface StoredUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  isGuest?: boolean;
  image?: string;
  preferences?: {
    theme?: "light" | "dark" | "system";
    responseStyle?: "concise" | "detailed" | "beginner" | "advanced";
    customInstructions?: string;
    memory?: boolean;
  };
  createdAt: string;
}

interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  parts: any;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

interface StoredProject {
  id: string;
  userId: string;
  title: string;
  language: string;
  files: Array<{ name: string; content: string }>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseData {
  users: StoredUser[];
  conversations: StoredConversation[];
  messages: StoredMessage[];
  projects: StoredProject[];
  executions: any[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "nova-db.json");

function getDefaultData(): DatabaseData {
  return {
    users: [
      {
        id: "dev-user-001",
        name: "Developer",
        email: "developer@novacode.dev",
        role: "admin",
        isGuest: false,
        preferences: {
          theme: "dark",
          responseStyle: "detailed",
          customInstructions: "",
          memory: false,
        },
        createdAt: new Date().toISOString(),
      },
    ],
    conversations: [],
    messages: [],
    projects: [],
    executions: [],
  };
}

let cachedData: DatabaseData | null = null;

function loadData(): DatabaseData {
  if (cachedData) return cachedData;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      cachedData = JSON.parse(content);
      return cachedData!;
    }
  } catch (err) {
    console.error("Failed to read local store, using default:", err);
  }

  cachedData = getDefaultData();
  saveData(cachedData);
  return cachedData;
}

function saveData(data: DatabaseData): void {
  try {
    cachedData = data;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error("Failed to write to local store:", err);
  }
}

export const localStore = {
  // --- USERS ---
  getUserById(id: string): StoredUser | null {
    const data = loadData();
    return data.users.find((u) => u.id === id) || null;
  },

  getUserByEmail(email: string): StoredUser | null {
    const data = loadData();
    const clean = email.trim().toLowerCase();
    return data.users.find((u) => u.email.toLowerCase() === clean) || null;
  },

  createUser(user: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    role?: "user" | "admin";
    isGuest?: boolean;
    image?: string;
  }): StoredUser {
    const data = loadData();
    const existing = this.getUserByEmail(user.email);
    if (existing) return existing;

    const newUser: StoredUser = {
      id: user.id || nanoid(16),
      name: user.name,
      email: user.email.trim().toLowerCase(),
      password: user.password,
      role: user.role || "user",
      isGuest: Boolean(user.isGuest),
      image: user.image,
      preferences: {
        theme: "dark",
        responseStyle: "detailed",
        customInstructions: "",
        memory: false,
      },
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    saveData(data);
    return newUser;
  },

  updateUserPreferences(userId: string, preferences: any): any {
    const data = loadData();
    const user = data.users.find((u) => u.id === userId);
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      saveData(data);
      return user.preferences;
    }
    return preferences;
  },

  // --- CONVERSATIONS ---
  getConversations(userId: string): StoredConversation[] {
    const data = loadData();
    return data.conversations
      .filter((c) => c.userId === userId && !c.archived)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  },

  getConversation(id: string, userId: string): StoredConversation | null {
    const data = loadData();
    return data.conversations.find((c) => c.id === id && c.userId === userId) || null;
  },

  createConversation(params: {
    id?: string;
    userId: string;
    title: string;
    model?: string;
  }): StoredConversation {
    const data = loadData();
    const existing = data.conversations.find((c) => c.id === params.id);
    if (existing) return existing;

    const newConv: StoredConversation = {
      id: params.id || nanoid(12),
      userId: params.userId,
      title: params.title || "New Conversation",
      model: params.model || "openai/gpt-oss-120b",
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.conversations.unshift(newConv);
    saveData(data);
    return newConv;
  },

  updateConversation(
    id: string,
    userId: string,
    updates: { title?: string; pinned?: boolean; archived?: boolean }
  ): StoredConversation | null {
    const data = loadData();
    const conv = data.conversations.find((c) => c.id === id && c.userId === userId);
    if (!conv) return null;

    if (updates.title !== undefined) conv.title = updates.title;
    if (updates.pinned !== undefined) conv.pinned = updates.pinned;
    if (updates.archived !== undefined) conv.archived = updates.archived;
    conv.updatedAt = new Date().toISOString();

    saveData(data);
    return conv;
  },

  deleteConversation(id: string, userId: string): boolean {
    const data = loadData();
    const initialLen = data.conversations.length;
    data.conversations = data.conversations.filter(
      (c) => !(c.id === id && c.userId === userId)
    );
    // Also delete associated messages
    data.messages = data.messages.filter((m) => m.conversationId !== id);
    saveData(data);
    return data.conversations.length < initialLen;
  },

  // --- MESSAGES ---
  getMessages(conversationId: string): StoredMessage[] {
    const data = loadData();
    return data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  saveMessage(params: {
    id?: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    parts: any;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  }): StoredMessage {
    const data = loadData();
    const newMsg: StoredMessage = {
      id: params.id || nanoid(16),
      conversationId: params.conversationId,
      role: params.role,
      parts: params.parts,
      model: params.model,
      inputTokens: params.inputTokens || 0,
      outputTokens: params.outputTokens || 0,
      createdAt: new Date().toISOString(),
    };

    // Update conversation updatedAt
    const conv = data.conversations.find((c) => c.id === params.conversationId);
    if (conv) {
      conv.updatedAt = new Date().toISOString();
    }

    data.messages.push(newMsg);
    saveData(data);
    return newMsg;
  },

  // --- PROJECTS ---
  getProjects(userId: string): StoredProject[] {
    const data = loadData();
    return data.projects.filter((p) => p.userId === userId);
  },

  getProject(id: string, userId?: string): StoredProject | null {
    const data = loadData();
    return data.projects.find((p) => p.id === id && (!userId || p.userId === userId)) || null;
  },

  saveProject(params: {
    id?: string;
    userId: string;
    title: string;
    language: string;
    files: Array<{ name: string; content: string }>;
  }): StoredProject {
    const data = loadData();
    const id = params.id || nanoid(12);
    const existing = data.projects.find((p) => p.id === id && p.userId === params.userId);

    if (existing) {
      existing.title = params.title;
      existing.language = params.language;
      existing.files = params.files;
      existing.version = (existing.version || 1) + 1;
      existing.updatedAt = new Date().toISOString();
      saveData(data);
      return existing;
    }

    const newProject: StoredProject = {
      id,
      userId: params.userId,
      title: params.title,
      language: params.language,
      files: params.files,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.projects.unshift(newProject);
    saveData(data);
    return newProject;
  },

  deleteProject(id: string, userId: string): boolean {
    const data = loadData();
    const initialLen = data.projects.length;
    data.projects = data.projects.filter((p) => !(p.id === id && p.userId === userId));
    saveData(data);
    return data.projects.length < initialLen;
  },
};
