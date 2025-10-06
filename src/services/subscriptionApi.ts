const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SubscriptionTier {
  id: string;
  name: string;
  tripLimit: number;
  model: string;
  features: string[];
}

export interface SubscriptionStatus {
  tier: string;
  status: string | null;
  periodEnd: string | null;
  tripCount: number;
  tripLimit: number;
  hasReachedLimit: boolean;
  features: string[];
}

/**
 * Get available subscription tiers
 */
export async function getSubscriptionTiers(): Promise<SubscriptionTier[]> {
  const response = await fetch(`${API_URL}/api/subscriptions/tiers`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription tiers');
  }

  const data = await response.json();
  return data.tiers;
}

/**
 * Get current user's subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await fetch(`${API_URL}/api/subscriptions/status`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription status');
  }

  return response.json();
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(tier: string): Promise<{ url: string; mock?: boolean }> {
  const response = await fetch(`${API_URL}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tier }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Create Stripe billing portal session
 */
export async function createBillingPortalSession(): Promise<{ url: string; mock?: boolean }> {
  const response = await fetch(`${API_URL}/api/subscriptions/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create billing portal session');
  }

  return response.json();
}
