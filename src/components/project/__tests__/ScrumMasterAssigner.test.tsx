import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScrumMasterAssigner } from '../ScrumMasterAssigner';
import type { Member } from '../../../types';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    memberId: 'sm-1',
    displayName: 'Alice SM',
    openId: 'open-1',
    roles: ['developer'],
    primaryRole: 'developer',
    scrumMasterId: null,
    projectIds: [],
    ...overrides,
  };
}

const defaultScrumMasters: Member[] = [
  makeMember({ memberId: 'sm-1', displayName: 'Alice SM' }),
  makeMember({ memberId: 'sm-2', displayName: 'Bob SM' }),
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ScrumMasterAssigner', () => {
  it('renders nothing for non-admin users (Req 4.3)', () => {
    const { container } = render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId={null}
        scrumMasters={defaultScrumMasters}
        isAdmin={false}
        onAssign={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders disabled select with message when no SM-role users exist (Req 4.8)', () => {
    render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId={null}
        scrumMasters={[]}
        isAdmin={true}
        onAssign={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i });
    expect(select).toBeDisabled();
    expect(screen.getByText('No Scrum Masters available')).toBeInTheDocument();
  });

  it('lists all SM-role users as options (Req 4.1)', () => {
    render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId={null}
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i });
    expect(select).not.toBeDisabled();

    const options = screen.getAllByRole('option');
    // Placeholder + 2 SM users
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveTextContent('Alice SM');
    expect(options[2]).toHaveTextContent('Bob SM');
  });

  it('pre-selects the current Scrum Master (Req 4.1)', () => {
    render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId="sm-2"
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i }) as HTMLSelectElement;
    expect(select.value).toBe('sm-2');
  });

  it('shows placeholder when currentSmId is null', () => {
    render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId={null}
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i }) as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('calls onAssign with taskId and selected SM id on change', () => {
    const onAssign = vi.fn();
    render(
      <ScrumMasterAssigner
        taskId="task-42"
        currentSmId={null}
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={onAssign}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i });
    fireEvent.change(select, { target: { value: 'sm-1' } });

    expect(onAssign).toHaveBeenCalledOnce();
    expect(onAssign).toHaveBeenCalledWith('task-42', 'sm-1');
  });

  it('does not call onAssign when placeholder is selected', () => {
    const onAssign = vi.fn();
    render(
      <ScrumMasterAssigner
        taskId="task-42"
        currentSmId="sm-1"
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={onAssign}
      />,
    );

    const select = screen.getByRole('combobox', { name: /assign scrum master/i });
    fireEvent.change(select, { target: { value: '' } });

    expect(onAssign).not.toHaveBeenCalled();
  });

  it('renders an accessible label', () => {
    render(
      <ScrumMasterAssigner
        taskId="task-1"
        currentSmId={null}
        scrumMasters={defaultScrumMasters}
        isAdmin={true}
        onAssign={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/scrum master/i)).toBeInTheDocument();
  });
});
