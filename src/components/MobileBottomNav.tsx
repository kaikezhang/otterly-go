import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Trips',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
      path: '/dashboard',
    },
    {
      id: 'new-trip',
      label: 'New Trip',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
      path: '/trip/new',
      highlighted: true,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      path: '/profile',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors ${
                active ? 'text-blue-600' : 'text-gray-600'
              } ${tab.highlighted ? 'relative' : ''}`}
            >
              {tab.highlighted ? (
                <div
                  className={`absolute -top-3 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-colors ${
                    active ? 'bg-blue-600' : 'bg-blue-500'
                  }`}
                >
                  <span className="text-white">{tab.icon}</span>
                </div>
              ) : (
                <>
                  <span className={active ? 'text-blue-600' : 'text-gray-600'}>{tab.icon}</span>
                  <span className={`text-xs mt-1 font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
