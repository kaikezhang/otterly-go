import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
          <div className="text-6xl mb-4">🦦</div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Looks like this otter took a wrong turn! The page you're looking for doesn't exist.
        </p>

        <div className="space-y-4">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </Link>

          <div>
            <button
              onClick={() => window.history.back()}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
