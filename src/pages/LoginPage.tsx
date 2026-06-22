import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const gridRef = useRef<HTMLDivElement>(null);

  // Subtle mouse parallax on terminal grid
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!gridRef.current) return;
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      gridRef.current.style.backgroundPosition = `${x * 10}px ${y * 10}px`;
    }
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#131315] text-[#e5e1e4]">
      {/* Terminal grid background */}
      <div
        ref={gridRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(60, 215, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-[#131315]/50 to-[#131315] pointer-events-none z-0" />

      {/* Scanline */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to right, transparent, #00d4ff, transparent)',
          height: '2px',
          width: '100%',
          animation: 'scan 4s linear infinite',
          opacity: 0.2,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Ambient spinning circles */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none overflow-hidden">
        <div className="relative w-[800px] h-[800px]">
          <div className="absolute inset-0 border border-[rgba(60,215,255,0.2)] rounded-full animate-[spin_60s_linear_infinite]" />
          <div className="absolute inset-20 border border-[rgba(60,215,255,0.1)] rounded-full animate-[spin_45s_linear_infinite_reverse]" />
          <div className="absolute inset-40 border border-[rgba(60,215,255,0.3)] rounded-full animate-[spin_30s_linear_infinite]" />
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[rgba(60,215,255,0.1)]" />
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-[rgba(60,215,255,0.1)]" />
        </div>
      </div>

      {/* Main content */}
      <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-5 md:px-16">
        <div className="relative max-w-2xl w-full flex flex-col items-center text-center space-y-12">

          {/* Logo and branding */}
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[#00d4ff] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                <span className="material-symbols-outlined text-4xl text-[#00d4ff]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  terminal
                </span>
              </div>
            </div>

            <h1 className="font-headline text-[32px] md:text-[48px] font-bold tracking-tighter leading-tight">
              SP <span className="text-[#00d4ff]">Madrid</span> Tracker
            </h1>
            <p className="text-lg text-[#bbc9cf] max-w-md mx-auto">
              Gamified onboarding &amp; task tracking
            </p>
          </div>

          {/* Action block */}
          <div className="w-full max-w-sm space-y-8">
            {/* Error message */}
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg border border-[#93000a]/50 bg-[#93000a]/10 px-4 py-3"
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

            {/* Sign in button with decorative corners */}
            <div className="relative group">
              <button
                type="button"
                onClick={login}
                disabled={isLoading}
                aria-label="Sign in with Lark"
                className="w-full py-5 bg-[#00d4ff] text-[#001f27] font-headline text-xl font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center gap-4 relative overflow-hidden hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#001f27]/30 border-t-[#001f27]" />
                    <span className="relative z-10">Signing in…</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Sign in with Lark</span>
                    <span className="material-symbols-outlined relative z-10 transition-transform group-hover:translate-x-1">
                      login
                    </span>
                  </>
                )}
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>

              {/* Corner brackets */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#00d4ff]" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#00d4ff]" />
            </div>

            {/* Footer links */}
            <div className="flex items-center justify-between font-mono text-[12px] uppercase tracking-wider text-[#859398] px-2">
              <div className="flex items-center gap-2 hover:text-[#00d4ff] cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Secure Auth</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#00d4ff] cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[14px]">help</span>
                <span>Need Access?</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-8 w-full px-16 flex justify-between items-center opacity-30 pointer-events-none">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">© 2024 SP MADRID_CORP</span>
          <div className="flex gap-4">
            <span className="font-mono text-[10px] uppercase">Privacy_Protocol</span>
            <span className="font-mono text-[10px] uppercase">Service_Terms</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
