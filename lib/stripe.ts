import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'dummy-key-for-build';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== 'production') {
    console.warn('STRIPE_SECRET_KEY is missing in development.');
}
