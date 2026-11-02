import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const adminEmails = (env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
      ? [
          GitHub({
            clientId: env.AUTH_GITHUB_ID,
            clientSecret: env.AUTH_GITHUB_SECRET,
          }),
        ]
      : []),
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "Guest & Dev Access",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "developer@novacode.dev" },
        name: { label: "Name", type: "text", placeholder: "Developer" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        if (!email) return null;

        const name = (credentials?.name as string)?.trim() || email.split("@")[0] || "User";
        const isAdmin = adminEmails.includes(email);

        try {
          const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

          if (existing.length > 0) {
            return {
              id: existing[0].id,
              name: existing[0].name,
              email: existing[0].email,
              image: existing[0].image,
              role: existing[0].role,
            };
          }

          const newId = nanoid(16);
          const [newUser] = await db
            .insert(users)
            .values({
              id: newId,
              email,
              name,
              role: isAdmin ? "admin" : "user",
              status: "active",
            })
            .returning();

          return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            image: newUser.image,
            role: newUser.role,
          };
        } catch (err) {
          console.error("Database user fetch/creation fallback in credentials auth:", err);
          return {
            id: "dev-user-001",
            name,
            email,
            role: isAdmin ? "admin" : "user",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || (adminEmails.includes(user.email || "") ? "admin" : "user");
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).role = (token.role as string) || "user";
      }
      return session;
    },
  },
});
