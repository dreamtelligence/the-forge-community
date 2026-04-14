import { z } from 'zod';
import { prisma } from '@/lib/database/prisma';
import {
  createPendingAction,
  getPendingActionByToken,
  confirmPendingAction,
  markActionExecuted,
  markActionFailed,
  cancelPendingAction,
  listPendingActions,
} from '@/lib/ai/actions';
import { Prisma } from '@prisma/client';
import { generateApiKey } from '@/lib/api-keys/crypto';
import { generateOAuthUrl, disconnectIntegration, getUserConnections } from '@/lib/integrations/service';
import { stripe } from '@/lib/billing/stripe';
import type { IntegrationProvider, Role } from '@prisma/client';
import { updateVentureProgress } from '@/lib/ventures/index/index';
import { getTemplateByType } from '@/lib/ventures/index/templates';
import { isConfiguredAdminEmail } from '@/lib/security/admin-access';

export interface ToolContext {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    founderNumber?: number | null;
  };
  ventures: Array<{ id: string; name: string }>;
  activeVentureId: string | null;
  requestText?: string;
}

type ToolDefinition<TArgs = any> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TArgs>;
  requiresConfirmation?: boolean;
  summarize?: (args: TArgs, ctx: ToolContext) => string;
  logResult?: (result: any) => unknown;
  execute: (args: TArgs, ctx: ToolContext) => Promise<any>;
};

const isFounder = (ctx: ToolContext) => (
  ctx.user.role === 'FOUNDER' ||
  ctx.user.role === 'ADMIN' ||
  (typeof ctx.user.founderNumber === 'number' && ctx.user.founderNumber > 0) ||
  isConfiguredAdminEmail(ctx.user.email)
);

