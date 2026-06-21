// ─── Validation Result Type ─────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─── Validation Functions ───────────────────────────────────────────────────

/**
 * Validates a task title.
 * Required, 1–100 characters, not whitespace-only.
 */
export function validateTaskTitle(title: string): ValidationResult {
  if (!title || title.trim().length === 0 || title.length > 100) {
    return { valid: false, error: 'Title is required and must be 1–100 characters' };
  }
  return { valid: true };
}

/**
 * Validates a task description.
 * Optional (empty is fine), max 500 characters.
 */
export function validateTaskDescription(description: string): ValidationResult {
  if (description.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates a rejection reason.
 * Required, 1–250 characters, not whitespace-only.
 */
export function validateRejectionReason(reason: string): ValidationResult {
  if (!reason || reason.trim().length === 0 || reason.length > 250) {
    return { valid: false, error: 'Rejection reason is required (max 250 characters)' };
  }
  return { valid: true };
}

// ─── Coin Store Validation Functions ────────────────────────────────────────

/**
 * Validates a coin value is a positive integer between 1 and 10,000.
 */
export function validateCoinValue(value: unknown): ValidationResult {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10000) {
    return { valid: false, error: 'Coin value must be a positive integer between 1 and 10,000' };
  }
  return { valid: true };
}

/**
 * Validates a difficulty string is one of the allowed values: 'easy', 'medium', or 'hard'.
 */
export function validateDifficulty(value: unknown): ValidationResult {
  if (value !== 'easy' && value !== 'medium' && value !== 'hard') {
    return { valid: false, error: 'Difficulty must be exactly "easy", "medium", or "hard"' };
  }
  return { valid: true };
}

/**
 * Validates task title for admin creation (1–100 chars, not whitespace-only).
 */
export function validateAdminTaskTitle(title: string): ValidationResult {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required and must not be whitespace-only' };
  }
  if (title.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates task description for admin creation (1–500 chars, not empty).
 */
export function validateAdminTaskDescription(description: string): ValidationResult {
  if (!description || description.length === 0) {
    return { valid: false, error: 'Description is required' };
  }
  if (description.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates that at least one project is selected.
 */
export function validateProjectSelection(projectIds: string[]): ValidationResult {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return { valid: false, error: 'At least one project must be selected' };
  }
  return { valid: true };
}
