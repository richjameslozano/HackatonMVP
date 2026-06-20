import { useEffect, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

/**
 * AuthGuard wraps protected routes.
 * - On mount, calls restoreSession() if not already authenticated
 * - Redirects to /login if unauthenticated and not loading
 * - Redirects to /onboarding if isOnboarding is true
 * - Renders <Outlet /> when authenticated
 */
export function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isOnboarding = useAuthStore((s) => s.isOnboarding);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !isOnboarding && !hasAttemptedRestore.current) {
      hasAttemptedRestore.current = true;
      void restoreSession();
    }
  }, [isAuthenticated, isLoading, isOnboarding, restoreSession]);

  // Show loading spinner while session is being restored
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="text-center">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-surface-200 border-t-madrid-600"
            aria-label="Loading"
          />
          <p className="mt-4 text-sm text-surface-500">Restoring session…</p>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if user needs to select a role
  if (isOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render nested protected routes
  return <Outlet />;
}
