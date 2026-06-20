import type { Quest, Member } from '../types';

/**
 * Returns true only if the quest is active (can be completed).
 * Prevents completion of pending or rejected quests.
 */
export function canCompleteQuest(quest: Quest): boolean {
  return quest.status === 'active';
}

/**
 * Returns true if the viewer is allowed to approve or reject this quest.
 * Conditions: quest must be pending AND viewer must be a Scrum Master.
 * Note: Self-approval is allowed since the scrum master and developer
 * may be the same person in small teams.
 */
export function canApproveReject(
  _viewerId: string,
  quest: Quest,
  viewerIsScrumMaster: boolean
): boolean {
  return (
    quest.status === 'pending' &&
    viewerIsScrumMaster
  );
}

/**
 * Returns false if the quest is pending (locked from modification).
 * Returns true otherwise.
 */
export function canModifyPendingTask(quest: Quest): boolean {
  return quest.status !== 'pending';
}

/**
 * Returns true if the member has more than one role,
 * indicating the role switcher should be visible.
 */
export function shouldShowRoleSwitcher(member: Member): boolean {
  return member.roles.length > 1;
}
