import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Dashboard } from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import EmailImport from './pages/EmailImport';
import { SharedTrip } from './pages/SharedTrip';
import AdminDashboard from './pages/AdminDashboard';
import { NotFound } from './pages/NotFound';
import { ErrorBoundary } from './components/ErrorBoundary';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  const isAuthLoading = useStore((state) => state.isAuthLoading);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Save the current location to redirect back after login
    const returnUrl = window.location.pathname + window.location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  return <>{children}</>;
}

// Admin route wrapper (only for admin users)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((state) => state.user);
  const isAuthLoading = useStore((state) => state.isAuthLoading);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Auth checker component
function AuthChecker({ children }: { children: React.ReactNode }) {
  const checkAuth = useStore((state) => state.checkAuth);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Redirect after login
  useEffect(() => {
    if (user && window.location.pathname === '/login') {
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl');

      if (returnUrl) {
        // Redirect to the original destination
        navigate(returnUrl, { replace: true });
      } else {
        // Default redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthChecker>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/share/:token" element={<SharedTrip />} />

            {/* Redirect root to dashboard */}
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* Dashboard - list all trips */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Create new trip */}
            <Route
              path="/trip/new"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* View/edit specific trip */}
            <Route
              path="/trip/:id"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* User profile */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Email import */}
            <Route
              path="/email-import"
              element={
                <ProtectedRoute>
                  <EmailImport />
                </ProtectedRoute>
              }
            />

            {/* Admin dashboard */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* 404 - Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthChecker>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
