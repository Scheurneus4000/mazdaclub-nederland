import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { ensureOwnerRole } from "@/lib/accounts";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mailadres", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Bescherming tegen brute force: max. 8 pogingen per e-mailadres per 15 minuten.
        if (!rateLimit(`login:${email}`, 8, 15 * 60_000).ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Altijd een hash vergelijken, zodat de responstijd niet verraadt of een account bestaat.
        const hash = user?.passwordHash ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5YvBz7Z1Q8y5Bz8V4vD3lH2E2nJk5aW";
        const valid = await bcrypt.compare(password, hash);
        if (!user || !valid) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        // Eigenaar met bevestigd e-mailadres krijgt (alsnog) automatisch beheerdersrechten.
        const promoted = await ensureOwnerRole(user).catch((err) => {
          console.error("[inloggen] eigenaarscontrole mislukt", err);
          return false;
        });
        return { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: promoted ? "ADMIN" : user.role };
      },
    }),
  ],
});

export const PASSWORD_HASH_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
