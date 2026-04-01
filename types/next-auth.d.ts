import type { DefaultSession } from 'next-auth';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      accountStatus?: 'ACTIVE' | 'DELETED';
      onboardingComplete?: boolean;
      role?: Role;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accountStatus?: 'ACTIVE' | 'DELETED';
    onboardingComplete?: boolean;
    role?: Role;
  }
}
