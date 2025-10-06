import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkAuth = useStore((state) => state.checkAuth);
  const success = searchParams.get('success');

  useEffect(() => {
    async function handleCallback() {
      if (success === 'true') {
        // Check authentication status
        await checkAuth();
        // Redirect to home page
        navigate('/', { replace: true });
      } else {
        // Redirect to login with error
        navigate('/login?error=callback_failed', { replace: true });
      }
    }

    handleCallback();
  }, [success, checkAuth, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
        <p className="text-gray-700 font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}
