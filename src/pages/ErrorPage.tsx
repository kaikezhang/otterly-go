import { Link } from 'react-router-dom';

interface ErrorPageProps {
  error?: Error;
  resetError?: () => void;
}

export function ErrorPage({ error, resetError }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-600 dark:text-red-400">500</h1>
          <div className="text-6xl mb-4">🚨</div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Something Went Wrong
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Our otters are working hard to fix this issue. Please try again later.
        </p>

        {error && import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
            <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {resetError && (
            <button
              onClick={resetError}
              className="inline-block px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors mr-2"
            >
              Try Again
            </button>
          )}

          <Link
            to="/"
            className="inline-block px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Home
          </Link>

          <div>
            <button
              onClick={() => window.location.reload()}
              className="text-red-600 dark:text-red-400 hover:underline"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
