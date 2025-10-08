import React, { useState } from 'react';
import type { Booking } from '../types';

interface BookingConfirmationProps {
  booking: Booking;
  onAddToTrip?: () => void;
  addedToTrip?: boolean; // Track if already added
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export function BookingConfirmation({ booking, onAddToTrip, addedToTrip }: BookingConfirmationProps) {
  const [isAdded, setIsAdded] = useState(addedToTrip || false);

  const handleAddToTrip = () => {
    if (onAddToTrip) {
      setIsAdded(true); // Set immediately to disable button
      onAddToTrip();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-3xl font-bold text-green-600 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">Your flight has been successfully booked</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600">Booking Reference (PNR)</div>
          <div className="text-3xl font-bold text-blue-600">{booking.pnr}</div>
        </div>

        <div className="border-t border-blue-200 pt-4 space-y-4">
          {/* Outbound Flight */}
          {booking.outboundFlight ? (
            <div className="bg-white rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Outbound Flight</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flight</span>
                  <span className="font-medium">{booking.outboundFlight.airline} {booking.outboundFlight.flightNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Route</span>
                  <span className="font-medium">{booking.outboundFlight.origin} → {booking.outboundFlight.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure</span>
                  <span className="font-medium">{formatDate(booking.outboundFlight.departTime)} • {formatTime(booking.outboundFlight.departTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Arrival</span>
                  <span className="font-medium">{formatTime(booking.outboundFlight.arriveTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{booking.outboundFlight.duration}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Flight</span>
                <span className="font-medium">{booking.airline} {booking.flightNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Route</span>
                <span className="font-medium">{booking.origin} → {booking.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Departure</span>
                <span className="font-medium">{formatDate(booking.departDate)} • {formatTime(booking.departDate)}</span>
              </div>
            </div>
          )}

          {/* Return Flight */}
          {booking.returnFlight && (
            <div className="bg-white rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Return Flight</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flight</span>
                  <span className="font-medium">{booking.returnFlight.airline} {booking.returnFlight.flightNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Route</span>
                  <span className="font-medium">{booking.returnFlight.origin} → {booking.returnFlight.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure</span>
                  <span className="font-medium">{formatDate(booking.returnFlight.departTime)} • {formatTime(booking.returnFlight.departTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Arrival</span>
                  <span className="font-medium">{formatTime(booking.returnFlight.arriveTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{booking.returnFlight.duration}</span>
                </div>
              </div>
            </div>
          )}

          {/* Passengers and Total */}
          <div className="pt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Passengers</span>
              <span className="font-medium">{booking.passengers.length}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
              <span>Total Paid</span>
              <span>${booking.totalPrice} {booking.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {booking.confirmationEmail && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <span className="mr-2 text-yellow-600">📧</span>
            <div className="text-sm">
              <div className="font-medium">Confirmation Email Sent</div>
              <div className="text-gray-600">
                A confirmation email has been sent to {booking.confirmationEmail}
              </div>
            </div>
          </div>
        </div>
      )}

      {onAddToTrip && (
        <div className="flex flex-col items-center space-y-3">
          {isAdded ? (
            <div className="flex items-center space-x-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Added to Trip Itinerary</span>
            </div>
          ) : (
            <button
              onClick={handleAddToTrip}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add to Trip Itinerary</span>
            </button>
          )}

          {isAdded && (
            <p className="text-sm text-gray-600 text-center">
              Your flight has been added to your trip itinerary. You can view and edit it in the itinerary panel.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 pt-6 border-t">
        <h3 className="font-semibold mb-3">Passenger Details</h3>
        <div className="space-y-3">
          {booking.passengers.map((passenger, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium">
                {passenger.firstName} {passenger.lastName}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                <div>Date of Birth: {new Date(passenger.dateOfBirth).toLocaleDateString()}</div>
                {passenger.passportNumber && (
                  <div>Passport: {passenger.passportNumber} ({passenger.passportCountry})</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
