import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../lark-api.service', () => ({
  listRecords: vi.fn(),
  getRecord: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  extractTextValue: vi.fn((val: unknown) => {
    if (typeof val === 'string') return val;
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === 'object' && first !== null && 'text' in first) {
        return (first as { text: string }).text;
      }
    }
    return '';
  }),
  extractNumberValue: vi.fn((val: unknown) => {
    if (typeof val === 'number') return val;
    return 0;
  }),
}));

vi.mock('../coin.service', () => ({
  awardCoinsForCompletion: vi.fn(),
}));

import { listRecords, getRecord, createRecord } from '../lark-api.service';
import { awardCoinsForCompletion } from '../coin.service';
import { completeQuest } from '../quest.service';

// ─── Property Tests ─────────────────────────────────────────────────────────

// Feature: coin-store-system, Property 4: Completion record includes correct coins_awarded
describe('quest.service - Property 4: Completion record includes correct coins_awarded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * For any quest with a valid difficulty and any coin config state,
   * when completeQuest creates a Quest_Completion record, the coins_awarded
   * field SHALL equal the value returned by calculateCoinsForDifficulty.
   */
  it('coins_awarded in the completion record matches the value from awardCoinsForCompletion', () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<'easy' | 'medium' | 'hard'>,
        fc.integer({ min: 1, max: 10000 }),
        async (difficulty, coinAmount) => {
          vi.clearAllMocks();

          const questId = 'quest_123';
          const memberId = 'member_456';

          // Mock getRecord to return a quest record with the generated difficulty
          const mockQuestRecord = {
            record_id: questId,
            fields: {
              title: [{ text: 'Test Quest', type: 'text' }],
              description: [{ text: 'A test quest', type: 'text' }],
              category: [{ text: 'daily', type: 'text' }],
              target_role: [{ text: 'developer', type: 'text' }],
              status: [{ text: 'active', type: 'text' }],
              assignment_type: [{ text: 'all', type: 'text' }],
              assignee_id: '',
              completion_mode: [{ text: 'multiple', type: 'text' }],
              proposer_id: '',
              created_at: Date.now(),
              difficulty: [{ text: difficulty, type: 'text' }],
              project_ids: '',
              edit_history: '',
              withdrawn: false,
            },
          };

          vi.mocked(getRecord).mockResolvedValue(mockQuestRecord);

          // Mock listRecords for duplicate completion check (no existing completions)
          vi.mocked(listRecords).mockResolvedValue([]);

          // Mock awardCoinsForCompletion to return the generated coin amount
          vi.mocked(awardCoinsForCompletion).mockResolvedValue(coinAmount);

          // Mock createRecord to capture the fields passed and return a valid completion record
          const capturedFields: Record<string, unknown>[] = [];
          vi.mocked(createRecord).mockImplementation(async (_tableId, fields) => {
            capturedFields.push(fields as Record<string, unknown>);
            return {
              record_id: 'completion_789',
              fields: {
                member_id: memberId,
                quest_id: questId,
                completed_at: new Date().toISOString(),
                coins_awarded: (fields as Record<string, unknown>).coins_awarded,
              },
            };
          });

          // Execute completeQuest
          await completeQuest(questId, memberId);

          // Verify that createRecord was called with coins_awarded matching the mocked return value
          expect(capturedFields).toHaveLength(1);
          expect(capturedFields[0]!.coins_awarded).toBe(coinAmount);

          // Verify awardCoinsForCompletion was called with the quest's difficulty and memberId
          expect(awardCoinsForCompletion).toHaveBeenCalledWith(questId, difficulty, memberId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
