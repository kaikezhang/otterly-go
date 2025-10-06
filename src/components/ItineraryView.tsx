import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { Trip, ItineraryItem } from '../types';

interface ItineraryViewProps {
  trip: Trip;
  onRemoveItem: (dayIndex: number, itemId: string) => void;
  onRequestSuggestion: (dayIndex: number) => void;
  onRequestReplace: (dayIndex: number, itemId: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  sight: '🏛️',
  food: '🍽️',
  museum: '🖼️',
  hike: '🥾',
  experience: '✨',
  transport: '🚗',
  rest: '😴',
};

export function ItineraryView({
  trip,
  onRemoveItem,
  onRequestSuggestion,
  onRequestReplace,
}: ItineraryViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(trip.days.map((_, i) => i))
  );

  const toggleDay = (dayIndex: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex);
    } else {
      newExpanded.add(dayIndex);
    }
    setExpandedDays(newExpanded);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-900">{trip.destination}</h2>
        <p className="text-sm text-gray-600">
          {format(parseISO(trip.startDate), 'MMM d')} -{' '}
          {format(parseISO(trip.endDate), 'MMM d, yyyy')}
        </p>
        <div className="flex gap-2 mt-2 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {trip.pace} pace
          </span>
          {trip.interests.map((interest) => (
            <span
              key={interest}
              className="px-2 py-1 bg-green-100 text-green-800 rounded"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Days */}
      <div className="p-4 space-y-3">
        {trip.days.map((day, dayIndex) => {
          const isExpanded = expandedDays.has(dayIndex);

          return (
            <div
              key={dayIndex}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              {/* Day Header */}
              <button
                onClick={() => toggleDay(dayIndex)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded={isExpanded}
              >
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">
                    Day {dayIndex + 1}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(day.date), 'EEEE, MMM d')}
                    {day.location && ` • ${day.location}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {day.items.length} items
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </button>

              {/* Day Items */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {day.items.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-gray-500 mb-3">No activities planned yet</p>
                      <button
                        onClick={() => onRequestSuggestion(dayIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Add suggestion
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {day.items.map((item) => (
                        <ItineraryItemComponent
                          key={item.id}
                          item={item}
                          onRemove={() => onRemoveItem(dayIndex, item.id)}
                          onReplace={() => onRequestReplace(dayIndex, item.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add Suggestion Button */}
                  {day.items.length > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <button
                        onClick={() => onRequestSuggestion(dayIndex)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Add suggestion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItineraryItemComponent({
  item,
  onRemove,
  onReplace,
}: {
  item: ItineraryItem;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="px-4 py-3 hover:bg-gray-50 transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0" aria-hidden="true">
          {TYPE_ICONS[item.type] || '📍'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{item.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          {item.notes && (
            <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
          )}
          {item.duration && (
            <p className="text-xs text-gray-500 mt-1">⏱️ {item.duration}</p>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2">
            <button
              onClick={onReplace}
              className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
              title="Replace this item"
            >
              Replace
            </button>
            <button
              onClick={onRemove}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
              title="Remove this item"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
