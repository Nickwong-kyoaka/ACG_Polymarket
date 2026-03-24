import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import type { UserRole } from "@/lib/types";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (
  process.env.EMAIL_SERVER_HOST &&
  process.env.EMAIL_SERVER_USER &&
  process.env.EMAIL_SERVER_PASSWORD &&
  process.env.EMAIL_FROM
) {
  providers.push(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "Demo login",
    credentials: {
      handle: { label: "Handle", type: "text" },
    },
    async authorize(credentials) {
      const handle = credentials?.handle?.trim() || "kyoaka";
      return {
        id: process.env.DEMO_USER_ID ?? "viewer-001",
        name: handle === "kyoaka" ? "Kyoaka" : handle,
        email: `${handle}@demo.local`,
        role: (process.env.DEMO_ADMIN_ENABLED === "true" ? "ADMIN" : "USER") as UserRole,
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: UserRole }).role ?? "USER";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole | undefined) ?? "USER";
      }

      return session;
    },
  },
  pages: {
    signIn: "/onboarding",
  },
};

export function getAppSession() {
  return getServerSession(authOptions);
}
