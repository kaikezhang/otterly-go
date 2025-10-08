import React from 'react';
import type { FlightDetails } from '../types';

interface FlightDetailsModalProps {
  details: FlightDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onBook?: () => void;
}

export function FlightDetailsModal({ details, isOpen, onClose, onBook }: FlightDetailsModalProps) {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Flight Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Flight Segments */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Flight Itinerary</h3>
            {details.segments.map((segment, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="text-xl font-bold">{segment.departTime}</div>
                    <div className="text-gray-600">{segment.origin}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm text-gray-500">{segment.duration}</div>
                    <div className="border-t my-1"></div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{segment.arriveTime}</div>
                    <div className="text-gray-600">{segment.destination}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {segment.airline} • {segment.flightNumber}
                  {segment.aircraft && ` • ${segment.aircraft}`}
                </div>
              </div>
            ))}
          </div>

          {/* Price Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Price Breakdown</h3>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare</span>
                <span className="font-medium">${details.price.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes</span>
                <span className="font-medium">${details.price.taxes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fees</span>
                <span className="font-medium">${details.price.fees}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${details.price.total} {details.price.currency}</span>
              </div>
            </div>
          </div>

          {/* Baggage */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Baggage Allowance</h3>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start">
                <span className="mr-2">✈️</span>
                <div>
                  <div className="font-medium">Carry-on</div>
                  <div className="text-sm text-gray-600">{details.baggage.carryOn}</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="mr-2">🧳</span>
                <div>
                  <div className="font-medium">Checked Bags</div>
                  <div className="text-sm text-gray-600">{details.baggage.checked}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {details.amenities && details.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {details.amenities.map((amenity, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {onBook && (
            <button
              onClick={onBook}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Book This Flight
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
