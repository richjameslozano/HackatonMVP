import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { LoadingIndicator } from '../components/shared/LoadingIndicator';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleCallback = useAuthStore((s) => s.handleCallback);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarding = useAuthStore((s) => s.isOnboarding);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const code = searchParams.get('code');
  const hasHandled = useRef(false);

  // Exchange the code — only once, even in React strict mode
  useEffect(() => {
    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    if (hasHandled.current) return;
    hasHandled.current = true;

    void handleCallback(code);
  }, [code, handleCallback, navigate]);

  // Navigate based on auth store state after callback completes
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && !isOnboarding) {
      navigate('/quests', { replace: true });
    } else if (isOnboarding) {
      navigate('/onboarding', { replace: true });
    } else if (error) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isOnboarding, isLoading, error, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-100">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-madrid-700 mb-4">
          <span className="text-lg font-bold text-white">SP</span>
        </div>
        <LoadingIndicator size="lg" message="Signing you in..." />
      </div>
    </div>
  );
}
