import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/billing/stripe';
import { prisma } from '@/lib/database/prisma';

/**
 * Stripe Checkout Session Creator
 *
 * Supports:
 * - Platform Subscriptions (recurring)
 * - AI Credit Packs (one-time)
 */

const normalizeToken = (value: string) => value.trim().replace(/^['"]+|['"]+$/g, '');

const parseCsv = (value: string | undefined | null) =>
  String(value || '')
    .split(',')
    .map((item) => normalizeToken(item))
    .filter(Boolean);

const getAllowedPriceIds = (type: 'subscription' | 'credits') => {
  if (type === 'subscription') {
    return new Set(
      parseCsv(process.env.STRIPE_ALLOWED_SUBSCRIPTION_PRICE_IDS).concat(
        parseCsv(process.env.STRIPE_PRICE_PRO_MONTHLY),
        parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY),
        parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_PLATFORM_ACCESS),
      )
    );
  }

  return new Set(
    parseCsv(process.env.STRIPE_ALLOWED_CREDIT_PRICE_IDS).concat(
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL_NEW),
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM_NEW),
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE_NEW),
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL),
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM),
      parseCsv(process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_SMALL_NEW),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_MEDIUM_NEW),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_LARGE_NEW),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_SMALL),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_MEDIUM),
      parseCsv(process.env.STRIPE_PRICE_CREDITS_LARGE),
    )
  );
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Bitte einloggen.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, priceId, returnTo } = body;

    // Validate input
    if (!type || !priceId) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Missing required fields: type, priceId' },
        { status: 400 }
      );
    }

    if (!['subscription', 'credits'].includes(type)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Invalid type. Must be "subscription" or "credits"' },
        { status: 400 }
      );
    }

    const normalizedType = type as 'subscription' | 'credits';
    const allowedPriceIds = getAllowedPriceIds(normalizedType);
    if (allowedPriceIds.size > 0 && !allowedPriceIds.has(priceId)) {
      return NextResponse.json(
        { error: 'bad_request', message: 'Price ID ist nicht freigeschaltet.' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'not_found', message: 'User not found' },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stakeandscale.de';

    // ============================================
    // CREATE CHECKOUT SESSION
    // ============================================

    const sessionConfig: any = {
      customer_email: user.email,
      mode: normalizedType === 'subscription' ? 'subscription' : 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        email: user.email,
        type: normalizedType,
        priceId,
        ...(returnTo ? { returnTo: String(returnTo).slice(0, 500) } : {}),
      },
      // German compliance
      // automatic_tax: { enabled: true }, // Disabled - requires Stripe Tax setup
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    };

    // Add tax ID collection for B2B customers
    if (normalizedType === 'subscription') {
      sessionConfig.tax_id_collection = { enabled: true };
    }

    // Use existing customer if available
    if (user.stripeCustomerId) {
      sessionConfig.customer = user.stripeCustomerId;
      delete sessionConfig.customer_email;
    }

    // Set success/cancel URLs
    const returnToParam = returnTo ? `&returnTo=${encodeURIComponent(String(returnTo).slice(0, 500))}` : '';
    if (normalizedType === 'subscription') {
      sessionConfig.success_url = `${appUrl}/payment/success?type=subscription${returnToParam}`;
      sessionConfig.cancel_url = `${appUrl}/pricing?canceled=true`;
    } else {
      sessionConfig.success_url = `${appUrl}/payment/success?type=credits${returnToParam}`;
      sessionConfig.cancel_url = `${appUrl}/pricing?canceled=true`;
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: any) {
    console.error('[CHECKOUT] Error creating session:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: 'internal_error', message },
      { status: 500 }
    );
  }
}
