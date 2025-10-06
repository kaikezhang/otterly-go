import { useState, useEffect } from 'react';
import {
  getSubscriptionTiers,
  getSubscriptionStatus,
  createCheckoutSession,
  createBillingPortalSession,
  type SubscriptionTier,
  type SubscriptionStatus,
} from '../services/subscriptionApi';

export default function SubscriptionPanel() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [tiersData, statusData] = await Promise.all([
        getSubscriptionTiers(),
        getSubscriptionStatus(),
      ]);
      setTiers(tiersData);
      setStatus(statusData);
    } catch (err) {
      setError('Failed to load subscription information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    try {
      setError(null);
      const response = await createCheckoutSession(tier);

      // Check if mock mode
      if ('mock' in response && response.mock) {
        // Reload page to show updated subscription
        window.location.reload();
      } else {
        window.location.href = response.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  const handleManageBilling = async () => {
    try {
      setError(null);
      const response = await createBillingPortalSession();

      // Check if mock mode
      if ('mock' in response && response.mock) {
        // Reload page to show updated subscription
        window.location.reload();
      } else {
        window.location.href = response.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Subscription
      </h2>

      {/* Mock Mode Notice */}
      {status?.tier !== 'free' && status?.subscriptionStatus === 'active' &&
       (window.location.search.includes('mock=true') ||
        (typeof status.subscriptionPeriodEnd === 'string' &&
         new Date(status.subscriptionPeriodEnd).getFullYear() > new Date().getFullYear() + 1)) && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <p className="text-blue-800 dark:text-blue-400">
            <strong>Development Mode:</strong> Stripe is not configured. Subscriptions are simulated for testing.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {status && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {status.tier}
              </p>
            </div>
            {status.tier !== 'free' && (
              <button
                onClick={handleManageBilling}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Manage Billing
              </button>
            )}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Trips Used</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.tripCount} / {status.tripLimit === -1 ? '∞' : status.tripLimit}
              </span>
            </div>
            {status.hasReachedLimit && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                You've reached your trip limit. Upgrade to create more trips.
              </p>
            )}
          </div>

          {status.tier !== 'free' && status.periodEnd && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status.status === 'active' && 'Renews on '}
              {status.status === 'canceled' && 'Ends on '}
              {new Date(status.periodEnd).toLocaleDateString()}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Features
            </p>
            <ul className="space-y-1">
              {status.features.map((feature, idx) => (
                <li
                  key={idx}
                  className="text-sm text-gray-600 dark:text-gray-400 flex items-center"
                >
                  <svg
                    className="w-4 h-4 mr-2 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {status?.tier === 'free' && status.tripCount !== undefined && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upgrade Your Plan
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers
              .filter((tier) => tier.id !== 'free')
              .map((tier) => (
                <div
                  key={tier.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {tier.name}
                  </h4>
                  <ul className="space-y-1 mb-4">
                    {tier.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-600 dark:text-gray-400 flex items-center"
                      >
                        <svg
                          className="w-4 h-4 mr-2 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Upgrade to {tier.name}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
