import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock app.store ─────────────────────────────────────────────────────────

const mockUseAppStore = vi.fn();

vi.mock('../../../store/app.store', () => ({
  useAppStore: (selector: unknown) => mockUseAppStore(selector),
}));

// ─── Mock react-router-dom ──────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Navigate: (props: { to: string; replace?: boolean }) => {
    mockNavigate(props);
    return <div data-testid="navigate" data-to={props.to} />;
  },
}));

// ─── Mock permissions ───────────────────────────────────────────────────────

const mockIsAdmin = vi.fn();

vi.mock('../../../utils/permissions', () => ({
  isAdmin: (member: unknown) => mockIsAdmin(member),
}));

import { AdminGuard } from '../AdminGuard';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders children for admin member', () => {
    const adminMember = {
      memberId: 'm1',
      displayName: 'Admin User',
      openId: 'ou_admin',
      roles: ['admin', 'developer'],
      primaryRole: 'developer',
      scrumMasterId: null,
    };

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = { currentMember: adminMember };
      return selector(state);
    });
    mockIsAdmin.mockReturnValue(true);

    render(
      <AdminGuard>
        <div data-testid="admin-content">Protected Content</div>
      </AdminGuard>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('redirects non-admin to /quests', () => {
    const regularMember = {
      memberId: 'm2',
      displayName: 'Regular User',
      openId: 'ou_regular',
      roles: ['developer'],
      primaryRole: 'developer',
      scrumMasterId: null,
    };

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = { currentMember: regularMember };
      return selector(state);
    });
    mockIsAdmin.mockReturnValue(false);

    render(
      <AdminGuard>
        <div data-testid="admin-content">Protected Content</div>
      </AdminGuard>
    );

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    const navigateEl = screen.getByTestId('navigate');
    expect(navigateEl).toHaveAttribute('data-to', '/quests');
  });

  it('redirects when no member is loaded (fail-closed)', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const state = { currentMember: null };
      return selector(state);
    });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Protected Content</div>
      </AdminGuard>
    );

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    const navigateEl = screen.getByTestId('navigate');
    expect(navigateEl).toHaveAttribute('data-to', '/quests');
  });
});
