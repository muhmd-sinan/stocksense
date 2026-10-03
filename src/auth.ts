import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { createShopForUser } from "@/lib/onboarding";
import { verifyPassword } from "@/lib/password";

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const credentialsSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts }),
  // Credentials provider requires JWT sessions
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Fires for OAuth sign-ups via the adapter. Credentials sign-up creates the shop itself.
    async createUser({ user }) {
      if (user.id) await createShopForUser(user.id, user.name ? `${user.name}'s shop` : "My shop");
    },
  },
});
