import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

// Subscription tier configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    tripLimit: 3,
    model: 'gpt-3.5-turbo',
    features: ['3 trips', 'GPT-3.5-turbo', 'Basic features'],
  },
  pro: {
    name: 'Pro',
    tripLimit: -1, // unlimited
    model: 'gpt-4o',
    features: ['Unlimited trips', 'GPT-4o', 'Export trips', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
  },
  team: {
    name: 'Team',
    tripLimit: -1, // unlimited
    model: 'gpt-4o',
    features: [
      'All Pro features',
      'Collaboration features',
      'Admin dashboard',
      'Team management',
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_TEAM,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Create or retrieve Stripe customer for user
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<Stripe.Customer> {
  try {
    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        userId,
      },
    });

    return customer;
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error);
    throw error;
  }
}

/**
 * Create Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      payment_method_collection: 'if_required',
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe Billing Portal Session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
}

/**
 * Check if user has reached trip limit
 */
export function hasReachedTripLimit(
  tier: SubscriptionTier,
  currentTripCount: number
): boolean {
  const limit = SUBSCRIPTION_TIERS[tier].tripLimit;
  if (limit === -1) return false; // unlimited
  return currentTripCount >= limit;
}

/**
 * Get OpenAI model for subscription tier
 */
export function getModelForTier(tier: SubscriptionTier): string {
  return SUBSCRIPTION_TIERS[tier].model;
}

export { stripe };
