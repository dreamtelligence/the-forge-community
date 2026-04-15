import { prisma } from '@/lib/database/prisma';
import type { MarketingMediaBrandContext } from '@/lib/ai/domain/marketing-media';

export type MarketingMediaUserRecord = {
  id: string;
};

export type MarketingMediaVentureRecord = {
  id: string;
  brandDNA: MarketingMediaBrandContext | null;
};

export type CreateMarketingMediaAssetInput = {
  ventureId: string;
  ownerId: string;
  type: 'VIDEO' | 'IMAGE';
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  prompt: string;
  model: string;
  width: number;
  height: number;
  tags: string[];
};

export const findMarketingMediaUserByEmail = async (
  email: string
): Promise<MarketingMediaUserRecord | null> => {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
};

export const findOwnedMarketingMediaVenture = async (
  ventureId: string,
  ownerId: string
): Promise<MarketingMediaVentureRecord | null> => {
  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, ownerId },
    include: { brandDNA: true },
  });

  if (!venture) return null;

  return {
    id: venture.id,
    brandDNA: venture.brandDNA
      ? {
          brandName: venture.brandDNA.brandName,
          productCategory: venture.brandDNA.productCategory,
          primaryColor: venture.brandDNA.primaryColor,
          toneOfVoice: venture.brandDNA.toneOfVoice,
          characterPrompt: venture.brandDNA.characterPrompt,
        }
      : null,
  };
};

export const createMarketingMediaAsset = async (input: CreateMarketingMediaAssetInput) => {
  return prisma.mediaAsset.create({
    data: {
      ventureId: input.ventureId,
      ownerId: input.ownerId,
      type: input.type,
      url: input.url,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      source: 'GENERATED',
      prompt: input.prompt,
      model: input.model,
      width: input.width,
      height: input.height,
      tags: input.tags,
    },
    select: {
      id: true,
      url: true,
      type: true,
      isPublic: true,
    },
  });
};
