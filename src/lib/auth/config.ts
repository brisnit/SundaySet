import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { z } from "zod";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        select: { id: true, email: true, name: true, image: true, passwordHash: true },
      });

      const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
      if (!user || !ok) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

// Magic-link sign-in is only offered when email is actually configured, so the
// UI never shows a button that silently does nothing.
if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "SetMeister <noreply@setmeister.app>",
    }),
  );
}

export const authConfig: NextAuthConfig = {
  // PrismaAdapter is typed against a Prisma 6 style client import. Our client is
  // generated to src/generated/prisma, so the shapes match structurally but not
  // nominally.
  adapter: PrismaAdapter(db as never),
  providers,
  // Credentials sign-in requires JWT sessions; the adapter still backs magic
  // links via the VerificationToken table.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  trustHost: true,
};
