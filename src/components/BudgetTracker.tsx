import { useMemo } from 'react';
import type { Trip, BudgetCategory } from '../types';

interface BudgetTrackerProps {
  trip: Trip;
  onOpenSettings: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  INR: '₹',
  SGD: 'S$',
};

const CATEGORY_INFO: Record<BudgetCategory, { label: string; icon: string }> = {
  flights: { label: 'Flights', icon: '✈️' },
  hotels: { label: 'Accommodation', icon: '🏨' },
  food: { label: 'Food & Drinks', icon: '🍽️' },
  activities: { label: 'Activities', icon: '🎟️' },
  transport: { label: 'Transport', icon: '🚗' },
  misc: { label: 'Miscellaneous', icon: '💼' },
};

export function BudgetTracker({ trip, onOpenSettings }: BudgetTrackerProps) {
  // Calculate total spent and per-category spending from all itinerary items
  const { totalSpent, categorySpending } = useMemo(() => {
    let total = 0;
    const spending: Record<BudgetCategory, number> = {
      flights: 0,
      hotels: 0,
      food: 0,
      activities: 0,
      transport: 0,
      misc: 0,
    };

    trip.days.forEach(day => {
      day.items.forEach(item => {
        if (item.cost) {
          total += item.cost;
          if (item.costCategory) {
            spending[item.costCategory] += item.cost;
          }
        }
      });
    });

    return { totalSpent: total, categorySpending: spending };
  }, [trip.days]);

  // If no budget is set, show a prompt to set one
  if (!trip.budget) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>💰</span>
            <span>Budget Tracker</span>
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 mb-3">
            Set a budget to track your spending and get optimization suggestions.
          </p>
          <button
            onClick={onOpenSettings}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            Set Budget
          </button>
        </div>
      </div>
    );
  }

  const { total, currency } = trip.budget;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const remaining = total - totalSpent;
  const percentSpent = (totalSpent / total) * 100;

  // Determine status color
  let statusColor = 'green';
  let statusText = 'Within budget';
  let statusIcon = '🟢';

  if (percentSpent >= 100) {
    statusColor = 'red';
    statusText = `${symbol}${Math.abs(remaining).toLocaleString()} over budget`;
    statusIcon = '🔴';
  } else if (percentSpent >= 80) {
    statusColor = 'yellow';
    statusText = 'Approaching limit';
    statusIcon = '🟡';
  } else {
    statusText = `${symbol}${remaining.toLocaleString()} remaining`;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>💰</span>
          <span>Budget Tracker</span>
        </h3>
        <button
          onClick={onOpenSettings}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Budget Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Budget Overview */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {symbol}{totalSpent.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">
            / {symbol}{total.toLocaleString()} {currency}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all ${
              percentSpent >= 100
                ? 'bg-red-500'
                : percentSpent >= 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 text-sm ${
          statusColor === 'red'
            ? 'text-red-600'
            : statusColor === 'yellow'
            ? 'text-yellow-600'
            : 'text-green-600'
        }`}>
          <span>{statusIcon}</span>
          <span className="font-medium">{statusText}</span>
        </div>
      </div>

      {/* Warning for over budget */}
      {percentSpent >= 100 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            ⚠️ You've exceeded your budget. Consider removing or finding cheaper alternatives for some activities.
          </p>
        </div>
      )}

      {/* Warning for approaching budget */}
      {percentSpent >= 80 && percentSpent < 100 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">
            ⚠️ You're approaching your budget limit. Be mindful when adding new activities.
          </p>
        </div>
      )}

      {/* Category Breakdown (Phase 2) */}
      {trip.budget.categories && Object.keys(trip.budget.categories).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Budget by Category</h4>
          <div className="space-y-2">
            {(Object.entries(trip.budget.categories) as Array<[BudgetCategory, number]>).map(([category, allocated]) => {
              const spent = categorySpending[category] || 0;
              const percentSpentInCategory = allocated > 0 ? (spent / allocated) * 100 : 0;
              const info = CATEGORY_INFO[category];

              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-gray-700">
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </span>
                    <span className={`font-medium ${
                      percentSpentInCategory >= 100
                        ? 'text-red-600'
                        : percentSpentInCategory >= 80
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                    }`}>
                      {symbol}{spent.toLocaleString()} / {symbol}{allocated.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        percentSpentInCategory >= 100
                          ? 'bg-red-500'
                          : percentSpentInCategory >= 80
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentSpentInCategory, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
