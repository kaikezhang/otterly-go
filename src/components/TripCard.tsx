import React from 'react';
import type { Trip, TripStatus } from '../types';

interface TripCardProps {
  trip: Trip & {
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  onClick: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  viewMode?: 'grid' | 'list';
}

const STATUS_STYLES: Record<TripStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  planning: 'bg-yellow-100 text-yellow-800',
  upcoming: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-50 text-gray-500',
};

const STATUS_LABELS: Record<TripStatus, string> = {
  draft: 'Draft',
  planning: 'Planning',
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'No date set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateProgress(trip: Trip): number {
  if (!trip.days || trip.days.length === 0) return 0;

  const totalPossibleActivities = trip.days.length * 4; // Assume 4 activities per day as "complete"
  const actualActivities = trip.days.reduce((sum, day) => sum + (day.items?.length || 0), 0);

  return Math.min(100, Math.round((actualActivities / totalPossibleActivities) * 100));
}

function calculateDaysCount(trip: Trip): number {
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  return trip.days?.length || 0;
}

function calculateActivitiesCount(trip: Trip): number {
  if (!trip.days) return 0;
  return trip.days.reduce((sum, day) => sum + (day.items?.length || 0), 0);
}

export function TripCard({
  trip,
  onClick,
  onDuplicate,
  onArchive,
  onDelete,
  isSelected,
  onSelect,
  viewMode = 'grid',
}: TripCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const status = trip.status || 'draft';
  const title = trip.title || trip.destination || 'Untitled Trip';
  const progress = calculateProgress(trip);
  const daysCount = calculateDaysCount(trip);
  const activitiesCount = calculateActivitiesCount(trip);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowMenu(false);
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-4 p-4 bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={onClick}
      >
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )}

        {trip.coverPhotoUrl && (
          <img
            src={trip.coverPhotoUrl}
            alt={title}
            className="w-24 h-24 object-cover rounded-md flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-1">{trip.destination}</p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {trip.startDate && trip.endDate
                ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
                : 'No dates set'}
            </span>
            <span>•</span>
            <span>{daysCount} days</span>
            <span>•</span>
            <span>{activitiesCount} activities</span>
            {progress > 0 && (
              <>
                <span>•</span>
                <span>{progress}% complete</span>
              </>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="More options"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
              {onDuplicate && (
                <button
                  onClick={(e) => handleMenuClick(e, onDuplicate)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Duplicate
                </button>
              )}
              {onArchive && (
                <button
                  onClick={(e) => handleMenuClick(e, onArchive)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {status === 'archived' ? 'Unarchive' : 'Archive'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => handleMenuClick(e, onDelete)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={`relative group bg-white rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onClick}
    >
      {onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white shadow"
          />
        </div>
      )}

      {trip.coverPhotoUrl ? (
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
          <img
            src={trip.coverPhotoUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white truncate">{title}</h3>
          </div>
        </div>
      ) : (
        <div className="relative h-48 w-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
          <h3 className="text-xl font-bold text-white text-center px-4">{title}</h3>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="More options"
            >
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                {onDuplicate && (
                  <button
                    onClick={(e) => handleMenuClick(e, onDuplicate)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Duplicate
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={(e) => handleMenuClick(e, onArchive)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => handleMenuClick(e, onDelete)}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm font-medium text-gray-600 mb-2">{trip.destination}</p>

        <p className="text-xs text-gray-500 mb-3">
          {trip.startDate && trip.endDate
            ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
            : 'No dates set'}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{daysCount} days</span>
          <span>{activitiesCount} activities</span>
        </div>

        {progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
