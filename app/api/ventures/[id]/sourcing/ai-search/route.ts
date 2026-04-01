import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const STOP_WORDS = new Set([
  'und', 'oder', 'der', 'die', 'das', 'mit', 'fuer', 'für', 'von', 'im', 'in', 'am',
  'an', 'auf', 'zu', 'zur', 'zum', 'bei', 'nach', 'aus', 'ohne', 'einer', 'einem',
  'eines', 'ist', 'sind', 'als', 'nur', 'wir', 'sie', 'ihr', 'dein', 'deine',
  'brand', 'dna', 'produkt', 'produkte', 'service', 'services', 'market', 'marketings'
]);

const KEYWORD_EXPANSION: Record<string, string[]> = {
  fashion: ['Damenmode', 'Freizeitmode', 'Corporate Fashion', 'Berufsbekleidung', 'Basics', 'Hoodies', 'Dessous'],
  bekleidung: ['Damenmode', 'Freizeitmode', 'Corporate Fashion', 'Berufsbekleidung', 'Basics', 'Hoodies', 'Dessous'],
  apparel: ['Damenmode', 'Freizeitmode', 'Corporate Fashion', 'Berufsbekleidung', 'Basics', 'Hoodies', 'Dessous'],
  food: ['Feinkost', 'Bio-Produkte', 'Backzutaten'],
  lebensmittel: ['Feinkost', 'Bio-Produkte', 'Backzutaten'],
  logistik: ['E-Commerce Logistik', 'E-Commerce Fulfillment', 'B2B Fulfillment', 'Express Logistik'],
  fulfillment: ['E-Commerce Fulfillment', 'B2B Fulfillment', 'Express Logistik'],
  dropshipping: ['Dropshipping'],
  druck: ['Drucktechnik', 'Folien'],
  printing: ['Drucktechnik', 'Folien'],
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const extractTokens = (value?: string | string[] | null) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(' ') : value;
  return normalizeToken(raw)
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
};

const unique = (values: string[]) => Array.from(new Set(values));

const buildKeywords = (venture: any) => {
  const brandDNA = venture?.brandDNA ?? {};
  const baseTokens = [
    ...extractTokens(venture?.type),
    ...extractTokens(venture?.productType),
    ...extractTokens(venture?.productCategory),
    ...extractTokens(brandDNA?.productCategory),
    ...extractTokens(brandDNA?.keyFeatures),
    ...extractTokens(brandDNA?.values),
    ...extractTokens(brandDNA?.usp),
  ];

  const expanded = baseTokens.flatMap(token => KEYWORD_EXPANSION[token] || []);
  return unique([...baseTokens, ...expanded]).slice(0, 24);
};

const containsMatch = (field: string | null | undefined, keyword: string) => {
  if (!field) return false;
  return field.toLowerCase().includes(keyword.toLowerCase());
};

const buildMatchExplanation = (resource: any, context: { keywords: string[]; targetMarket?: string | null }) => {
  const reasons: string[] = [];
  const matchedKeywords = context.keywords.filter(keyword =>
    containsMatch(resource.type, keyword) ||
    containsMatch(resource.title, keyword) ||
    containsMatch(resource.description, keyword) ||
    containsMatch(resource.category, keyword)
  );

  if (resource.type) {
    const typeMatch = matchedKeywords.find(keyword => containsMatch(resource.type, keyword));
    if (typeMatch) reasons.push(`Branche/Art matcht: ${resource.type}`);
  }

  if (resource.category) {
    const categoryMatch = matchedKeywords.find(keyword => containsMatch(resource.category, keyword));
    if (categoryMatch) reasons.push(`Kategorie passt: ${resource.category}`);
  }

  if (resource.tags?.length) {
    const tagMatches = resource.tags.filter((tag: string) =>
      matchedKeywords.some(keyword => containsMatch(tag, keyword))
    );
    if (tagMatches.length) reasons.push(`Tags: ${tagMatches.slice(0, 3).join(', ')}`);
  }

  if (resource.location && context.targetMarket) {
    const target = context.targetMarket.toLowerCase();
    const location = resource.location.toLowerCase();
    if (target.includes(location) || location.includes(target)) {
      reasons.push(`Standort passt zu Zielmarkt: ${resource.location}`);
    }
  }

  if (!reasons.length && matchedKeywords.length) {
    reasons.push(`Match auf Keyword: ${matchedKeywords[0]}`);
  }

  return reasons.slice(0, 3).join(' · ');
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    const venture = await prisma.venture.findUnique({
      where: { id },
      include: { brandDNA: true }
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture nicht gefunden' }, { status: 404 });
    }

    const targetAudience = venture.brandDNA?.targetAudience as { location?: string } | null;
    const targetMarket = venture.targetMarket || targetAudience?.location || null;
    const keywords = buildKeywords(venture);

    const searchFilters = keywords.flatMap(keyword => ([
      { title: { contains: keyword, mode: 'insensitive' as const } },
      { description: { contains: keyword, mode: 'insensitive' as const } },
      { type: { contains: keyword, mode: 'insensitive' as const } },
      { category: { contains: keyword, mode: 'insensitive' as const } },
    ]));

    const where = searchFilters.length
      ? { isPublic: true, OR: searchFilters }
      : { isPublic: true };

    const resources = await prisma.resource.findMany({
      where,
      take: 80,
      orderBy: { updatedAt: 'desc' }
    });

    const scored = resources.map(resource => {
      let score = 0;
      keywords.forEach(keyword => {
        if (containsMatch(resource.type, keyword)) score += 5;
        if (containsMatch(resource.category, keyword)) score += 3;
        if (containsMatch(resource.title, keyword)) score += 2;
        if (containsMatch(resource.description, keyword)) score += 1;
        if (resource.tags?.some((tag: string) => containsMatch(tag, keyword))) score += 1;
      });
      if (targetMarket && resource.location) {
        const tm = targetMarket.toLowerCase();
        const loc = resource.location.toLowerCase();
        if (tm.includes(loc) || loc.includes(tm)) score += 2;
      }
      const explanation = buildMatchExplanation(resource, { keywords, targetMarket });
      return { resource, score, explanation };
    });

    const suggestions = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ resource, explanation }) => ({
        companyName: resource.title,
        country: resource.location || 'Unbekannt',
        category: resource.type || resource.category || 'Supplier',
        specialization: resource.description || resource.type || '',
        moq: resource.minOrderQty ? String(resource.minOrderQty) : 'N/A',
        notes: [resource.description, explanation].filter(Boolean).join(' • ')
      }));

    return NextResponse.json({
      suppliers: suggestions,
      explanation: 'Treffer kommen ausschliesslich aus unserer Lieferanten-Datenbank.'
    });

  } catch (error) {
    console.error('AI Sourcing failed:', error);
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
  }
}
