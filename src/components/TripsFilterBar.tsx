import React from 'react';
import type { TripStatus} from '../types';

interface TripsFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  status: TripStatus | 'all' | 'past' | undefined;
  onStatusChange: (status: TripStatus | 'all' | 'past' | undefined) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalCount: number;
  selectedCount?: number;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
}

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'draft' as const, label: 'Draft' },
  { value: 'planning' as const, label: 'Planning' },
  { value: 'upcoming' as const, label: 'Upcoming' },
  { value: 'active' as const, label: 'Active' },
  { value: 'past' as const, label: 'Past' },
];

export function TripsFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
  totalCount,
  selectedCount = 0,
  onBulkArchive,
  onBulkDelete,
}: TripsFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Search and view mode */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search trips by title or destination..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
        </div>

        {/* View mode toggle */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-2 transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-2 border-l border-gray-300 transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-label="List view"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status filters and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => onStatusChange(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} selected
              </span>
              {onBulkArchive && (
                <button
                  onClick={onBulkArchive}
                  className="px-3 py-1 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded transition-colors"
                >
                  Archive
                </button>
              )}
              {onBulkDelete && (
                <button
                  onClick={onBulkDelete}
                  className="px-3 py-1 text-sm font-medium text-red-700 hover:text-red-900 hover:bg-red-100 rounded transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          <span className="text-sm text-gray-600">
            {totalCount} {totalCount === 1 ? 'trip' : 'trips'}
          </span>
        </div>
      </div>
    </div>
  );
}
