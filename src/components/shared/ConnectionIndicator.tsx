import type { ConnectionState } from '../../types/realtime';

interface ConnectionIndicatorProps {
  state: ConnectionState;
  onRetry?: () => void;
}

const stateConfig: Record<ConnectionState, { dotClass: string; label: string }> = {
  connecting: { dotClass: 'bg-yellow-400', label: 'Connecting...' },
  connected: { dotClass: 'bg-green-500', label: 'Live' },
  disconnected: { dotClass: 'bg-red-500', label: 'Disconnected' },
  reconnecting: { dotClass: 'bg-yellow-400', label: 'Reconnecting...' },
  failed: { dotClass: 'bg-red-500', label: 'Disconnected' },
};

export function ConnectionIndicator({ state, onRetry }: ConnectionIndicatorProps) {
  const { dotClass, label } = stateConfig[state];
  const showRefresh = state === 'failed';

  return (
    <div
      className="flex items-center gap-2 text-sm"
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span className="text-surface-600">{label}</span>
      {showRefresh && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded px-2 py-0.5 text-xs font-medium text-madrid-600 hover:bg-madrid-50 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-1"
          aria-label="Retry connection"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
