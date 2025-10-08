import React from 'react';
import type { Flight } from '../types';

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  onViewDetails: (flight: Flight) => void;
}

export function FlightCard({ flight, onSelect, onViewDetails }: FlightCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      {flight.badge && (
        <div className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded mb-2">
          {flight.badge}
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-2xl font-bold">{flight.departTime}</div>
          <div className="text-gray-600">{flight.origin}</div>
        </div>

        <div className="text-center flex-1 px-4">
          <div className="text-sm text-gray-500">{flight.duration}</div>
          <div className="border-t border-gray-300 my-2"></div>
          <div className="text-xs text-gray-500">
            {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">{flight.arriveTime}</div>
          <div className="text-gray-600">{flight.destination}</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-medium">{flight.airline}</div>
          <div className="text-xs text-gray-500">{flight.flightNumber}</div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">
            ${flight.price}
            <span className="text-sm font-normal text-gray-500"> {flight.currency}</span>
          </div>
          <div className="space-x-2 mt-2">
            <button
              onClick={() => onViewDetails(flight)}
              className="text-sm text-blue-600 hover:underline"
            >
              View Details
            </button>
            <button
              onClick={() => onSelect(flight)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
