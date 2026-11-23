import type { NextAuthConfig } from "next-auth";

export type Role = "USER" | "ADMIN";

/**
 * Edge-veilige Auth.js-configuratie (geen Prisma/bcrypt), gedeeld met de middleware.
 * De Credentials-provider staat in src/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/inloggen" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      // /admin: hier alleen "ingelogd" controleren. De beheerdersrol wordt bij elke pagina en actie
      // opnieuw uit de database gelezen (requireAdmin), zodat een net gepromoveerde eigenaar niet
      // opnieuw hoeft in te loggen en een ingetrokken rol direct geldt. Geen beheerder → /account.
      if (pathname.startsWith("/admin")) return isLoggedIn; // false → /inloggen?callbackUrl=...
      if (pathname.startsWith("/account")) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
