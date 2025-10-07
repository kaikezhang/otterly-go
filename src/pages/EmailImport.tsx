/**
 * Email Import Page (Milestone 5.1)
 * Connect Gmail/Outlook, manually upload emails, and manage parsed bookings
 */

import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Mail, Upload, Check, X, AlertCircle, RefreshCw, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface EmailConnection {
  connected: boolean;
  email?: string;
  status?: string;
  lastSyncedAt?: string;
  syncEnabled?: boolean;
}

interface ParsedBooking {
  id: string;
  bookingType: string;
  title: string;
  description?: string;
  confirmationNumber?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
  status: string;
  confidence: number;
  conflictDetected: boolean;
  source: string;
  parsedDataJson: any;
  createdAt: string;
}

export default function EmailImport() {
  const user = useStore((state) => state.user);

  // Connection status
  const [gmailStatus, setGmailStatus] = useState<EmailConnection>({ connected: false });
  const [outlookStatus, setOutlookStatus] = useState<EmailConnection>({ connected: false });

  // Bookings list
  const [bookings, setBookings] = useState<ParsedBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Manual upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Scanning status
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Trips for dropdown
  const [trips, setTrips] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (user) {
      fetchConnectionStatus();
      fetchBookings();
      fetchTrips();
    }
  }, [user]);

  const fetchConnectionStatus = async () => {
    try {
      const [gmailRes, outlookRes] = await Promise.all([
        fetch(`${API_URL}/api/email-import/gmail/status`, { credentials: 'include' }),
        fetch(`${API_URL}/api/email-import/outlook/status`, { credentials: 'include' }),
      ]);

      if (gmailRes.ok) setGmailStatus(await gmailRes.json());
      if (outlookRes.ok) setOutlookStatus(await outlookRes.json());
    } catch (error) {
      console.error('Failed to fetch connection status:', error);
    }
  };

  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const response = await fetch(`${API_URL}/api/email-import/bookings`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trips`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips.map((t: any) => ({ id: t.id, title: t.title })));
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    }
  };

  const connectGmail = async () => {
    try {
      const response = await fetch(`${API_URL}/api/email-import/gmail/auth`, {
        credentials: 'include',
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Gmail OAuth:', error);
    }
  };

  const connectOutlook = async () => {
    try {
      const response = await fetch(`${API_URL}/api/email-import/outlook/auth`, {
        credentials: 'include',
      });

      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Failed to initiate Outlook OAuth:', error);
    }
  };

  const scanInbox = async (provider: 'gmail' | 'outlook') => {
    setIsScanning(true);
    setScanMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/email-import/${provider}/scan`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setScanMessage(`Scanned ${data.scannedCount} emails, found ${data.parsedCount} bookings`);
        fetchBookings(); // Reload bookings
      } else {
        throw new Error('Scan failed');
      }
    } catch (error) {
      setScanMessage('Failed to scan inbox');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/email-import/upload-pdf`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUploadSuccess(`Successfully parsed: ${data.booking.title}`);
          fetchBookings();
        } else {
          setUploadError(data.message || 'Could not extract booking information');
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadError('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const addBookingToTrip = async (bookingId: string, tripId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/email-import/bookings/${bookingId}/add-to-trip`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ tripId }),
        }
      );

      if (response.ok) {
        fetchBookings(); // Reload to update status
      }
    } catch (error) {
      console.error('Failed to add booking to trip:', error);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/email-import/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchBookings();
      }
    } catch (error) {
      console.error('Failed to delete booking:', error);
    }
  };

  const getBookingTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      flight: 'bg-blue-100 text-blue-800',
      hotel: 'bg-purple-100 text-purple-800',
      car_rental: 'bg-green-100 text-green-800',
      restaurant: 'bg-orange-100 text-orange-800',
      activity: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-600">Please log in to access email import features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Email Import</h1>

      {/* Gmail & Outlook Connection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Gmail */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Gmail</h2>
            {gmailStatus.connected ? (
              <Check className="w-6 h-6 text-green-500" />
            ) : (
              <X className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {gmailStatus.connected ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Connected: <span className="font-medium">{gmailStatus.email}</span>
              </p>
              {gmailStatus.lastSyncedAt && (
                <p className="text-xs text-gray-500 mb-4">
                  Last synced: {new Date(gmailStatus.lastSyncedAt).toLocaleString()}
                </p>
              )}
              <button
                onClick={() => scanInbox('gmail')}
                disabled={isScanning}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                Scan Inbox
              </button>
            </div>
          ) : (
            <button
              onClick={connectGmail}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
          )}
        </div>

        {/* Outlook */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Outlook</h2>
            {outlookStatus.connected ? (
              <Check className="w-6 h-6 text-green-500" />
            ) : (
              <X className="w-6 h-6 text-gray-400" />
            )}
          </div>

          {outlookStatus.connected ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Connected: <span className="font-medium">{outlookStatus.email}</span>
              </p>
              {outlookStatus.lastSyncedAt && (
                <p className="text-xs text-gray-500 mb-4">
                  Last synced: {new Date(outlookStatus.lastSyncedAt).toLocaleString()}
                </p>
              )}
              <button
                onClick={() => scanInbox('outlook')}
                disabled={isScanning}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                Scan Inbox
              </button>
            </div>
          ) : (
            <button
              onClick={connectOutlook}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Connect Outlook
            </button>
          )}
        </div>
      </div>

      {/* Scan Message */}
      {scanMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">{scanMessage}</p>
        </div>
      )}

      {/* Manual Upload */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Manual Upload</h2>
        <p className="text-gray-600 mb-4">
          Upload a confirmation email (PDF, HTML, or TXT) to extract booking information
        </p>

        <input
          type="file"
          accept=".pdf,.html,.txt"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {isUploading && <p className="text-gray-600 mt-2">Uploading...</p>}
        {uploadError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{uploadError}</p>
          </div>
        )}
        {uploadSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{uploadSuccess}</p>
          </div>
        )}
      </div>

      {/* Parsed Bookings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Parsed Bookings</h2>
          <button
            onClick={fetchBookings}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {isLoadingBookings ? (
          <p className="text-gray-600">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-600">No bookings found. Connect an email account or upload a booking email to get started.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getBookingTypeColor(booking.bookingType)}`}
                      >
                        {booking.bookingType.replace('_', ' ').toUpperCase()}
                      </span>
                      {booking.status === 'added_to_trip' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Added
                        </span>
                      )}
                      {booking.conflictDetected && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Conflict
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg">{booking.title}</h3>
                    {booking.description && (
                      <p className="text-sm text-gray-600 mt-1">{booking.description}</p>
                    )}

                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {booking.confirmationNumber && (
                        <p>Confirmation: {booking.confirmationNumber}</p>
                      )}
                      {booking.startDateTime && (
                        <p>
                          {new Date(booking.startDateTime).toLocaleString()}
                          {booking.endDateTime &&
                            ` - ${new Date(booking.endDateTime).toLocaleString()}`}
                        </p>
                      )}
                      {booking.location && <p>Location: {booking.location}</p>}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Confidence: {(booking.confidence * 100).toFixed(0)}% • Source:{' '}
                      {booking.source}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {booking.status !== 'added_to_trip' && trips.length > 0 && (
                      <select
                        onChange={(e) => addBookingToTrip(booking.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Add to trip...
                        </option>
                        {trips.map((trip) => (
                          <option key={trip.id} value={trip.id}>
                            {trip.title}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => deleteBooking(booking.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
