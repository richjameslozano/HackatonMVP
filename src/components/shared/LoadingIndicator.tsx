interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

export function LoadingIndicator({ size = 'md', message }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-4" role="status">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-gray-300 border-t-indigo-600`}
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
