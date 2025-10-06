import express, { Request, Response } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { prisma } from '../db';
import {
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  SUBSCRIPTION_TIERS,
  STRIPE_ENABLED,
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
 * Works with or without authentication (returns free tier if not logged in)
 */
router.get('/status', optionalAuth, async (req: Request, res: Response) => {
  try {
    // If not authenticated, return default free tier status
    if (!req.userId) {
      const tierConfig = SUBSCRIPTION_TIERS.free;
      return res.json({
        tier: 'free',
        status: null,
        periodEnd: null,
        tripCount: 0,
        tripLimit: tierConfig.tripLimit,
        hasReachedLimit: false,
        features: tierConfig.features,
      });
    }

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
 * Create Stripe Checkout Session (or mock upgrade)
 */
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;

    if (!tier || !['pro', 'team'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // MOCK MODE: Simulate instant upgrade without Stripe
    if (!STRIPE_ENABLED) {
      console.log(`[MOCK] Upgrading user to ${tier} tier`);

      await prisma.user.update({
        where: { id: req.userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          stripeCustomerId: `cus_mock_${req.userId}`,
          stripeSubscriptionId: `sub_mock_${Date.now()}`,
        },
      });

      return res.json({
        url: `${FRONTEND_URL}/profile?subscription=success&mock=true`,
        mock: true
      });
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
 * Create Stripe Billing Portal Session (or mock downgrade)
 */
router.post('/portal', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // MOCK MODE: Simulate downgrade to free tier
    if (!STRIPE_ENABLED) {
      console.log(`[MOCK] Downgrading user to free tier`);

      await prisma.user.update({
        where: { id: req.userId },
        data: {
          subscriptionTier: 'free',
          subscriptionStatus: null,
          subscriptionPeriodEnd: null,
          stripeSubscriptionId: null,
        },
      });

      return res.json({
        url: `${FRONTEND_URL}/profile?subscription=downgraded&mock=true`,
        mock: true
      });
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
