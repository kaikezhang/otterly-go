import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedTrip, type SharedTripResponse } from '../services/tripApi';
import { checkActivityDetails } from '../services/activityApi';
import { ItineraryView } from '../components/ItineraryView';
import { MapView } from '../components/MapView';
import type { Trip } from '../types';

type ViewMode = 'itinerary' | 'map';

export function SharedTrip() {
  const { token } = useParams<{ token: string }>();
  const [sharedTrip, setSharedTrip] = useState<SharedTripResponse | null>(null);
  const [activityDetailsMap, setActivityDetailsMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('itinerary');

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    const fetchSharedTrip = async () => {
      try {
        const data = await getSharedTrip(token);
        setSharedTrip(data);

        // Fetch activity details map
        if (data.tripData.id) {
          try {
            const detailsMap = await checkActivityDetails(data.tripData.id);
            setActivityDetailsMap(detailsMap);
          } catch (detailsErr) {
            console.error('Failed to fetch activity details:', detailsErr);
            // Don't fail the whole page if details check fails
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared trip');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSharedTrip();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared trip...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error === 'Share link has expired' ? 'Link Expired' : 'Trip Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'This shared trip doesn\'t exist or has been removed.'}
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan Your Own Trip
          </Link>
        </div>
      </div>
    );
  }

  const trip: Trip = sharedTrip.tripData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {trip.destination}
                </h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Shared Trip
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Shared by {sharedTrip.owner.name} • {sharedTrip.viewCount} views
              </p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Plan Your Own Trip
            </Link>
          </div>
        </div>
      </header>

      {/* View Mode Tabs (Mobile) */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setViewMode('itinerary')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'itinerary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Itinerary
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              viewMode === 'map'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto h-[calc(100vh-80px)]">
        {/* Itinerary - Desktop: Left side, Mobile: Tab content */}
        <div
          className={`${
            viewMode === 'itinerary' ? 'block' : 'hidden'
          } md:block md:w-1/2 overflow-y-auto bg-white`}
        >
          <ItineraryView
            trip={trip}
            isEditMode={false}
            onRemoveItem={() => {}}
            onRequestSuggestion={() => {}}
            onShowDetails={() => {}}
            hideShareButton={true}
            activityDetailsMap={activityDetailsMap}
          />
        </div>

        {/* Map - Desktop: Right side, Mobile: Tab content */}
        <div
          className={`${
            viewMode === 'map' ? 'block' : 'hidden'
          } md:block md:w-1/2 relative`}
        >
          <MapView trip={trip} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>
            Powered by{' '}
            <Link to="/" className="text-blue-600 hover:underline font-medium">
              OtterlyGo
            </Link>{' '}
            - Plan your next adventure
          </p>
        </div>
      </footer>
    </div>
  );
}
