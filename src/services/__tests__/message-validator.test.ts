// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEventMessage } from '../message-validator';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('message-validator', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('validateEventMessage', () => {
    it('should return a valid EventMessage for well-formed input', () => {
      const raw = {
        type: 'leaderboard_update',
        payload: { member_id: 'mem1', badge_count: 5 },
        timestamp: '2024-01-15T10:30:00Z',
      };
      const result = validateEventMessage(raw);
      expect(result).toEqual(raw);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should accept all valid event types', () => {
      const types = ['leaderboard_update', 'quest_update', 'badge_update', 'connection_ack'] as const;
      for (const type of types) {
        const raw = { type, payload: { data: 'test' }, timestamp: '2024-01-15T10:30:00Z' };
        expect(validateEventMessage(raw)).toEqual(raw);
      }
    });

    // ─── Invalid: not an object ─────────────────────────────────────────

    it('should return null for null input', () => {
      expect(validateEventMessage(null)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should return null for undefined input', () => {
      expect(validateEventMessage(undefined)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should return null for string input', () => {
      expect(validateEventMessage('hello')).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should return null for number input', () => {
      expect(validateEventMessage(42)).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should return null for array input', () => {
      expect(validateEventMessage([1, 2, 3])).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
    });

    // ─── Invalid: missing or invalid type ───────────────────────────────

    it('should return null when type field is missing', () => {
      const raw = { payload: { data: 'test' }, timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or invalid type'),
        raw,
      );
    });

    it('should return null when type is not a string', () => {
      const raw = { type: 123, payload: { data: 'test' }, timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
    });

    it('should return null when type is not in the valid set', () => {
      const raw = { type: 'unknown_event', payload: { data: 'test' }, timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or invalid type'),
        raw,
      );
    });

    // ─── Invalid: missing or invalid payload ────────────────────────────

    it('should return null when payload field is missing', () => {
      const raw = { type: 'leaderboard_update', timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or invalid payload'),
        raw,
      );
    });

    it('should return null when payload is null', () => {
      const raw = { type: 'leaderboard_update', payload: null, timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
    });

    it('should return null when payload is a string', () => {
      const raw = { type: 'leaderboard_update', payload: 'not an object', timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
    });

    it('should return null when payload is a number', () => {
      const raw = { type: 'quest_update', payload: 42, timestamp: '2024-01-15T10:30:00Z' };
      expect(validateEventMessage(raw)).toBeNull();
    });

    // ─── Invalid: missing or invalid timestamp ──────────────────────────

    it('should return null when timestamp field is missing', () => {
      const raw = { type: 'badge_update', payload: { data: 'test' } };
      expect(validateEventMessage(raw)).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing or invalid timestamp'),
        raw,
      );
    });

    it('should return null when timestamp is not a string', () => {
      const raw = { type: 'badge_update', payload: { data: 'test' }, timestamp: 12345 };
      expect(validateEventMessage(raw)).toBeNull();
    });

    // ─── Console warning behavior ───────────────────────────────────────

    it('should log a warning with the raw message for each invalid case', () => {
      const raw = { type: 'invalid', payload: {}, timestamp: '2024-01-15T10:30:00Z' };
      validateEventMessage(raw);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket]'),
        raw,
      );
    });
  });
});
