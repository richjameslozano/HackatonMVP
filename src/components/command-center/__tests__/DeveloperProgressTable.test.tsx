import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeveloperProgressTable } from '../DeveloperProgressTable';
import type { DeveloperOverview } from '../../../services/team-progress.service';

function createDeveloper(
    memberId: string,
    displayName: string,
    overrides: Partial<DeveloperOverview> = {}
): DeveloperOverview {
    return {
        member: {
            memberId,
            displayName,
            openId: `open_${memberId}`,
            roles: ['developer'],
            primaryRole: 'developer',
            scrumMasterId: 'sm1',
            projectIds: [],
        },
        totalQuests: 10,
        completedQuests: 5,
        activeQuests: 3,
        pendingQuests: 1,
        rejectedQuests: 1,
        blockedQuests: 0,
        completionPercentage: 50,
        ...overrides,
    };
}

describe('DeveloperProgressTable', () => {
    it('renders all developer rows', () => {
        const developers = [
            createDeveloper('d1', 'Alice'),
            createDeveloper('d2', 'Bob'),
        ];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('shows empty state when no developers', () => {
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={[]} onViewDetails={onViewDetails} />);

        expect(screen.getByText('No developers found')).toBeInTheDocument();
    });

    it('calls onViewDetails with correct developer id', () => {
        const developers = [createDeveloper('d1', 'Alice')];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        fireEvent.click(screen.getByRole('button', { name: /view details for alice/i }));
        expect(onViewDetails).toHaveBeenCalledWith('d1');
    });

    it('displays task count and blocked indicator', () => {
        const developers = [
            createDeveloper('d1', 'Alice', { totalQuests: 8, blockedQuests: 2 }),
        ];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('2 blocked')).toBeInTheDocument();
    });

    it('displays progress bar with percentage', () => {
        const developers = [
            createDeveloper('d1', 'Alice', { completionPercentage: 75 }),
        ];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    });

    it('sorts by developer name on column click', () => {
        const developers = [
            createDeveloper('d1', 'Charlie'),
            createDeveloper('d2', 'Alice'),
            createDeveloper('d3', 'Bob'),
        ];
        const onViewDetails = vi.fn();

        const { container } = render(
            <DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />
        );

        // Default sort is name ascending
        const rows = container.querySelectorAll('tbody tr');
        expect(rows[0]).toHaveTextContent('Alice');
        expect(rows[1]).toHaveTextContent('Bob');
        expect(rows[2]).toHaveTextContent('Charlie');
    });

    it('sorts by completion percentage on column click', () => {
        const developers = [
            createDeveloper('d1', 'Alice', { completionPercentage: 30 }),
            createDeveloper('d2', 'Bob', { completionPercentage: 80 }),
            createDeveloper('d3', 'Charlie', { completionPercentage: 50 }),
        ];
        const onViewDetails = vi.fn();

        const { container } = render(
            <DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />
        );

        // Click "Progress" column header to sort by completion (defaults to desc)
        fireEvent.click(screen.getByText('Progress'));

        const rows = container.querySelectorAll('tbody tr');
        expect(rows[0]).toHaveTextContent('Bob');
        expect(rows[1]).toHaveTextContent('Charlie');
        expect(rows[2]).toHaveTextContent('Alice');
    });

    it('renders Download CSV button', () => {
        const developers = [createDeveloper('d1', 'Alice')];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument();
    });

    it('shows status dots for each status type', () => {
        const developers = [
            createDeveloper('d1', 'Alice', {
                completedQuests: 3,
                activeQuests: 2,
                pendingQuests: 1,
                rejectedQuests: 1,
                blockedQuests: 1,
            }),
        ];
        const onViewDetails = vi.fn();

        render(<DeveloperProgressTable developers={developers} onViewDetails={onViewDetails} />);

        // Check the status dot labels via title attributes
        expect(screen.getByTitle('3 completed')).toBeInTheDocument();
        expect(screen.getByTitle('2 active')).toBeInTheDocument();
        expect(screen.getByTitle('1 pending')).toBeInTheDocument();
        expect(screen.getByTitle('1 rejected')).toBeInTheDocument();
        // "1 blocked" appears both in the Tasks column badge-pill and the status dot
        expect(screen.getAllByTitle('1 blocked')).toHaveLength(2);
    });
});
