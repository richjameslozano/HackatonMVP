import type { Member } from '../../types';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ScrumMasterAssignerProps {
  taskId: string;
  currentSmId: string | null;
  scrumMasters: Member[];
  isAdmin: boolean;
  onAssign: (taskId: string, scrumMasterId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ScrumMasterAssigner({
  taskId,
  currentSmId,
  scrumMasters,
  isAdmin,
  onAssign,
}: ScrumMasterAssignerProps) {
  // Requirement 4.3: Non-admin users cannot assign Scrum Masters
  if (!isAdmin) {
    return null;
  }

  // Requirement 4.8: Disabled when no SM-role users exist
  if (scrumMasters.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`sm-assigner-${taskId}`}
          className="text-xs font-bold uppercase tracking-wider text-[#859398]"
        >
          Scrum Master
        </label>
        <select
          id={`sm-assigner-${taskId}`}
          disabled
          className="w-full rounded-lg border border-[#3c494e] bg-[#2a2a2c] px-3 py-2 text-sm text-[#859398] opacity-60 cursor-not-allowed"
          aria-label="Assign Scrum Master"
        >
          <option>No Scrum Masters available</option>
        </select>
      </div>
    );
  }

  // Requirement 4.1: Selection control listing all SM-role users, pre-selected to current SM
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value;
    if (selectedId) {
      onAssign(taskId, selectedId);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={`sm-assigner-${taskId}`}
        className="text-xs font-bold uppercase tracking-wider text-[#859398]"
      >
        Scrum Master
      </label>
      <select
        id={`sm-assigner-${taskId}`}
        value={currentSmId ?? ''}
        onChange={handleChange}
        className="w-full rounded-lg border border-[rgba(0,212,255,0.2)] bg-[#2a2a2c] px-3 py-2 text-sm text-[#e5e1e4] transition-all focus:border-[#3cd7ff] focus:outline-none focus:ring-1 focus:ring-[rgba(0,212,255,0.3)]"
        aria-label="Assign Scrum Master"
      >
        <option value="">— Select Scrum Master —</option>
        {scrumMasters.map((sm) => (
          <option key={sm.memberId} value={sm.memberId}>
            {sm.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
