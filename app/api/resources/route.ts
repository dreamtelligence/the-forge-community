import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const types = searchParams.get('types')?.split(',').filter(Boolean);
    const locations = searchParams.get('locations')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'title'; // title, location
    const order = searchParams.get('order') || 'asc';
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (category) where.category = category;
    
    // Multi-choice filters
    if (types && types.length > 0) {
      where.OR = [
        { type: { in: types, mode: 'insensitive' } },
        { category: { in: types, mode: 'insensitive' } }
      ];
    }

    if (locations && locations.length > 0) {
      if (where.OR) {
        // If we already have a type filter, we need to ensure both conditions are met
        const existingOr = [...where.OR];
        where.AND = [
          { OR: existingOr },
          { location: { in: locations, mode: 'insensitive' } }
        ];
        delete where.OR;
      } else {
        where.location = { in: locations, mode: 'insensitive' };
      }
    }

    if (search) {
      const searchFilter = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      };

      if (where.AND) {
        where.AND.push(searchFilter);
      } else if (where.location || where.OR) {
        const currentWhere = { ...where };
        where.AND = [currentWhere, searchFilter];
        delete where.OR;
        delete where.location;
        delete where.category;
      } else {
        Object.assign(where, searchFilter);
      }
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: { [sortBy]: order },
        take: limit,
        skip: offset,
      }),
      prisma.resource.count({ where })
    ]);

    // Also return available filters for the UI
    const [allTypes, allLocations] = await Promise.all([
      prisma.resource.findMany({ select: { type: true, category: true }, distinct: ['type', 'category'] }),
      prisma.resource.findMany({ select: { location: true }, distinct: ['location'], where: { NOT: { location: null } } })
    ]);

    const uniqueTypes = Array.from(new Set(allTypes.flatMap(r => [r.type, r.category]))).filter(Boolean).sort();
    const uniqueLocations = Array.from(new Set(allLocations.map(r => r.location))).filter(Boolean).sort();

    return NextResponse.json({ 
      resources, 
      total, 
      availableFilters: { 
        types: uniqueTypes, 
        locations: uniqueLocations 
      } 
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources', details: error.message },
      { status: 500 }
    );
  }
}
