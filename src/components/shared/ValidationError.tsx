interface ValidationErrorProps {
  message?: string;
}

export function ValidationError({ message }: ValidationErrorProps) {
  if (!message) return null;

  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}
