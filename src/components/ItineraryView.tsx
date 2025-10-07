import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Trip, ItineraryItem } from '../types';
import { EditableText } from './EditableText';
import { TimeRangePicker } from './TimePicker';
import { ShareButton } from './ShareButton';

interface ItineraryViewProps {
  trip: Trip;
  isEditMode: boolean;
  onRemoveItem: (dayIndex: number, itemId: string) => void;
  onRequestSuggestion: (dayIndex: number) => void;
  onRequestReplace: (dayIndex: number, itemId: string) => void;
  onUpdateItem?: (dayIndex: number, itemId: string, updates: Partial<ItineraryItem>) => void;
  onReorderItems?: (dayIndex: number, startIndex: number, endIndex: number) => void;
  onMoveItemBetweenDays?: (fromDayIndex: number, toDayIndex: number, itemId: string, toIndex: number) => void;
  onDuplicateDay?: (dayIndex: number) => void;
  isSyncing?: boolean;
  currentTripId?: string | null;
  hideShareButton?: boolean;
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

function getItemIcon(item: ItineraryItem): string {
  // For transport items, check if it involves flying
  if (item.type === 'transport') {
    const text = `${item.title} ${item.description}`.toLowerCase();
    if (text.includes('fly') || text.includes('flight') || text.includes('plane') || text.includes('airport')) {
      return '✈️';
    }
  }
  return TYPE_ICONS[item.type] || '📍';
}

interface DayItemsListProps {
  day: Trip['days'][0];
  dayIndex: number;
  isEditMode: boolean;
  onRemoveItem: (dayIndex: number, itemId: string) => void;
  onRequestReplace: (dayIndex: number, itemId: string) => void;
  onUpdateItem?: (dayIndex: number, itemId: string, updates: Partial<ItineraryItem>) => void;
}

function DayItemsList({
  day,
  dayIndex,
  isEditMode,
  onRemoveItem,
  onRequestReplace,
  onUpdateItem,
}: DayItemsListProps) {
  const itemIds = day.items.map((item) => item.id);

  return (
    <SortableContext
      id={`sortable-day-${dayIndex}`}
      items={itemIds}
      strategy={verticalListSortingStrategy}
      disabled={!isEditMode}
    >
      {day.items.map((item, itemIndex) => (
        <SortableItineraryItem
          key={item.id}
          item={item}
          dayIndex={dayIndex}
          isEditMode={isEditMode}
          isFirst={itemIndex === 0}
          onRemove={() => onRemoveItem(dayIndex, item.id)}
          onReplace={() => onRequestReplace(dayIndex, item.id)}
          onUpdate={
            onUpdateItem
              ? (updates) => onUpdateItem(dayIndex, item.id, updates)
              : undefined
          }
        />
      ))}
    </SortableContext>
  );
}

export function ItineraryView({
  trip,
  isEditMode,
  onRemoveItem,
  onRequestSuggestion,
  onRequestReplace,
  onUpdateItem,
  onReorderItems,
  onMoveItemBetweenDays,
  onDuplicateDay,
  isSyncing = false,
  currentTripId = null,
  hideShareButton = false,
}: ItineraryViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(trip.days.map((_, i) => i))
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Find source day and item
    let sourceDayIndex = -1;
    let sourceItemIndex = -1;
    let destDayIndex = -1;
    let destItemIndex = -1;

    trip.days.forEach((day, dayIdx) => {
      const itemIdx = day.items.findIndex((item) => item.id === active.id);
      if (itemIdx !== -1) {
        sourceDayIndex = dayIdx;
        sourceItemIndex = itemIdx;
      }

      const destIdx = day.items.findIndex((item) => item.id === over.id);
      if (destIdx !== -1) {
        destDayIndex = dayIdx;
        destItemIndex = destIdx;
      }
    });

    if (sourceDayIndex === -1) {
      setActiveId(null);
      return;
    }

    // Same day reordering
    if (sourceDayIndex === destDayIndex && onReorderItems) {
      onReorderItems(sourceDayIndex, sourceItemIndex, destItemIndex);
    }
    // Move between days
    else if (sourceDayIndex !== destDayIndex && onMoveItemBetweenDays) {
      onMoveItemBetweenDays(sourceDayIndex, destDayIndex, active.id as string, destItemIndex);
    }

    setActiveId(null);
  };

