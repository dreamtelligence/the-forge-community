import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ventures: {
          orderBy: { updatedAt: 'desc' },
          include: {
            squad: true,
            tasks: {
              where: { status: { not: 'DONE' } },
              orderBy: { dueDate: 'asc' },
              take: 5
            },
            _count: {
              select: { steps: true }
            }
          }
        },
        squadMemberships: {
          include: {
            squad: {
              include: {
                _count: {
                  select: { members: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            createdPosts: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = {
      myVentures: user.ventures.length,
      mySquads: user.squadMemberships.length,
      karma: user.karmaScore ?? 0,
      forumPosts: user._count.createdPosts
    };

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        onboardingComplete: user.onboardingComplete,
        hasSeenCockpitTour: user.hasSeenCockpitTour,
        role: user.role,
        phone: user.phone,
        birthday: user.birthday,
        addressStreet: user.addressStreet,
        addressCity: user.addressCity,
        addressZip: user.addressZip,
        addressCountry: user.addressCountry,
      },
      ventures: user.ventures,
      squads: user.squadMemberships.map(m => m.squad),
      stats
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.warn('GET /api/dashboard fallback (DB issue):', error.message);
    } else {
      console.error('GET /api/dashboard failed:', error);
    }

    // Minimal Fallback, damit die Seite nicht mit 500 stirbt
    return NextResponse.json({
      user: {
        id: session.user.email,
        name: session.user.name,
        image: session.user.image || null,
        onboardingComplete: false,
        hasSeenCockpitTour: false,
        role: 'USER',
        phone: null,
        birthday: null,
        addressStreet: null,
        addressCity: null,
        addressZip: null,
        addressCountry: null,
      },
      ventures: [],
      squads: [],
      stats: { myVentures: 0, mySquads: 0, karma: 0, forumPosts: 0 }
    }, { status: 200 });
  }
}
