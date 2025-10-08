import React, { useState } from 'react';
import type { Flight, Passenger } from '../types';
import { validateAllPassengers } from '../utils/passengerValidation';

interface BookingFormProps {
  flight: Flight;
  onSubmit: (passengers: Passenger[], contactEmail: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all passengers
    const validation = validateAllPassengers(passengers);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowValidationErrors(true);

      // Scroll to first error
      const firstErrorField = Object.keys(validation.errors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Validate email
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setValidationErrors({ contactEmail: 'Please enter a valid email address' });
      setShowValidationErrors(true);
      return;
    }

    // Clear errors and submit
    setValidationErrors({});
    setShowValidationErrors(false);
    onSubmit(passengers, contactEmail);
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);

    // Clear validation error for this field
    if (showValidationErrors) {
      const prefix = index > 0 ? `passenger${index}_` : '';
      const fieldKey = `${prefix}${field}`;
      if (validationErrors[fieldKey]) {
        const newErrors = { ...validationErrors };
        delete newErrors[fieldKey];
        setValidationErrors(newErrors);
      }
    }
  };

  const addPassenger = () => {
    setPassengers([
      ...passengers,
      {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        passportExpiry: '',
        passportCountry: '',
      },
    ]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length === 1) return; // Must have at least one passenger
    const updated = [...passengers];
    updated.splice(index, 1);
    setPassengers(updated);
  };

  const getFieldError = (passengerIndex: number, field: string): string | undefined => {
    if (!showValidationErrors) return undefined;
    const prefix = passengerIndex > 0 ? `passenger${passengerIndex}_` : '';
    const fieldKey = `${prefix}${field}`;
    return validationErrors[fieldKey];
  };

  const inputClassName = (hasError: boolean) =>
    `mt-1 w-full rounded-md shadow-sm ${
      hasError
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }`;

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
          {flight.airline} {flight.flightNumber} • {formatDate(flight.departTime)} • {formatTime(flight.departTime)}
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
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => {
              setContactEmail(e.target.value);
              if (showValidationErrors && validationErrors.contactEmail) {
                const newErrors = { ...validationErrors };
                delete newErrors.contactEmail;
                setValidationErrors(newErrors);
              }
            }}
            className={inputClassName(!!validationErrors.contactEmail)}
            placeholder="your.email@example.com"
            required
          />
          {validationErrors.contactEmail && showValidationErrors && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.contactEmail}</p>
          )}
        </div>

        {/* Passenger Details */}
        {passengers.map((passenger, idx) => (
          <div key={idx} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Passenger {idx + 1}</h3>
              {passengers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePassenger(idx)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  id={idx === 0 ? 'firstName' : `passenger${idx}_firstName`}
                  type="text"
                  value={passenger.firstName}
                  onChange={(e) => updatePassenger(idx, 'firstName', e.target.value)}
                  className={inputClassName(!!getFieldError(idx, 'firstName'))}
                  placeholder="As shown on passport"
                  required
                />
                {getFieldError(idx, 'firstName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'firstName')}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  id={idx === 0 ? 'lastName' : `passenger${idx}_lastName`}
                  type="text"
                  value={passenger.lastName}
                  onChange={(e) => updatePassenger(idx, 'lastName', e.target.value)}
                  className={inputClassName(!!getFieldError(idx, 'lastName'))}
                  placeholder="As shown on passport"
                  required
                />
                {getFieldError(idx, 'lastName') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'lastName')}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date of Birth *
                </label>
                <input
                  id={idx === 0 ? 'dateOfBirth' : `passenger${idx}_dateOfBirth`}
                  type="date"
                  value={passenger.dateOfBirth}
                  onChange={(e) => updatePassenger(idx, 'dateOfBirth', e.target.value)}
                  className={inputClassName(!!getFieldError(idx, 'dateOfBirth'))}
                  max={new Date().toISOString().split('T')[0]} // Can't be in future
                  required
                />
                {getFieldError(idx, 'dateOfBirth') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'dateOfBirth')}</p>
                )}
              </div>

              {/* Passport Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Passport Number
                </label>
                <input
                  id={idx === 0 ? 'passportNumber' : `passenger${idx}_passportNumber`}
                  type="text"
                  value={passenger.passportNumber}
                  onChange={(e) => updatePassenger(idx, 'passportNumber', e.target.value.toUpperCase())}
                  className={inputClassName(!!getFieldError(idx, 'passportNumber'))}
                  placeholder="A12345678"
                  maxLength={9}
                />
                {getFieldError(idx, 'passportNumber') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'passportNumber')}</p>
                )}
              </div>

              {/* Passport Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Passport Expiry
                </label>
                <input
                  id={idx === 0 ? 'passportExpiry' : `passenger${idx}_passportExpiry`}
                  type="date"
                  value={passenger.passportExpiry}
                  onChange={(e) => updatePassenger(idx, 'passportExpiry', e.target.value)}
                  className={inputClassName(!!getFieldError(idx, 'passportExpiry'))}
                  min={new Date().toISOString().split('T')[0]} // Can't be in past
                />
                {getFieldError(idx, 'passportExpiry') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'passportExpiry')}</p>
                )}
              </div>

              {/* Passport Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Passport Country
                </label>
                <input
                  id={idx === 0 ? 'passportCountry' : `passenger${idx}_passportCountry`}
                  type="text"
                  value={passenger.passportCountry}
                  onChange={(e) => updatePassenger(idx, 'passportCountry', e.target.value.toUpperCase())}
                  className={inputClassName(!!getFieldError(idx, 'passportCountry'))}
                  placeholder="US"
                  maxLength={2}
                />
                {getFieldError(idx, 'passportCountry') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError(idx, 'passportCountry')}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Passenger Button */}
        <button
          type="button"
          onClick={addPassenger}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Add Another Passenger</span>
        </button>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Booking...
              </span>
            ) : (
              `Confirm Booking - $${flight.price * passengers.length} ${flight.currency}`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
