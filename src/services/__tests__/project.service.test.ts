import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ─── Mock lark-api.service ──────────────────────────────────────────────────

vi.mock('../lark-api.service', () => ({
  listRecords: vi.fn(),
  getRecord: vi.fn(),
  createRecord: vi.fn(),
  extractTextValue: vi.fn((value: unknown) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null && 'text' in first) {
        return (first as { text: string }).text;
      }
      if (typeof first === 'string') return first;
    }
    return '';
  }),
}));

import { listRecords } from '../lark-api.service';
import { listProjects } from '../project.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockListRecords = vi.mocked(listRecords);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('project.service - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: coin-store-system, Property 6: Project list sorted alphabetically
  // **Validates: Requirements 4.1**
  describe('Property 6: Project list sorted alphabetically', () => {
    it('listProjects() returns projects sorted in case-insensitive alphabetical order by name with no additions/removals/duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (projects) => {
            // Arrange: Mock listRecords to return records with generated names
            const mockRecords = projects.map((p, idx) => ({
              record_id: `rec_${idx}`,
              fields: {
                name: p.name,
                description: p.description,
              },
            }));
            mockListRecords.mockResolvedValue(mockRecords);

            // Act
            const result = await listProjects();

            // Assert: Same length (no additions or removals)
            expect(result).toHaveLength(projects.length);

            // Assert: Contains the same set of names (no duplicates introduced/removed)
            const inputNames = projects.map((p) => p.name).sort();
            const outputNames = result.map((p) => p.name).sort();
            expect(outputNames).toEqual(inputNames);

            // Assert: Result is sorted in case-insensitive alphabetical order
            for (let i = 1; i < result.length; i++) {
              const prev = result[i - 1]!.name.toLowerCase();
              const curr = result[i]!.name.toLowerCase();
              expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: coin-store-system, Property 9: "All projects" resolves to complete set
  // **Validates: Requirements 5.3**
  describe('Property 9: "All projects" resolves to complete set', () => {
    it('fetching all projects returns the complete set with no duplicates and same length as total project count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (projectIds) => {
            // Arrange: Mock listRecords to return projects with those IDs
            const mockRecords = projectIds.map((id) => ({
              record_id: id,
              fields: {
                name: `Project ${id}`,
                description: `Description for ${id}`,
              },
            }));
            mockListRecords.mockResolvedValue(mockRecords);

            // Act: Fetch all projects (listProjects returns the complete set)
            const result = await listProjects();

            // Assert: Result contains every ID with no duplicates
            const resultIds = result.map((p) => p.projectId);
            const uniqueResultIds = [...new Set(resultIds)];

            // No duplicates
            expect(resultIds).toHaveLength(uniqueResultIds.length);

            // Same length as total project count
            expect(result).toHaveLength(projectIds.length);

            // Every input ID is present in the result
            for (const id of projectIds) {
              expect(resultIds).toContain(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