  const activeItem = activeId
    ? trip.days.flatMap((day) => day.items).find((item) => item.id === activeId)
    : null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      {/* Cover Photo */}
      {trip.coverPhotoUrl && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={trip.coverPhotoUrl}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Photo attribution */}
          {trip.coverPhotoAttribution && (
            <div className="absolute bottom-2 right-2 text-white text-xs opacity-75 hover:opacity-100 transition-opacity">
              <a
                href={trip.coverPhotoAttribution.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Photo by {trip.coverPhotoAttribution.photographerName}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{trip.destination}</h2>
            <p className="text-sm text-gray-600">
              {trip.startDate && trip.endDate ? (
                <>
                  {format(parseISO(trip.startDate), 'MMM d')} -{' '}
                  {format(parseISO(trip.endDate), 'MMM d, yyyy')}
                </>
              ) : (
                'No dates set'
              )}
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
          {!hideShareButton && (
            <div className="flex-shrink-0">
              <ShareButton
                tripId={trip.id}
                tripTitle={`${trip.destination} Trip`}
                isSyncing={isSyncing}
                currentTripId={currentTripId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Days */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4 space-y-3">
          {trip.days.map((day, dayIndex) => {
            const isExpanded = expandedDays.has(dayIndex);

            return (
              <div
                key={dayIndex}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
              >
                {/* Day Header */}
                <div className="flex items-stretch">
                  <button
                    onClick={() => toggleDay(dayIndex)}
                    className="flex-1 px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    aria-expanded={isExpanded}
                  >
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">
                        Day {dayIndex + 1}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
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

                  {/* Duplicate Day Button (Edit Mode Only) */}
                  {isEditMode && onDuplicateDay && (
                    <button
                      onClick={() => onDuplicateDay(dayIndex)}
                      className="px-3 border-l border-gray-200 hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                      title="Duplicate this day"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>

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
                      <DayItemsList
                        day={day}
                        dayIndex={dayIndex}
                        isEditMode={isEditMode}
                        onRemoveItem={onRemoveItem}
                        onRequestReplace={onRequestReplace}
                        onUpdateItem={onUpdateItem}
                      />
                    )}

                    {/* Add Suggestion Button */}
                    {day.items.length > 0 && (
                      <button
                        onClick={() => onRequestSuggestion(dayIndex)}
                        className="w-full px-4 py-3 bg-gray-50 border-t border-gray-200 text-left text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium transition-colors"
                      >
                        + Add suggestion
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="bg-white rounded shadow-lg border-2 border-blue-500 p-3 opacity-90">
              <div className="flex items-start gap-3">
                <div className="text-2xl" aria-hidden="true">
                  {getItemIcon(activeItem)}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{activeItem.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{activeItem.description}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface SortableItineraryItemProps {
  item: ItineraryItem;
  dayIndex: number;
  isEditMode: boolean;
  isFirst: boolean;
  onRemove: () => void;
  onReplace: () => void;
  onUpdate?: (updates: Partial<ItineraryItem>) => void;
}

function SortableItineraryItem({
  item,
  dayIndex: _dayIndex,
  isEditMode,
  isFirst,
  onRemove,
  onReplace,
  onUpdate,
}: SortableItineraryItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Truncate description if longer than 150 characters
  const MAX_LENGTH = 150;
  const shouldTruncate = item.description.length > MAX_LENGTH;
  const displayDescription = shouldTruncate && !isExpanded && !isEditMode
    ? item.description.slice(0, MAX_LENGTH) + '...'
    : item.description;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 hover:bg-gray-50 transition-colors relative ${
        !isFirst ? 'border-t border-gray-100' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {isEditMode && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"
            title="Drag to reorder"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
          </button>
        )}

        <div className="text-2xl flex-shrink-0" aria-hidden="true">
          {getItemIcon(item)}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          {isEditMode && onUpdate ? (
            <EditableText
              value={item.title}
              onChange={(newTitle) => onUpdate({ title: newTitle })}
              className="font-medium text-gray-900"
              placeholder="Activity title"
            />
          ) : (
            <h4 className="font-medium text-gray-900">{item.title}</h4>
          )}

          {/* Description */}
          {isEditMode && onUpdate ? (
            <EditableText
              value={item.description}
              onChange={(newDesc) => onUpdate({ description: newDesc })}
              className="text-sm text-gray-600"
              multiline
              placeholder="Activity description"
            />
          ) : (
            <div>
              <p className="text-sm text-gray-600">{displayDescription}</p>
              {shouldTruncate && !isEditMode && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          {(item.notes || isEditMode) && (
            <>
              {isEditMode && onUpdate ? (
                <EditableText
                  value={item.notes || ''}
                  onChange={(newNotes) => onUpdate({ notes: newNotes })}
                  className="text-xs text-gray-500 italic"
                  multiline
                  placeholder="Add notes (optional)"
                />
              ) : (
                item.notes && <p className="text-xs text-gray-500 italic">{item.notes}</p>
              )}
            </>
          )}

          {/* Time Range */}
          {isEditMode && onUpdate ? (
            <TimeRangePicker
              startTime={item.startTime}
              endTime={item.endTime}
              onStartTimeChange={(time) => onUpdate({ startTime: time })}
              onEndTimeChange={(time) => onUpdate({ endTime: time })}
            />
          ) : (
            (item.startTime || item.endTime) && (
              <p className="text-xs text-gray-500">
                ⏱️ {item.startTime || '??:??'} — {item.endTime || '??:??'}
              </p>
            )
          )}

          {/* Duration */}
          {item.duration && !isEditMode && (
            <p className="text-sm text-gray-700 font-medium">🕐 {item.duration}</p>
          )}
        </div>

        {/* Action Buttons */}
        {(showActions || isEditMode) && !isDragging && (
          <div className="flex gap-2">
            {!isEditMode && (
              <button
                onClick={onReplace}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                title="Replace this item"
              >
                Replace
              </button>
            )}
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
