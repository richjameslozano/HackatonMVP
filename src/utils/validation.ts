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

// ─── Reward Item Validation ─────────────────────────────────────────────────

/**
 * Validates reward item title: 1–100 characters, not whitespace-only.
 */
export function validateRewardItemTitle(title: string): ValidationResult {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required and must not be whitespace-only' };
  }
  if (title.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates reward item description: 0–500 characters.
 */
export function validateRewardItemDescription(description: string): ValidationResult {
  if (description.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or fewer' };
  }
  return { valid: true };
}

/**
 * Validates reward item cost: positive integer between 1 and 100,000.
 */
export function validateRewardItemCost(value: unknown): ValidationResult {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100000) {
    return { valid: false, error: 'Cost must be a positive integer between 1 and 100,000' };
  }
  return { valid: true };
}

/**
 * Validates stock quantity: -1 (unlimited) or positive integer > 0.
 */
export function validateStockQuantity(value: unknown): ValidationResult {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { valid: false, error: 'Stock quantity must be an integer' };
  }
  if (value === -1) {
    return { valid: true };
  }
  if (value <= 0) {
    return { valid: false, error: 'Stock quantity must be -1 (unlimited) or a positive integer' };
  }
  return { valid: true };
}

/**
 * Validates image URL: empty string (optional) or valid URL format.
 */
export function validateImageUrl(url: string): ValidationResult {
  if (url === '') {
    return { valid: true };
  }
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Image URL must be a valid URL or empty' };
  }
}

// ─── Project Name Validation ────────────────────────────────────────────────

/**
 * Validates a project name for creation or renaming.
 * Trims input, rejects empty/whitespace-only, rejects >100 chars after trim.
 */
export function validateProjectName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Project name cannot be empty' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Project name must be 100 characters or fewer' };
  }

  return { valid: true };
}

/**
 * Validates project name uniqueness via case-insensitive comparison after trim.
 * When `currentProjectId` is provided, the caller should exclude the current project's
 * name from `existingNames` to allow renaming to the same name (no-op rename).
 * This parameter serves as a semantic marker — filtering is the caller's responsibility.
 */
export function validateProjectNameUniqueness(
  name: string,
  existingNames: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _currentProjectId?: string
): ValidationResult {
  const trimmed = name.trim().toLowerCase();

  const isDuplicate = existingNames.some(
    (existing) => existing.trim().toLowerCase() === trimmed
  );

  if (isDuplicate) {
    return { valid: false, error: 'A project with this name already exists' };
  }

  return { valid: true };
}

// ─── SM Task Creation Validation ────────────────────────────────────────────

/**
 * Validates Scrum Master task creation inputs.
 * Title: 1–200 chars after trim, not whitespace-only.
 * Assignee: required (non-empty).
 * Project: required (non-empty).
 */
export function validateSmTaskCreation(
  title: string,
  assigneeId: string,
  projectId: string
): ValidationResult {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    return { valid: false, error: 'Task title is required and must not be whitespace-only' };
  }

  if (trimmedTitle.length > 200) {
    return { valid: false, error: 'Task title must be 200 characters or fewer' };
  }

  if (!assigneeId || assigneeId.trim().length === 0) {
    return { valid: false, error: 'Assignee is required' };
  }

  if (!projectId || projectId.trim().length === 0) {
    return { valid: false, error: 'Project is required' };
  }

  return { valid: true };
}
