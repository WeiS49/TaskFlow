import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      timezone: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    timezone: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, timezone: user.timezone };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.timezone = (user as { timezone?: string }).timezone ?? "UTC";
      }
      // Refresh timezone from DB so settings changes take effect without re-login
      if (token.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
          columns: { timezone: true },
        });
        if (dbUser) token.timezone = dbUser.timezone;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.timezone = token.timezone ?? "UTC";
      return session;
    },
  },
});
