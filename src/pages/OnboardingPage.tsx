import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import type { Role } from '../types';

const ROLE_OPTIONS: { value: Role; label: string; description: string; icon: string; number: string }[] = [
  {
    value: 'agent',
    label: 'Agent',
    description: 'BPO operations — onboarding quests, daily tasks, and milestones. Focus on efficiency and client delivery.',
    icon: 'support_agent',
    number: '01',
  },
  {
    value: 'developer',
    label: 'Developer',
    description: 'Tech team — sprint tasks, code reviews, and developer badges. Architect the future of the platform.',
    icon: 'terminal',
    number: '02',
  },
];

export function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnboarding = useAuthStore((s) => s.isOnboarding);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const navigate = useNavigate();

  // On mount, restore session to check if user is already registered
  useEffect(() => {
    if (!isAuthenticated && !hasCheckedSession) {
      restoreSession().finally(() => {
        setHasCheckedSession(true);
      });
    } else {
      setHasCheckedSession(true);
    }
  }, [isAuthenticated, hasCheckedSession, restoreSession]);

  // Redirect authenticated (already-registered) users to the main app
  useEffect(() => {
    if (hasCheckedSession && isAuthenticated && !isOnboarding) {
      navigate('/quests', { replace: true });
    }
  }, [hasCheckedSession, isAuthenticated, isOnboarding, navigate]);

  const handleConfirm = async () => {
    if (!selectedRole || isLoading) return;

    await completeOnboarding(selectedRole);

    const { isAuthenticated: authenticated, error: storeError } =
      useAuthStore.getState();

    if (authenticated && !storeError) {
      navigate('/quests');
    }
  };

  // Show loading while checking session
  if (!hasCheckedSession || isLoading && !selectedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e10]">
        <div className="text-center">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#3c494e] border-t-[#00d4ff]"
            aria-label="Loading"
          />
          <p className="mt-4 text-sm text-[#bbc9cf]">Checking session…</p>
        </div>
      </div>
    );
  }

  const isDisabled = selectedRole === null || isLoading;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0e0e10] text-[#e5e1e4]">
      {/* Scanline */}
      <div
        className="fixed inset-0 pointer-events-none z-[5]"
        style={{
          width: '100%',
          height: '100px',
          background: 'linear-gradient(0deg, rgba(0,212,255,0) 0%, rgba(0,212,255,0.05) 50%, rgba(0,212,255,0) 100%)',
          opacity: 0.1,
          position: 'absolute',
          animation: 'scanline 8s linear infinite',
        }}
      />

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-16 py-12">
        {/* Header */}
        <header className="text-center mb-12 space-y-4 max-w-2xl">
          <div className="inline-block px-4 py-1 border border-[rgba(60,215,255,0.3)] bg-[rgba(60,215,255,0.05)] rounded-full mb-4">
            <span className="font-mono text-[12px] text-[#3cd7ff] uppercase tracking-[0.2em]">
              Deployment Phase 01
            </span>
          </div>
          <h1 className="font-headline text-[32px] md:text-[48px] font-bold tracking-tighter leading-tight">
            Welcome<span className="text-[#00d4ff]">!</span>
          </h1>
          <p className="text-lg text-[#bbc9cf]">
            Select your role to get started
          </p>
        </header>

        {/* Error message */}
        {error && (
          <div
            className="w-full max-w-5xl mb-6 flex items-center gap-2 rounded-lg border border-[#93000a]/50 bg-[#93000a]/10 px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <span className="material-symbols-outlined text-[#ffb4ab] text-lg">error</span>
            <p className="text-sm text-[#ffb4ab] flex-1">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="ml-auto shrink-0 text-[#ffb4ab] hover:text-white transition-colors"
              aria-label="Dismiss error"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Role selection grid */}
        <fieldset aria-label="Select your role" className="w-full max-w-5xl">
          <legend className="sr-only">Select your role</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ROLE_OPTIONS.map((option) => {
              const isSelected = selectedRole === option.value;
              return (
                <div
                  key={option.value}
                  onClick={() => setSelectedRole(option.value)}
                  className={`group relative flex flex-col justify-between p-8 bg-[#201f21] border transition-all duration-300 cursor-pointer ${isSelected
                      ? 'border-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.4)] bg-[rgba(0,212,255,0.03)]'
                      : 'border-[#3c494e]/30 hover:shadow-[0_0_25px_rgba(0,212,255,0.15)] hover:border-[rgba(0,212,255,0.5)]'
                    }`}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Select ${option.label} role`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedRole(option.value); }}
                >
                  {/* Number label */}
                  <div className="absolute top-0 right-0 p-4">
                    <span className={`font-mono text-[12px] ${isSelected ? 'text-[#3cd7ff]' : 'text-[#3c494e]/50'}`}>
                      {option.number}
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 flex items-center justify-center border ${isSelected
                        ? 'bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.3)]'
                        : 'bg-[#353437]/50 border-[#3c494e]/20'
                      }`}>
                      <span
                        className={`material-symbols-outlined text-[32px] transition-colors ${isSelected ? 'text-[#3cd7ff]' : 'text-[#bbc9cf] group-hover:text-[#3cd7ff]'
                          }`}
                        style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {option.icon}
                      </span>
                    </div>

                    {/* Title + description */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-headline text-2xl font-semibold">{option.label}</h3>
                        {option.value === 'developer' && (
                          <span className="px-2 py-0.5 bg-[#00d4ff] text-[#003642] text-[10px] font-bold uppercase tracking-tight">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-base text-[#bbc9cf] leading-relaxed">{option.description}</p>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div className="mt-12 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#00d4ff]' : 'border-[#3c494e]'
                        }`}>
                        <div className={`w-2.5 h-2.5 rounded-full bg-[#00d4ff] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'
                          }`} />
                      </div>
                      <span className={`font-mono text-[12px] uppercase tracking-wider ${isSelected ? 'text-[#3cd7ff]' : 'text-[#bbc9cf]'
                        }`}>
                        {isSelected ? 'Active Choice' : 'Select Role'}
                      </span>
                    </div>
                    <div className={`h-1 transition-all ${isSelected ? 'w-12 bg-[#00d4ff]' : 'w-8 bg-[#3c494e]/20'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* Action footer */}
        <footer className="mt-16 w-full max-w-5xl flex flex-col items-center space-y-6">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDisabled}
            aria-label="Confirm role selection"
            className="group relative w-full md:w-64 h-14 bg-[#00d4ff] text-[#003642] font-bold overflow-hidden transition-all duration-300 hover:brightness-110 active:scale-[0.98] shadow-[0_0_15px_rgba(0,212,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="relative z-10 flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#003642]/30 border-t-[#003642]" />
                Creating profile…
              </span>
            ) : (
              <>
                <span className="relative z-10 font-headline text-xl tracking-tight">Confirm Selection</span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </>
            )}
          </button>
        </footer>
      </main>
    </div>
  );
}
