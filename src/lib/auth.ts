import { timingSafeEqual } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Single-officer credentials auth.
 * Set AUTH_USER_EMAIL + AUTH_USER_PASSWORD in env (Vercel / .env.local).
 */
function credentialsConfigured(): boolean {
  return Boolean(
    process.env.AUTH_USER_EMAIL?.trim() && process.env.AUTH_USER_PASSWORD,
  );
}

function safeEqualString(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still compare to reduce obvious timing leaks on length
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentialsConfigured()) {
          console.error(
            "[auth] AUTH_USER_EMAIL / AUTH_USER_PASSWORD not set — rejecting",
          );
          return null;
        }

        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        const expectedEmail = process.env.AUTH_USER_EMAIL!.trim().toLowerCase();
        const expectedPassword = process.env.AUTH_USER_PASSWORD!;

        const emailOk = safeEqualString(email, expectedEmail);
        const passwordOk = safeEqualString(password, expectedPassword);

        if (!emailOk || !passwordOk) return null;

        return {
          id: "fs-primary",
          email: expectedEmail,
          name: process.env.AUTH_USER_NAME?.trim() || "Financial Secretary",
          role: "fs",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role ?? "fs";
      }
      if (!token.role) token.role = "fs";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.role = (token.role as string) ?? "fs";
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!session?.user;
      const isPublic =
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron") ||
        pathname.startsWith("/api/webhooks");

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  trustHost: true,
});
