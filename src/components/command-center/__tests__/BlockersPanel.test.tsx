import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BlockersPanel } from '../BlockersPanel';
import type { DeveloperOverview, RecentActivityEntry } from '../../../services/team-progress.service';
import type { Member } from '../../../types';

function createMember(id: string, name: string): Member {
    return {
        memberId: id,
        displayName: name,
        openId: `open_${id}`,
        roles: ['developer'],
        primaryRole: 'developer',
        scrumMasterId: null,
        projectIds: [],
    };
}

function createDeveloperOverview(
    id: string,
    name: string,
    overrides: Partial<DeveloperOverview> = {},
): DeveloperOverview {
    return {
        member: createMember(id, name),
        totalQuests: 5,
        completedQuests: 2,
        activeQuests: 2,
        pendingQuests: 1,
        rejectedQuests: 0,
        blockedQuests: 0,
        completionPercentage: 40,
        ...overrides,
    };
}

function createActivity(
    developerId: string,
    daysAgo: number,
): RecentActivityEntry {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - daysAgo);
    return {
        id: `act-${developerId}-${daysAgo}`,
        type: 'completion',
        developerName: `Dev ${developerId}`,
        developerId,
        questTitle: 'Some quest',
        questId: 'q1',
        timestamp,
    };
}

describe('BlockersPanel', () => {
    it('shows "All clear" message when no blockers or risks exist', () => {
        const developers = [createDeveloperOverview('d1', 'Alice')];
        const recentActivity = [createActivity('d1', 1)];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText(/All clear/)).toBeInTheDocument();
    });

    it('shows high priority section for developers with blocked quests', () => {
        const developers = [
            createDeveloperOverview('d1', 'Alice', { blockedQuests: 2 }),
        ];
        const recentActivity = [createActivity('d1', 1)];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('2 blocked tasks')).toBeInTheDocument();
    });

    it('shows high priority section for developers with rejected quests', () => {
        const developers = [
            createDeveloperOverview('d1', 'Bob', { rejectedQuests: 3 }),
        ];
        const recentActivity = [createActivity('d1', 1)];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('3 rejected tasks')).toBeInTheDocument();
    });

    it('shows combined blocked and rejected description', () => {
        const developers = [
            createDeveloperOverview('d1', 'Charlie', { blockedQuests: 1, rejectedQuests: 2 }),
        ];
        const recentActivity = [createActivity('d1', 1)];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText('1 blocked task, 2 rejected tasks')).toBeInTheDocument();
    });

    it('shows inactivity section for developers with no recent activity', () => {
        const developers = [
            createDeveloperOverview('d1', 'Diana'),
        ];
        const recentActivity = [createActivity('d1', 10)]; // 10 days ago

        render(
            <BlockersPanel
                developers={developers}
                recentActivity={recentActivity}
                inactivityThresholdDays={7}
            />,
        );

        expect(screen.getByText('Inactivity')).toBeInTheDocument();
        expect(screen.getByText('Diana')).toBeInTheDocument();
        expect(screen.getByText('No activity for 10 days')).toBeInTheDocument();
    });

    it('shows inactivity for developers with no activity records at all', () => {
        const developers = [
            createDeveloperOverview('d1', 'Eve'),
        ];
        const recentActivity: RecentActivityEntry[] = [];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText('Inactivity')).toBeInTheDocument();
        expect(screen.getByText('Eve')).toBeInTheDocument();
        expect(screen.getByText('No recent activity recorded')).toBeInTheDocument();
    });

    it('respects custom inactivityThresholdDays', () => {
        const developers = [
            createDeveloperOverview('d1', 'Frank'),
        ];
        const recentActivity = [createActivity('d1', 4)]; // 4 days ago

        // With threshold of 3, should show inactivity
        render(
            <BlockersPanel
                developers={developers}
                recentActivity={recentActivity}
                inactivityThresholdDays={3}
            />,
        );

        expect(screen.getByText('Inactivity')).toBeInTheDocument();
        expect(screen.getByText('Frank')).toBeInTheDocument();
    });

    it('does not show inactivity for developers within threshold', () => {
        const developers = [
            createDeveloperOverview('d1', 'Grace'),
        ];
        const recentActivity = [createActivity('d1', 2)]; // 2 days ago

        render(
            <BlockersPanel
                developers={developers}
                recentActivity={recentActivity}
                inactivityThresholdDays={7}
            />,
        );

        expect(screen.queryByText('Inactivity')).not.toBeInTheDocument();
        expect(screen.getByText(/All clear/)).toBeInTheDocument();
    });

    it('shows both high priority and inactivity sections when both exist', () => {
        const developers = [
            createDeveloperOverview('d1', 'Alice', { blockedQuests: 1 }),
            createDeveloperOverview('d2', 'Bob'),
        ];
        const recentActivity = [
            createActivity('d1', 1),
            createActivity('d2', 14),
        ];

        render(
            <BlockersPanel developers={developers} recentActivity={recentActivity} />,
        );

        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Inactivity')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });
});
