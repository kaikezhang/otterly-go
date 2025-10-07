import { useState } from 'react';
import type { BudgetCategory } from '../types';

interface BudgetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (total: number, currency: string, categories?: Record<BudgetCategory, number>) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

const BUDGET_CATEGORIES: Array<{ key: BudgetCategory; label: string; icon: string }> = [
  { key: 'flights', label: 'Flights', icon: '✈️' },
  { key: 'hotels', label: 'Accommodation', icon: '🏨' },
  { key: 'food', label: 'Food & Drinks', icon: '🍽️' },
  { key: 'activities', label: 'Activities', icon: '🎟️' },
  { key: 'transport', label: 'Transport', icon: '🚗' },
  { key: 'misc', label: 'Miscellaneous', icon: '💼' },
];

export function BudgetSetupModal({ isOpen, onClose, onSave }: BudgetSetupModalProps) {
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState<Record<BudgetCategory, string>>({
    flights: '',
    hotels: '',
    food: '',
    activities: '',
    transport: '',
    misc: '',
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const budgetNumber = parseFloat(budget);
    if (budgetNumber && budgetNumber > 0) {
      // Convert category strings to numbers if any are filled
      const categoryNumbers: Record<BudgetCategory, number> | undefined = showCategories
        ? Object.entries(categories).reduce((acc, [key, value]) => {
            if (value && parseFloat(value) > 0) {
              acc[key as BudgetCategory] = parseFloat(value);
            }
            return acc;
          }, {} as Record<BudgetCategory, number>)
        : undefined;

      // Only pass categories if at least one is set
      const hasCategories = categoryNumbers && Object.keys(categoryNumbers).length > 0;
      onSave(budgetNumber, currency, hasCategories ? categoryNumbers : undefined);
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleCategoryChange = (category: BudgetCategory, value: string) => {
    setCategories({ ...categories, [category]: value });
  };

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(categories).reduce((sum, value) => {
    return sum + (value ? parseFloat(value) : 0);
  }, 0);

  const budgetNumber = parseFloat(budget) || 0;
  const remaining = budgetNumber - totalAllocated;
  const percentAllocated = budgetNumber > 0 ? (totalAllocated / budgetNumber) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Set Your Budget</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Set a budget to track expenses and get optimization suggestions while planning your trip.
        </p>

        <div className="space-y-4">
          {/* Total Budget Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Budget
            </label>
            <div className="flex gap-2">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code}
                  </option>
                ))}
              </select>

              {/* Budget Amount Input */}
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="5000"
                min="0"
                step="100"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Info Box */}
          {budget && parseFloat(budget) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Budget tracking helps you:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>See real-time spending as you add activities</li>
                    <li>Get alerts when approaching your limit</li>
                    <li>Find cheaper alternatives to stay within budget</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Category Allocation (Phase 2) */}
          {budget && parseFloat(budget) > 0 && (
            <div className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowCategories(!showCategories)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700">
                  Set budget by category (optional)
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showCategories ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCategories && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Allocate your budget across different categories to better track spending.
                  </p>

                  {/* Category Inputs */}
                  <div className="space-y-2">
                    {BUDGET_CATEGORIES.map((category) => (
                      <div key={category.key} className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <label className="flex-1 text-sm text-gray-700">{category.label}</label>
                        <input
                          type="number"
                          value={categories[category.key]}
                          onChange={(e) => handleCategoryChange(category.key, e.target.value)}
                          placeholder="0"
                          min="0"
                          step="50"
                          className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Allocation Summary */}
                  {totalAllocated > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Allocated:</span>
                        <span className="font-medium text-gray-900">
                          {totalAllocated.toLocaleString()} {currency}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remaining.toLocaleString()} {currency}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            percentAllocated > 100
                              ? 'bg-red-500'
                              : percentAllocated === 100
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(percentAllocated, 100)}%` }}
                        />
                      </div>

                      {/* Warning for over-allocation */}
                      {remaining < 0 && (
                        <p className="text-xs text-red-600">
                          ⚠️ Total allocation exceeds budget by {Math.abs(remaining).toLocaleString()} {currency}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={!budget || parseFloat(budget) <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
          >
            Save Budget
          </button>
        </div>
      </div>
    </div>
  );
}
