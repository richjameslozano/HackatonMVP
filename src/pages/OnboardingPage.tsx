import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import type { Role } from '../types';

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  {
    value: 'agent',
    label: 'Agent',
    description: 'BPO operations — onboarding quests, daily tasks, and milestones',
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Tech team — sprint tasks, code reviews, and developer badges',
  },
];

export function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!selectedRole || isLoading) return;

    await completeOnboarding(selectedRole);

    // After completeOnboarding, check the latest store state
    const { isAuthenticated: authenticated, error: storeError } =
      useAuthStore.getState();

    if (authenticated && !storeError) {
      navigate('/quests');
    }
  };

  // If authenticated already (e.g. after successful onboarding on re-render), redirect
  if (isAuthenticated) {
    navigate('/quests');
    return null;
  }

  const isDisabled = selectedRole === null || isLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-surface-900">Welcome!</h1>
          <p className="mt-2 text-sm text-surface-500">
            Select your role to get started
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
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {/* Role selector */}
        <fieldset aria-label="Select your role">
          <legend className="sr-only">Select your role</legend>
          <div className="space-y-3">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = selectedRole === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                    isSelected
                      ? 'border-madrid-600 bg-madrid-50 ring-2 ring-madrid-200'
                      : 'border-surface-200 bg-white hover:border-surface-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSelectedRole(option.value)}
                    className="mt-0.5 h-4 w-4 text-madrid-600 focus:ring-madrid-500"
                    aria-label={`Select ${option.label} role`}
                  />
                  <div>
                    <span className="block text-sm font-semibold text-surface-900">
                      {option.label}
                    </span>
                    <span className="block text-xs text-surface-500">
                      {option.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDisabled}
          aria-label="Confirm role selection"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-madrid-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              Creating profile…
            </>
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  );
}
