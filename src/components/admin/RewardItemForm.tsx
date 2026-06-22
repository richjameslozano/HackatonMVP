import { useState, useEffect } from 'react';
import {
  validateRewardItemTitle,
  validateRewardItemDescription,
  validateRewardItemCost,
  validateImageUrl,
  validateStockQuantity,
} from '../../utils/validation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RewardItemFormValues {
  title: string;
  description: string;
  cost: number;
  imageUrl: string;
  stockQuantity: number;
}

export interface RewardItemFormProps {
  initialValues?: RewardItemFormValues;
  onSubmit: (values: RewardItemFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
  mode: 'create' | 'edit';
}

interface FieldErrors {
  title?: string;
  description?: string;
  cost?: string;
  imageUrl?: string;
  stockQuantity?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RewardItemForm({ initialValues, onSubmit, onCancel, isLoading, error, mode }: RewardItemFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [cost, setCost] = useState<string>(initialValues?.cost != null ? String(initialValues.cost) : '');
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? '');
  const [stockQuantity, setStockQuantity] = useState<string>(
    initialValues?.stockQuantity != null && initialValues.stockQuantity !== -1
      ? String(initialValues.stockQuantity)
      : ''
  );
  const [unlimited, setUnlimited] = useState(initialValues?.stockQuantity === -1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // ─── Sync initial values for edit mode ──────────────────────────────────

  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title);
      setDescription(initialValues.description);
      setCost(String(initialValues.cost));
      setImageUrl(initialValues.imageUrl);
      setUnlimited(initialValues.stockQuantity === -1);
      setStockQuantity(initialValues.stockQuantity !== -1 ? String(initialValues.stockQuantity) : '');
    }
  }, [initialValues]);

  // ─── Validation helpers ─────────────────────────────────────────────────

  function validateField(field: string): string | undefined {
    switch (field) {
      case 'title': {
        const result = validateRewardItemTitle(title);
        return result.valid ? undefined : result.error;
      }
      case 'description': {
        const result = validateRewardItemDescription(description);
        return result.valid ? undefined : result.error;
      }
      case 'cost': {
        const numericCost = cost === '' ? NaN : Number(cost);
        const result = validateRewardItemCost(numericCost);
        return result.valid ? undefined : result.error;
      }
      case 'imageUrl': {
        const result = validateImageUrl(imageUrl);
        return result.valid ? undefined : result.error;
      }
      case 'stockQuantity': {
        if (unlimited) return undefined;
        const numericStock = stockQuantity === '' ? NaN : Number(stockQuantity);
        const result = validateStockQuantity(numericStock);
        return result.valid ? undefined : result.error;
      }
      default:
        return undefined;
    }
  }

  function handleBlur(field: string) {
    setTouched((prev) => new Set(prev).add(field));
    const error = validateField(field);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  }

  function validateAll(): boolean {
    const errors: FieldErrors = {};
    const fields = ['title', 'description', 'cost', 'imageUrl', 'stockQuantity'] as const;

    for (const field of fields) {
      const err = validateField(field);
      if (err) errors[field] = err;
    }

    setFieldErrors(errors);
    setTouched(new Set(fields));
    return Object.keys(errors).length === 0;
  }

  // ─── Submit handler ─────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    const values: RewardItemFormValues = {
      title: title.trim(),
      description,
      cost: Number(cost),
      imageUrl,
      stockQuantity: unlimited ? -1 : Number(stockQuantity),
    };

    await onSubmit(values);
  }

  // ─── Input class helper ─────────────────────────────────────────────────

  function inputClass(field: string): string {
    const hasError = touched.has(field) && fieldErrors[field as keyof FieldErrors];
    return `mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] bg-[#201f21] focus:outline-none focus:ring-2 focus:border-[#00d4ff] focus:ring-[#00d4ff] ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-[#3c494e]'
      }`;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold text-[#e5e1e4]">
        {mode === 'create' ? 'Create Reward Item' : 'Edit Reward Item'}
      </h2>
      <p className="mt-1 text-sm text-[#859398]">
        {mode === 'create'
          ? 'Add a new item to the reward store catalog.'
          : 'Update the reward item details.'}
      </p>

      {/* API Error Banner */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/30 px-4 py-3" role="alert">
          <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Title */}
        <div>
          <label htmlFor="reward-title" className="block text-sm font-medium text-[#bbc9cf]">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="reward-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            onBlur={() => handleBlur('title')}
            className={inputClass('title')}
            aria-invalid={!!(touched.has('title') && fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'reward-title-error' : undefined}
          />
          {touched.has('title') && fieldErrors.title && (
            <p id="reward-title-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="reward-description" className="block text-sm font-medium text-[#bbc9cf]">
            Description
          </label>
          <textarea
            id="reward-description"
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
            }}
            onBlur={() => handleBlur('description')}
            className={inputClass('description')}
            aria-invalid={!!(touched.has('description') && fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'reward-description-error' : undefined}
          />
          {touched.has('description') && fieldErrors.description && (
            <p id="reward-description-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.description}
            </p>
          )}
        </div>

        {/* Cost */}
        <div>
          <label htmlFor="reward-cost" className="block text-sm font-medium text-[#bbc9cf]">
            Cost (coins) <span className="text-red-400">*</span>
          </label>
          <input
            id="reward-cost"
            type="number"
            min={1}
            max={100000}
            value={cost}
            onChange={(e) => {
              setCost(e.target.value);
              if (fieldErrors.cost) setFieldErrors((prev) => ({ ...prev, cost: undefined }));
            }}
            onBlur={() => handleBlur('cost')}
            className={inputClass('cost')}
            aria-invalid={!!(touched.has('cost') && fieldErrors.cost)}
            aria-describedby={fieldErrors.cost ? 'reward-cost-error' : undefined}
          />
          {touched.has('cost') && fieldErrors.cost && (
            <p id="reward-cost-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.cost}
            </p>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="reward-image-url" className="block text-sm font-medium text-[#bbc9cf]">
            Image URL <span className="text-sm text-[#859398]">(optional)</span>
          </label>
          <input
            id="reward-image-url"
            type="text"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (fieldErrors.imageUrl) setFieldErrors((prev) => ({ ...prev, imageUrl: undefined }));
            }}
            onBlur={() => handleBlur('imageUrl')}
            placeholder="https://example.com/image.png"
            className={inputClass('imageUrl')}
            aria-invalid={!!(touched.has('imageUrl') && fieldErrors.imageUrl)}
            aria-describedby={fieldErrors.imageUrl ? 'reward-image-url-error' : undefined}
          />
          {touched.has('imageUrl') && fieldErrors.imageUrl && (
            <p id="reward-image-url-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.imageUrl}
            </p>
          )}
        </div>

        {/* Stock Quantity */}
        <div>
          <label htmlFor="reward-stock" className="block text-sm font-medium text-[#bbc9cf]">
            Stock Quantity <span className="text-red-400">*</span>
          </label>

          {/* Unlimited checkbox */}
          <label className="mt-2 flex items-center gap-2 text-sm text-[#e5e1e4]">
            <input
              type="checkbox"
              checked={unlimited}
              onChange={(e) => {
                setUnlimited(e.target.checked);
                if (e.target.checked) {
                  setStockQuantity('');
                  setFieldErrors((prev) => ({ ...prev, stockQuantity: undefined }));
                }
              }}
              className="rounded text-[#00d4ff] focus:ring-[#00d4ff]"
            />
            Unlimited stock
          </label>

          {!unlimited && (
            <input
              id="reward-stock"
              type="number"
              min={1}
              value={stockQuantity}
              onChange={(e) => {
                setStockQuantity(e.target.value);
                if (fieldErrors.stockQuantity) setFieldErrors((prev) => ({ ...prev, stockQuantity: undefined }));
              }}
              onBlur={() => handleBlur('stockQuantity')}
              className={inputClass('stockQuantity')}
              aria-invalid={!!(touched.has('stockQuantity') && fieldErrors.stockQuantity)}
              aria-describedby={fieldErrors.stockQuantity ? 'reward-stock-error' : undefined}
            />
          )}
          {touched.has('stockQuantity') && fieldErrors.stockQuantity && !unlimited && (
            <p id="reward-stock-error" className="mt-1 text-xs text-red-400" role="alert">
              {fieldErrors.stockQuantity}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-lg bg-[#00d4ff] px-4 py-2.5 text-sm font-medium text-[#003642] hover:bg-[#3cd7ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? mode === 'create' ? 'Creating...' : 'Saving...'
              : mode === 'create' ? 'Create Item' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[#3c494e] bg-[#2a2a2c] px-4 py-2.5 text-sm font-medium text-[#bbc9cf] hover:bg-[#353437] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
