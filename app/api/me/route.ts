import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { ensureProfileSlug } from '@/lib/user/profile';
import { assignFounderNumberIfMissing } from '@/lib/user/founder-number';
import { Prisma } from '@prisma/client';
import { ensureSessionUser } from '@/lib/user/session';

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ensuredUser = await ensureSessionUser({
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    const user = await prisma.user.findUnique({
      where: { id: ensuredUser.id },
      select: {
        id: true,
        name: true,
        profileSlug: true,
        email: true,
        image: true,
        role: true,
        accountStatus: true,
        credits: true,
        onboardingComplete: true,
        hasSeenCockpitTour: true,
        founderNumber: true,
        karmaScore: true,
        phone: true,
        birthday: true,
        addressStreet: true,
        addressCity: true,
        addressZip: true,
        addressCountry: true,
        instagram: true,
        linkedin: true,
        bio: true,
        goal: true,
        skills: true,
        _count: {
          select: {
            ventures: true,
            squadMemberships: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const founderNumber = await assignFounderNumberIfMissing(user.id);
    const profileSlug = await ensureProfileSlug({
      id: user.id,
      name: user.name,
      founderNumber,
      profileSlug: user.profileSlug,
    });

    return NextResponse.json({
      ...user,
      founderNumber,
      profileSlug,
      accountStatus: user.accountStatus,
      address_street: user.addressStreet,
      address_city: user.addressCity,
      address_zip: user.addressZip,
      address_country: user.addressCountry,
    });
  } catch (error: any) {
    // Fallback für fehlende Spalten
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.warn('GET /api/me fallback (missing profile fields):', error.message);
      const ensuredUser = await ensureSessionUser({
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      });
      const user = await prisma.user.findUnique({
        where: { id: ensuredUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          accountStatus: true,
          credits: true,
          onboardingComplete: true,
          hasSeenCockpitTour: true,
          founderNumber: true,
          karmaScore: true,
          _count: {
            select: { ventures: true, squadMemberships: true }
          }
        }
      });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const founderNumber = await assignFounderNumberIfMissing(user.id);
      return NextResponse.json({ ...user, founderNumber, profileSlug: null });
    }

    // Fallback für DB-Connectivity: liefere Minimaldaten aus der Session
    console.error('GET /api/me failed:', error);
      return NextResponse.json({
        id: session.user.email,
        name: session.user.name,
        profileSlug: null,
        email: session.user.email,
        image: session.user.image || null,
        role: 'USER',
        accountStatus: 'ACTIVE',
        credits: 0,
      onboardingComplete: false,
      hasSeenCockpitTour: false,
      founderNumber: 0,
      karmaScore: 0,
      _count: { ventures: 0, squadMemberships: 0 }
    }, { status: 200 });
  }
}
