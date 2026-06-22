import { useEffect, useState, useCallback } from 'react';
import type { Member } from '../../types';
import {
  listAllMembers,
  getMembersForProject,
  assignMemberToProject,
  removeMemberFromProject,
} from '../../services/member.service';
import { LoadingIndicator } from '../shared/LoadingIndicator';
import { ErrorBanner } from '../shared/ErrorBanner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProjectMemberManagerProps {
  projectId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProjectMemberManager({ projectId }: ProjectMemberManagerProps) {
  const [projectMembers, setProjectMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [members, all] = await Promise.all([
        getMembersForProject(projectId),
        listAllMembers(),
      ]);
      setProjectMembers(members);
      setAllMembers(all);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─── Actions ────────────────────────────────────────────────────────────

  async function handleAssign(memberId: string) {
    setActionLoading(memberId);
    try {
      await assignMemberToProject(memberId, projectId);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign member.';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(memberId: string) {
    setActionLoading(memberId);
    try {
      await removeMemberFromProject(memberId);
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member.';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Derived Data ───────────────────────────────────────────────────────

  const projectMemberIds = new Set(projectMembers.map((m) => m.memberId));

  const availableMembers = allMembers.filter(
    (m) => !projectMemberIds.has(m.memberId)
  );

  const filteredAvailable = availableMembers.filter((m) =>
    m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.primaryRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingIndicator message="Loading members..." />;
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error) {
    return <ErrorBanner message={error} onRetry={fetchData} />;
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Current Project Members */}
      <div>
        <h3 className="text-sm font-semibold text-[#e5e1e4] uppercase tracking-wider mb-3">
          Project Members ({projectMembers.length})
        </h3>

        {projectMembers.length === 0 ? (
          <p className="text-sm text-[#859398] italic">
            No members assigned to this project yet.
          </p>
        ) : (
          <div className="space-y-2">
            {projectMembers.map((member) => (
              <div
                key={member.memberId}
                className="flex items-center justify-between rounded-lg border border-[#3c494e] bg-[#201f21] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00d4ff]/15 text-xs font-bold text-[#3cd7ff]">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e5e1e4]">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-[#859398] capitalize">
                      {member.primaryRole}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(member.memberId)}
                  disabled={actionLoading === member.memberId}
                  className="rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  aria-label={`Remove ${member.displayName} from project`}
                >
                  {actionLoading === member.memberId ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[#3c494e]" />

      {/* Add Members Section */}
      <div>
        <h3 className="text-sm font-semibold text-[#e5e1e4] uppercase tracking-wider mb-3">
          Add Members
        </h3>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or role..."
            className="block w-full rounded-lg border border-[#3c494e] bg-[#201f21] px-3 py-2 text-sm text-[#e5e1e4] placeholder-[#859398] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
            aria-label="Search available members"
          />
        </div>

        {/* Available Members List */}
        {filteredAvailable.length === 0 ? (
          <p className="text-sm text-[#859398] italic">
            {searchQuery
              ? 'No matching members found.'
              : 'All members are already assigned to this project.'}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-[#3c494e] bg-[#1c1b1d] p-2">
            {filteredAvailable.map((member) => (
              <div
                key={member.memberId}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[#2a2a2c] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3c494e] text-xs font-bold text-[#bbc9cf]">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e5e1e4]">
                      {member.displayName}
                    </p>
                    <p className="text-xs text-[#859398] capitalize">
                      {member.primaryRole}
                      {member.projectId && (
                        <span className="ml-1 text-yellow-500">(in another project)</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleAssign(member.memberId)}
                  disabled={actionLoading === member.memberId}
                  className="rounded-lg bg-[#00d4ff] px-3 py-1.5 text-xs font-medium text-[#003642] hover:bg-[#3cd7ff] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  aria-label={`Add ${member.displayName} to project`}
                >
                  {actionLoading === member.memberId ? 'Adding...' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
