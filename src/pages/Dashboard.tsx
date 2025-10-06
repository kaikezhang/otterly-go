import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TripCard } from '../components/TripCard';
import { TripsFilterBar } from '../components/TripsFilterBar';
import {
  listTripsWithFilters,
  getTripStats,
  duplicateTrip,
  bulkOperateTrips,
  type TripResponse,
  type TripStats,
  type TripFilters,
} from '../services/tripApi';
import type { TripStatus } from '../types';
import { useStore } from '../store/useStore';

export function Dashboard() {
  const navigate = useNavigate();
  const clearAll = useStore((state) => state.clearAll);

  // State
  const [trips, setTrips] = React.useState<TripResponse[]>([]);
  const [stats, setStats] = React.useState<TripStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter state
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TripStatus | 'all' | 'past' | undefined>(
    undefined
  );
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  // Selection state
  const [selectedTrips, setSelectedTrips] = React.useState<Set<string>>(new Set());

  // Load trips and stats
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: TripFilters = {
        limit: 100, // Load all trips for now
        search: search || undefined,
        status: statusFilter,
        sort: 'recent',
      };

      const [tripsData, statsData] = await Promise.all([
        listTripsWithFilters(filters),
        getTripStats(),
      ]);

      setTrips(tripsData.trips);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleTripClick = (tripId: string) => {
    navigate(`/trip/${tripId}`);
  };

  const handleNewTrip = () => {
    clearAll(); // Clear previous trip state
    navigate('/trip/new');
  };

  const handleDuplicate = async (tripId: string) => {
    try {
      const newTrip = await duplicateTrip(tripId);
      await loadData(); // Refresh list
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error('Error duplicating trip:', err);
      alert('Failed to duplicate trip');
    }
  };

  const handleArchive = async (tripId: string) => {
    try {
      await bulkOperateTrips('archive', [tripId]);
      await loadData();
    } catch (err) {
      console.error('Error archiving trip:', err);
      alert('Failed to archive trip');
    }
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      await bulkOperateTrips('delete', [tripId]);
      await loadData();
    } catch (err) {
      console.error('Error deleting trip:', err);
      alert('Failed to delete trip');
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTrips.size === 0) return;

    try {
      await bulkOperateTrips('archive', Array.from(selectedTrips));
      setSelectedTrips(new Set());
      await loadData();
    } catch (err) {
      console.error('Error archiving trips:', err);
      alert('Failed to archive trips');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTrips.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTrips.size} trips?`)) return;

    try {
      await bulkOperateTrips('delete', Array.from(selectedTrips));
      setSelectedTrips(new Set());
      await loadData();
    } catch (err) {
      console.error('Error deleting trips:', err);
      alert('Failed to delete trips');
    }
  };

  const handleSelect = (tripId: string) => {
    setSelectedTrips((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  // Empty state
  if (!isLoading && trips.length === 0 && !search && !statusFilter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <svg
            className="w-24 h-24 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No trips yet</h2>
          <p className="text-gray-600 mb-6">
            Start planning your next adventure by creating your first trip!
          </p>
          <button
            onClick={handleNewTrip}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plan Your First Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
              {stats && (
                <p className="text-gray-600 mt-1">
                  {stats.total} {stats.total === 1 ? 'trip' : 'trips'} •{' '}
                  {stats.destinationsCount} {stats.destinationsCount === 1 ? 'destination' : 'destinations'}
                </p>
              )}
            </div>

            <button
              onClick={handleNewTrip}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Trip
            </button>
          </div>

          {/* Stats overview */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {stats.byStatus.upcoming > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.byStatus.upcoming}</p>
                </div>
              )}
              {stats.byStatus.active > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.byStatus.active}</p>
                </div>
              )}
              {stats.totalDays > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Days</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalDays}</p>
                </div>
              )}
              {stats.activitiesCount > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium">Activities</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.activitiesCount}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TripsFilterBar
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={trips.length}
          selectedCount={selectedTrips.size}
          onBulkArchive={selectedTrips.size > 0 ? handleBulkArchive : undefined}
          onBulkDelete={selectedTrips.size > 0 ? handleBulkDelete : undefined}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Trips grid/list */}
        {!isLoading && !error && trips.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6'
                : 'space-y-4 mt-6'
            }
          >
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={{
                  ...trip.tripData,
                  id: trip.id,
                  userId: trip.userId,
                  title: trip.title,
                  destination: trip.destination,
                  startDate: trip.startDate,
                  endDate: trip.endDate,
                  createdAt: trip.createdAt,
                  updatedAt: trip.updatedAt,
                }}
                onClick={() => handleTripClick(trip.id)}
                onDuplicate={() => handleDuplicate(trip.id)}
                onArchive={() => handleArchive(trip.id)}
                onDelete={() => handleDelete(trip.id)}
                isSelected={selectedTrips.has(trip.id)}
                onSelect={() => handleSelect(trip.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && !error && trips.length === 0 && (search || statusFilter) && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter(undefined);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
