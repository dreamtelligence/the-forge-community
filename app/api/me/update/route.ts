import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

async function handleUpdate(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    onboardingComplete,
    phone,
    birthday,
    address_street,
    address_city,
    address_zip,
    address_country,
    instagram,
    linkedin,
    bio,
    goal,
    skills,
  } = body;

  const data: any = {};
  if (typeof name === 'string') data.name = name.trim();
  if (typeof onboardingComplete === 'boolean') data.onboardingComplete = onboardingComplete;
  if (typeof phone === 'string') data.phone = phone.trim();
  if (typeof birthday === 'string') data.birthday = birthday;
  if (typeof address_street === 'string') data.addressStreet = address_street.trim();
  if (typeof address_city === 'string') data.addressCity = address_city.trim();
  if (typeof address_zip === 'string') data.addressZip = address_zip.trim();
  if (typeof address_country === 'string') data.addressCountry = address_country.trim();
  if (typeof instagram === 'string') data.instagram = instagram.trim();
  if (typeof linkedin === 'string') data.linkedin = linkedin.trim();
  if (typeof bio === 'string') data.bio = bio;
  if (typeof goal === 'string') data.goal = goal;
  if (Array.isArray(skills)) data.skills = skills.filter((s: any) => typeof s === 'string');

  if (onboardingComplete === true) {
    let existing: {
      name: string | null;
      phone: string | null;
      birthday: string | null;
      addressStreet: string | null;
      addressCity: string | null;
      addressZip: string | null;
      addressCountry: string | null;
    } | null = null;

    try {
      existing = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          name: true,
          phone: true,
          birthday: true,
          addressStreet: true,
          addressCity: true,
          addressZip: true,
          addressCountry: true,
        },
      });
    } catch (error) {
      console.warn('Onboarding validation skipped (user fetch failed):', error);
    }

    const effective = {
      name: typeof data.name === 'string' ? data.name : existing?.name || '',
      phone: typeof data.phone === 'string' ? data.phone : existing?.phone || '',
      birthday: typeof data.birthday === 'string' ? data.birthday : existing?.birthday || '',
      addressStreet: typeof data.addressStreet === 'string' ? data.addressStreet : existing?.addressStreet || '',
      addressCity: typeof data.addressCity === 'string' ? data.addressCity : existing?.addressCity || '',
      addressZip: typeof data.addressZip === 'string' ? data.addressZip : existing?.addressZip || '',
      addressCountry: typeof data.addressCountry === 'string' ? data.addressCountry : existing?.addressCountry || '',
    };

    const missing = Object.entries(effective)
      .filter(([, value]) => !String(value || '').trim())
      .map(([key]) => key);

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Missing onboarding fields', fields: missing },
        { status: 400 }
      );
    }
  }

  try {
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data
    });
    return NextResponse.json(user);
  } catch (error: any) {
    // Fallback falls DB (z.B. andere Umgebung) die neuen Spalten noch nicht hat
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.warn('POST /api/me/update fallback (DB lacks new profile fields):', error.message);
    } else {
      console.error('Update profile failed:', error);
    }

    const fallbackData: any = {};
    if (typeof name === 'string') fallbackData.name = name.trim();
    if (typeof onboardingComplete === 'boolean') fallbackData.onboardingComplete = onboardingComplete;

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: fallbackData
    });
    return NextResponse.json(user);
  }
}

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdate(req);
}
