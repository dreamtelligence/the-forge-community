import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { restoreGermanUmlauts } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const courses = await prisma.trainingCourse.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        category: true,
        level: true,
        coverImage: true,
        durationMins: true,
        createdAt: true,
        _count: { select: { modules: true } },
      },
    });

    return NextResponse.json(
      courses.map(({ _count, ...course }) => ({
        ...course,
        title: restoreGermanUmlauts(course.title),
        summary: course.summary ? restoreGermanUmlauts(course.summary) : course.summary,
        category: restoreGermanUmlauts(course.category),
        level: course.level ? restoreGermanUmlauts(course.level) : course.level,
        modulesCount: _count.modules,
      }))
    );
  } catch (error) {
    console.error('Training list error:', error);
    return NextResponse.json({ error: 'Failed to load training' }, { status: 500 });
  }
}
