import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Store ─────────────────────────────────────────────────────────────

const mockFetchQuests = vi.fn();
const mockFetchLeaderboard = vi.fn();
const mockFetchBadgeCollection = vi.fn();
const mockSetState = vi.fn();

const mockStoreState = {
  fetchQuests: mockFetchQuests,
  fetchLeaderboard: mockFetchLeaderboard,
  fetchBadgeCollection: mockFetchBadgeCollection,
  quests: null as Record<string, Array<{ questId: string }>> | null,
  completedQuestIds: new Set<string>(),
};

vi.mock('../../store/app.store', () => ({
  useAppStore: Object.assign(
    (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState),
    {
      getState: () => mockStoreState,
      setState: (partial: Record<string, unknown>) => mockSetState(partial),
    }
  ),
}));

// ─── Mock Config ────────────────────────────────────────────────────────────

vi.mock('../../services/config', () => ({
  TABLE_IDS: {
    members: 'tbl_members',
    quests: 'tbl_quests',
    questCompletions: 'tbl_questCompletions',
    badges: 'tbl_badges',
    badgeEarned: 'tbl_badgeEarned',
    coinConfig: 'tbl_coinConfig',
    projects: 'tbl_projects',
    rewardItems: 'tbl_rewardItems',
    purchases: 'tbl_purchases',
  },
}));

import { routeMessage } from '../message-router';
import type { EventMessage } from '../../types/realtime';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WebSocket cache event handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.quests = null;
    mockStoreState.completedQuestIds = new Set<string>();
  });

  // ─── cache_updated ──────────────────────────────────────────────────────

  describe('cache_updated', () => {
    it('triggers fetchQuests when cache_updated is received for the quests table', () => {
      const message: EventMessage = {
        type: 'cache_updated',
        payload: {
          table_name: 'tbl_quests',
          record_id: 'rec_001',
          action: 'updated',
        },
        timestamp: new Date().toISOString(),
      };

      routeMessage(message);

      expect(mockFetchQuests).toHaveBeenCalledTimes(1);
    });
  });

  // ─── write_failed ─────────────────────────────────────────────────────────

  describe('write_failed', () => {
    it('sets notificationWarning with record_id and error message', () => {
      const message: EventMessage = {
        type: 'write_failed',
        payload: {
          table_name: 'tbl_quests',
          record_id: 'rec_fail_123',
          error: 'Lark API rate limit exceeded',
        },
        timestamp: new Date().toISOString(),
      };

      routeMessage(message);

      expect(mockSetState).toHaveBeenCalledTimes(1);
      const stateUpdate = mockSetState.mock.calls[0][0] as { notificationWarning: string };
      expect(stateUpdate.notificationWarning).toContain('rec_fail_123');
      expect(stateUpdate.notificationWarning).toContain('Lark API rate limit exceeded');
    });
  });

  // ─── id_reconciliation ────────────────────────────────────────────────────

  describe('id_reconciliation', () => {
    it('replaces temp ID with permanent ID in quests store', () => {
      // Set up quests with a temp ID
      mockStoreState.quests = {
        open: [
          { questId: 'temp_123' },
          { questId: 'rec_other' },
        ],
      };

      const message: EventMessage = {
        type: 'id_reconciliation',
        payload: {
          table_name: 'tbl_quests',
          mappings: { temp_123: 'rec_abc' },
        },
        timestamp: new Date().toISOString(),
      };

      routeMessage(message);

      expect(mockSetState).toHaveBeenCalled();
      // Find the call that updated quests (not completedQuestIds)
      const questsCall = mockSetState.mock.calls.find(
        (call) => (call[0] as Record<string, unknown>).quests !== undefined
      );
      expect(questsCall).toBeDefined();

      const updatedQuests = (questsCall![0] as { quests: Record<string, Array<{ questId: string }>> }).quests;
      expect(updatedQuests.open[0].questId).toBe('rec_abc');
      expect(updatedQuests.open[1].questId).toBe('rec_other');
    });
  });
});
