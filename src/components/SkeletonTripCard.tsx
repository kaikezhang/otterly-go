import React from 'react';

interface SkeletonTripCardProps {
  viewMode?: 'grid' | 'list';
}

export function SkeletonTripCard({ viewMode = 'grid' }: SkeletonTripCardProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border-2 border-gray-200">
        {/* Thumbnail skeleton */}
        <div className="w-24 h-24 bg-gray-200 rounded-md flex-shrink-0 animate-pulse" />

        <div className="flex-1 min-w-0 space-y-3">
          {/* Title and status badge */}
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
          </div>

          {/* Destination */}
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />

          {/* Metadata */}
          <div className="flex items-center gap-4">
            <div className="h-3 bg-gray-200 rounded w-40 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>

        {/* Menu button */}
        <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
      {/* Cover photo skeleton */}
      <div className="h-48 w-full bg-gray-200 animate-pulse" />

      <div className="p-4 md:p-6 space-y-3">
        {/* Status badge and menu */}
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Destination */}
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />

        {/* Dates */}
        <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />

        {/* Metadata */}
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 rounded w-12 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-8 animate-pulse" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
