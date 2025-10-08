import React from 'react';
import type { Booking } from '../types';

interface BookingConfirmationProps {
  booking: Booking;
  onAddToTrip?: () => void;
}

export function BookingConfirmation({ booking, onAddToTrip }: BookingConfirmationProps) {
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

        <div className="border-t border-blue-200 pt-4 space-y-2">
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
            <span className="font-medium">{new Date(booking.departDate).toLocaleDateString()}</span>
          </div>
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

      {onAddToTrip && (
        <div className="flex justify-center">
          <button
            onClick={onAddToTrip}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add to Trip Itinerary
          </button>
        </div>
      )}
    </div>
  );
}
