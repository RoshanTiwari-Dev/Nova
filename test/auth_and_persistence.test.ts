import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { localStore } from "../lib/db/store";

describe("Authentication & Password Hashing", () => {
  it("should securely hash a password and verify it correctly", () => {
    const raw = "SuperSecret123!";
    const hashed = hashPassword(raw);

    expect(hashed).toContain(":");
    expect(verifyPassword(raw, hashed)).toBe(true);
    expect(verifyPassword("WrongPassword", hashed)).toBe(false);
  });

  it("should register a new user in the store", () => {
    const email = `testuser_${Date.now()}@example.com`;
    const user = localStore.createUser({
      name: "Test User",
      email,
      password: hashPassword("mypassword"),
      role: "user",
      isGuest: false,
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);

    const retrieved = localStore.getUserByEmail(email);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Test User");
  });

  it("should create guest user sessions", () => {
    const guest = localStore.createUser({
      name: "Guest Explorer",
      email: `guest-${Date.now()}@nova.local`,
      isGuest: true,
    });

    expect(guest.isGuest).toBe(true);
  });
});

describe("Message Persistence & Conversation Memory", () => {
  it("should persist conversation and retrieve messages sequentially", () => {
    const convId = `conv-test-${Date.now()}`;
    const userId = "dev-user-001";

    const conv = localStore.createConversation({
      id: convId,
      userId,
      title: "Testing Banking Inquiry",
    });

    expect(conv.id).toBe(convId);

    // Save user message
    localStore.saveMessage({
      conversationId: convId,
      role: "user",
      parts: [{ type: "text", text: "Tell me about ICICI Bank" }],
    });

    // Save assistant message
    localStore.saveMessage({
      conversationId: convId,
      role: "assistant",
      parts: [{ type: "text", text: "ICICI Bank is a leading Indian private bank..." }],
    });

    // Retrieve messages
    const msgs = localStore.getMessages(convId);
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("assistant");
    expect(msgs[1].parts[0].text).toContain("ICICI Bank");
  });
});
