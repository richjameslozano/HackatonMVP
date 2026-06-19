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

  return (
    <div
      className="flex items-center justify-center gap-1 rounded-lg bg-gray-100 p-1"
      role="radiogroup"
      aria-label="Role view switcher"
    >
      {roles
        .filter((r) => currentMember.roles.includes(r.value))
        .map(({ value, label }) => {
          const isSelected = selectedRole === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setRole(value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          );
        })}
    </div>
  );
}
