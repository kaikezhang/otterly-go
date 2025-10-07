import { useMemo, useState } from 'react';
import type { Trip, BudgetCategory } from '../types';

interface CompactBudgetTrackerProps {
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

export function CompactBudgetTracker({ trip, onOpenSettings }: CompactBudgetTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate total spent and per-category spending
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

  // If no budget is set, don't show anything
  if (!trip.budget) {
    return null;
  }

  const { total, currency } = trip.budget;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const remaining = total - totalSpent;
  const percentSpent = (totalSpent / total) * 100;

  // Determine status color
  let statusColor = 'green';
  let barColor = 'bg-green-500';

  if (percentSpent >= 100) {
    statusColor = 'red';
    barColor = 'bg-red-500';
  } else if (percentSpent >= 80) {
    statusColor = 'yellow';
    barColor = 'bg-yellow-500';
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      {/* Compact View (Always Visible) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-base font-bold text-gray-900">
              💰 {symbol}{totalSpent.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">
              / {symbol}{total.toLocaleString()} {currency}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            />
          </div>

          {/* Status */}
          <div className={`text-xs font-medium ${
            statusColor === 'red'
              ? 'text-red-600'
              : statusColor === 'yellow'
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}>
            {percentSpent >= 100
              ? `${symbol}${Math.abs(remaining).toLocaleString()} over budget`
              : `${symbol}${remaining.toLocaleString()} remaining`
            }
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
            title="Budget Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Expand/Collapse Button */}
          {trip.budget.categories && Object.keys(trip.budget.categories).length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition"
              title={isExpanded ? "Hide details" : "Show details"}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded View (Category Breakdown) */}
      {isExpanded && trip.budget.categories && Object.keys(trip.budget.categories).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Budget by Category
          </h4>
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
