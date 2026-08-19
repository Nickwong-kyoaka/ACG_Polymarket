import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@/lib/types";
import { AuthenticationError, AuthorizationError } from "@/lib/api";
import { STARTER_BALANCE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [];
const demoMode = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function handleBase(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/@.*$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "supporter"
  ).slice(0, 24);
}

async function provisionUser(input: {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string;
  providerAccountId?: string;
}) {
  const email = input.email?.toLowerCase() ?? null;
  const requestedAdmin = Boolean(email && adminEmails().includes(email));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
    const existing = email
      ? await tx.user.findUnique({ where: { email } })
      : input.id
        ? await tx.user.findUnique({ where: { id: input.id } })
        : null;
    const role: UserRole = requestedAdmin || existing?.role === "ADMIN" ? "ADMIN" : "USER";
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { name: input.name ?? existing.name, image: input.image ?? existing.image, role },
        })
      : await tx.user.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            email,
            name: input.name ?? "Supporter",
            image: input.image,
            role,
          },
        });

    const candidate = `${handleBase(email ?? input.name ?? user.id)}-${user.id.slice(-5)}`;
    const wallet = await tx.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, softBalance: STARTER_BALANCE, premiumBalance: 0 },
      update: {},
    });
    await tx.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        handle: candidate,
        displayName: input.name ?? "Supporter",
        bio: "A new supporter in the ACG Exchange.",
        favoriteTags: [],
        pinnedCharacterIds: [],
      },
      update: input.name ? { displayName: input.name } : {},
    });
    await tx.ledgerEntry.upsert({
      where: { idempotencyKey: `starter-${user.id}` },
      create: {
        walletId: wallet.id,
        currencyType: "SOFT",
        delta: STARTER_BALANCE,
        balanceAfter: STARTER_BALANCE,
        referenceType: "STARTER_GRANT",
        referenceId: user.id,
        idempotencyKey: `starter-${user.id}`,
      },
      update: {},
    });
    if (input.provider && input.providerAccountId) {
      await tx.authIdentity.upsert({
        where: {
          provider_providerAccountId: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
          },
        },
        create: { userId: user.id, provider: input.provider, providerAccountId: input.providerAccountId },
        update: { userId: user.id },
      });
    }
        return user;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 2) throw error;
    }
  }

  throw new Error("User provisioning retry limit reached.");
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (demoMode) {
  providers.push(
    CredentialsProvider({
    name: "Demo login",
    credentials: {
      handle: { label: "Handle", type: "text" },
    },
      async authorize(credentials) {
      const handle =
        typeof credentials?.handle === "string" ? credentials.handle.trim() || "kyoaka" : "kyoaka";
        const user = await provisionUser({
          id: process.env.DEMO_USER_ID ?? "viewer-001",
          name: handle === "kyoaka" ? "Kyoaka" : handle,
          email: `${handle}@demo.local`,
          provider: "credentials",
          providerAccountId: handle,
        });
        return { ...user, role: user.role as UserRole };
      },
    }),
  );
}

export const authOptions: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.RENDER === "true",
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      const provisioned = await provisionUser({
        id: demoMode && account?.provider === "credentials" ? user.id : undefined,
        email: user.email,
        name: user.name,
        image: user.image,
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });
      user.id = provisioned.id;
      (user as typeof user & { role?: UserRole }).role = provisioned.role as UserRole;
      return true;
    },
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

export const { auth, handlers } = NextAuth(authOptions);

export function getAppSession() {
  return auth();
}

export async function getOptionalSessionUserId() {
  const session = await getAppSession();
  if (session?.user?.id) {
    return session.user.id;
  }

  return demoMode ? process.env.DEMO_USER_ID ?? "viewer-001" : undefined;
}

export async function requireSessionUserId() {
  const userId = await getOptionalSessionUserId();
  if (!userId) {
    throw new AuthenticationError();
  }
  return userId;
}

export async function requireAdminSessionUserId() {
  const userId = await requireSessionUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthenticationError();
  }
  if (user.role !== "ADMIN" && (!user.email || !adminEmails().includes(user.email.toLowerCase()))) {
    throw new AuthorizationError("Admin privileges are required.");
  }
  return userId;
}
