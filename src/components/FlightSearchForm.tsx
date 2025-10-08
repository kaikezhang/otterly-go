import React, { useState } from 'react';
import type { SearchCriteria } from '../types/index';

interface FlightSearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
  initialCriteria?: Partial<SearchCriteria>;
}

export function FlightSearchForm({ onSearch, isLoading, initialCriteria }: FlightSearchFormProps) {
  const [formData, setFormData] = useState<SearchCriteria>({
    origin: initialCriteria?.origin || '',
    destination: initialCriteria?.destination || '',
    departDate: initialCriteria?.departDate || '',
    returnDate: initialCriteria?.returnDate || '',
    passengers: initialCriteria?.passengers || 1,
    class: initialCriteria?.class || 'economy',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Search Flights</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From (IATA code)</label>
          <input
            type="text"
            maxLength={3}
            placeholder="e.g. JFK"
            value={formData.origin}
            onChange={(e) => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To (IATA code)</label>
          <input
            type="text"
            maxLength={3}
            placeholder="e.g. LAX"
            value={formData.destination}
            onChange={(e) => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Depart Date</label>
          <input
            type="date"
            value={formData.departDate}
            onChange={(e) => setFormData({ ...formData, departDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Return Date (Optional)</label>
          <input
            type="date"
            value={formData.returnDate}
            onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Passengers</label>
          <input
            type="number"
            min={1}
            max={9}
            value={formData.passengers}
            onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Class</label>
          <select
            value={formData.class}
            onChange={(e) => setFormData({ ...formData, class: e.target.value as any })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Searching...' : 'Search Flights'}
      </button>
    </form>
  );
}
