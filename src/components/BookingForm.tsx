import React, { useState } from 'react';
import type { Flight, Passenger } from '../types';

interface BookingFormProps {
  flight: Flight;
  onSubmit: (passengers: Passenger[], contactEmail: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function BookingForm({ flight, onSubmit, onCancel, isLoading }: BookingFormProps) {
  const [contactEmail, setContactEmail] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      passportNumber: '',
      passportExpiry: '',
      passportCountry: '',
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(passengers, contactEmail);
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Passenger Information</h2>

      {/* Flight Summary */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Selected Flight</div>
        <div className="font-semibold">
          {flight.origin} → {flight.destination}
        </div>
        <div className="text-sm text-gray-600">
          {flight.airline} {flight.flightNumber} • {flight.departTime}
        </div>
        <div className="text-lg font-bold mt-2">${flight.price} {flight.currency}</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        {/* Passenger Details */}
        {passengers.map((passenger, idx) => (
          <div key={idx} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Passenger {idx + 1}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={passenger.firstName}
                  onChange={(e) => updatePassenger(idx, 'firstName', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={passenger.lastName}
                  onChange={(e) => updatePassenger(idx, 'lastName', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                <input
                  type="date"
                  value={passenger.dateOfBirth}
                  onChange={(e) => updatePassenger(idx, 'dateOfBirth', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Number</label>
                <input
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Expiry</label>
                <input
                  type="date"
                  value={passenger.passportExpiry}
                  onChange={(e) => updatePassenger(idx, 'passportExpiry', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Passport Country</label>
                <input
                  type="text"
                  value={passenger.passportCountry}
                  onChange={(e) => updatePassenger(idx, 'passportCountry', e.target.value)}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="e.g. US"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
