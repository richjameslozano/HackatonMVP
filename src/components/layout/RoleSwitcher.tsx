import { useAppStore } from '../../store/app.store';
import type { Role } from '../../types';

const roles: { value: Role; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'developer', label: 'Developer' },
];

export function RoleSwitcher() {
  const currentMember = useAppStore((s) => s.currentMember);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const setRole = useAppStore((s) => s.setRole);

  // Hidden if user has only one role or no member loaded
  if (!currentMember || currentMember.roles.length <= 1) {
    return null;
  }

  const otherRole = roles.find((r) => r.value !== selectedRole && currentMember.roles.includes(r.value));

  if (!otherRole) return null;

  return (
    <button
      type="button"
      onClick={() => setRole(otherRole.value)}
      className="w-full rounded-lg border border-madrid-200 bg-madrid-50 px-3 py-2 text-sm font-medium text-madrid-700 transition-colors hover:bg-madrid-100"
      aria-label={`Switch to ${otherRole.label}`}
    >
      Switch to {otherRole.label}
    </button>
  );
}
