import { Link } from 'react-router-dom';

export interface UsageWarningData {
  currentUsage: number;
  limit: number;
  percentageUsed: number;
  tier: string;
  message: string;
  upgradeUrl: string;
}

interface UsageWarningProps {
  warning: UsageWarningData;
  onDismiss?: () => void;
}

export default function UsageWarning({ warning, onDismiss }: UsageWarningProps) {
  const isExceeded = warning.percentageUsed >= 100;

  return (
    <div
      className={`rounded-lg p-4 mb-4 border ${
        isExceeded
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isExceeded ? (
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <div className="ml-3 flex-1">
          <h3
            className={`text-sm font-medium ${
              isExceeded
                ? 'text-red-800 dark:text-red-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}
          >
            {isExceeded ? 'Usage Limit Exceeded' : 'Approaching Usage Limit'}
          </h3>

          <div
            className={`mt-2 text-sm ${
              isExceeded
                ? 'text-red-700 dark:text-red-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}
          >
            <p>{warning.message}</p>

            {/* Progress bar */}
            <div className="mt-3 mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>
                  {warning.currentUsage.toLocaleString()} / {warning.limit.toLocaleString()} tokens
                </span>
                <span>{warning.percentageUsed}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isExceeded
                      ? 'bg-red-600 dark:bg-red-500'
                      : warning.percentageUsed >= 90
                      ? 'bg-orange-600 dark:bg-orange-500'
                      : 'bg-yellow-600 dark:bg-yellow-500'
                  }`}
                  style={{
                    width: `${Math.min(warning.percentageUsed, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              to={warning.upgradeUrl}
              className={`text-sm font-medium ${
                isExceeded
                  ? 'text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100'
                  : 'text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100'
              } underline`}
            >
              Upgrade to Pro →
            </Link>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-sm font-medium ${
                  isExceeded
                    ? 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
                    : 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100'
                }`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
