import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Profile() {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const logout = useStore((state) => state.logout);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [customName, setCustomName] = useState(user?.customName || user?.name || '');
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotifications ?? true
  );
  const [tripReminders, setTripReminders] = useState(user?.tripReminders ?? true);
  const [publicProfile, setPublicProfile] = useState(user?.publicProfile ?? false);

  if (!user) {
    return null;
  }

  const displayName = user.customName || user.name;
  const displayPicture = user.customPicture || user.picture;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customName: customName !== user.name ? customName : null,
          emailNotifications,
          tripReminders,
          publicProfile,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/user/account`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Account deleted, redirect to login
      await logout();
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomName(user.customName || user.name || '');
    setEmailNotifications(user.emailNotifications ?? true);
    setTripReminders(user.tripReminders ?? true);
    setPublicProfile(user.publicProfile ?? false);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </button>
            <h1 className="text-xl font-bold text-gray-900">Profile & Settings</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
          </div>
          <div className="px-6 py-5">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0">
                {displayPicture ? (
                  <img
                    src={displayPicture}
                    alt={displayName || 'User'}
                    className="w-20 h-20 rounded-full border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {(displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p className="text-gray-900">{displayName || 'Not set'}</p>
                  )}
                  {!isEditing && user.customName && (
                    <p className="text-xs text-gray-500 mt-1">
                      Override of Google name: {user.name}
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription
                  </label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {user.subscriptionTier === 'free' ? 'Free' : 'Premium'}
                  </span>
                </div>
              </div>
            </div>

            {/* Google Account Info */}
            {user.googleId && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Connected Account
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Connected with Google</span>
                </div>
              </div>
            )}

            {/* Edit/Save Buttons */}
            <div className="mt-6 flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Notification Preferences
            </h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive updates and news via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => {
                    setEmailNotifications(e.target.checked);
                    if (!isEditing) setIsEditing(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Trip Reminders</p>
                <p className="text-sm text-gray-500">
                  Get reminders about upcoming trips
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tripReminders}
                  onChange={(e) => {
                    setTripReminders(e.target.checked);
                    if (!isEditing) setIsEditing(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Public Profile</p>
                <p className="text-sm text-gray-500">
                  Allow others to discover your profile (for future social features)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => {
                    setPublicProfile(e.target.checked);
                    if (!isEditing) setIsEditing(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-red-200 bg-red-50">
            <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          </div>
          <div className="px-6 py-5">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Permanently delete your account and all associated data including trips
                and conversations. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Account
                </button>
              ) : (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <p className="text-sm font-medium text-red-900 mb-3">
                    Are you absolutely sure? This action is permanent and cannot be
                    undone.
                  </p>
                  <p className="text-sm text-red-800 mb-3">
                    Type <strong>DELETE</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                        setError(null);
                      }}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
