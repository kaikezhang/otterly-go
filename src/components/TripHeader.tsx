import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip, TripStatus } from '../types';

interface TripHeaderProps {
  trip: Trip;
  onUpdate: (updates: Partial<Trip>) => void;
  onShare: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSettings: () => void;
}

const STATUS_STYLES: Record<TripStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  planning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Planning' },
  upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Upcoming' },
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
  archived: { bg: 'bg-gray-50', text: 'text-gray-500', label: 'Archived' },
};

export function TripHeader({
  trip,
  onUpdate,
  onShare,
  onDuplicate,
  onArchive,
  onDelete,
  onSettings,
}: TripHeaderProps) {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(trip.title || trip.destination);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const status = (trip.status || 'draft') as TripStatus;
  const statusStyle = STATUS_STYLES[status];

  // Calculate progress (% of days with activities)
  const totalDays = trip.days.length;
  const daysWithActivities = trip.days.filter((day) => day.items.length > 0).length;
  const progress = totalDays > 0 ? Math.round((daysWithActivities / totalDays) * 100) : 0;

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== trip.title) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const formatDateRange = () => {
    if (!trip.startDate || !trip.endDate) return 'No dates set';
    const start = new Date(trip.startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(trip.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Breadcrumb Navigation */}
      <div className="px-6 pt-4 pb-2">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-gray-900 transition-colors"
          >
            Dashboard
          </button>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium truncate">
            {trip.title || trip.destination}
          </span>
        </nav>
      </div>

      {/* Main Header Content */}
      <div className="px-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Title and Metadata */}
          <div className="flex-1 min-w-0">
            {/* Title (Editable) */}
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setEditedTitle(trip.title || trip.destination);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none w-full"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                title="Click to edit"
              >
                {trip.title || trip.destination}
              </h1>
            )}

            {/* Metadata Row */}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {/* Destination with Icon */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{trip.destination}</span>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">{formatDateRange()}</span>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>

              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share trip"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>

            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="More actions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      onSettings();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      onArchive();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    Archive
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setShowActionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
