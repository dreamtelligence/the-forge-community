import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

/**
 * Cancel Subscription API
 * Cancels the user's active Stripe subscription at period end
 */

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // Cancel subscription at period end (user keeps access until end of billing cycle)
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
    const fallbackEnd = subscription.cancel_at ?? null;
    const periodEnd = typeof itemPeriodEnd === 'number' ? itemPeriodEnd : fallbackEnd;
    const endsAt = periodEnd ? new Date(periodEnd * 1000) : null;

    console.log(
      `[CANCEL] Subscription ${subscription.id} will cancel at ${endsAt?.toISOString() ?? 'unknown'}`
    );

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'cancelled',
        subscriptionEndsAt: endsAt,
      },
    });

    return NextResponse.json({
      success: true,
      endsAt: endsAt ? endsAt.toISOString() : null,
    });
  } catch (error: any) {
    console.error('[CANCEL] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
