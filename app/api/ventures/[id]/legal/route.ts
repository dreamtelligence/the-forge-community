/**
 * Legal Documents API
 * POST /api/ventures/[id]/legal - Generate new contract
 * GET /api/ventures/[id]/legal - List all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateContract } from '@/lib/ai-legal';
import { getLegalGroundingForContract } from '@/lib/legal-corpus';
import {
  CreateLegalDocumentSchema,
  type AIContractGenerationRequest,
} from '@/types/legal';
import { ZodError } from 'zod';

// POST - Generate new contract
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ventureId } = await params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify access to venture
    const venture = await prisma.venture.findFirst({
      where: {
        id: ventureId,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null,
                },
              },
            },
          },
        ],
      },
      include: {
        brandDNA: true,
        squad: { select: { id: true } },
      },
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CreateLegalDocumentSchema.parse(body);

    const legalGrounding = await getLegalGroundingForContract({
      documentType: validatedData.documentType,
      additionalInstructions: validatedData.additionalInstructions,
      contractTerms: validatedData.contractTerms,
      maxSources: validatedData.documentType === 'NDA' ? 5 : 3,
    });

    // Build AI generation request
    const aiRequest: AIContractGenerationRequest = {
      documentType: validatedData.documentType,
      documentTitle: validatedData.documentTitle,
      partnerInfo: validatedData.partnerInfo,
      contractTerms: validatedData.contractTerms,
      brandContext: venture.brandDNA
        ? {
            brandName: venture.brandDNA.brandName,
            mission: venture.brandDNA.mission || undefined,
            toneOfVoice: venture.brandDNA.toneOfVoice || undefined,
          }
        : undefined,
      additionalInstructions: validatedData.additionalInstructions,
      legalGrounding: {
        context: legalGrounding.context,
        corpusVersion: legalGrounding.corpusVersion,
        lastSyncedAt: legalGrounding.lastSyncedAt,
        citations: legalGrounding.citations.map((citation) => ({
          sourceId: citation.sourceId,
          title: citation.title,
          url: citation.url,
          jurisdiction: citation.jurisdiction,
          excerpt: citation.excerpt,
        })),
      },
    };

    const aiPromptPayload = {
      ...aiRequest,
      legalGrounding: {
        corpusVersion: legalGrounding.corpusVersion,
        lastSyncedAt: legalGrounding.lastSyncedAt,
        sourceCount: legalGrounding.sourceCount,
        citations: legalGrounding.citations.map((citation) => ({
          sourceId: citation.sourceId,
          title: citation.title,
          url: citation.url,
          jurisdiction: citation.jurisdiction,
        })),
      },
    };

    // Generate contract with AI
    const aiResponse = await generateContract(aiRequest);

    if (!aiResponse.content) {
      return NextResponse.json(
        { error: 'AI generation failed', details: aiResponse.error },
        { status: 500 }
      );
    }

    // Save to database
    const legalDocument = await prisma.legalDocument.create({
      data: {
        ventureId: venture.id,
        squadId: venture.squad?.id,
        createdById: user.id,
        documentType: validatedData.documentType,
        documentTitle: validatedData.documentTitle,
        status: 'DRAFT',
        aiPrompt: JSON.stringify(aiPromptPayload),
        generatedContent: aiResponse.content,
        partnerCompanyName: validatedData.partnerInfo.companyName,
        partnerContactName: validatedData.partnerInfo.contactName,
        partnerContactEmail: validatedData.partnerInfo.contactEmail,
        partnerContactPhone: validatedData.partnerInfo.contactPhone,
        partnerAddress: validatedData.partnerInfo.address,
        contractTerms: validatedData.contractTerms as any,
      },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      document: legalDocument,
      aiProvider: aiResponse.provider,
      legalGrounding: {
        corpusVersion: legalGrounding.corpusVersion,
        lastSyncedAt: legalGrounding.lastSyncedAt,
        citations: legalGrounding.citations.map((citation) => ({
          title: citation.title,
          url: citation.url,
          jurisdiction: citation.jurisdiction,
        })),
      },
    });
  } catch (error) {
    console.error('Legal document generation error:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List all documents for a venture
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ventureId } = await params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify access
    const venture = await prisma.venture.findFirst({
      where: {
        id: ventureId,
        OR: [
          { ownerId: user.id },
          {
            squad: {
              members: {
                some: {
                  userId: user.id,
                  leftAt: null,
                },
              },
            },
          },
        ],
      },
    });

    if (!venture) {
      return NextResponse.json({ error: 'Venture not found' }, { status: 404 });
    }

    // Fetch documents
    const documents = await prisma.legalDocument.findMany({
      where: { ventureId: venture.id },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Legal documents fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
