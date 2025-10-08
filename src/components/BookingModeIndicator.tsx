import React from 'react';

interface BookingModeIndicatorProps {
  onExitBookingMode: () => void;
}

export function BookingModeIndicator({ onExitBookingMode }: BookingModeIndicatorProps) {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 rounded-full p-2">
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
          <div>
            <div className="font-semibold">Flight Booking Mode</div>
            <div className="text-sm text-blue-100">
              Search and book flights for your trip
            </div>
          </div>
        </div>

        <button
          onClick={onExitBookingMode}
          className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="text-sm font-medium">Exit Booking Mode</span>
        </button>
      </div>
    </div>
  );
}
