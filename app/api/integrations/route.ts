/**
 * Integrations API
 *
 * GET /api/integrations - List user's integrations
 * POST /api/integrations/connect - Start OAuth flow
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { 
  getUserConnections, 
  generateOAuthUrl,
  disconnectIntegration,
} from '@/lib/integrations/service';
import { INTEGRATION_CONFIGS } from '@/lib/integrations/types';

/**
 * GET - List user's connected integrations and available options
 */
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get connections
    const connections = await getUserConnections(user.id);

    // Format available integrations
    const available = Object.values(INTEGRATION_CONFIGS)
      .filter(config => config && config.name)
      .map(config => ({
        provider: config.provider,
        name: config.name,
        description: config.description,
        icon: config.icon,
        features: config.features,
      }));

    return NextResponse.json({
      connections,
      available,
    });
  } catch (error) {
    console.error('[Integrations API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST - Start OAuth connection flow
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, ventureId, redirectUrl = '/settings/integrations' } = body;

    // Validate provider
    const validProviders = Object.values(INTEGRATION_CONFIGS).map(c => c?.provider).filter(Boolean);
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate OAuth URL
    const { url, state } = await generateOAuthUrl(
      user.id,
      provider,
      redirectUrl,
      ventureId
    );

    return NextResponse.json({
      url,
      state,
    });
  } catch (error) {
    console.error('[Integrations API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start OAuth' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect an integration
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Disconnect
    const success = await disconnectIntegration(connectionId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Integrations API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect integration' },
      { status: 500 }
    );
  }
}
