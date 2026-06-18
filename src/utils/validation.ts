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