const truncate = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max).trim()}…` : value;

const getAccessibleVenture = async (ventureId: string, userId: string) => {
  return prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: userId },
        { squad: { members: { some: { userId, leftAt: null } } } },
      ],
    },
  });
};

const ensureSquadAccess = async (squadId: string, userId: string) => {
  return prisma.squadMember.findFirst({
    where: {
      squadId,
      userId,
      leftAt: null,
    },
  });
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === undefined || value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
};

const toolDefinitions: ToolDefinition[] = [
  {
    name: 'store_user_memory',
    description:
      'Speichert wichtige Informationen über den User langfristig (Ziele, Vorlieben, Fakten). Nutze dies, wenn der User sagt "merk dir das" oder wichtige persönliche Infos teilt.',
    inputSchema: z.object({
      category: z.enum(['GOAL', 'PREFERENCE', 'FACT', 'DECISION', 'OTHER']),
      content: z.string().describe('Der zu speichernde Inhalt'),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Memory speichern (${args.category}): ${truncate(args.content)}`,
    execute: async ({ category, content }: { category: 'GOAL' | 'PREFERENCE' | 'FACT' | 'DECISION' | 'OTHER'; content: string }, ctx) => {
      await prisma.userMemory.create({
        data: {
          userId: ctx.user.id,
          category,
          content,
        },
      });
      return { ok: true, message: 'Erinnerung gespeichert.' };
    },
  },
  {
    name: 'search_user_memory',
    description: 'Durchsucht die gespeicherten Erinnerungen des Users. Nutze dies, um frühere Informationen abzurufen.',
    inputSchema: z.object({
      query: z.string().describe('Suchbegriff'),
    }),
    requiresConfirmation: false,
    execute: async ({ query }: { query: string }, ctx) => {
      const memories = await prisma.userMemory.findMany({
        where: {
          userId: ctx.user.id,
          content: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return { ok: true, memories };
    },
  },
  {
    name: 'create_task',
    description: 'Erstellt eine neue Aufgabe für ein Venture',
    inputSchema: z.object({
      ventureId: z.string().describe('Die ID des Ventures'),
      title: z.string().describe('Titel der Aufgabe'),
      description: z.string().optional().describe('Beschreibung (optional)'),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Task erstellen: ${truncate(args.title, 80)}`,
    execute: async (
      { ventureId, title, description }: { ventureId: string; title: string; description?: string },
      ctx
    ) => {
      const venture = await getAccessibleVenture(ventureId, ctx.user.id);

      if (!venture) {
        return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
      }

      const task = await prisma.ventureTask.create({
        data: {
          ventureId,
          title,
          description: description || null,
          status: 'TODO',
          priority: 'MEDIUM',
        },
      });

      return { ok: true, task: { id: task.id, title: task.title } };
    },
  },
  {
    name: 'update_profile',
    description: 'Aktualisiert Profilfelder (Name, Bio, Ziel, Skills, Socials).',
    inputSchema: z.object({
      name: z.string().min(1).max(120).optional(),
      bio: z.string().max(2000).optional(),
      goal: z.string().max(500).optional(),
      skills: z.array(z.string().min(1).max(40)).max(50).optional(),
      linkedin: z.string().max(255).optional(),
      instagram: z.string().max(255).optional(),
    }),
    requiresConfirmation: true,
    summarize: () => 'Profilfelder aktualisieren',
    execute: async (args: {
      name?: string;
      bio?: string;
      goal?: string;
      skills?: string[];
      linkedin?: string;
      instagram?: string;
    }, ctx) => {
      const data: Record<string, any> = {};
      if (args.name !== undefined) data.name = args.name.trim();
      if (args.bio !== undefined) data.bio = args.bio.trim();
      if (args.goal !== undefined) data.goal = args.goal.trim();
      if (args.skills !== undefined) data.skills = args.skills.map((s) => s.trim()).filter(Boolean);
      if (args.linkedin !== undefined) data.linkedin = args.linkedin.trim();
      if (args.instagram !== undefined) data.instagram = args.instagram.trim();

      const updated = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
        select: {
          id: true,
          name: true,
          bio: true,
          goal: true,
          skills: true,
          linkedin: true,
          instagram: true,
        },
      });

      return { ok: true, profile: updated };
    },
  },
  {
    name: 'set_notification_preferences',
    description: 'Setzt Notification Preferences (Forum, Mentions, System).',
    inputSchema: z.object({
      forumComments: z.boolean().optional(),
      forumReplies: z.boolean().optional(),
      mentions: z.boolean().optional(),
      system: z.boolean().optional(),
    }),
    requiresConfirmation: true,
    summarize: () => 'Notification Preferences aktualisieren',
    execute: async (args: {
      forumComments?: boolean;
      forumReplies?: boolean;
      mentions?: boolean;
      system?: boolean;
    }, ctx) => {
      const updated = await prisma.notificationPreference.upsert({
        where: { userId: ctx.user.id },
        update: {
          ...(args.forumComments !== undefined && { forumComments: args.forumComments }),
          ...(args.forumReplies !== undefined && { forumReplies: args.forumReplies }),
          ...(args.mentions !== undefined && { mentions: args.mentions }),
          ...(args.system !== undefined && { system: args.system }),
        },
        create: {
          userId: ctx.user.id,
          forumComments: args.forumComments ?? true,
          forumReplies: args.forumReplies ?? true,
          mentions: args.mentions ?? true,
          system: args.system ?? true,
        },
      });

      return { ok: true, preferences: updated };
    },
  },
  {
    name: 'set_privacy_preferences',
    description: 'Setzt Privacy Preferences (Profil-Sichtbarkeit, Follower-Zahlen).',
    inputSchema: z.object({
      profileVisible: z.boolean().optional(),
      showFollowerCounts: z.boolean().optional(),
    }),
    requiresConfirmation: true,
    summarize: () => 'Privacy Preferences aktualisieren',
    execute: async (args: { profileVisible?: boolean; showFollowerCounts?: boolean }, ctx) => {
      const updated = await prisma.privacyPreference.upsert({
        where: { userId: ctx.user.id },
        update: {
          ...(args.profileVisible !== undefined && { profileVisible: args.profileVisible }),
          ...(args.showFollowerCounts !== undefined && { showFollowerCounts: args.showFollowerCounts }),
        },
        create: {
          userId: ctx.user.id,
          profileVisible: args.profileVisible ?? true,
          showFollowerCounts: args.showFollowerCounts ?? true,
        },
      });

      return { ok: true, preferences: updated };
    },
  },
  {
    name: 'set_tour_flags',
    description: 'Aktualisiert Onboarding/Tour-Flags des Users.',
    inputSchema: z.object({
      onboardingComplete: z.boolean().optional(),
      hasSeenTour: z.boolean().optional(),
      hasSeenCockpitTour: z.boolean().optional(),
    }),
    requiresConfirmation: true,
    summarize: () => 'Onboarding/Tour-Status aktualisieren',
    execute: async (
      args: { onboardingComplete?: boolean; hasSeenTour?: boolean; hasSeenCockpitTour?: boolean },
      ctx
    ) => {
      const updated = await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(args.onboardingComplete !== undefined && { onboardingComplete: args.onboardingComplete }),
          ...(args.hasSeenTour !== undefined && { hasSeenTour: args.hasSeenTour }),
          ...(args.hasSeenCockpitTour !== undefined && { hasSeenCockpitTour: args.hasSeenCockpitTour }),
        },
        select: {
          id: true,
          onboardingComplete: true,
          hasSeenTour: true,
          hasSeenCockpitTour: true,
        },
      });
      return { ok: true, flags: updated };
    },
  },
  {
    name: 'list_api_keys',
    description: 'Listet API Keys des Users auf.',
    inputSchema: z.object({
      ventureId: z.string().optional(),
      includeInactive: z.boolean().optional(),
    }),
    requiresConfirmation: false,
    execute: async (args: { ventureId?: string; includeInactive?: boolean }, ctx) => {
      const where: any = { userId: ctx.user.id };
      if (args.ventureId) where.ventureId = args.ventureId;
      if (!args.includeInactive) where.isActive = true;

      const keys = await prisma.apiKey.findMany({
        where,
        include: { venture: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return {
        ok: true,
        keys: keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes,
          ventureId: key.ventureId || undefined,
          ventureName: key.venture?.name,
          rateLimit: key.rateLimit,
          rateLimitDaily: key.rateLimitDaily,
          isActive: key.isActive,
          lastUsedAt: key.lastUsedAt?.toISOString(),
          expiresAt: key.expiresAt?.toISOString(),
          createdAt: key.createdAt.toISOString(),
        })),
      };
    },
  },
  {
    name: 'create_api_key',
    description: 'Erstellt einen neuen API Key (einmaliges Klartext-Secret).',
    inputSchema: z.object({
      name: z.string().min(1).max(100),
      ventureId: z.string().optional(),
      scopes: z.array(z.string()).min(1),
      rateLimit: z.number().int().min(10).max(10000).optional(),
      rateLimitDaily: z.number().int().min(100).max(100000).optional(),
      expiresAt: z.string().datetime().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `API Key erstellen: ${truncate(args.name, 60)}`,
    logResult: (result) => ({ ...result, apiKey: '[REDACTED]' }),
    execute: async (args: {
      name: string;
      ventureId?: string;
      scopes: string[];
      rateLimit?: number;
      rateLimitDaily?: number;
      expiresAt?: string;
    }, ctx) => {
      if (args.ventureId) {
        const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
        if (!venture) {
          return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
        }
      }

      const keyCount = await prisma.apiKey.count({ where: { userId: ctx.user.id } });
      if (keyCount >= 50) {
        return { ok: false, error: 'Maximale API-Key-Anzahl erreicht (50).' };
      }

      const { apiKey, keyHash, keyPrefix } = generateApiKey();
      const dbKey = await prisma.apiKey.create({
        data: {
          userId: ctx.user.id,
          ventureId: args.ventureId,
          name: args.name,
          keyHash,
          keyPrefix,
          scopes: args.scopes,
          rateLimit: args.rateLimit ?? 100,
          rateLimitDaily: args.rateLimitDaily ?? 1000,
          expiresAt: args.expiresAt ? new Date(args.expiresAt) : null,
        },
      });

      return {
        ok: true,
        apiKey,
        keyId: dbKey.id,
        keyPrefix: dbKey.keyPrefix,
        name: dbKey.name,
        scopes: dbKey.scopes,
        createdAt: dbKey.createdAt.toISOString(),
        expiresAt: dbKey.expiresAt?.toISOString(),
      };
    },
  },
  {
    name: 'update_api_key',
    description: 'Aktualisiert API Key Metadaten (Name, Scopes, Limits).',
    inputSchema: z.object({
      keyId: z.string(),
      name: z.string().min(1).max(100).optional(),
      scopes: z.array(z.string()).min(1).optional(),
      rateLimit: z.number().int().min(10).max(10000).optional(),
      rateLimitDaily: z.number().int().min(100).max(100000).optional(),
      isActive: z.boolean().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `API Key aktualisieren: ${args.keyId}`,
    execute: async (args: {
      keyId: string;
      name?: string;
      scopes?: string[];
      rateLimit?: number;
      rateLimitDaily?: number;
      isActive?: boolean;
    }, ctx) => {
      const existing = await prisma.apiKey.findFirst({
        where: { id: args.keyId, userId: ctx.user.id },
      });
      if (!existing) {
        return { ok: false, error: 'API Key nicht gefunden.' };
      }

      const updated = await prisma.apiKey.update({
        where: { id: args.keyId },
        data: {
          ...(args.name && { name: args.name }),
          ...(args.scopes && { scopes: args.scopes }),
          ...(args.rateLimit !== undefined && { rateLimit: args.rateLimit }),
          ...(args.rateLimitDaily !== undefined && { rateLimitDaily: args.rateLimitDaily }),
          ...(args.isActive !== undefined && { isActive: args.isActive }),
        },
        include: { venture: { select: { id: true, name: true } } },
      });

      return {
        ok: true,
        key: {
          id: updated.id,
          name: updated.name,
          keyPrefix: updated.keyPrefix,
          scopes: updated.scopes,
          ventureId: updated.ventureId || undefined,
          ventureName: updated.venture?.name,
          rateLimit: updated.rateLimit,
          rateLimitDaily: updated.rateLimitDaily,
          isActive: updated.isActive,
          lastUsedAt: updated.lastUsedAt?.toISOString(),
          expiresAt: updated.expiresAt?.toISOString(),
          createdAt: updated.createdAt.toISOString(),
        },
      };
    },
  },
  {
    name: 'deactivate_api_key',
    description: 'Deaktiviert einen API Key.',
    inputSchema: z.object({
      keyId: z.string(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `API Key deaktivieren: ${args.keyId}`,
    execute: async ({ keyId }: { keyId: string }, ctx) => {
      const existing = await prisma.apiKey.findFirst({
        where: { id: keyId, userId: ctx.user.id },
      });
      if (!existing) {
        return { ok: false, error: 'API Key nicht gefunden.' };
      }

      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: { isActive: false },
      });

      return { ok: true, keyId: updated.id, isActive: updated.isActive };
    },
  },
  {
    name: 'rotate_api_key',
    description: 'Rotiert einen API Key (alter wird deaktiviert, neuer wird erstellt).',
    inputSchema: z.object({
      keyId: z.string(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `API Key rotieren: ${args.keyId}`,
    logResult: (result) => ({ ...result, apiKey: '[REDACTED]' }),
    execute: async ({ keyId }: { keyId: string }, ctx) => {
      const existing = await prisma.apiKey.findFirst({
        where: { id: keyId, userId: ctx.user.id },
      });
      if (!existing) {
        return { ok: false, error: 'API Key nicht gefunden.' };
      }

      const { apiKey, keyHash, keyPrefix } = generateApiKey();
      const dbKey = await prisma.apiKey.create({
        data: {
          userId: ctx.user.id,
          ventureId: existing.ventureId,
          name: existing.name,
          keyHash,
          keyPrefix,
          scopes: existing.scopes,
          rateLimit: existing.rateLimit,
          rateLimitDaily: existing.rateLimitDaily,
          expiresAt: existing.expiresAt,
        },
      });

      await prisma.apiKey.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      return {
        ok: true,
        apiKey,
        keyId: dbKey.id,
        keyPrefix: dbKey.keyPrefix,
        name: dbKey.name,
        scopes: dbKey.scopes,
        createdAt: dbKey.createdAt.toISOString(),
        expiresAt: dbKey.expiresAt?.toISOString(),
      };
    },
  },
  {
    name: 'list_integrations',
    description: 'Listet vorhandene Integrationen des Users auf.',
    inputSchema: z.object({
      ventureId: z.string().optional(),
    }),
    requiresConfirmation: false,
    execute: async ({ ventureId }: { ventureId?: string }, ctx) => {
      const connections = await getUserConnections(ctx.user.id, ventureId);
      return { ok: true, connections };
    },
  },
  {
    name: 'connect_integration',
    description: 'Startet den OAuth-Connect für eine Integration und liefert den Auth-URL zurück.',
    inputSchema: z.object({
      provider: z.enum(['NOTION', 'DOCUSIGN', 'SLACK']),
      ventureId: z.string().optional(),
      redirectUrl: z.string().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Integration verbinden: ${args.provider}`,
    execute: async (
      args: { provider: IntegrationProvider; ventureId?: string; redirectUrl?: string },
      ctx
    ) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
      const redirectUrl = args.redirectUrl || `${appUrl}/settings/integrations`;
      const { url, state } = await generateOAuthUrl(
        ctx.user.id,
        args.provider,
        redirectUrl,
        args.ventureId
      );
      return { ok: true, url, state };
    },
  },
  {
    name: 'disconnect_integration',
    description: 'Trennt eine Integration.',
    inputSchema: z.object({
      connectionId: z.string(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Integration trennen: ${args.connectionId}`,
    execute: async ({ connectionId }: { connectionId: string }, ctx) => {
      const success = await disconnectIntegration(connectionId, ctx.user.id);
      if (!success) {
        return { ok: false, error: 'Integration nicht gefunden.' };
      }
      return { ok: true, connectionId };
    },
  },
  {
    name: 'get_billing_summary',
    description: 'Liefert Billing-Status, Credits und Abo-Daten.',
    inputSchema: z.object({}),
    requiresConfirmation: false,
    execute: async (_args: Record<string, never>, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          credits: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          subscriptionStatus: true,
          subscriptionTier: true,
          subscriptionEndsAt: true,
        },
      });
      if (!user) return { ok: false, error: 'User nicht gefunden.' };
      return { ok: true, billing: user };
    },
  },
  {
    name: 'list_invoices',
    description: 'Listet Rechnungen des Users auf.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(50).optional(),
    }),
    requiresConfirmation: false,
    execute: async ({ limit }: { limit?: number }, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, email: true },
      });
      if (!user) return { ok: false, error: 'User nicht gefunden.' };

      const invoices = await prisma.platformInvoice.findMany({
        where: {
          OR: [
            { ledgerEntry: { userId: user.id } },
            { buyerEmail: user.email },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          currency: true,
          status: true,
          issueDate: true,
          pdfUrl: true,
        },
        orderBy: { issueDate: 'desc' },
        take: limit ?? 20,
      });

      return { ok: true, invoices };
    },
  },
  {
    name: 'create_billing_portal',
    description: 'Erstellt einen Stripe Billing Portal Link.',
    inputSchema: z.object({}),
    requiresConfirmation: true,
    summarize: () => 'Stripe Billing Portal öffnen',
    execute: async (_args: Record<string, never>, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { stripeCustomerId: true },
      });
      if (!user?.stripeCustomerId) {
        return { ok: false, error: 'Kein Stripe Customer gefunden.' };
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl}/settings/billing`,
      });
      return { ok: true, url: portalSession.url };
    },
  },
  {
    name: 'cancel_subscription',
    description: 'Kündigt das aktive Abo zum Periodenende.',
    inputSchema: z.object({}),
    requiresConfirmation: true,
    summarize: () => 'Abo kündigen',
    execute: async (_args: Record<string, never>, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, stripeSubscriptionId: true },
      });
      if (!user?.stripeSubscriptionId) {
        return { ok: false, error: 'Kein aktives Abo gefunden.' };
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
      const fallbackEnd = subscription.cancel_at ?? null;
      const periodEnd = typeof itemPeriodEnd === 'number' ? itemPeriodEnd : fallbackEnd;
      const endsAt = periodEnd ? new Date(periodEnd * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'cancelled',
          subscriptionEndsAt: endsAt,
        },
      });

      return { ok: true, endsAt: endsAt ? endsAt.toISOString() : null };
    },
  },
  {
    name: 'start_checkout',
    description: 'Erstellt eine Stripe Checkout Session (Abo oder Credits).',
    inputSchema: z.object({
      type: z.enum(['subscription', 'credits']),
      priceId: z.string(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Checkout starten: ${args.type}`,
    execute: async ({ type, priceId }: { type: 'subscription' | 'credits'; priceId: string }, ctx) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { id: true, email: true, stripeCustomerId: true },
      });
      if (!user) return { ok: false, error: 'User nicht gefunden.' };

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';

      const sessionConfig: any = {
        customer_email: user.email,
        mode: type === 'subscription' ? 'subscription' : 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { userId: user.id, email: user.email, type },
        billing_address_collection: 'required',
        allow_promotion_codes: true,
      };

      if (type === 'subscription') {
        sessionConfig.tax_id_collection = { enabled: true };
      }

      if (user.stripeCustomerId) {
        sessionConfig.customer = user.stripeCustomerId;
        delete sessionConfig.customer_email;
      }

      if (type === 'subscription') {
        sessionConfig.success_url = `${appUrl}/payment/success?type=subscription`;
        sessionConfig.cancel_url = `${appUrl}/pricing?canceled=true`;
      } else {
        sessionConfig.success_url = `${appUrl}/payment/success?type=credits`;
        sessionConfig.cancel_url = `${appUrl}/pricing?canceled=true`;
      }

      const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);
      return { ok: true, url: checkoutSession.url };
    },
  },
  {
    name: 'create_venture',
    description: 'Erstellt ein neues Venture.',
    inputSchema: z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      type: z.enum(['ECOMMERCE', 'SAAS', 'SERVICE', 'INFLUENCER', 'MARKETPLACE', 'AGENCY', 'OTHER']).optional(),
      status: z.enum(['IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED']).optional(),
      currentPhase: z.number().int().min(1).max(6).optional(),
      productType: z.string().max(200).optional(),
      targetMarket: z.string().max(200).optional(),
      marketingBudget: z.number().min(0).optional(),
      totalBudget: z.number().min(0).optional(),
      launchDate: z.string().datetime().optional(),
      squadId: z.string().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Venture erstellen: ${truncate(args.name, 80)}`,
    execute: async (args: {
      name: string;
      description?: string;
      type?: 'ECOMMERCE' | 'SAAS' | 'SERVICE' | 'INFLUENCER' | 'MARKETPLACE' | 'AGENCY' | 'OTHER';
      status?: 'IDEATION' | 'IN_PROGRESS' | 'LAUNCHED' | 'PAUSED' | 'CANCELLED';
      currentPhase?: number;
      productType?: string;
      targetMarket?: string;
      marketingBudget?: number;
      totalBudget?: number;
      launchDate?: string;
      squadId?: string;
    }, ctx) => {
      if (args.squadId) {
        const membership = await ensureSquadAccess(args.squadId, ctx.user.id);
        if (!membership) {
          return { ok: false, error: 'Kein Zugriff auf dieses Squad.' };
        }
      }

      const ventureType = args.type ?? 'ECOMMERCE';
      const template = getTemplateByType(ventureType);

      const venture = await prisma.venture.create({
        data: {
          ownerId: ctx.user.id,
          squadId: args.squadId ?? null,
          name: args.name,
          description: args.description ?? null,
          type: ventureType,
          status: args.status ?? 'IDEATION',
          currentPhase: args.currentPhase ?? 1,
          productType: args.productType ?? null,
          targetMarket: args.targetMarket ?? null,
          marketingBudget: args.marketingBudget ?? null,
          totalBudget: args.totalBudget ?? null,
          launchDate: args.launchDate ? new Date(args.launchDate) : null,
          lastActivityAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          status: true,
          currentPhase: true,
          type: true,
          squadId: true,
        },
      });

      if (template) {
        await Promise.all(
          template.steps.map((step) =>
            prisma.ventureStep.create({
              data: {
                ventureId: venture.id,
                stepNumber: step.number,
                stepName: step.name,
                status: step.number === 1 ? 'IN_PROGRESS' : 'PENDING',
                data: {
                  description: step.description,
                  estimatedDays: step.estimatedDays
                }
              }
            })
          )
        );

        const now = new Date();
        await Promise.all(
          template.tasks.map((task) => {
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + task.estimatedDays);

            return prisma.ventureTask.create({
              data: {
                ventureId: venture.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                dueDate,
                isFromTemplate: true,
                assignedToId: ctx.user.id
              }
            });
          })
        );
      }

      await updateVentureProgress(venture.id);

      return { ok: true, venture, seededTemplate: Boolean(template) };
    },
  },
  {
    name: 'update_venture',
    description: 'Aktualisiert Venture-Status, Phase oder Basisdaten.',
    inputSchema: z.object({
      ventureId: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(['IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED']).optional(),
      currentPhase: z.number().int().min(1).max(6).optional(),
      type: z.enum(['ECOMMERCE', 'SAAS', 'SERVICE', 'INFLUENCER', 'MARKETPLACE', 'AGENCY', 'OTHER']).optional(),
      productType: z.string().max(200).optional(),
      targetMarket: z.string().max(200).optional(),
      marketingBudget: z.number().min(0).optional(),
      totalBudget: z.number().min(0).optional(),
      launchDate: z.string().datetime().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Venture aktualisieren: ${args.ventureId}`,
    execute: async (args: {
      ventureId: string;
      name?: string;
      description?: string;
      status?: 'IDEATION' | 'IN_PROGRESS' | 'LAUNCHED' | 'PAUSED' | 'CANCELLED';
      currentPhase?: number;
      type?: 'ECOMMERCE' | 'SAAS' | 'SERVICE' | 'INFLUENCER' | 'MARKETPLACE' | 'AGENCY' | 'OTHER';
      productType?: string;
      targetMarket?: string;
      marketingBudget?: number;
      totalBudget?: number;
      launchDate?: string;
    }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) {
        return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
      }

      const updated = await prisma.venture.update({
        where: { id: venture.id },
        data: {
          ...(args.name !== undefined && { name: args.name }),
          ...(args.description !== undefined && { description: args.description }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.currentPhase !== undefined && { currentPhase: args.currentPhase }),
          ...(args.type !== undefined && { type: args.type }),
          ...(args.productType !== undefined && { productType: args.productType }),
          ...(args.targetMarket !== undefined && { targetMarket: args.targetMarket }),
          ...(args.marketingBudget !== undefined && { marketingBudget: args.marketingBudget }),
          ...(args.totalBudget !== undefined && { totalBudget: args.totalBudget }),
          ...(args.launchDate !== undefined && { launchDate: new Date(args.launchDate) }),
          lastActivityAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          status: true,
          currentPhase: true,
          type: true,
          productType: true,
          targetMarket: true,
          marketingBudget: true,
          totalBudget: true,
          launchDate: true,
        },
      });

      return { ok: true, venture: updated };
    },
  },
  {
    name: 'update_task',
    description: 'Aktualisiert/verschiebt Aufgaben (Status, Priorität, Zuweisung).',
    inputSchema: z.object({
      taskId: z.string(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']).optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      dueDate: z.string().datetime().optional(),
      assignedToId: z.string().optional().nullable(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Task aktualisieren: ${args.taskId}`,
    execute: async (args: {
      taskId: string;
      title?: string;
      description?: string;
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      dueDate?: string;
      assignedToId?: string | null;
    }, ctx) => {
      const task = await prisma.ventureTask.findFirst({
        where: {
          id: args.taskId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
        select: {
          id: true,
          ventureId: true,
          venture: { select: { ownerId: true, squadId: true } },
        },
      });

      if (!task) {
        return { ok: false, error: 'Task nicht gefunden oder keine Berechtigung' };
      }

      if (typeof args.assignedToId === 'string') {
        const assigneeIsOwner = args.assignedToId === task.venture.ownerId;
        let assigneeIsMember = false;
        if (task.venture.squadId) {
          const member = await ensureSquadAccess(task.venture.squadId, args.assignedToId);
          assigneeIsMember = Boolean(member);
        }
        if (!assigneeIsOwner && !assigneeIsMember) {
          return { ok: false, error: 'Ziel-User ist nicht Teil dieses Ventures.' };
        }
      }

      const completedAt =
        args.status === 'DONE' ? new Date() : args.status ? null : undefined;

      const updated = await prisma.ventureTask.update({
        where: { id: task.id },
        data: {
          ...(args.title !== undefined && { title: args.title }),
          ...(args.description !== undefined && { description: args.description }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.priority !== undefined && { priority: args.priority }),
          ...(args.dueDate !== undefined && { dueDate: new Date(args.dueDate) }),
          ...(args.assignedToId !== undefined && { assignedToId: args.assignedToId }),
          ...(completedAt !== undefined && { completedAt }),
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedToId: true,
          completedAt: true,
        },
      });

      return { ok: true, task: updated };
    },
  },
  {
    name: 'update_venture_step',
    description: 'Aktualisiert Venture-Step Status oder Daten.',
    inputSchema: z.object({
      ventureId: z.string(),
      stepNumber: z.number().int().min(1).max(20),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
      data: z.any().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Venture Step aktualisieren: ${args.ventureId} #${args.stepNumber}`,
    execute: async (args: {
      ventureId: string;
      stepNumber: number;
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      data?: unknown;
    }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) {
        return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
      }

      const existing = await prisma.ventureStep.findFirst({
        where: { ventureId: venture.id, stepNumber: args.stepNumber },
      });

      const completedAt =
        args.status === 'COMPLETED' ? new Date() : args.status ? null : undefined;

      const step = existing
        ? await prisma.ventureStep.update({
            where: { id: existing.id },
            data: {
              ...(args.status !== undefined && { status: args.status }),
              ...(args.data !== undefined && { data: toJsonValue(args.data) }),
              ...(completedAt !== undefined && { completedAt }),
            },
          })
        : await prisma.ventureStep.create({
            data: {
              ventureId: venture.id,
              stepNumber: args.stepNumber,
              stepName: `Step ${args.stepNumber}`,
              status: args.status ?? 'PENDING',
              ...(args.data !== undefined && { data: toJsonValue(args.data) }),
              completedAt: completedAt ?? undefined,
            },
          });

      return { ok: true, step };
    },
  },
  {
    name: 'create_roadmap_item',
    description: 'Erstellt ein Roadmap-Item für eine Squad.',
    inputSchema: z.object({
      squadId: z.string(),
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE']).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Roadmap-Item erstellen: ${truncate(args.title, 60)}`,
    execute: async (args: { squadId: string; title: string; description?: string; status?: 'PLANNED' | 'IN_PROGRESS' | 'DONE' }, ctx) => {
      const membership = await ensureSquadAccess(args.squadId, ctx.user.id);
      if (!membership) {
        return { ok: false, error: 'Keine Berechtigung für diese Squad.' };
      }

      const item = await prisma.roadmapItem.create({
        data: {
          squadId: args.squadId,
          title: args.title,
          description: args.description || null,
          status: args.status ?? 'PLANNED',
        },
      });

      return { ok: true, item };
    },
  },
  {
    name: 'update_roadmap_item',
    description: 'Aktualisiert ein Roadmap-Item.',
    inputSchema: z.object({
      roadmapItemId: z.string(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE']).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Roadmap-Item aktualisieren: ${args.roadmapItemId}`,
    execute: async (args: { roadmapItemId: string; title?: string; description?: string; status?: 'PLANNED' | 'IN_PROGRESS' | 'DONE' }, ctx) => {
      const item = await prisma.roadmapItem.findUnique({
        where: { id: args.roadmapItemId },
        select: { id: true, squadId: true },
      });
      if (!item) return { ok: false, error: 'Roadmap-Item nicht gefunden.' };

      const membership = await ensureSquadAccess(item.squadId, ctx.user.id);
      if (!membership) {
        return { ok: false, error: 'Keine Berechtigung für diese Squad.' };
      }

      const updated = await prisma.roadmapItem.update({
        where: { id: item.id },
        data: {
          ...(args.title !== undefined && { title: args.title }),
          ...(args.description !== undefined && { description: args.description }),
          ...(args.status !== undefined && { status: args.status }),
        },
      });

      return { ok: true, item: updated };
    },
  },
  {
    name: 'vote_roadmap_item',
    description: 'Stimmt für ein Roadmap-Item ab.',
    inputSchema: z.object({
      roadmapItemId: z.string(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Roadmap-Item voten: ${args.roadmapItemId}`,
    execute: async ({ roadmapItemId }: { roadmapItemId: string }, ctx) => {
      const item = await prisma.roadmapItem.findUnique({
        where: { id: roadmapItemId },
        select: { id: true, squadId: true },
      });
      if (!item) return { ok: false, error: 'Roadmap-Item nicht gefunden.' };

      const membership = await ensureSquadAccess(item.squadId, ctx.user.id);
      if (!membership) {
        return { ok: false, error: 'Keine Berechtigung für diese Squad.' };
      }

      const vote = await prisma.roadmapVote.upsert({
        where: { userId_roadmapItemId: { userId: ctx.user.id, roadmapItemId: item.id } },
        update: {},
        create: { userId: ctx.user.id, roadmapItemId: item.id },
      });

      return { ok: true, voteId: vote.id };
    },
  },
  {
    name: 'create_decision',
    description: 'Erstellt eine neue Entscheidung/Abstimmung.',
    inputSchema: z.object({
      squadId: z.string(),
      ventureId: z.string().optional(),
      question: z.string().min(3).max(500),
      description: z.string().max(2000).optional(),
      type: z.enum(['multiple-choice', 'yes-no', 'ranking']).optional(),
      options: z.array(z.string().min(1).max(200)).optional(),
      deadline: z.string().datetime().optional(),
      requiredQuorum: z.number().int().min(1).max(100).optional(),
      winningThreshold: z.number().int().min(1).max(100).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Decision erstellen: ${truncate(args.question, 80)}`,
    execute: async (args: {
      squadId: string;
      ventureId?: string;
      question: string;
      description?: string;
      type?: 'multiple-choice' | 'yes-no' | 'ranking';
      options?: string[];
      deadline?: string;
      requiredQuorum?: number;
      winningThreshold?: number;
    }, ctx) => {
      const membership = await ensureSquadAccess(args.squadId, ctx.user.id);
      if (!membership) {
        return { ok: false, error: 'Keine Berechtigung für diese Squad.' };
      }

      if (args.ventureId) {
        const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
        if (!venture) {
          return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
        }
        if (venture.squadId && venture.squadId !== args.squadId) {
          return { ok: false, error: 'Venture gehört zu einer anderen Squad.' };
        }
      }

      const type = args.type ?? 'multiple-choice';
      let options = args.options ?? [];
      if (type === 'yes-no' && options.length === 0) {
        options = ['Ja', 'Nein'];
      }
      if (type !== 'yes-no' && options.length < 2) {
        return { ok: false, error: 'Mindestens 2 Optionen erforderlich.' };
      }

      const decision = await prisma.decision.create({
        data: {
          squadId: args.squadId,
          ventureId: args.ventureId ?? null,
          question: args.question,
          description: args.description ?? null,
          type,
          options,
          deadline: args.deadline ? new Date(args.deadline) : null,
          requiredQuorum: args.requiredQuorum ?? 50,
          winningThreshold: args.winningThreshold ?? 50,
          status: 'open',
          createdById: ctx.user.id,
        },
      });

      return { ok: true, decision };
    },
  },
  {
    name: 'create_marketing_content',
    description: 'Speichert generierten Marketing-Content.',
    inputSchema: z.object({
      ventureId: z.string(),
      contentType: z.string().min(1).max(50),
      prompt: z.string().min(1).max(5000),
      generatedContent: z.string().min(1),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Marketing Content speichern: ${args.contentType}`,
    execute: async (args: { ventureId: string; contentType: string; prompt: string; generatedContent: string }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const content = await prisma.marketingContent.create({
        data: {
          ventureId: venture.id,
          contentType: args.contentType,
          prompt: args.prompt,
          generatedContent: args.generatedContent,
          createdById: ctx.user.id,
        },
      });

      return { ok: true, content };
    },
  },
  {
    name: 'create_marketing_campaign',
    description: 'Legt eine Marketing-Kampagne an.',
    inputSchema: z.object({
      ventureId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      goal: z.string().max(100).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      budgetAmount: z.number().min(0).optional(),
      budgetCurrency: z.string().max(10).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Kampagne erstellen: ${truncate(args.name, 60)}`,
    execute: async (args: {
      ventureId: string;
      name: string;
      description?: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      budgetAmount?: number;
      budgetCurrency?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
    }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const campaign = await prisma.marketingCampaign.create({
        data: {
          ventureId: venture.id,
          name: args.name,
          description: args.description ?? null,
          goal: args.goal ?? null,
          startDate: args.startDate ? new Date(args.startDate) : null,
          endDate: args.endDate ? new Date(args.endDate) : null,
          budgetAmount: args.budgetAmount ?? null,
          budgetCurrency: args.budgetCurrency ?? 'EUR',
          status: args.status ?? 'DRAFT',
          createdById: ctx.user.id,
        },
      });

      return { ok: true, campaign };
    },
  },
  {
    name: 'update_marketing_campaign',
    description: 'Aktualisiert eine Marketing-Kampagne.',
    inputSchema: z.object({
      campaignId: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      goal: z.string().max(100).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      budgetAmount: z.number().min(0).optional(),
      budgetCurrency: z.string().max(10).optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
      spentAmount: z.number().min(0).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Kampagne aktualisieren: ${args.campaignId}`,
    execute: async (args: {
      campaignId: string;
      name?: string;
      description?: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      budgetAmount?: number;
      budgetCurrency?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
      spentAmount?: number;
    }, ctx) => {
      const campaign = await prisma.marketingCampaign.findFirst({
        where: {
          id: args.campaignId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!campaign) return { ok: false, error: 'Kampagne nicht gefunden oder keine Berechtigung' };

      const updated = await prisma.marketingCampaign.update({
        where: { id: campaign.id },
        data: {
          ...(args.name !== undefined && { name: args.name }),
          ...(args.description !== undefined && { description: args.description }),
          ...(args.goal !== undefined && { goal: args.goal }),
          ...(args.startDate !== undefined && { startDate: new Date(args.startDate) }),
          ...(args.endDate !== undefined && { endDate: new Date(args.endDate) }),
          ...(args.budgetAmount !== undefined && { budgetAmount: args.budgetAmount }),
          ...(args.budgetCurrency !== undefined && { budgetCurrency: args.budgetCurrency }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.spentAmount !== undefined && { spentAmount: args.spentAmount }),
        },
      });

      return { ok: true, campaign: updated };
    },
  },
  {
    name: 'create_content_post',
    description: 'Plant oder erstellt einen Content-Post.',
    inputSchema: z.object({
      ventureId: z.string(),
      campaignId: z.string().optional(),
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      contentType: z.string().min(1).max(50),
      platform: z.string().max(50).optional(),
      status: z.enum(['DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED']).optional(),
      scheduledFor: z.string().datetime().optional(),
      imageUrls: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Content-Post erstellen: ${truncate(args.title, 60)}`,
    execute: async (args: {
      ventureId: string;
      campaignId?: string;
      title: string;
      content: string;
      contentType: string;
      platform?: string;
      status?: 'DRAFT' | 'READY' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
      scheduledFor?: string;
      imageUrls?: string[];
    }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      if (args.campaignId) {
        const campaign = await prisma.marketingCampaign.findFirst({
          where: { id: args.campaignId, ventureId: venture.id },
        });
        if (!campaign) return { ok: false, error: 'Kampagne nicht gefunden.' };
      }

      const post = await prisma.contentPost.create({
        data: {
          ventureId: venture.id,
          campaignId: args.campaignId ?? null,
          title: args.title,
          content: args.content,
          contentType: args.contentType,
          platform: args.platform ?? null,
          status: args.status ?? 'DRAFT',
          scheduledFor: args.scheduledFor ? new Date(args.scheduledFor) : null,
          imageUrls: args.imageUrls ?? [],
          createdById: ctx.user.id,
        },
      });

      return { ok: true, post };
    },
  },
  {
    name: 'update_content_post',
    description: 'Aktualisiert einen Content-Post.',
    inputSchema: z.object({
      postId: z.string(),
      title: z.string().min(1).max(200).optional(),
      content: z.string().optional(),
      contentType: z.string().min(1).max(50).optional(),
      platform: z.string().max(50).optional(),
      status: z.enum(['DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED']).optional(),
      scheduledFor: z.string().datetime().optional(),
      publishedAt: z.string().datetime().optional(),
      externalId: z.string().optional(),
      externalUrl: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Content-Post aktualisieren: ${args.postId}`,
    execute: async (args: {
      postId: string;
      title?: string;
      content?: string;
      contentType?: string;
      platform?: string;
      status?: 'DRAFT' | 'READY' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
      scheduledFor?: string;
      publishedAt?: string;
      externalId?: string;
      externalUrl?: string;
      imageUrls?: string[];
    }, ctx) => {
      const post = await prisma.contentPost.findFirst({
        where: {
          id: args.postId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!post) return { ok: false, error: 'Post nicht gefunden oder keine Berechtigung' };

      const updated = await prisma.contentPost.update({
        where: { id: post.id },
        data: {
          ...(args.title !== undefined && { title: args.title }),
          ...(args.content !== undefined && { content: args.content }),
          ...(args.contentType !== undefined && { contentType: args.contentType }),
          ...(args.platform !== undefined && { platform: args.platform }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.scheduledFor !== undefined && { scheduledFor: new Date(args.scheduledFor) }),
          ...(args.publishedAt !== undefined && { publishedAt: new Date(args.publishedAt) }),
          ...(args.externalId !== undefined && { externalId: args.externalId }),
          ...(args.externalUrl !== undefined && { externalUrl: args.externalUrl }),
          ...(args.imageUrls !== undefined && { imageUrls: args.imageUrls }),
        },
      });

      return { ok: true, post: updated };
    },
  },
  {
    name: 'create_legal_document',
    description: 'Erstellt ein Legal-Dokument.',
    inputSchema: z.object({
      ventureId: z.string(),
      documentType: z.enum(['NDA', 'SERVICE_AGREEMENT', 'PARTNERSHIP', 'SUPPLIER_CONTRACT', 'EMPLOYMENT', 'CUSTOM']),
      documentTitle: z.string().min(3).max(255),
      status: z.enum(['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED']).optional(),
      generatedContent: z.string().min(1),
      aiPrompt: z.string().optional(),
      partnerInfo: z.object({
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
      }).optional(),
      contractTerms: z.any().optional(),
      notes: z.string().optional(),
      documentUrl: z.string().optional(),
      signatureUrl: z.string().optional(),
      sentAt: z.string().datetime().optional(),
      signedAt: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Legal Doc erstellen: ${truncate(args.documentTitle, 60)}`,
    execute: async (args: any, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const doc = await prisma.legalDocument.create({
        data: {
          ventureId: venture.id,
          squadId: venture.squadId ?? null,
          createdById: ctx.user.id,
          documentType: args.documentType,
          documentTitle: args.documentTitle,
          status: args.status ?? 'DRAFT',
          aiPrompt: args.aiPrompt ?? null,
          generatedContent: args.generatedContent,
          partnerCompanyName: args.partnerInfo?.companyName ?? null,
          partnerContactName: args.partnerInfo?.contactName ?? null,
          partnerContactEmail: args.partnerInfo?.contactEmail ?? null,
          partnerContactPhone: args.partnerInfo?.contactPhone ?? null,
          partnerAddress: args.partnerInfo?.address ?? null,
          contractTerms: toJsonValue(args.contractTerms ?? null),
          notes: args.notes ?? null,
          documentUrl: args.documentUrl ?? null,
          signatureUrl: args.signatureUrl ?? null,
          sentAt: args.sentAt ? new Date(args.sentAt) : null,
          signedAt: args.signedAt ? new Date(args.signedAt) : null,
          expiresAt: args.expiresAt ? new Date(args.expiresAt) : null,
        },
      });

      return { ok: true, document: doc };
    },
  },
  {
    name: 'update_legal_document',
    description: 'Aktualisiert ein Legal-Dokument (Version wird erhöht, wenn Inhalt geändert wird).',
    inputSchema: z.object({
      documentId: z.string(),
      documentTitle: z.string().min(3).max(255).optional(),
      status: z.enum(['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED']).optional(),
      generatedContent: z.string().optional(),
      aiPrompt: z.string().optional(),
      partnerInfo: z.object({
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        address: z.string().optional(),
      }).optional(),
      contractTerms: z.any().optional(),
      notes: z.string().optional(),
      documentUrl: z.string().optional(),
      signatureUrl: z.string().optional(),
      sentAt: z.string().datetime().optional(),
      signedAt: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Legal Doc aktualisieren: ${args.documentId}`,
    execute: async (args: any, ctx) => {
      const doc = await prisma.legalDocument.findFirst({
        where: {
          id: args.documentId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!doc) return { ok: false, error: 'Dokument nicht gefunden oder keine Berechtigung' };

      const bumpVersion = args.generatedContent !== undefined || args.contractTerms !== undefined;
      const updated = await prisma.legalDocument.update({
        where: { id: doc.id },
        data: {
          ...(args.documentTitle !== undefined && { documentTitle: args.documentTitle }),
          ...(args.status !== undefined && { status: args.status }),
          ...(args.generatedContent !== undefined && { generatedContent: args.generatedContent }),
          ...(args.aiPrompt !== undefined && { aiPrompt: args.aiPrompt }),
          ...(args.partnerInfo?.companyName !== undefined && { partnerCompanyName: args.partnerInfo.companyName }),
          ...(args.partnerInfo?.contactName !== undefined && { partnerContactName: args.partnerInfo.contactName }),
          ...(args.partnerInfo?.contactEmail !== undefined && { partnerContactEmail: args.partnerInfo.contactEmail }),
          ...(args.partnerInfo?.contactPhone !== undefined && { partnerContactPhone: args.partnerInfo.contactPhone }),
          ...(args.partnerInfo?.address !== undefined && { partnerAddress: args.partnerInfo.address }),
          ...(args.contractTerms !== undefined && { contractTerms: toJsonValue(args.contractTerms) }),
          ...(args.notes !== undefined && { notes: args.notes }),
          ...(args.documentUrl !== undefined && { documentUrl: args.documentUrl }),
          ...(args.signatureUrl !== undefined && { signatureUrl: args.signatureUrl }),
          ...(args.sentAt !== undefined && { sentAt: new Date(args.sentAt) }),
          ...(args.signedAt !== undefined && { signedAt: new Date(args.signedAt) }),
          ...(args.expiresAt !== undefined && { expiresAt: new Date(args.expiresAt) }),
          ...(bumpVersion && { version: doc.version + 1 }),
        },
      });

      return { ok: true, document: updated };
    },
  },
  {
    name: 'save_contract_scan',
    description: 'Speichert Contract-Scanner-Ausgaben als Legal-Dokument.',
    inputSchema: z.object({
      ventureId: z.string(),
      documentTitle: z.string().min(3).max(255),
      summary: z.string().min(1),
      scanResult: z.any().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Contract-Scan speichern: ${truncate(args.documentTitle, 60)}`,
    execute: async (args: { ventureId: string; documentTitle: string; summary: string; scanResult?: unknown }, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const doc = await prisma.legalDocument.create({
        data: {
          ventureId: venture.id,
          squadId: venture.squadId ?? null,
          createdById: ctx.user.id,
          documentType: 'CUSTOM',
          documentTitle: args.documentTitle,
          status: 'DRAFT',
          generatedContent: args.summary,
          notes: args.scanResult ? JSON.stringify(args.scanResult) : null,
        },
      });

      return { ok: true, document: doc };
    },
  },
  {
    name: 'attach_signature_link',
    description: 'Speichert einen Signatur-Link für ein Dokument (DocuSign falls verbunden).',
    inputSchema: z.object({
      documentId: z.string(),
      signatureUrl: z.string().min(5),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Signatur-Link speichern: ${args.documentId}`,
    execute: async (args: { documentId: string; signatureUrl: string }, ctx) => {
      const doc = await prisma.legalDocument.findFirst({
        where: {
          id: args.documentId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
        select: { id: true, ventureId: true },
      });
      if (!doc) return { ok: false, error: 'Dokument nicht gefunden oder keine Berechtigung' };

      const docusignConnection = await prisma.integrationConnection.findFirst({
        where: { userId: ctx.user.id, provider: 'DOCUSIGN', status: 'CONNECTED' },
      });
      if (!docusignConnection) {
        return { ok: false, error: 'DocuSign ist nicht verbunden.' };
      }

      const updated = await prisma.legalDocument.update({
        where: { id: doc.id },
        data: {
          signatureUrl: args.signatureUrl,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      return { ok: true, document: updated };
    },
  },
  {
    name: 'list_suppliers',
    description: 'Listet Supplier für ein Venture auf (optional mit Filtern).',
    inputSchema: z.object({
      ventureId: z.string().optional(),
      query: z.string().min(1).max(120).optional(),
      category: z.string().min(1).max(100).optional(),
      country: z.string().min(1).max(100).optional(),
      ratingMin: z.number().int().min(1).max(5).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    requiresConfirmation: false,
    execute: async (args: any, ctx) => {
      let ventureIds: string[] = [];
      if (args.ventureId) {
        const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
        if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };
        ventureIds = [venture.id];
      } else if (ctx.activeVentureId) {
        ventureIds = [ctx.activeVentureId];
      } else {
        ventureIds = ctx.ventures.map((venture) => venture.id);
      }

      if (ventureIds.length === 0) return { ok: false, error: 'Bitte Venture angeben.' };

      const where: Prisma.SupplierWhereInput = { ventureId: { in: ventureIds } };
      if (args.category) {
        where.category = { contains: args.category, mode: 'insensitive' };
      }
      if (args.country) {
        where.country = { contains: args.country, mode: 'insensitive' };
      }
      if (args.ratingMin) {
        where.rating = { gte: args.ratingMin };
      }
      if (args.query) {
        const q = args.query.trim();
        where.OR = [
          { companyName: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { specialization: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { country: { contains: q, mode: 'insensitive' } },
        ];
      }

      const suppliers = await prisma.supplier.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: args.limit ?? 20,
        select: {
          id: true,
          ventureId: true,
          venture: { select: { id: true, name: true } },
          companyName: true,
          category: true,
          contactName: true,
          email: true,
          phone: true,
          website: true,
          country: true,
          specialization: true,
          moq: true,
          leadTimeDays: true,
          paymentTerms: true,
          rating: true,
          tags: true,
          updatedAt: true,
        },
      });

      return { ok: true, ventureIds, suppliers };
    },
  },
  {
    name: 'get_supplier',
    description: 'Lädt einen Supplier mit Details.',
    inputSchema: z.object({
      supplierId: z.string(),
    }),
    requiresConfirmation: false,
    execute: async (args: any, ctx) => {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: args.supplierId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!supplier) return { ok: false, error: 'Supplier nicht gefunden oder keine Berechtigung' };
      return { ok: true, supplier };
    },
  },
  {
    name: 'create_supplier',
    description: 'Legt einen Supplier an.',
    inputSchema: z.object({
      ventureId: z.string(),
      companyName: z.string().min(1).max(200),
      category: z.string().min(1).max(100),
      contactName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      specialization: z.string().optional(),
      moq: z.number().int().min(0).optional(),
      leadTimeDays: z.number().int().min(0).optional(),
      paymentTerms: z.string().optional(),
      rating: z.number().int().min(1).max(5).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Supplier erstellen: ${truncate(args.companyName, 60)}`,
    execute: async (args: any, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const supplier = await prisma.supplier.create({
        data: {
          ventureId: venture.id,
          companyName: args.companyName,
          category: args.category,
          contactName: args.contactName ?? null,
          email: args.email ?? null,
          phone: args.phone ?? null,
          website: args.website ?? null,
          address: args.address ?? null,
          country: args.country ?? null,
          specialization: args.specialization ?? null,
          moq: args.moq ?? null,
          leadTimeDays: args.leadTimeDays ?? null,
          paymentTerms: args.paymentTerms ?? null,
          rating: args.rating ?? null,
          notes: args.notes ?? null,
          tags: args.tags ?? [],
        },
      });

      return { ok: true, supplier };
    },
  },
  {
    name: 'update_supplier',
    description: 'Aktualisiert einen Supplier (inkl. Bewertung).',
    inputSchema: z.object({
      supplierId: z.string(),
      companyName: z.string().min(1).max(200).optional(),
      category: z.string().min(1).max(100).optional(),
      contactName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      country: z.string().optional(),
      specialization: z.string().optional(),
      moq: z.number().int().min(0).optional(),
      leadTimeDays: z.number().int().min(0).optional(),
      paymentTerms: z.string().optional(),
      rating: z.number().int().min(1).max(5).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Supplier aktualisieren: ${args.supplierId}`,
    execute: async (args: any, ctx) => {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: args.supplierId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!supplier) return { ok: false, error: 'Supplier nicht gefunden oder keine Berechtigung' };

      const updated = await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
          ...(args.companyName !== undefined && { companyName: args.companyName }),
          ...(args.category !== undefined && { category: args.category }),
          ...(args.contactName !== undefined && { contactName: args.contactName }),
          ...(args.email !== undefined && { email: args.email }),
          ...(args.phone !== undefined && { phone: args.phone }),
          ...(args.website !== undefined && { website: args.website }),
          ...(args.address !== undefined && { address: args.address }),
          ...(args.country !== undefined && { country: args.country }),
          ...(args.specialization !== undefined && { specialization: args.specialization }),
          ...(args.moq !== undefined && { moq: args.moq }),
          ...(args.leadTimeDays !== undefined && { leadTimeDays: args.leadTimeDays }),
          ...(args.paymentTerms !== undefined && { paymentTerms: args.paymentTerms }),
          ...(args.rating !== undefined && { rating: args.rating }),
          ...(args.notes !== undefined && { notes: args.notes }),
          ...(args.tags !== undefined && { tags: args.tags }),
        },
      });

      return { ok: true, supplier: updated };
    },
  },
  {
    name: 'create_sample',
    description: 'Legt einen Sample-Request an.',
    inputSchema: z.object({
      ventureId: z.string(),
      supplierId: z.string(),
      productName: z.string().min(1).max(200),
      description: z.string().optional(),
      quantity: z.number().int().min(1).optional(),
      cost: z.number().min(0).optional(),
      currency: z.string().max(10).optional(),
      status: z.enum(['REQUESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED']).optional(),
      orderedAt: z.string().datetime().optional(),
      receivedAt: z.string().datetime().optional(),
      approved: z.boolean().optional(),
      qualityRating: z.number().int().min(1).max(5).optional(),
      feedback: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      specFileUrls: z.array(z.string()).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Sample erstellen: ${truncate(args.productName, 60)}`,
    execute: async (args: any, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const supplier = await prisma.supplier.findFirst({
        where: { id: args.supplierId, ventureId: venture.id },
      });
      if (!supplier) return { ok: false, error: 'Supplier nicht gefunden.' };

      const sample = await prisma.sample.create({
        data: {
          ventureId: venture.id,
          supplierId: supplier.id,
          productName: args.productName,
          description: args.description ?? null,
          quantity: args.quantity ?? null,
          cost: args.cost ?? null,
          currency: args.currency ?? 'EUR',
          status: args.status ?? 'REQUESTED',
          orderedAt: args.orderedAt ? new Date(args.orderedAt) : null,
          receivedAt: args.receivedAt ? new Date(args.receivedAt) : null,
          approved: args.approved ?? null,
          qualityRating: args.qualityRating ?? null,
          feedback: args.feedback ?? null,
          imageUrls: args.imageUrls ?? [],
          specFileUrls: args.specFileUrls ?? [],
          createdById: ctx.user.id,
        },
      });

      return { ok: true, sample };
    },
  },
  {
    name: 'update_sample',
    description: 'Aktualisiert einen Sample-Request.',
    inputSchema: z.object({
      sampleId: z.string(),
      status: z.enum(['REQUESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED']).optional(),
      orderedAt: z.string().datetime().optional(),
      receivedAt: z.string().datetime().optional(),
      approved: z.boolean().optional(),
      qualityRating: z.number().int().min(1).max(5).optional(),
      feedback: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      specFileUrls: z.array(z.string()).optional(),
      cost: z.number().min(0).optional(),
      quantity: z.number().int().min(1).optional(),
      currency: z.string().max(10).optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Sample aktualisieren: ${args.sampleId}`,
    execute: async (args: any, ctx) => {
      const sample = await prisma.sample.findFirst({
        where: {
          id: args.sampleId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!sample) return { ok: false, error: 'Sample nicht gefunden oder keine Berechtigung' };

      const receivedAt =
        args.status === 'RECEIVED' && !args.receivedAt ? new Date() : args.receivedAt ? new Date(args.receivedAt) : undefined;
      const orderedAt =
        args.status === 'ORDERED' && !args.orderedAt ? new Date() : args.orderedAt ? new Date(args.orderedAt) : undefined;

      const updated = await prisma.sample.update({
        where: { id: sample.id },
        data: {
          ...(args.status !== undefined && { status: args.status }),
          ...(orderedAt !== undefined && { orderedAt }),
          ...(receivedAt !== undefined && { receivedAt }),
          ...(args.approved !== undefined && { approved: args.approved }),
          ...(args.qualityRating !== undefined && { qualityRating: args.qualityRating }),
          ...(args.feedback !== undefined && { feedback: args.feedback }),
          ...(args.imageUrls !== undefined && { imageUrls: args.imageUrls }),
          ...(args.specFileUrls !== undefined && { specFileUrls: args.specFileUrls }),
          ...(args.cost !== undefined && { cost: args.cost }),
          ...(args.quantity !== undefined && { quantity: args.quantity }),
          ...(args.currency !== undefined && { currency: args.currency }),
        },
      });

      return { ok: true, sample: updated };
    },
  },
  {
    name: 'create_production_order',
    description: 'Erstellt einen Production Order.',
    inputSchema: z.object({
      ventureId: z.string(),
      supplierId: z.string(),
      orderNumber: z.string().min(1).max(100),
      productName: z.string().min(1).max(200),
      description: z.string().optional(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
      totalPrice: z.number().min(0).optional(),
      currency: z.string().max(10).optional(),
      expectedDelivery: z.string().datetime().optional(),
      status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
      paymentStatus: z.enum(['PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED']).optional(),
      depositPaid: z.number().min(0).optional(),
      finalPaid: z.number().min(0).optional(),
      poFileUrl: z.string().optional(),
      invoiceUrls: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Production Order erstellen: ${truncate(args.orderNumber, 60)}`,
    execute: async (args: any, ctx) => {
      const venture = await getAccessibleVenture(args.ventureId, ctx.user.id);
      if (!venture) return { ok: false, error: 'Venture nicht gefunden oder keine Berechtigung' };

      const supplier = await prisma.supplier.findFirst({
        where: { id: args.supplierId, ventureId: venture.id },
      });
      if (!supplier) return { ok: false, error: 'Supplier nicht gefunden.' };

      const totalPrice = args.totalPrice ?? args.quantity * args.unitPrice;

      const order = await prisma.productionOrder.create({
        data: {
          ventureId: venture.id,
          supplierId: supplier.id,
          orderNumber: args.orderNumber,
          productName: args.productName,
          description: args.description ?? null,
          quantity: args.quantity,
          unitPrice: args.unitPrice,
          totalPrice,
          currency: args.currency ?? 'EUR',
          expectedDelivery: args.expectedDelivery ? new Date(args.expectedDelivery) : null,
          status: args.status ?? 'DRAFT',
          paymentStatus: args.paymentStatus ?? 'PENDING',
          depositPaid: args.depositPaid ?? null,
          finalPaid: args.finalPaid ?? null,
          poFileUrl: args.poFileUrl ?? null,
          invoiceUrls: args.invoiceUrls ?? [],
          notes: args.notes ?? null,
          createdById: ctx.user.id,
        },
      });

      return { ok: true, order };
    },
  },
  {
    name: 'update_production_order',
    description: 'Aktualisiert einen Production Order.',
    inputSchema: z.object({
      orderId: z.string(),
      status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
      paymentStatus: z.enum(['PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED']).optional(),
      expectedDelivery: z.string().datetime().optional(),
      actualDelivery: z.string().datetime().optional(),
      depositPaid: z.number().min(0).optional(),
      finalPaid: z.number().min(0).optional(),
      poFileUrl: z.string().optional(),
      invoiceUrls: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }),
    requiresConfirmation: true,
    summarize: (args) => `Production Order aktualisieren: ${args.orderId}`,
    execute: async (args: any, ctx) => {
      const order = await prisma.productionOrder.findFirst({
        where: {
          id: args.orderId,
          venture: {
            OR: [
              { ownerId: ctx.user.id },
              { squad: { members: { some: { userId: ctx.user.id, leftAt: null } } } },
            ],
          },
        },
      });
      if (!order) return { ok: false, error: 'Order nicht gefunden oder keine Berechtigung' };

      const updated = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          ...(args.status !== undefined && { status: args.status }),
          ...(args.paymentStatus !== undefined && { paymentStatus: args.paymentStatus }),
          ...(args.expectedDelivery !== undefined && { expectedDelivery: new Date(args.expectedDelivery) }),
          ...(args.actualDelivery !== undefined && { actualDelivery: new Date(args.actualDelivery) }),
          ...(args.depositPaid !== undefined && { depositPaid: args.depositPaid }),
          ...(args.finalPaid !== undefined && { finalPaid: args.finalPaid }),
          ...(args.poFileUrl !== undefined && { poFileUrl: args.poFileUrl }),
          ...(args.invoiceUrls !== undefined && { invoiceUrls: args.invoiceUrls }),
          ...(args.notes !== undefined && { notes: args.notes }),
        },
      });

      return { ok: true, order: updated };
    },
  },
  {
    name: 'confirm_action',
    description: 'Bestätigt eine zuvor vorgeschlagene Aktion und führt sie aus.',
    inputSchema: z.object({
      confirmationToken: z.string().describe('Der Bestätigungs-Token der Aktion'),
    }),
    requiresConfirmation: false,
    execute: async ({ confirmationToken }: { confirmationToken: string }, ctx) => {
      const pending = await getPendingActionByToken(ctx.user.id, confirmationToken);
      if (!pending) {
        return { ok: false, error: 'Keine ausstehende Aktion mit diesem Token gefunden.' };
      }

      const tool = toolDefinitions.find((item) => item.name === pending.toolName);
      if (!tool) {
        await markActionFailed(pending.id, 'Tool nicht gefunden');
        return { ok: false, error: 'Tool nicht gefunden.' };
      }

      await confirmPendingAction(pending.id);

      try {
        const result = await tool.execute(pending.payload as any, ctx);
        const logged = tool.logResult ? tool.logResult(result) : result;
        await markActionExecuted(pending.id, logged);
        return { ok: true, result, actionId: pending.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await markActionFailed(pending.id, message);
        return { ok: false, error: message, actionId: pending.id };
      }
    },
  },
  {
    name: 'cancel_action',
    description: 'Bricht eine ausstehende Aktion ab.',
    inputSchema: z.object({
      confirmationToken: z.string().describe('Der Bestätigungs-Token der Aktion'),
    }),
    requiresConfirmation: false,
    execute: async ({ confirmationToken }: { confirmationToken: string }, ctx) => {
      const pending = await getPendingActionByToken(ctx.user.id, confirmationToken);
      if (!pending) {
        return { ok: false, error: 'Keine ausstehende Aktion mit diesem Token gefunden.' };
      }

      await cancelPendingAction(pending.id);
      return { ok: true, message: 'Aktion abgebrochen.', actionId: pending.id };
    },
  },
  {
    name: 'list_pending_actions',
    description: 'Listet ausstehende Aktionen des Users auf.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(10).optional().describe('Maximale Anzahl'),
    }),
    requiresConfirmation: false,
    execute: async ({ limit }: { limit?: number }, ctx) => {
      const actions = await listPendingActions(ctx.user.id, limit ?? 5);
      return { ok: true, actions };
    },
  },
];

export const ORION_TOOL_DECLARATIONS = [
  {
    name: 'store_user_memory',
    description: 'Speichert wichtige Informationen über den User langfristig (Ziele, Vorlieben, Fakten). Nutze dies, wenn der User sagt "merk dir das" oder wichtige persönliche Infos teilt.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        category: {
          type: 'STRING' as const,
          description: 'Kategorie (z.B. GOAL, PREFERENCE, FACT, DECISION)',
          enum: ['GOAL', 'PREFERENCE', 'FACT', 'DECISION', 'OTHER'],
        },
        content: {
          type: 'STRING' as const,
          description: 'Der zu speichernde Inhalt',
        },
      },
      required: ['category', 'content'],
    },
  },
  {
    name: 'search_user_memory',
    description: 'Durchsucht die gespeicherten Erinnerungen des Users. Nutze dies, um frühere Informationen abzurufen.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        query: {
          type: 'STRING' as const,
          description: 'Suchbegriff',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_task',
    description: 'Erstellt eine neue Aufgabe für ein Venture',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: {
          type: 'STRING' as const,
          description: 'Die ID des Ventures',
        },
        title: {
          type: 'STRING' as const,
          description: 'Titel der Aufgabe',
        },
        description: {
          type: 'STRING' as const,
          description: 'Beschreibung (optional)',
        },
      },
      required: ['ventureId', 'title'],
    },
  },
  {
    name: 'update_profile',
    description: 'Aktualisiert Profilfelder (Name, Bio, Ziel, Skills, Socials).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        name: { type: 'STRING' as const, description: 'Name' },
        bio: { type: 'STRING' as const, description: 'Bio' },
        goal: { type: 'STRING' as const, description: 'Ziel' },
        skills: {
          type: 'ARRAY' as const,
          description: 'Skills',
          items: { type: 'STRING' as const },
        },
        linkedin: { type: 'STRING' as const, description: 'LinkedIn URL' },
        instagram: { type: 'STRING' as const, description: 'Instagram URL' },
      },
      required: [],
    },
  },
  {
    name: 'set_notification_preferences',
    description: 'Setzt Notification Preferences (Forum, Mentions, System).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        forumComments: { type: 'BOOLEAN' as const },
        forumReplies: { type: 'BOOLEAN' as const },
        mentions: { type: 'BOOLEAN' as const },
        system: { type: 'BOOLEAN' as const },
      },
      required: [],
    },
  },
  {
    name: 'set_privacy_preferences',
    description: 'Setzt Privacy Preferences (Profil-Sichtbarkeit, Follower-Zahlen).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        profileVisible: { type: 'BOOLEAN' as const },
        showFollowerCounts: { type: 'BOOLEAN' as const },
      },
      required: [],
    },
  },
  {
    name: 'set_tour_flags',
    description: 'Aktualisiert Onboarding/Tour-Flags des Users.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        onboardingComplete: { type: 'BOOLEAN' as const },
        hasSeenTour: { type: 'BOOLEAN' as const },
        hasSeenCockpitTour: { type: 'BOOLEAN' as const },
      },
      required: [],
    },
  },
  {
    name: 'list_api_keys',
    description: 'Listet API Keys des Users auf.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        includeInactive: { type: 'BOOLEAN' as const },
      },
      required: [],
    },
  },
  {
    name: 'create_api_key',
    description: 'Erstellt einen neuen API Key (einmaliges Klartext-Secret).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        name: { type: 'STRING' as const },
        ventureId: { type: 'STRING' as const },
        scopes: {
          type: 'ARRAY' as const,
          items: { type: 'STRING' as const },
        },
        rateLimit: { type: 'NUMBER' as const },
        rateLimitDaily: { type: 'NUMBER' as const },
        expiresAt: { type: 'STRING' as const, description: 'ISO Datetime' },
      },
      required: ['name', 'scopes'],
    },
  },
  {
    name: 'update_api_key',
    description: 'Aktualisiert API Key Metadaten (Name, Scopes, Limits).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        keyId: { type: 'STRING' as const },
        name: { type: 'STRING' as const },
        scopes: {
          type: 'ARRAY' as const,
          items: { type: 'STRING' as const },
        },
        rateLimit: { type: 'NUMBER' as const },
        rateLimitDaily: { type: 'NUMBER' as const },
        isActive: { type: 'BOOLEAN' as const },
      },
      required: ['keyId'],
    },
  },
  {
    name: 'deactivate_api_key',
    description: 'Deaktiviert einen API Key.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        keyId: { type: 'STRING' as const },
      },
      required: ['keyId'],
    },
  },
  {
    name: 'rotate_api_key',
    description: 'Rotiert einen API Key (alter wird deaktiviert, neuer wird erstellt).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        keyId: { type: 'STRING' as const },
      },
      required: ['keyId'],
    },
  },
  {
    name: 'list_integrations',
    description: 'Listet vorhandene Integrationen des Users auf.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
      },
      required: [],
    },
  },
  {
    name: 'connect_integration',
    description: 'Startet den OAuth-Connect für eine Integration und liefert den Auth-URL zurück.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        provider: {
          type: 'STRING' as const,
          enum: ['NOTION', 'DOCUSIGN', 'SLACK'],
        },
        ventureId: { type: 'STRING' as const },
        redirectUrl: { type: 'STRING' as const },
      },
      required: ['provider'],
    },
  },
  {
    name: 'disconnect_integration',
    description: 'Trennt eine Integration.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        connectionId: { type: 'STRING' as const },
      },
      required: ['connectionId'],
    },
  },
  {
    name: 'get_billing_summary',
    description: 'Liefert Billing-Status, Credits und Abo-Daten.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_invoices',
    description: 'Listet Rechnungen des Users auf.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        limit: { type: 'NUMBER' as const },
      },
      required: [],
    },
  },
  {
    name: 'create_billing_portal',
    description: 'Erstellt einen Stripe Billing Portal Link.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cancel_subscription',
    description: 'Kündigt das aktive Abo zum Periodenende.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'start_checkout',
    description: 'Erstellt eine Stripe Checkout Session (Abo oder Credits).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        type: { type: 'STRING' as const, enum: ['subscription', 'credits'] },
        priceId: { type: 'STRING' as const },
      },
      required: ['type', 'priceId'],
    },
  },
  {
    name: 'create_venture',
    description: 'Erstellt ein neues Venture.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        name: { type: 'STRING' as const, description: 'Venture-Name' },
        description: { type: 'STRING' as const, description: 'Beschreibung' },
        type: {
          type: 'STRING' as const,
          description: 'Venture-Typ',
          enum: ['ECOMMERCE', 'SAAS', 'SERVICE', 'INFLUENCER', 'MARKETPLACE', 'AGENCY', 'OTHER'],
        },
        status: {
          type: 'STRING' as const,
          description: 'Status',
          enum: ['IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED'],
        },
        currentPhase: { type: 'NUMBER' as const, description: 'Phase (1-6)' },
        productType: { type: 'STRING' as const, description: 'Produkt-Typ' },
        targetMarket: { type: 'STRING' as const, description: 'Zielmarkt' },
        marketingBudget: { type: 'NUMBER' as const, description: 'Marketing-Budget' },
        totalBudget: { type: 'NUMBER' as const, description: 'Gesamtbudget' },
        launchDate: { type: 'STRING' as const, description: 'Launch-Datum (ISO)' },
        squadId: { type: 'STRING' as const, description: 'Squad-ID (optional)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_venture',
    description: 'Aktualisiert Venture-Status, Phase oder Basisdaten.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        name: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['IDEATION', 'IN_PROGRESS', 'LAUNCHED', 'PAUSED', 'CANCELLED'] },
        currentPhase: { type: 'NUMBER' as const },
        type: { type: 'STRING' as const, enum: ['ECOMMERCE', 'SAAS', 'SERVICE', 'INFLUENCER', 'MARKETPLACE', 'AGENCY', 'OTHER'] },
        productType: { type: 'STRING' as const },
        targetMarket: { type: 'STRING' as const },
        marketingBudget: { type: 'NUMBER' as const },
        totalBudget: { type: 'NUMBER' as const },
        launchDate: { type: 'STRING' as const, description: 'ISO Datetime' },
      },
      required: ['ventureId'],
    },
  },
  {
    name: 'update_task',
    description: 'Aktualisiert/verschiebt Aufgaben (Status, Priorität, Zuweisung).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        taskId: { type: 'STRING' as const },
        title: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'] },
        priority: { type: 'STRING' as const, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        dueDate: { type: 'STRING' as const, description: 'ISO Datetime' },
        assignedToId: { type: 'STRING' as const },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'update_venture_step',
    description: 'Aktualisiert Venture-Step Status oder Daten.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        stepNumber: { type: 'NUMBER' as const },
        status: { type: 'STRING' as const, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
        data: { type: 'OBJECT' as const },
      },
      required: ['ventureId', 'stepNumber'],
    },
  },
  {
    name: 'create_roadmap_item',
    description: 'Erstellt ein Roadmap-Item für eine Squad.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        squadId: { type: 'STRING' as const },
        title: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['PLANNED', 'IN_PROGRESS', 'DONE'] },
      },
      required: ['squadId', 'title'],
    },
  },
  {
    name: 'update_roadmap_item',
    description: 'Aktualisiert ein Roadmap-Item.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        roadmapItemId: { type: 'STRING' as const },
        title: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['PLANNED', 'IN_PROGRESS', 'DONE'] },
      },
      required: ['roadmapItemId'],
    },
  },
  {
    name: 'vote_roadmap_item',
    description: 'Stimmt für ein Roadmap-Item ab.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        roadmapItemId: { type: 'STRING' as const },
      },
      required: ['roadmapItemId'],
    },
  },
  {
    name: 'create_decision',
    description: 'Erstellt eine neue Entscheidung/Abstimmung.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        squadId: { type: 'STRING' as const },
        ventureId: { type: 'STRING' as const },
        question: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        type: { type: 'STRING' as const, enum: ['multiple-choice', 'yes-no', 'ranking'] },
        options: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        deadline: { type: 'STRING' as const, description: 'ISO Datetime' },
        requiredQuorum: { type: 'NUMBER' as const },
        winningThreshold: { type: 'NUMBER' as const },
      },
      required: ['squadId', 'question'],
    },
  },
  {
    name: 'create_marketing_content',
    description: 'Speichert generierten Marketing-Content.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        contentType: { type: 'STRING' as const },
        prompt: { type: 'STRING' as const },
        generatedContent: { type: 'STRING' as const },
      },
      required: ['ventureId', 'contentType', 'prompt', 'generatedContent'],
    },
  },
  {
    name: 'create_marketing_campaign',
    description: 'Legt eine Marketing-Kampagne an.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        name: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        goal: { type: 'STRING' as const },
        startDate: { type: 'STRING' as const, description: 'ISO Datetime' },
        endDate: { type: 'STRING' as const, description: 'ISO Datetime' },
        budgetAmount: { type: 'NUMBER' as const },
        budgetCurrency: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'] },
      },
      required: ['ventureId', 'name'],
    },
  },
  {
    name: 'update_marketing_campaign',
    description: 'Aktualisiert eine Marketing-Kampagne.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        campaignId: { type: 'STRING' as const },
        name: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        goal: { type: 'STRING' as const },
        startDate: { type: 'STRING' as const, description: 'ISO Datetime' },
        endDate: { type: 'STRING' as const, description: 'ISO Datetime' },
        budgetAmount: { type: 'NUMBER' as const },
        budgetCurrency: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'] },
        spentAmount: { type: 'NUMBER' as const },
      },
      required: ['campaignId'],
    },
  },
  {
    name: 'create_content_post',
    description: 'Plant oder erstellt einen Content-Post.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        campaignId: { type: 'STRING' as const },
        title: { type: 'STRING' as const },
        content: { type: 'STRING' as const },
        contentType: { type: 'STRING' as const },
        platform: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED'] },
        scheduledFor: { type: 'STRING' as const, description: 'ISO Datetime' },
        imageUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
      },
      required: ['ventureId', 'title', 'content', 'contentType'],
    },
  },
  {
    name: 'update_content_post',
    description: 'Aktualisiert einen Content-Post.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        postId: { type: 'STRING' as const },
        title: { type: 'STRING' as const },
        content: { type: 'STRING' as const },
        contentType: { type: 'STRING' as const },
        platform: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'READY', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'ARCHIVED'] },
        scheduledFor: { type: 'STRING' as const, description: 'ISO Datetime' },
        publishedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        externalId: { type: 'STRING' as const },
        externalUrl: { type: 'STRING' as const },
        imageUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
      },
      required: ['postId'],
    },
  },
  {
    name: 'create_legal_document',
    description: 'Erstellt ein Legal-Dokument.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        documentType: { type: 'STRING' as const, enum: ['NDA', 'SERVICE_AGREEMENT', 'PARTNERSHIP', 'SUPPLIER_CONTRACT', 'EMPLOYMENT', 'CUSTOM'] },
        documentTitle: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED'] },
        generatedContent: { type: 'STRING' as const },
        aiPrompt: { type: 'STRING' as const },
        partnerInfo: { type: 'OBJECT' as const },
        contractTerms: { type: 'OBJECT' as const },
        notes: { type: 'STRING' as const },
        documentUrl: { type: 'STRING' as const },
        signatureUrl: { type: 'STRING' as const },
        sentAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        signedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        expiresAt: { type: 'STRING' as const, description: 'ISO Datetime' },
      },
      required: ['ventureId', 'documentType', 'documentTitle', 'generatedContent'],
    },
  },
  {
    name: 'update_legal_document',
    description: 'Aktualisiert ein Legal-Dokument (Version wird erhöht, wenn Inhalt geändert wird).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        documentId: { type: 'STRING' as const },
        documentTitle: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'REVIEW', 'SENT', 'SIGNED', 'ARCHIVED', 'REJECTED'] },
        generatedContent: { type: 'STRING' as const },
        aiPrompt: { type: 'STRING' as const },
        partnerInfo: { type: 'OBJECT' as const },
        contractTerms: { type: 'OBJECT' as const },
        notes: { type: 'STRING' as const },
        documentUrl: { type: 'STRING' as const },
        signatureUrl: { type: 'STRING' as const },
        sentAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        signedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        expiresAt: { type: 'STRING' as const, description: 'ISO Datetime' },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'save_contract_scan',
    description: 'Speichert Contract-Scanner-Ausgaben als Legal-Dokument.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        documentTitle: { type: 'STRING' as const },
        summary: { type: 'STRING' as const },
        scanResult: { type: 'OBJECT' as const },
      },
      required: ['ventureId', 'documentTitle', 'summary'],
    },
  },
  {
    name: 'attach_signature_link',
    description: 'Speichert einen Signatur-Link für ein Dokument (DocuSign falls verbunden).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        documentId: { type: 'STRING' as const },
        signatureUrl: { type: 'STRING' as const },
      },
      required: ['documentId', 'signatureUrl'],
    },
  },
  {
    name: 'create_supplier',
    description: 'Legt einen Supplier an.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        companyName: { type: 'STRING' as const },
        category: { type: 'STRING' as const },
        contactName: { type: 'STRING' as const },
        email: { type: 'STRING' as const },
        phone: { type: 'STRING' as const },
        website: { type: 'STRING' as const },
        address: { type: 'STRING' as const },
        country: { type: 'STRING' as const },
        specialization: { type: 'STRING' as const },
        moq: { type: 'NUMBER' as const },
        leadTimeDays: { type: 'NUMBER' as const },
        paymentTerms: { type: 'STRING' as const },
        rating: { type: 'NUMBER' as const },
        notes: { type: 'STRING' as const },
        tags: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
      },
      required: ['ventureId', 'companyName', 'category'],
    },
  },
  {
    name: 'update_supplier',
    description: 'Aktualisiert einen Supplier (inkl. Bewertung).',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        supplierId: { type: 'STRING' as const },
        companyName: { type: 'STRING' as const },
        category: { type: 'STRING' as const },
        contactName: { type: 'STRING' as const },
        email: { type: 'STRING' as const },
        phone: { type: 'STRING' as const },
        website: { type: 'STRING' as const },
        address: { type: 'STRING' as const },
        country: { type: 'STRING' as const },
        specialization: { type: 'STRING' as const },
        moq: { type: 'NUMBER' as const },
        leadTimeDays: { type: 'NUMBER' as const },
        paymentTerms: { type: 'STRING' as const },
        rating: { type: 'NUMBER' as const },
        notes: { type: 'STRING' as const },
        tags: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
      },
      required: ['supplierId'],
    },
  },
  {
    name: 'create_sample',
    description: 'Legt einen Sample-Request an.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        supplierId: { type: 'STRING' as const },
        productName: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        quantity: { type: 'NUMBER' as const },
        cost: { type: 'NUMBER' as const },
        currency: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['REQUESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED'] },
        orderedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        receivedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        approved: { type: 'BOOLEAN' as const },
        qualityRating: { type: 'NUMBER' as const },
        feedback: { type: 'STRING' as const },
        imageUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        specFileUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
      },
      required: ['ventureId', 'supplierId', 'productName'],
    },
  },
  {
    name: 'update_sample',
    description: 'Aktualisiert einen Sample-Request.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        sampleId: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['REQUESTED', 'ORDERED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED'] },
        orderedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        receivedAt: { type: 'STRING' as const, description: 'ISO Datetime' },
        approved: { type: 'BOOLEAN' as const },
        qualityRating: { type: 'NUMBER' as const },
        feedback: { type: 'STRING' as const },
        imageUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        specFileUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        cost: { type: 'NUMBER' as const },
        quantity: { type: 'NUMBER' as const },
        currency: { type: 'STRING' as const },
      },
      required: ['sampleId'],
    },
  },
  {
    name: 'create_production_order',
    description: 'Erstellt einen Production Order.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        ventureId: { type: 'STRING' as const },
        supplierId: { type: 'STRING' as const },
        orderNumber: { type: 'STRING' as const },
        productName: { type: 'STRING' as const },
        description: { type: 'STRING' as const },
        quantity: { type: 'NUMBER' as const },
        unitPrice: { type: 'NUMBER' as const },
        totalPrice: { type: 'NUMBER' as const },
        currency: { type: 'STRING' as const },
        expectedDelivery: { type: 'STRING' as const, description: 'ISO Datetime' },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'] },
        paymentStatus: { type: 'STRING' as const, enum: ['PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED'] },
        depositPaid: { type: 'NUMBER' as const },
        finalPaid: { type: 'NUMBER' as const },
        poFileUrl: { type: 'STRING' as const },
        invoiceUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        notes: { type: 'STRING' as const },
      },
      required: ['ventureId', 'supplierId', 'orderNumber', 'productName', 'quantity', 'unitPrice'],
    },
  },
  {
    name: 'update_production_order',
    description: 'Aktualisiert einen Production Order.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        orderId: { type: 'STRING' as const },
        status: { type: 'STRING' as const, enum: ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'] },
        paymentStatus: { type: 'STRING' as const, enum: ['PENDING', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED'] },
        expectedDelivery: { type: 'STRING' as const, description: 'ISO Datetime' },
        actualDelivery: { type: 'STRING' as const, description: 'ISO Datetime' },
        depositPaid: { type: 'NUMBER' as const },
        finalPaid: { type: 'NUMBER' as const },
        poFileUrl: { type: 'STRING' as const },
        invoiceUrls: { type: 'ARRAY' as const, items: { type: 'STRING' as const } },
        notes: { type: 'STRING' as const },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'confirm_action',
    description: 'Bestätigt eine zuvor vorgeschlagene Aktion und führt sie aus.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        confirmationToken: {
          type: 'STRING' as const,
          description: 'Der Bestätigungs-Token der Aktion',
        },
      },
      required: ['confirmationToken'],
    },
  },
  {
    name: 'cancel_action',
    description: 'Bricht eine ausstehende Aktion ab.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        confirmationToken: {
          type: 'STRING' as const,
          description: 'Der Bestätigungs-Token der Aktion',
        },
      },
      required: ['confirmationToken'],
    },
  },
  {
    name: 'list_pending_actions',
    description: 'Listet ausstehende Aktionen des Users auf.',
    parameters: {
      type: 'OBJECT' as const,
      properties: {
        limit: {
          type: 'NUMBER' as const,
          description: 'Maximale Anzahl',
        },
      },
      required: [],
    },
  },
];

