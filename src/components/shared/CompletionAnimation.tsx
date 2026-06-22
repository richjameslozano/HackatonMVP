import { useEffect, useState } from 'react';

interface CompletionAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

const ANIMATION_DURATION_MS = 1500;

export function CompletionAnimation({ visible, onComplete }: CompletionAnimationProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        onComplete?.();
      }, ANIMATION_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible && !animating) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className={`flex flex-col items-center gap-2 ${animating ? 'animate-completion' : ''}`}>
        <svg
          className="h-20 w-20 text-[#00d4ff]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 12px rgba(0, 212, 255, 0.6))' }}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span className="text-lg font-semibold text-[#3cd7ff]">Quest Complete!</span>
      </div>
    </div>
  );
}
