import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db';
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  SUBSCRIPTION_TIERS,
} from '../services/stripe';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/subscriptions/tiers
 * Get available subscription tiers
 */
router.get('/tiers', (req: Request, res: Response) => {
  try {
    const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([key, value]) => ({
      id: key,
      ...value,
      // Don't expose Stripe price IDs to frontend
      stripePriceId: undefined,
    }));

    res.json({ tiers });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    res.status(500).json({ error: 'Failed to fetch subscription tiers' });
  }
});

/**
 * GET /api/subscriptions/status
 * Get current user's subscription status
 */
router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        tripCount: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tierConfig = SUBSCRIPTION_TIERS[user.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS];
    const hasReachedLimit = tierConfig.tripLimit !== -1 && user.tripCount >= tierConfig.tripLimit;

    res.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      periodEnd: user.subscriptionPeriodEnd,
      tripCount: user.tripCount,
      tripLimit: tierConfig.tripLimit,
      hasReachedLimit,
      features: tierConfig.features,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * POST /api/subscriptions/checkout
 * Create Stripe Checkout Session
 */
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;

    if (!tier || !['pro', 'team'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
    const stripePriceId = 'stripePriceId' in tierConfig ? tierConfig.stripePriceId : undefined;
    if (!stripePriceId) {
      return res.status(500).json({ error: 'Stripe price ID not configured for this tier' });
    }

    // Get or create user
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getOrCreateCustomer(
        user.id,
        user.email,
        user.name
      );
      stripeCustomerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Create checkout session
    const session = await createCheckoutSession(
      stripeCustomerId,
      stripePriceId,
      `${FRONTEND_URL}/settings?subscription=success`,
      `${FRONTEND_URL}/settings?subscription=canceled`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscriptions/portal
 * Create Stripe Billing Portal Session
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    // Create billing portal session
    const session = await createBillingPortalSession(
      user.stripeCustomerId,
      `${FRONTEND_URL}/settings`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

export default router;
