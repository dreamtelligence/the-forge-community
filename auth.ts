import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Resend from 'next-auth/providers/resend';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { Resend as ResendClient } from 'resend';
import { timingSafeEqual } from 'node:crypto';
import { assignFounderNumberIfMissing } from '@/lib/founder-number';
import { isLoginAllowedDuringClosedBeta } from '@/lib/beta-access.server';
import { isConfiguredAdminEmail } from '@/lib/admin-access';
import { getCaseworkerLoginEmail, isCaseworkerCredentialsEnabled } from '@/lib/caseworker-login';
import { ensureSessionUser } from '@/lib/session-user';

const resendClient = new ResendClient(process.env.AUTH_RESEND_KEY);
const resendFrom =
  process.env.AUTH_RESEND_FROM ||
  (process.env.NODE_ENV === 'production'
    ? 'STAKE & SCALE <info@stakeandscale.de>'
    : 'onboarding@resend.dev');

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

const providers: Provider[] = [
  Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: resendFrom,
      async sendVerificationRequest({ identifier: email, url }) {
        if (!isLoginAllowedDuringClosedBeta(email)) {
          throw new Error('BETA_ACCESS_CLOSED');
        }
        try {
          await resendClient.emails.send({
            from: 'STAKE & SCALE <info@stakeandscale.de>',
            to: email,
            subject: 'Dein Login Link für STAKE & SCALE',
            html: `
              <body style="background: #000; color: #fff; font-family: sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; border-radius: 10px; padding: 40px; text-align: center;">
                  <h1 style="color: #3b82f6; margin-bottom: 20px;">Willkommen zurück.</h1>
                  <p style="color: #ccc; margin-bottom: 30px;">Klicke auf den Button, um dich sicher einzuloggen.</p>
                  <a href="${url}" style="background: #3b82f6; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Jetzt einloggen
                  </a>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Falls du diesen Login nicht angefordert hast, kannst du diese Email ignorieren.
                  </p>
                </div>
              </body>
            `,
            text: `Login Link: ${url}`,
          });
          console.log('Verification email sent to:', email);
        } catch (error) {
          console.error('Failed to send verification email:', error);
          throw new Error('Failed to send verification email');
        }
      },
    })
];

if (isCaseworkerCredentialsEnabled()) {
  providers.push(
    Credentials({
      name: 'Sachbearbeiter Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const expectedUsername = getCaseworkerLoginEmail();
        const expectedPassword = process.env.CASEWORKER_LOGIN_PASSWORD || '';
        const providedUsername =
          typeof credentials?.username === 'string'
            ? credentials.username.trim().toLowerCase()
            : '';
        const providedPassword =
          typeof credentials?.password === 'string' ? credentials.password : '';

        if (!expectedPassword) {
          console.warn('CASEWORKER_LOGIN_PASSWORD is missing; credentials login is disabled.');
          return null;
        }

        if (!constantTimeEqual(providedUsername, expectedUsername)) {
          return null;
        }

        if (!constantTimeEqual(providedPassword, expectedPassword)) {
          return null;
        }

        const dbUser = await ensureSessionUser({
          email: expectedUsername,
          name: 'Sachbearbeiter',
        });

        return {
          id: dbUser.id,
          email: expectedUsername,
          name: 'Sachbearbeiter',
        };
      },
    })
  );
}

async function promoteConfiguredAdminByEmail(email: string | null | undefined) {
  const targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;
  if (!targetEmail || !isConfiguredAdminEmail(targetEmail)) {
    return;
  }

  await prisma.user.updateMany({
    where: {
      email: targetEmail,
      role: { not: 'ADMIN' },
    },
    data: { role: 'ADMIN' },
  });
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === 'development',
  providers,
  callbacks: {
    // Closed beta access control is enforced here.
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user?.email) return false;
      if (!isLoginAllowedDuringClosedBeta(user.email)) {
        return '/login?error=BetaAccess';
      }
      const account = await prisma.user.findUnique({
        where: { email: user.email },
        select: { accountStatus: true }
      });
      if (account?.accountStatus === 'DELETED') return false;

      await promoteConfiguredAdminByEmail(user.email);
      return true;
    },
    async jwt({ token }) {
      if (!token.sub) return token;
      const account = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { accountStatus: true, onboardingComplete: true, role: true }
      });
      const tokenEmail = typeof token.email === 'string' ? token.email : undefined;

      if (isConfiguredAdminEmail(tokenEmail) && account?.role !== 'ADMIN') {
        await promoteConfiguredAdminByEmail(tokenEmail);
      }

      token.accountStatus = account?.accountStatus ?? 'ACTIVE';
      token.onboardingComplete = account?.onboardingComplete ?? false;
      token.role =
        (isConfiguredAdminEmail(tokenEmail) ? 'ADMIN' : account?.role) ?? 'USER';
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (session.user) {
        const accountStatus =
          (token as { accountStatus?: 'ACTIVE' | 'DELETED' }).accountStatus ?? 'ACTIVE';
        session.user.accountStatus = accountStatus;
        session.user.onboardingComplete =
          (token as { onboardingComplete?: boolean }).onboardingComplete ?? false;
        session.user.role =
          (token as { role?: 'USER' | 'ADMIN' | 'FOUNDER' | 'MENTOR' }).role ?? 'USER';
      }
      return session;
    }
  },
  events: {
    async createUser({ user }) {
      if (user?.id) {
        await assignFounderNumberIfMissing(user.id);
        const initialCreditsRaw = Number.parseInt(process.env.INITIAL_CREDITS ?? '0', 10);
        const initialCredits = Number.isFinite(initialCreditsRaw)
          ? Math.max(0, initialCreditsRaw)
          : 0;
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: initialCredits }
        });
      }

      if (isConfiguredAdminEmail(user.email)) {
        await promoteConfiguredAdminByEmail(user.email);
      }

      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return;

      try {
        const createdAt = new Date().toISOString();
        await resendClient.emails.send({
          from: resendFrom,
          to: adminEmail,
          subject: 'Neue Registrierung bei STAKE & SCALE',
          html: `
            <body style="font-family: sans-serif; padding: 20px;">
              <h2>Neue User-Registrierung</h2>
              <p><strong>Email:</strong> ${user.email ?? 'Unbekannt'}</p>
              <p><strong>Name:</strong> ${user.name ?? 'Unbekannt'}</p>
              <p><strong>User ID:</strong> ${user.id ?? 'Unbekannt'}</p>
              <p><strong>Zeit:</strong> ${createdAt}</p>
            </body>
          `,
          text: [
            'Neue User-Registrierung',
            `Email: ${user.email ?? 'Unbekannt'}`,
            `Name: ${user.name ?? 'Unbekannt'}`,
            `User ID: ${user.id ?? 'Unbekannt'}`,
            `Zeit: ${createdAt}`
          ].join('\n'),
        });
      } catch (error) {
        console.error('Failed to send admin signup notification:', error);
      }
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET, // Explizit setzen
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-authjs.session-token' 
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
