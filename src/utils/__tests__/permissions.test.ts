import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isAdmin } from '../permissions';
import type { Member } from '../../types';

// ─── Property 8: Admin role access control ──────────────────────────────────
// Feature: coin-store-system, Property 8: Admin role access control
// **Validates: Requirements 4.4, 4.5**

describe('Property 8: Admin role access control', () => {
  const nonAdminRoles = ['agent', 'developer', 'scrum_master'] as const;

  function buildMockMember(roles: string[]): Member {
    return {
      memberId: 'test-member-id',
      displayName: 'Test Member',
      openId: 'test-open-id',
      roles: roles as Member['roles'],
      primaryRole: 'agent',
      scrumMasterId: null,
      projectId: null,
    };
  }

  it('returns true if and only if member roles include "admin"', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('agent', 'developer', 'scrum_master', 'admin'),
          { minLength: 1, maxLength: 4 }
        ),
        (roles) => {
          const member = buildMockMember(roles);
          const result = isAdmin(member);
          const hasAdmin = roles.includes('admin');

          expect(result).toBe(hasAdmin);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false for all non-admin roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...nonAdminRoles),
          { minLength: 1, maxLength: 3 }
        ),
        (roles) => {
          const member = buildMockMember(roles);
          expect(isAdmin(member)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true when admin is present among other roles', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...nonAdminRoles),
          { minLength: 0, maxLength: 3 }
        ),
        (otherRoles) => {
          const roles = [...otherRoles, 'admin'];
          const member = buildMockMember(roles);
          expect(isAdmin(member)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
