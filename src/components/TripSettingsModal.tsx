import { useState } from 'react';
import type { Trip, TripStatus } from '../types';

interface TripSettingsModalProps {
  isOpen: boolean;
  trip: Trip;
  onClose: () => void;
  onUpdate: (updates: Partial<Trip>) => void;
}

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'planning', label: 'Planning' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function TripSettingsModal({ isOpen, trip, onClose, onUpdate }: TripSettingsModalProps) {
  const [status, setStatus] = useState<TripStatus>(trip.status || 'draft');
  const [tags, setTags] = useState<string>(trip.tags?.join(', ') || '');
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onUpdate({
      status,
      tags: tagArray,
    });

    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const currentTags = tags ? `${tags}, ${newTag.trim()}` : newTag.trim();
      setTags(currentTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== tagToRemove);
    setTags(tagArray.join(', '));
  };

  const tagArray = tags
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Trip Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Trip Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trip Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Manually override the trip status. Normally this is set automatically based on dates.
            </p>
          </div>

          {/* Tags/Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags & Categories
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Tag List */}
            {tagArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tagArray.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Use tags to organize your trips (e.g., "beach", "adventure", "family", "solo")
            </p>
          </div>

          {/* Cover Photo Section (Placeholder for future) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {trip.coverPhotoUrl ? (
                <div className="relative">
                  <img
                    src={trip.coverPhotoUrl}
                    alt={trip.destination}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Cover photo is set automatically. Manual selection coming soon.
                  </p>
                </div>
              ) : (
                <div className="py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No cover photo yet</p>
                  <p className="text-xs text-gray-400">Manual selection coming soon</p>
                </div>
              )}
            </div>
          </div>

          {/* Trip Metadata (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Trip Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>{' '}
                <span className="text-gray-900">
                  {trip.createdAt
                    ? new Date(trip.createdAt).toLocaleDateString()
                    : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>{' '}
                <span className="text-gray-900">
                  {trip.updatedAt
                    ? new Date(trip.updatedAt).toLocaleDateString()
                    : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Days:</span>{' '}
                <span className="text-gray-900">{trip.days.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Activities:</span>{' '}
                <span className="text-gray-900">
                  {trip.days.reduce((sum, day) => sum + day.items.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
