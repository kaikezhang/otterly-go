import { useState, useEffect } from 'react';
import type { SuggestionCard as SuggestionCardType } from '../types';
import { searchPhotos, type Photo } from '../services/photoApi';

// Platform badge component
function PlatformBadge({ platform }: { platform: string }) {
  const badges: Record<string, { bg: string; label: string }> = {
    xiaohongshu: { bg: 'bg-red-500', label: '小红书' },
    reddit: { bg: 'bg-orange-500', label: 'Reddit' },
    tiktok: { bg: 'bg-black', label: 'TikTok' },
    instagram: { bg: 'bg-pink-500', label: 'Instagram' },
    youtube: { bg: 'bg-red-600', label: 'YouTube' },
    'ai-generated': { bg: 'bg-gradient-to-r from-purple-500 to-blue-500', label: '🤖 AI Generated' },
  };

  const badge = badges[platform] || { bg: 'bg-gray-500', label: platform };

  return (
    <div className={`${badge.bg} text-white px-3 py-1 rounded-full text-xs font-bold`}>
      {badge.label}
    </div>
  );
}

// Get platform-specific background class
function getPlatformBgClass(platform: string): string {
  const classes: Record<string, string> = {
    xiaohongshu: 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-md p-3 mb-4',
    reddit: 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-md p-3 mb-4',
    tiktok: 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-md p-3 mb-4',
    instagram: 'bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-md p-3 mb-4',
    youtube: 'bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-md p-3 mb-4',
    'ai-generated': 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-md p-3 mb-4',
  };

  return classes[platform] || 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-3 mb-4';
}

// Get language label
function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    zh: '🇨🇳 Chinese',
    ja: '🇯🇵 Japanese',
    ko: '🇰🇷 Korean',
    es: '🇪🇸 Spanish',
    fr: '🇫🇷 French',
    de: '🇩🇪 German',
  };

  return labels[lang] || lang;
}

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
  const [showDetailedDescription, setShowDetailedDescription] = useState(false);

  // Use persisted flags from suggestion prop
  const isAdded = suggestion.isAdded ?? false;
  const addedToDayIndex = suggestion.addedToDayIndex ?? null;

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

      {/* Platform Attribution (Xiaohongshu, Reddit, etc.) */}
      {suggestion.source && suggestion.platformMeta && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Show platform badge (Reddit, Xiaohongshu, etc.) or multi-platform badge */}
              {suggestion.source === 'multi-platform' ? (
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {suggestion.platformMeta.platform || 'Multi-platform'}
                </div>
              ) : (
                <PlatformBadge platform={suggestion.source} />
              )}

              {/* Language indicator for non-English content */}
              {suggestion.platformMeta.contentLang && suggestion.platformMeta.contentLang !== 'en' && (
                <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200">
                  {getLanguageLabel(suggestion.platformMeta.contentLang)}
                </span>
              )}
            </div>

            {/* Aggregated engagement metrics */}
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span>👍</span>
                <span className="font-medium">{suggestion.platformMeta.likes?.toLocaleString() || 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>💬</span>
                <span className="font-medium">{suggestion.platformMeta.comments?.toLocaleString() || 0}</span>
              </span>
            </div>
          </div>

          {/* Additional metadata (location, best time) */}
          {(suggestion.platformMeta.location || suggestion.platformMeta.bestTime) && (
            <div className="flex gap-3 mt-2 text-xs text-gray-600">
              {suggestion.platformMeta.location && (
                <span className="flex items-center gap-1">
                  <span>📍</span>
                  <span>{suggestion.platformMeta.location}</span>
                </span>
              )}
              {suggestion.platformMeta.bestTime && (
                <span className="flex items-center gap-1">
                  <span>⏰</span>
                  <span>Best time: {suggestion.platformMeta.bestTime}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legacy Xiaohongshu Attribution (for backward compatibility) */}
      {suggestion.source === 'xiaohongshu' && suggestion.xiaohongshuMeta && !suggestion.platformMeta && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">小红书</span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                Featured on Xiaohongshu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {suggestion.xiaohongshuMeta.authorAvatar && (
              <img
                src={suggestion.xiaohongshuMeta.authorAvatar}
                alt={suggestion.xiaohongshuMeta.authorName}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">
                {suggestion.xiaohongshuMeta.authorName}
              </p>
              <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                <span>❤️ {suggestion.xiaohongshuMeta.likes.toLocaleString()} likes</span>
                <span>💬 {suggestion.xiaohongshuMeta.comments.toLocaleString()} comments</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Detailed Description (expandable) */}
      {suggestion.detailedDescription && (
        <div className="mb-4">
          {showDetailedDescription && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
              <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                {suggestion.detailedDescription}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowDetailedDescription(!showDetailedDescription)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
          >
            {showDetailedDescription ? (
              <>
                <span>Show less</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show more</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

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

      {/* Source Links - Compact view */}
      {suggestion.sourceLinks.length > 0 && (
        <div className="mb-4">
          <details className="group">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 flex items-center gap-2 py-2">
              <span className="text-blue-600">📚</span>
              <span className="font-medium">
                Based on {suggestion.sourceLinks.length} {suggestion.sourceLinks.length === 1 ? 'post' : 'posts'}
              </span>
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2 pl-6 space-y-1">
              {suggestion.sourceLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-2 group/link"
                >
                  <span className="text-gray-400 group-hover/link:text-blue-600">→</span>
                  <span className="flex-1 truncate">{link.label}</span>
                  <svg
                    className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </details>
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
                onClick={() => onAddToDay(selectedDayIndex)}
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
