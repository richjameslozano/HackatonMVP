import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LeaderboardTable } from '../LeaderboardTable';
import type { LeaderboardEntry } from '../../../types';

// Mock the leaderboard service (for badge breakdown in LeaderboardRow)
vi.mock('../../../services/leaderboard.service', () => ({
    getMemberBadgeBreakdown: vi.fn().mockResolvedValue({ memberId: '', badges: [] }),
}));

function createEntry(memberId: string, displayName: string, badgeCount: number, rank: number): LeaderboardEntry {
    return {
        member: {
            memberId,
            displayName,
            openId: `open_${memberId}`,
            roles: ['agent'],
            primaryRole: 'agent',
            scrumMasterId: null,
        },
        badgeCount,
        rank,
    };
}

describe('LeaderboardTable', () => {
    it('renders all entries', () => {
        const entries = [
            createEntry('m1', 'Alice', 5, 1),
            createEntry('m2', 'Bob', 3, 2),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={null} currentMemberId="m1" />
        );

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('shows rank change up indicator when member moved up', () => {
        const previousRankings = { m1: 2, m2: 1 };
        const entries = [
            createEntry('m1', 'Alice', 6, 1),
            createEntry('m2', 'Bob', 5, 2),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={previousRankings} currentMemberId="m1" />
        );

        // Alice moved from rank 2 to rank 1 (up 1)
        expect(screen.getByTitle('Up 1 from #2')).toBeInTheDocument();
        // Bob moved from rank 1 to rank 2 (down 1)
        expect(screen.getByTitle('Down 1 from #1')).toBeInTheDocument();
    });

    it('shows no rank change indicator when ranks are unchanged', () => {
        const previousRankings = { m1: 1, m2: 2 };
        const entries = [
            createEntry('m1', 'Alice', 5, 1),
            createEntry('m2', 'Bob', 3, 2),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={previousRankings} currentMemberId="m1" />
        );

        expect(screen.queryByTitle(/Up \d+ from/)).not.toBeInTheDocument();
        expect(screen.queryByTitle(/Down \d+ from/)).not.toBeInTheDocument();
    });

    it('shows no indicator when there is no previous data', () => {
        const entries = [
            createEntry('m1', 'Alice', 5, 1),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={null} currentMemberId="m1" />
        );

        // No rank change indicators shown when no previous data exists
        expect(screen.queryByTitle(/Up \d+ from/)).not.toBeInTheDocument();
        expect(screen.queryByTitle(/Down \d+ from/)).not.toBeInTheDocument();
    });

    it('shows multi-position rank change with count', () => {
        const previousRankings = { m1: 4, m2: 1, m3: 2, m4: 3 };
        const entries = [
            createEntry('m1', 'Alice', 7, 1),
            createEntry('m2', 'Bob', 5, 2),
            createEntry('m3', 'Charlie', 4, 3),
            createEntry('m4', 'Diana', 3, 4),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={previousRankings} currentMemberId="m1" />
        );

        // Alice moved from rank 4 to rank 1 (up 3)
        expect(screen.getByTitle('Up 3 from #4')).toBeInTheDocument();
    });

    it('highlights the current user row', () => {
        const entries = [
            createEntry('m1', 'Alice', 5, 1),
            createEntry('m2', 'Bob', 3, 2),
        ];

        render(
            <LeaderboardTable entries={entries} previousRankings={null} currentMemberId="m1" />
        );

        expect(screen.getByText('(You)')).toBeInTheDocument();
    });
});
