import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Adapter } from 'next-auth/adapters';

/** Roles supported by Zippp.link */
type UserRole = 'ADMIN' | 'SELLER';

/** Extend built-in session/token types */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }
  interface User {
    role?: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
    id?: string;
  }
}

/** Local-dev mock credentials — never used in production */
const DEV_CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  'admin@zippp.link': { password: 'admin', role: 'ADMIN' },
  'seller@zippp.link': { password: 'seller', role: 'SELLER' },
};

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as Adapter,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),

    CredentialsProvider({
      id: 'credentials',
      name: 'Local Dev Mock',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const mock = DEV_CREDENTIALS[credentials.email];
        if (!mock || mock.password !== credentials.password) return null;

        // Return a minimal user object — role is injected via jwt callback
        return {
          id: `mock-${credentials.email}`,
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: mock.role,
        };
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in `user` is populated; persist role into token
      if (user) {
        token.id = user.id;
        // Prefer role from the user object (credentials mock sets it)
        if ((user as { role?: UserRole }).role) {
          token.role = (user as { role?: UserRole }).role;
        } else if (user.email) {
          // OAuth sign-in — look up role from DB
          try {
            const [dbUser] = await db
              .select({ role: users.role })
              .from(users)
              .where(eq(users.email, user.email))
              .limit(1);
            token.role = (dbUser?.role as UserRole) ?? 'SELLER';
          } catch {
            token.role = 'SELLER';
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = token.role ?? 'SELLER';
      }
      return session;
    },
  },

  pages: {
    signIn: '/api/auth/signin',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
