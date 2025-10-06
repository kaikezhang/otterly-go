import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import { verifyWebhookSignature } from '../services/stripe';

const router = express.Router();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn('Warning: STRIPE_WEBHOOK_SECRET not configured. Webhook verification will fail.');
}

/**
 * Map Stripe subscription status to our subscription tier
 */
function mapSubscriptionStatusToTier(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price.id;

  if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
    return 'pro';
  } else if (priceId === process.env.STRIPE_PRICE_ID_TEAM) {
    return 'team';
  }

  return 'free';
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature || !WEBHOOK_SECRET) {
      console.error('Missing webhook signature or secret');
      return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionChange(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }

        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook event:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const tier = mapSubscriptionStatusToTier(subscription);

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  // Update user subscription
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: tier,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null,
    },
  });

  console.log(`Updated subscription for user ${user.email}: ${tier} (${subscription.status})`);
}

/**
 * Handle subscription deleted (canceled)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  // Downgrade to free tier
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'free',
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
      subscriptionPeriodEnd: null,
    },
  });

  console.log(`Downgraded user ${user.email} to free tier`);
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.log('Checkout session completed but no subscription ID');
    return;
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  console.log(`Checkout completed for user ${user.email}, subscription: ${subscriptionId}`);
  // Subscription details will be updated via subscription.created webhook
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`User not found for Stripe customer: ${customerId}`);
    return;
  }

  // Update subscription status to past_due
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  console.log(`Payment failed for user ${user.email}, status updated to past_due`);
  // TODO: Send email notification to user
}

export default router;
