import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/app.store';
import { isAdmin } from '../../utils/permissions';

// ─── AdminGuard ─────────────────────────────────────────────────────────────

/**
 * Protects admin-only routes.
 * - Redirects to /quests if currentMember is null (fail-closed).
 * - Redirects to /quests if the member does not have the admin role.
 * - Renders children when the member is confirmed admin.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const currentMember = useAppStore((s) => s.currentMember);

  // Fail-closed: if member is not loaded, redirect rather than showing content
  if (!currentMember) {
    return <Navigate to="/quests" replace />;
  }

  // Non-admins are redirected to the quest board
  if (!isAdmin(currentMember)) {
    return <Navigate to="/quests" replace />;
  }

  // Admin confirmed — render protected content
  return <>{children}</>;
}
