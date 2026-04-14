import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { restoreGermanUmlauts } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const course = await prisma.trainingCourse.findUnique({
      where: { slug },
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
        updatedAt: true,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            summary: true,
            content: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Training not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...course,
      title: restoreGermanUmlauts(course.title),
      summary: course.summary ? restoreGermanUmlauts(course.summary) : course.summary,
      category: restoreGermanUmlauts(course.category),
      level: course.level ? restoreGermanUmlauts(course.level) : course.level,
      modules: course.modules.map((module) => ({
        ...module,
        title: restoreGermanUmlauts(module.title),
        summary: module.summary ? restoreGermanUmlauts(module.summary) : module.summary,
        content: restoreGermanUmlauts(module.content),
      })),
    });
  } catch (error) {
    console.error('Training detail error:', error);
    return NextResponse.json({ error: 'Failed to load training' }, { status: 500 });
  }
}
