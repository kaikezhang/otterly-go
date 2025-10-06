import { useState } from 'react';
import { generateShareLink, revokeShareLink } from '../services/tripApi';

interface ShareButtonProps {
  tripId: string;
  tripTitle: string;
  isSyncing?: boolean;
  currentTripId?: string | null;
}

export function ShareButton({ tripId, tripTitle, isSyncing = false, currentTripId }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if trip is saved to database (has database ID and not currently syncing)
  const isTripSaved = Boolean(currentTripId) && !isSyncing;

  const handleGenerateLink = async () => {
    if (!isTripSaved || !currentTripId) {
      setError('Trip must be saved before sharing. Please wait for auto-save to complete.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { shareUrl } = await generateShareLink(currentTripId);
      setShareUrl(shareUrl);
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  const handleRevokeLink = async () => {
    if (!currentTripId) return;

    setIsLoading(true);
    setError(null);
    try {
      await revokeShareLink(currentTripId);
      setShareUrl(null);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke share link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerateLink}
        disabled={isLoading || !isTripSaved}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isTripSaved ? "Share this trip" : "Trip is saving... please wait"}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span>
          {isLoading ? 'Loading...' : !isTripSaved ? 'Saving...' : 'Share'}
        </span>
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 pointer-events-auto border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share Trip
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Anyone with this link can view your trip "{tripTitle}". They won't be able to edit it.
            </p>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 break-all text-sm text-gray-800 font-mono">
              {shareUrl}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRevokeLink}
                disabled={isLoading}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Revoke
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Tip: Share this link on social media, email, or messaging apps. You can revoke access at any time.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
