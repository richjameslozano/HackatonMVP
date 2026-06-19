import { useEffect, useState } from 'react';

interface ConfirmationToastProps {
  message: string;
  type: 'success' | 'warning';
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

export function ConfirmationToast({ message, type, onDismiss }: ConfirmationToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // wait for fade-out animation
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const typeStyles =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-yellow-200 bg-yellow-50 text-yellow-800';

  const iconColor = type === 'success' ? 'text-green-500' : 'text-yellow-500';

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-md border px-4 py-3 shadow-lg transition-all duration-300 ${typeStyles} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      {type === 'success' ? (
        <svg className={`h-5 w-5 shrink-0 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className={`h-5 w-5 shrink-0 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <p className="text-sm font-medium">{message}</p>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className="ml-auto shrink-0 rounded p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}
