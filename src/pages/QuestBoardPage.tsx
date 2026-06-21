import { useState, useCallback } from 'react';
import { useAppStore } from '../store/app.store';
import { QuestCategory, PendingTaskCard, ProposeTaskForm, ResubmitTaskModal } from '../components/quest';
import { LoadingIndicator, CompletionAnimation, ConfirmationToast, ConfettiAnimation } from '../components/shared';
import { canResubmitTask } from '../utils/permissions';
import type { Quest, Difficulty } from '../types';

interface ToastState {
  message: string;
  type: 'success' | 'warning';
}

export function QuestBoardPage() {
  const currentMember = useAppStore((s) => s.currentMember);
  const selectedRole = useAppStore((s) => s.selectedRole);
  const quests = useAppStore((s) => s.quests);
  const questsLoading = useAppStore((s) => s.questsLoading);
  const completionFeedback = useAppStore((s) => s.completionFeedback);
  const notificationWarning = useAppStore((s) => s.notificationWarning);
  const completedQuestIds = useAppStore((s) => s.completedQuestIds);

  const storeCompleteQuest = useAppStore((s) => s.completeQuest);
  const storeProposeTask = useAppStore((s) => s.proposeTask);
  const storeApproveTask = useAppStore((s) => s.approveTask);
  const storeRejectTask = useAppStore((s) => s.rejectTask);
  const storeEditPendingTask = useAppStore((s) => s.editPendingTask);
  const storeWithdrawTask = useAppStore((s) => s.withdrawTask);
  const storeResubmitTask = useAppStore((s) => s.resubmitTask);
  const clearCompletionFeedback = useAppStore((s) => s.clearCompletionFeedback);
  const clearNotificationWarning = useAppStore((s) => s.clearNotificationWarning);
  const newBadgeUnlocked = useAppStore((s) => s.newBadgeUnlocked);
  const clearNewBadgeUnlocked = useAppStore((s) => s.clearNewBadgeUnlocked);
  const isScrumMaster = useAppStore((s) => s.isScrumMaster);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [resubmitQuest, setResubmitQuest] = useState<Quest | null>(null);

  const handleComplete = useCallback(
    async (questId: string) => {
      try {
        await storeCompleteQuest(questId);
      } catch {
        setToast({ message: 'Failed to complete quest. Please try again.', type: 'warning' });
      }
    },
    [storeCompleteQuest],
  );

  const handlePropose = useCallback(
    async (title: string, description: string, difficulty: Difficulty) => {
      try {
        await storeProposeTask(title, description, difficulty);
        setToast({ message: 'Task proposed successfully!', type: 'success' });
      } catch {
        setToast({ message: 'Failed to propose task. Please try again.', type: 'warning' });
      }
    },
    [storeProposeTask],
  );

  const handleApprove = useCallback(
    async (questId: string) => {
      try {
        await storeApproveTask(questId);
        setToast({ message: 'Task approved successfully!', type: 'success' });
      } catch {
        setToast({ message: 'Failed to approve task. Please try again.', type: 'warning' });
      }
    },
    [storeApproveTask],
  );

  const handleReject = useCallback(
    async (questId: string, reason: string) => {
      try {
        await storeRejectTask(questId, reason);
        setToast({ message: 'Task rejected.', type: 'success' });
      } catch {
        setToast({ message: 'Failed to reject task. Please try again.', type: 'warning' });
      }
    },
    [storeRejectTask],
  );

  const handleEditPendingTask = useCallback(
    async (questId: string, title: string, description: string) => {
      try {
        await storeEditPendingTask(questId, title, description);
        setToast({ message: 'Task updated successfully!', type: 'success' });
      } catch {
        setToast({ message: 'Failed to update task. Please try again.', type: 'warning' });
      }
    },
    [storeEditPendingTask],
  );

  const handleWithdrawTask = useCallback(
    async (questId: string) => {
      try {
        await storeWithdrawTask(questId);
        setToast({ message: 'Task withdrawn.', type: 'success' });
      } catch {
        setToast({ message: 'Failed to withdraw task. Please try again.', type: 'warning' });
      }
    },
    [storeWithdrawTask],
  );

  const handleResubmitTask = useCallback(
    async (originalQuestId: string, title: string, description: string) => {
      try {
        await storeResubmitTask(originalQuestId, title, description);
        setToast({ message: 'Task resubmitted for review!', type: 'success' });
        setResubmitQuest(null);
      } catch {
        setToast({ message: 'Failed to resubmit task. Please try again.', type: 'warning' });
      }
    },
    [storeResubmitTask],
  );

  if (questsLoading) {
    return <LoadingIndicator size="lg" message="Loading quests..." />;
  }

  return (
    <div className="space-y-6">
      {/* Completion Animation */}
      <CompletionAnimation
        visible={completionFeedback !== null && completionFeedback.success}
        onComplete={clearCompletionFeedback}
      />

      {/* Confetti on badge unlock */}
      <ConfettiAnimation
        visible={newBadgeUnlocked}
        onComplete={clearNewBadgeUnlocked}
      />

      {/* Notification warning toast */}
      {notificationWarning && (
        <ConfirmationToast
          message={notificationWarning}
          type="warning"
          onDismiss={clearNotificationWarning}
        />
      )}

      {/* Action confirmation toast */}
      {toast && (
        <ConfirmationToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Page header - Agent view only */}
      {selectedRole === 'agent' && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-madrid-600">
            MADRID_HQ // QUEST_BOARD
          </p>
          <h1 className="mt-1 text-2xl font-bold text-surface-900">Agent Quest Board</h1>
          <p className="mt-1 text-sm text-surface-500">
            Complete quests to earn badges and climb the leaderboard.
          </p>
        </div>
      )}

      {/* Agent View */}
      {selectedRole === 'agent' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <QuestCategory
              title="Agent Onboarding"
              quests={quests?.onboarding ?? []}
              onComplete={handleComplete}
              completedQuestIds={completedQuestIds}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                </svg>
              }
            />

            <QuestCategory
              title="Agent Milestones"
              quests={quests?.milestones ?? []}
              onComplete={handleComplete}
              completedQuestIds={completedQuestIds}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.996.178-1.768.65-2.08 1.283m0 0a5.334 5.334 0 003.168 1.647m-3.168-1.647a3 3 0 01-.327-1.267M20.83 5.519c.996.178 1.768.65 2.08 1.283m0 0a5.334 5.334 0 01-3.168 1.647m3.168-1.647a3 3 0 00.327-1.267" />
                </svg>
              }
            />

            {(quests?.assigned ?? []).length > 0 && (
              <QuestCategory
                title="Assigned to You"
                quests={quests?.assigned ?? []}
                onComplete={handleComplete}
                completedQuestIds={completedQuestIds}
              />
            )}

            {(quests?.open ?? []).length > 0 && (
              <QuestCategory
                title="Open Tasks (Optional)"
                quests={quests?.open ?? []}
                onComplete={handleComplete}
                completedQuestIds={completedQuestIds}
                emptyMessage="No open tasks available"
              />
            )}
          </div>

          {/* Sidebar - Daily quests */}
          <div className="space-y-6">
            <QuestCategory
              title="Daily Quests"
              quests={quests?.daily ?? []}
              onComplete={handleComplete}
              completedQuestIds={completedQuestIds}
              showStreak
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {/* Developer View */}
      {selectedRole === 'developer' && (
        <>
          {/* Developer header with Propose Task button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-madrid-600">
                MADRID_HQ // SPRINT_04
              </p>
              <h1 className="mt-1 text-2xl font-bold text-surface-900">Developer Quest Board</h1>
              <p className="mt-1 text-sm text-surface-500">
                Overview of active development sprints and community-proposed features.
              </p>
            </div>
            <ProposeTaskForm onSubmit={handlePropose} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <QuestCategory
                title="Approved Sprint Tasks"
                quests={quests?.sprint ?? []}
                onComplete={handleComplete}
                completedQuestIds={completedQuestIds}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              {(quests?.assigned ?? []).length > 0 && (
                <QuestCategory
                  title="Assigned to You"
                  quests={quests?.assigned ?? []}
                  onComplete={handleComplete}
                  completedQuestIds={completedQuestIds}
                />
              )}

              {(quests?.open ?? []).length > 0 && (
                <QuestCategory
                  title="Open Tasks (Optional)"
                  quests={quests?.open ?? []}
                  onComplete={handleComplete}
                  completedQuestIds={completedQuestIds}
                  emptyMessage="No open tasks available"
                />
              )}
            </div>

            {/* Sidebar - Pending tasks */}
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="h-5 w-5 text-madrid-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-base font-semibold text-surface-900">Pending Approval</h3>
                </div>
                {(quests?.pending ?? []).length === 0 ? (
                  <p className="py-2 text-sm text-surface-400 italic">Awaiting first vote</p>
                ) : (
                  <div className="space-y-3">
                    {(quests?.pending ?? []).map((quest) => (
                      <PendingTaskCard
                        key={quest.questId}
                        quest={quest}
                        currentMemberId={currentMember?.memberId ?? ''}
                        isScrumMaster={isScrumMaster}
                        proposerName={quest.proposerId === currentMember?.memberId ? currentMember?.displayName : undefined}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onEdit={handleEditPendingTask}
                        onWithdraw={handleWithdrawTask}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Rejected Tasks — shows rejected tasks proposed by current user */}
              {(quests?.rejected ?? []).length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <h3 className="text-base font-semibold text-surface-900">Rejected Tasks</h3>
                  </div>
                  <div className="space-y-3">
                    {(quests?.rejected ?? []).map((quest) => (
                      <div
                        key={quest.questId}
                        className="rounded-xl border border-red-100 bg-red-50/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-surface-900">{quest.title}</h4>
                            {quest.description && (
                              <p className="mt-1 text-xs text-surface-500 line-clamp-2">{quest.description}</p>
                            )}
                            {quest.rejectionReason && (
                              <p className="mt-2 text-xs text-red-600">
                                <span className="font-medium">Reason:</span> {quest.rejectionReason}
                              </p>
                            )}
                          </div>
                          {canResubmitTask(quest, currentMember?.memberId ?? '') && (
                            <button
                              type="button"
                              onClick={() => setResubmitQuest(quest)}
                              className="flex-shrink-0 rounded-lg border border-madrid-200 bg-madrid-50 px-3 py-1.5 text-xs font-medium text-madrid-700 transition-colors hover:bg-madrid-100"
                              aria-label={`Resubmit task: ${quest.title}`}
                            >
                              Resubmit
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resubmit Task Modal */}
          {resubmitQuest && (
            <ResubmitTaskModal
              quest={resubmitQuest}
              onSubmit={handleResubmitTask}
              onClose={() => setResubmitQuest(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
