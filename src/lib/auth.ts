import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Parse AUTH_ALLOWLIST (comma-separated emails) into a normalized set.
 * Only allowlisted emails may sign in — this app holds member PII.
 */
function getAllowlist(): Set<string> {
  const raw = process.env.AUTH_ALLOWLIST ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      const allowlist = getAllowlist();
      // Fail closed: empty allowlist rejects everyone
      if (allowlist.size === 0) {
        console.error(
          "[auth] AUTH_ALLOWLIST is empty — rejecting all sign-ins",
        );
        return false;
      }
      return allowlist.has(email);
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
      }
      // Default role; Ticket 11 may expand to read-only GK/trustee
      token.role = "fs";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.image = token.picture as string | null | undefined;
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
        pathname === "/api/cron/daily"; // protected by CRON_SECRET itself

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  trustHost: true,
});
