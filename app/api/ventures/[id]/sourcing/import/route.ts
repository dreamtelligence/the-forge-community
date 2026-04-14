import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getVentureAccessByEmail } from '@/lib/ventures/access';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const access = await getVentureAccessByEmail(session.user.email, id);
    if (!access) {
      return NextResponse.json({ error: 'Venture nicht gefunden oder Zugriff verweigert' }, { status: 404 });
    }
    const { resourceId } = await request.json();
    const ventureId = access.ventureId;

    // 1. Hole die globale Ressource
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // 2. Erstelle einen Supplier-Eintrag für dieses Venture basierend auf der Ressource
    const contactInfo = resource.contactInfo as any;
    
    const supplier = await prisma.supplier.create({
      data: {
        ventureId,
        companyName: resource.title,
        email: contactInfo?.email || resource.contactEmail || null,
        phone: contactInfo?.phone || null,
        address: contactInfo?.address || null,
        website: resource.url || null,
        country: resource.location || null,
        category: resource.type || resource.category,
        notes: resource.description,
        tags: resource.tags,
      }
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error('Error importing supplier:', error);
    return NextResponse.json(
      { error: 'Failed to import supplier', details: error.message },
      { status: 500 }
    );
  }
}
