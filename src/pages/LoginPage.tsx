import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* App title / logo area */}
        <div>
          <h1 className="text-3xl font-bold text-surface-900">SP Madrid Tracker</h1>
          <p className="mt-2 text-sm text-surface-500">
            Gamified onboarding &amp; task tracking
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <svg
              className="h-5 w-5 shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="ml-auto shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {/* Sign in button */}
        <button
          type="button"
          onClick={login}
          disabled={isLoading}
          aria-label="Sign in with Lark"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-madrid-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              Signing in…
            </>
          ) : (
            'Sign in with Lark'
          )}
        </button>
      </div>
    </div>
  );
}
