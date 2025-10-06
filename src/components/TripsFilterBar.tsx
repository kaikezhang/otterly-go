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
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
  onBulkComplete?: () => void;
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
  isSelectionMode = false,
  onToggleSelectionMode,
  onSelectAll,
  onDeselectAll,
  onBulkArchive,
  onBulkDelete,
  onBulkComplete,
}: TripsFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* Selection Mode Action Bar (sticky) */}
      {isSelectionMode && selectedCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">
                  {selectedCount} {selectedCount === 1 ? 'trip' : 'trips'} selected
                </span>
                {onSelectAll && selectedCount < totalCount && (
                  <button
                    onClick={onSelectAll}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Select All
                  </button>
                )}
                {onDeselectAll && (
                  <button
                    onClick={onDeselectAll}
                    className="px-3 py-1.5 text-sm font-medium text-white border border-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Deselect All
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onBulkComplete && (
                  <button
                    onClick={onBulkComplete}
                    className="px-4 py-2 text-sm font-medium text-white border border-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark Complete
                  </button>
                )}
                {onBulkArchive && (
                  <button
                    onClick={onBulkArchive}
                    className="px-4 py-2 text-sm font-medium text-white border border-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    Archive
                  </button>
                )}
                {onBulkDelete && (
                  <button
                    onClick={onBulkDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
                {onToggleSelectionMode && (
                  <button
                    onClick={onToggleSelectionMode}
                    className="px-4 py-2 text-sm font-medium text-white border border-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* View mode and selection toggle */}
        <div className="flex gap-2">
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

          {/* Selection mode toggle */}
          {onToggleSelectionMode && (
            <button
              onClick={onToggleSelectionMode}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isSelectionMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              aria-label="Toggle selection mode"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="hidden sm:inline">{isSelectionMode ? 'Done' : 'Select'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status filters */}
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

        <span className="text-sm text-gray-600">
          {totalCount} {totalCount === 1 ? 'trip' : 'trips'}
        </span>
      </div>
    </div>
  );
}
