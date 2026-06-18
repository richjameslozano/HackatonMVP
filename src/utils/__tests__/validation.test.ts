import { describe, it, expect } from 'vitest';
import {
  validateTaskTitle,
  validateTaskDescription,
  validateRejectionReason,
} from '../validation';

describe('validateTaskTitle', () => {
  it('rejects empty string', () => {
    const result = validateTaskTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('rejects whitespace-only string', () => {
    const result = validateTaskTitle('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('rejects string longer than 100 characters', () => {
    const result = validateTaskTitle('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Title is required and must be 1–100 characters');
  });

  it('accepts valid title of 1 character', () => {
    const result = validateTaskTitle('a');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid title at exactly 100 characters', () => {
    const result = validateTaskTitle('a'.repeat(100));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts normal title', () => {
    const result = validateTaskTitle('Complete onboarding module');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateTaskDescription', () => {
  it('accepts empty string (optional field)', () => {
    const result = validateTaskDescription('');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts description at exactly 500 characters', () => {
    const result = validateTaskDescription('a'.repeat(500));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects description longer than 500 characters', () => {
    const result = validateTaskDescription('a'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Description must be 500 characters or fewer');
  });

  it('accepts normal description', () => {
    const result = validateTaskDescription('This is a task description.');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateRejectionReason', () => {
  it('rejects empty string', () => {
    const result = validateRejectionReason('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('rejects whitespace-only string', () => {
    const result = validateRejectionReason('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('rejects string longer than 250 characters', () => {
    const result = validateRejectionReason('a'.repeat(251));
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Rejection reason is required (max 250 characters)');
  });

  it('accepts valid reason of 1 character', () => {
    const result = validateRejectionReason('x');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid reason at exactly 250 characters', () => {
    const result = validateRejectionReason('a'.repeat(250));
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts normal rejection reason', () => {
    const result = validateRejectionReason('Not aligned with sprint goals');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