export const ORION_TOOL_NAMES = ORION_TOOL_DECLARATIONS.map((t) => t.name);

const runTool = async (tool: ToolDefinition, args: any, ctx: ToolContext) => {
  if (!isFounder(ctx)) {
    return { ok: false, error: 'Nur Founder dürfen Aktionen ausführen.' };
  }

  if (tool.requiresConfirmation) {
    const summary = tool.summarize ? tool.summarize(args, ctx) : tool.name;
    const ventureId =
      typeof args?.ventureId === 'string' ? args.ventureId : ctx.activeVentureId;
    const action = await createPendingAction({
      userId: ctx.user.id,
      ventureId,
      toolName: tool.name,
      payload: args,
      summary,
      requiresConfirmation: true,
    });

    return {
      ok: false,
      requiresConfirmation: true,
      actionId: action.id,
      confirmationToken: action.confirmationToken,
      summary: action.summary,
    };
  }

  return tool.execute(args, ctx);
};

export async function executeOrionToolCall(
  call: { name: string; args: any },
  ctx: ToolContext
): Promise<any> {
  const tool = toolDefinitions.find((item) => item.name === call.name);
  if (!tool) return { ok: false, error: `Unknown tool: ${call.name}` };
  return runTool(tool, call.args, ctx);
}

export function buildAiSdkTools(ctx: ToolContext) {
  return Object.fromEntries(
    toolDefinitions.map((tool) => [
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (args: any) => runTool(tool, args, ctx),
      },
    ])
  );
}
