import { useEffect, useState } from 'react';
import { getCoinConfig, updateCoinConfig } from '../../services/coin.service';
import { validateCoinValue } from '../../utils/validation';
import type { CoinConfig } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FieldErrors {
  easy_coins?: string;
  medium_coins?: string;
  hard_coins?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CoinConfigPanel() {
  const [formValues, setFormValues] = useState<CoinConfig>({
    easy_coins: 1,
    medium_coins: 3,
    hard_coins: 5,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Fetch current config on mount ──────────────────────────────────────

  useEffect(() => {
    async function fetchConfig() {
      try {
        const config = await getCoinConfig();
        setFormValues(config);
      } catch {
        setErrorMessage('Failed to load coin configuration.');
      } finally {
        setIsLoading(false);
      }
    }
    void fetchConfig();
  }, []);

  // ─── Auto-dismiss success toast ─────────────────────────────────────────

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // ─── Validation ─────────────────────────────────────────────────────────

  function validateField(field: keyof CoinConfig, value: number): string | undefined {
    const result = validateCoinValue(value);
    return result.valid ? undefined : result.error;
  }

  function validateAll(): boolean {
    const errors: FieldErrors = {
      easy_coins: validateField('easy_coins', formValues.easy_coins),
      medium_coins: validateField('medium_coins', formValues.medium_coins),
      hard_coins: validateField('hard_coins', formValues.hard_coins),
    };

    // Remove undefined entries
    const cleanErrors: FieldErrors = {};
    if (errors.easy_coins) cleanErrors.easy_coins = errors.easy_coins;
    if (errors.medium_coins) cleanErrors.medium_coins = errors.medium_coins;
    if (errors.hard_coins) cleanErrors.hard_coins = errors.hard_coins;

    setFieldErrors(cleanErrors);
    return Object.keys(cleanErrors).length === 0;
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleChange(field: keyof CoinConfig, rawValue: string) {
    const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    const value = isNaN(numValue) ? 0 : numValue;

    setFormValues((prev) => ({ ...prev, [field]: value }));

    // Validate on change
    const error = validateField(field, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });

    // Clear error banner when user starts editing
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!validateAll()) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateCoinConfig(formValues);
      setSuccessMessage('Coin values updated successfully.');
    } catch {
      // Retain form values on failure
      setErrorMessage('Failed to save coin configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-madrid-500 border-t-transparent" />
        <span className="ml-2 text-sm text-gray-500">Loading coin configuration...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900">Coin Configuration</h2>
      <p className="mt-1 text-sm text-gray-500">
        Set the number of coins awarded for each difficulty level.
      </p>

      {/* Success Toast */}
      {successMessage && (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <svg
            className="h-5 w-5 shrink-0 text-green-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm font-medium text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
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
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="mt-6 space-y-5">
        {/* Easy Coins */}
        <div>
          <label htmlFor="easy_coins" className="block text-sm font-medium text-gray-700">
            Easy Quest Coins
          </label>
          <input
            id="easy_coins"
            type="number"
            min={1}
            max={10000}
            value={formValues.easy_coins}
            onChange={(e) => handleChange('easy_coins', e.target.value)}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 ${
              fieldErrors.easy_coins
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            aria-invalid={!!fieldErrors.easy_coins}
            aria-describedby={fieldErrors.easy_coins ? 'easy_coins-error' : undefined}
          />
          {fieldErrors.easy_coins && (
            <p id="easy_coins-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.easy_coins}
            </p>
          )}
        </div>

        {/* Medium Coins */}
        <div>
          <label htmlFor="medium_coins" className="block text-sm font-medium text-gray-700">
            Medium Quest Coins
          </label>
          <input
            id="medium_coins"
            type="number"
            min={1}
            max={10000}
            value={formValues.medium_coins}
            onChange={(e) => handleChange('medium_coins', e.target.value)}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 ${
              fieldErrors.medium_coins
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            aria-invalid={!!fieldErrors.medium_coins}
            aria-describedby={fieldErrors.medium_coins ? 'medium_coins-error' : undefined}
          />
          {fieldErrors.medium_coins && (
            <p id="medium_coins-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.medium_coins}
            </p>
          )}
        </div>

        {/* Hard Coins */}
        <div>
          <label htmlFor="hard_coins" className="block text-sm font-medium text-gray-700">
            Hard Quest Coins
          </label>
          <input
            id="hard_coins"
            type="number"
            min={1}
            max={10000}
            value={formValues.hard_coins}
            onChange={(e) => handleChange('hard_coins', e.target.value)}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-madrid-500 ${
              fieldErrors.hard_coins
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300'
            }`}
            aria-invalid={!!fieldErrors.hard_coins}
            aria-describedby={fieldErrors.hard_coins ? 'hard_coins-error' : undefined}
          />
          {fieldErrors.hard_coins && (
            <p id="hard_coins-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.hard_coins}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-lg bg-madrid-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
}
