import { useState, useCallback } from 'react';
import { useAppStore } from '../store/app.store';
import { QuestCategory, PendingTaskCard, ProposeTaskForm } from '../components/quest';
import { LoadingIndicator, CompletionAnimation, ConfirmationToast } from '../components/shared';

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
  const clearCompletionFeedback = useAppStore((s) => s.clearCompletionFeedback);
  const clearNotificationWarning = useAppStore((s) => s.clearNotificationWarning);

  const [toast, setToast] = useState<ToastState | null>(null);

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
    async (title: string, description: string) => {
      try {
        await storeProposeTask(title, description);
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

  if (questsLoading) {
    return <LoadingIndicator size="lg" message="Loading quests..." />;
  }

  return (
    <div className="space-y-6 p-4">
      {/* Completion Animation */}
      <CompletionAnimation
        visible={completionFeedback !== null && completionFeedback.success}
        onComplete={clearCompletionFeedback}
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

      {/* Agent View */}
      {selectedRole === 'agent' && (
        <>
          <QuestCategory
            title="Onboarding"
            quests={quests?.onboarding ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
          />
          <QuestCategory
            title="Daily Tasks"
            quests={quests?.daily ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
          />
          <QuestCategory
            title="Milestones"
            quests={quests?.milestones ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
          />
        </>
      )}

      {/* Developer View */}
      {selectedRole === 'developer' && (
        <>
          <QuestCategory
            title="Sprint Tasks"
            quests={quests?.sprint ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
          />

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-gray-800">Pending Tasks</h3>
            {(quests?.pending ?? []).length === 0 ? (
              <p className="py-2 text-sm text-gray-400">No pending tasks</p>
            ) : (
              <div className="space-y-2">
                {(quests?.pending ?? []).map((quest) => (
                  <PendingTaskCard
                    key={quest.questId}
                    quest={quest}
                    currentMemberId={currentMember?.memberId ?? ''}
                    isScrumMaster={true}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}

            <ProposeTaskForm onSubmit={handlePropose} />
          </section>
        </>
      )}
    </div>
  );
}
