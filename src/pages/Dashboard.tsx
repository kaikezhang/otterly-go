import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TripCard } from '../components/TripCard';
import { SkeletonTripCard } from '../components/SkeletonTripCard';
import { TripsFilterBar } from '../components/TripsFilterBar';
import { MobileBottomNav } from '../components/MobileBottomNav';
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
import toast, { Toaster } from 'react-hot-toast';

export function Dashboard() {
  const navigate = useNavigate();
  const clearAll = useStore((state) => state.clearAll);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // State
  const [trips, setTrips] = React.useState<TripResponse[]>([]);
  const [stats, setStats] = React.useState<TripStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // Filter state
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TripStatus | 'all' | 'past' | undefined>(
    undefined
  );
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedTrips, setSelectedTrips] = React.useState<Set<string>>(new Set());

  // Pull-to-refresh state
  const [isPulling, setIsPulling] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const pullStartY = React.useRef(0);
  const isPullingRef = React.useRef(false);

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

  // Pull-to-refresh handlers (mobile only)
  React.useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && window.innerWidth < 768) {
        pullStartY.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - pullStartY.current;

      if (distance > 0 && distance < 100) {
        setPullDistance(distance);
        setIsPulling(true);
      }
    };

    const handleTouchEnd = async () => {
      if (isPullingRef.current && pullDistance > 60) {
        setIsPulling(true);
        await loadData();
        toast.success('Trips refreshed');
      }

      setIsPulling(false);
      setPullDistance(0);
      isPullingRef.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, loadData]);

  // Close user menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Handlers
  const handleTripClick = (tripId: string) => {
    navigate(`/trip/${tripId}`);
  };

  const handleNewTrip = () => {
    clearAll(); // Clear previous trip state
    navigate('/trip/new');
  };

  const handleDuplicate = async (tripId: string) => {
    // Show loading toast
    const loadingToast = toast.loading('Duplicating trip...');

    try {
      const newTrip = await duplicateTrip(tripId);

      toast.dismiss(loadingToast);
      toast.success(
        (t) => (
          <div className="flex items-center gap-3">
            <span>Trip duplicated successfully</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate(`/trip/${newTrip.id}`);
              }}
              className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
            >
              View
            </button>
          </div>
        ),
        { duration: 4000 }
      );

      // Reload data to show new trip
      await loadData();
    } catch (err) {
      console.error('Error duplicating trip:', err);
      toast.dismiss(loadingToast);
      toast.error('Failed to duplicate trip');
    }
  };

  const handleArchive = async (tripId: string) => {
    // Optimistic update: immediately remove from UI
    const tripToArchive = trips.find((t) => t.id === tripId);
    if (!tripToArchive) return;

    setTrips((prev) => prev.filter((t) => t.id !== tripId));

    // Show toast with undo
    const toastId = toast.success(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Trip archived</span>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              // Restore trip in UI
              setTrips((prev) => [tripToArchive, ...prev]);
              toast.success('Archive cancelled');
            }}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    try {
      await bulkOperateTrips('archive', [tripId]);
      // Success - no need to reload, optimistic update already done
    } catch (err) {
      console.error('Error archiving trip:', err);
      toast.dismiss(toastId);
      toast.error('Failed to archive trip');
      // Restore trip in UI on error
      setTrips((prev) => [tripToArchive, ...prev]);
    }
  };

  const handleDelete = async (tripId: string) => {
    // Optimistic update: immediately remove from UI
    const tripToDelete = trips.find((t) => t.id === tripId);
    if (!tripToDelete) return;

    setTrips((prev) => prev.filter((t) => t.id !== tripId));

    // Show toast with undo
    const toastId = toast.success(
      (t) => (
        <div className="flex items-center gap-3">
          <span>Trip deleted</span>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              // Restore trip in UI
              setTrips((prev) => [tripToDelete, ...prev]);
              toast.success('Delete cancelled');
            }}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 underline"
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    try {
      await bulkOperateTrips('delete', [tripId]);
      // Success - no need to reload, optimistic update already done
    } catch (err) {
      console.error('Error deleting trip:', err);
      toast.dismiss(toastId);
      toast.error('Failed to delete trip');
      // Restore trip in UI on error
      setTrips((prev) => [tripToDelete, ...prev]);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedTrips.size === 0) return;

    const selectedIds = Array.from(selectedTrips);
    const tripsToArchive = trips.filter((t) => selectedIds.includes(t.id));

    // Optimistic update
    setTrips((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    setSelectedTrips(new Set());
    setIsSelectionMode(false);

    const count = selectedIds.length;
    const toastId = toast.success(`${count} ${count === 1 ? 'trip' : 'trips'} archived`, {
      duration: 4000,
    });

    try {
      await bulkOperateTrips('archive', selectedIds);
    } catch (err) {
      console.error('Error archiving trips:', err);
      toast.dismiss(toastId);
      toast.error('Failed to archive trips');
      // Restore trips on error
      setTrips((prev) => [...tripsToArchive, ...prev]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTrips.size === 0) return;

    const selectedIds = Array.from(selectedTrips);
    const tripsToDelete = trips.filter((t) => selectedIds.includes(t.id));

    // Optimistic update
    setTrips((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
    setSelectedTrips(new Set());
    setIsSelectionMode(false);

    const count = selectedIds.length;
    const toastId = toast.success(`${count} ${count === 1 ? 'trip' : 'trips'} deleted`, {
      duration: 4000,
    });

    try {
      await bulkOperateTrips('delete', selectedIds);
    } catch (err) {
      console.error('Error deleting trips:', err);
      toast.dismiss(toastId);
      toast.error('Failed to delete trips');
      // Restore trips on error
      setTrips((prev) => [...tripsToDelete, ...prev]);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTrips.size === 0) return;

    const selectedIds = Array.from(selectedTrips);

    // Optimistic update
    const updatedTrips = trips.map((t) => {
      if (selectedIds.includes(t.id)) {
        return {
          ...t,
          status: 'completed' as TripStatus,
        };
      }
      return t;
    });
    setTrips(updatedTrips);
    setSelectedTrips(new Set());
    setIsSelectionMode(false);

    const count = selectedIds.length;
    const toastId = toast.success(`${count} ${count === 1 ? 'trip' : 'trips'} marked as completed`, {
      duration: 4000,
    });

    try {
      await bulkOperateTrips('complete', selectedIds);
    } catch (err) {
      console.error('Error completing trips:', err);
      toast.dismiss(toastId);
      toast.error('Failed to mark trips as completed');
      // Reload data on error
      await loadData();
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev);
    // Clear selection when exiting selection mode
    if (isSelectionMode) {
      setSelectedTrips(new Set());
    }
  };

  const handleSelectAll = () => {
    const allTripIds = trips.map((t) => t.id);
    setSelectedTrips(new Set(allTripIds));
  };

  const handleDeselectAll = () => {
    setSelectedTrips(new Set());
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

  const handleCardClick = (tripId: string) => {
    if (isSelectionMode) {
      // In selection mode, clicking card toggles selection
      handleSelect(tripId);
    } else {
      // Normal mode, navigate to trip
      handleTripClick(tripId);
    }
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
    <>
      <Toaster position="top-right" />
      {/* Pull-to-refresh indicator (mobile only) */}
      {isPulling && pullDistance > 0 && (
        <div
          className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-all"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance / 100,
          }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
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

            {/* User Profile Menu */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                      {(user.name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile & Settings
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={async () => {
                        await logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats overview with New Trip button */}
          {stats && (
            <div className="flex items-start gap-4 mt-6">
              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
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

              {/* New Trip Button */}
              <button
                onClick={handleNewTrip}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
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
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) - Mobile only */}
      <button
        onClick={handleNewTrip}
        className="md:hidden fixed bottom-20 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-40"
        aria-label="Create new trip"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Main content */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 ${
        isSelectionMode && selectedTrips.size > 0 ? 'mt-20' : ''
      }`}>
        <TripsFilterBar
          search={search}
          onSearchChange={setSearch}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={trips.length}
          selectedCount={selectedTrips.size}
          isSelectionMode={isSelectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onBulkArchive={selectedTrips.size > 0 ? handleBulkArchive : undefined}
          onBulkDelete={selectedTrips.size > 0 ? handleBulkDelete : undefined}
          onBulkComplete={selectedTrips.size > 0 ? handleBulkComplete : undefined}
        />

        {/* Loading state with skeleton cards */}
        {isLoading && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6'
                : 'space-y-4 mt-6'
            }
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonTripCard key={i} viewMode={viewMode} />
            ))}
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
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mt-6'
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
                onClick={() => handleCardClick(trip.id)}
                onDuplicate={() => handleDuplicate(trip.id)}
                onArchive={() => handleArchive(trip.id)}
                onDelete={() => handleDelete(trip.id)}
                isSelected={selectedTrips.has(trip.id)}
                onSelect={isSelectionMode ? () => handleSelect(trip.id) : undefined}
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
      <MobileBottomNav />
    </>
  );
}
