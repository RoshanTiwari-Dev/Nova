import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, createUser } from "@/lib/db/queries";
import { verifyPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import { nanoid } from "nanoid";

const adminEmails = (env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      name: "NOVA Access",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isGuest: { label: "isGuest", type: "text" },
      },
      async authorize(credentials) {
        const isGuest = credentials?.isGuest === "true";

        // 1. GUEST MODE
        if (isGuest) {
          const guestId = `guest-${nanoid(8)}`;
          const guestUser = await createUser({
            id: guestId,
            name: (credentials?.name as string) || "Guest User",
            email: `${guestId}@nova.local`,
            role: "user",
            isGuest: true,
          });
          return {
            id: guestUser.id,
            name: guestUser.name,
            email: guestUser.email,
            role: guestUser.role,
            isGuest: true,
          };
        }

        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;

        if (!email) return null;

        const isAdmin = adminEmails.includes(email);

        // 2. DEVELOPER SHORTCUT LOGIN
        if (email === "developer@novacode.dev") {
          return {
            id: "dev-user-001",
            name: "Developer",
            email: "developer@novacode.dev",
            role: "admin",
            isGuest: false,
          };
        }

        // 3. REGISTERED USER LOGIN WITH PASSWORD
        const user = await getUserByEmail(email);

        if (!user) {
          throw new Error("No account found with this email. Please register first.");
        }

        if ((user as any).password) {
          if (!password) {
            throw new Error("Password is required to sign in.");
          }
          const isValid = verifyPassword(password, (user as any).password);
          if (!isValid) {
            throw new Error("Invalid password. Please try again.");
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: isAdmin ? "admin" : (user.role || "user"),
          isGuest: false,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || (adminEmails.includes(user.email || "") ? "admin" : "user");
        token.isGuest = (user as any).isGuest || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).role = (token.role as string) || "user";
        (session.user as any).isGuest = Boolean(token.isGuest);
      }
      return session;
    },
  },
});
