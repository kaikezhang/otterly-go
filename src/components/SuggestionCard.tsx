import { useState, useEffect } from 'react';
import type { SuggestionCard as SuggestionCardType } from '../types';
import { searchPhotos, type Photo } from '../services/photoApi';

interface SuggestionCardProps {
  suggestion: SuggestionCardType;
  onAddToDay: (dayIndex: number) => void;
  onSkip: () => void;
  maxDays: number;
}

export function SuggestionCard({
  suggestion,
  onAddToDay,
  onSkip,
  maxDays,
}: SuggestionCardProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    suggestion.defaultDayIndex ?? 0
  );
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isAdded, setIsAdded] = useState(false);
  const [addedToDayIndex, setAddedToDayIndex] = useState<number | null>(null);

  // Fetch photos if photoQuery is provided
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!suggestion.photoQuery) return;

      try {
        const results = await searchPhotos(suggestion.photoQuery, {
          limit: 3, // Get up to 3 photos
        });
        setPhotos(results);
      } catch (error) {
        console.error('Failed to fetch photos for suggestion:', error);
      }
    };

    fetchPhotos();
  }, [suggestion.photoQuery]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 my-4 border border-gray-200">
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {suggestion.title}
      </h3>

      {/* Images from photoQuery */}
      {photos.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="flex-shrink-0">
                <button
                  onClick={() => setExpandedImage(photo.urls.regular)}
                  className="w-32 h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View photo ${idx + 1} of ${suggestion.title}`}
                >
                  <img
                    src={photo.urls.small}
                    alt={suggestion.title}
                    className="w-full h-full object-cover"
                  />
                </button>
                {idx === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Photo by{' '}
                    <a
                      href={photo.attribution.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {photo.attribution.photographerName}
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: Images from legacy images array */}
      {photos.length === 0 && suggestion.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {suggestion.images.map((image, idx) => (
            <button
              key={idx}
              onClick={() => setExpandedImage(image)}
              className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`View image ${idx + 1} of ${suggestion.title}`}
            >
              <img
                src={image}
                alt={`${suggestion.title} - view ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      <p className="text-gray-700 mb-4 leading-relaxed">{suggestion.summary}</p>

      {/* Quotes */}
      {suggestion.quotes.length > 0 && (
        <div className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
          {suggestion.quotes.map((quote, idx) => (
            <div key={idx} className="border-l-4 border-blue-400 pl-3">
              <p className="text-gray-800 italic mb-1">{quote.zh}</p>
              <p className="text-gray-600 text-sm italic">"{quote.en}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Source Links */}
      {suggestion.sourceLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.sourceLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        {isAdded ? (
          // Show confirmation message after adding
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Activity added to Day {addedToDayIndex! + 1}!</span>
          </div>
        ) : (
          // Show action buttons before adding
          <>
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="day-select" className="text-sm font-medium text-gray-700">
                Add to:
              </label>
              <select
                id="day-select"
                value={selectedDayIndex}
                onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: maxDays }, (_, i) => (
                  <option key={i} value={i}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setIsAdded(true);
                  setAddedToDayIndex(selectedDayIndex);
                  onAddToDay(selectedDayIndex);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Add to Day
              </button>
            </div>
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-md transition-colors"
            >
              Skip
            </button>
          </>
        )}
      </div>

      {/* Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={expandedImage}
              alt={suggestion.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 focus:outline-none"
            aria-label="Close image"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
