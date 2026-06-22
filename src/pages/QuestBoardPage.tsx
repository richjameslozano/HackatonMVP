import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store/app.store';
import { QuestCategory, ProposeTaskForm, ResubmitTaskModal } from '../components/quest';
import { LoadingIndicator, CompletionAnimation, ConfirmationToast, ConfettiAnimation } from '../components/shared';
import { canResubmitTask } from '../utils/permissions';
import type { Quest, Difficulty } from '../types';

interface ToastState {
  message: string;
  type: 'success' | 'warning';
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  const [showAllPendingModal, setShowAllPendingModal] = useState(false);
  const [reviewingQuestId, setReviewingQuestId] = useState<string | null>(null);

  const pendingTasks = useMemo(() => quests?.pending ?? [], [quests]);
  const visiblePendingTasks = useMemo(() => pendingTasks.slice(0, 3), [pendingTasks]);
  const hasMorePending = pendingTasks.length > 0;

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
    async (title: string, description: string, difficulty: Difficulty, projectId: string) => {
      try {
        await storeProposeTask(title, description, difficulty, projectId);
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

      {/* Hero branding section */}
      <div className="relative glass-panel scanline overflow-hidden p-8 border-2 border-[rgba(0,212,255,0.2)] rounded-xl">
        <div className="relative z-10">
          <h1 className="font-headline text-[48px] font-bold text-[#3cd7ff] tracking-tight leading-tight">
            {selectedRole === 'developer' ? 'Developer Quest Board' : 'Agent Quest Board'}
          </h1>
          <p className="mt-3 text-base text-[#bbc9cf] max-w-2xl">
            {selectedRole === 'developer'
              ? 'Accept challenges, squash bugs, and earn EXP. The realm of code awaits your mastery. ⚔️'
              : 'Complete quests to earn badges and climb the leaderboard. Your journey begins here.'
            }
          </p>
        </div>
      </div>

      {/* Agent View */}
      {selectedRole === 'agent' && (
        <div className="space-y-6">
          <QuestCategory
            title="Agent Onboarding"
            quests={quests?.onboarding ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
            icon={
              <span className="material-symbols-outlined text-2xl">school</span>
            }
          />

          <QuestCategory
            title="Agent Milestones"
            quests={quests?.milestones ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
            icon={
              <span className="material-symbols-outlined text-2xl">emoji_events</span>
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

          <QuestCategory
            title="Daily Quests"
            quests={quests?.daily ?? []}
            onComplete={handleComplete}
            completedQuestIds={completedQuestIds}
            showStreak
            icon={
              <span className="material-symbols-outlined text-2xl">schedule</span>
            }
          />
        </div>
      )}

      {/* Developer View */}
      {selectedRole === 'developer' && (
        <>
          {/* Main content — single column */}
          <div className="space-y-6">
            <QuestCategory
              title="Approved Sprint Tasks"
              quests={quests?.sprint ?? []}
              onComplete={handleComplete}
              completedQuestIds={completedQuestIds}
              icon={
                <span className="material-symbols-outlined text-2xl">check_circle</span>
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

            {(quests?.daily ?? []).length > 0 && (
              <QuestCategory
                title="Project Tasks"
                quests={quests?.daily ?? []}
                onComplete={handleComplete}
                completedQuestIds={completedQuestIds}
                icon={
                  <span className="material-symbols-outlined text-2xl">folder_open</span>
                }
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

          {/* Fixed Right Panel — rendered via portal to avoid transform containment */}
          {createPortal(
            <aside className="hidden lg:block w-[340px] h-screen fixed right-0 top-0 bg-[rgba(25,25,35,0.95)] backdrop-blur-xl border-l border-[rgba(0,212,255,0.08)] pt-4 px-5 pb-6 z-40 overflow-y-auto">
              {/* In-Review Quests header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#3cd7ff] text-xl">pending_actions</span>
                <h3 className="font-headline text-lg font-bold text-[#e5e1e4]">In-Review Quests</h3>
              </div>

              {/* Pending tasks (limited to 5) — new inline card design */}
              {pendingTasks.length === 0 ? (
                <p className="py-2 text-sm text-[#859398] italic">No tasks awaiting review</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {visiblePendingTasks.map((quest) => (
                    <div
                      key={quest.questId}
                      className="bg-[#201f21] border border-[#3c494e]/30 hover:border-[rgba(0,212,255,0.5)] p-4 rounded-lg transition-colors"
                    >
                      {/* Top row: badge + time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#d1bcff] bg-[rgba(205,183,255,0.1)] border border-[rgba(205,183,255,0.3)] px-2 py-0.5 rounded">
                          Review Pending
                        </span>
                        <span className="text-[10px] text-[#859398] font-mono">
                          {timeAgo(quest.createdAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-headline text-[16px] font-bold text-white leading-tight mb-1">
                        {quest.title}
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#3cd7ff] bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] px-2 py-0.5 rounded mt-1 inline-block">
                        Project: {quest.projectIds.length > 0 ? quest.projectIds.join(', ') : 'Unassigned'}
                      </span>

                      {/* Description */}
                      {quest.description && (
                        <p className="text-xs text-[#859398] line-clamp-2 mb-3">
                          {quest.description}
                        </p>
                      )}

                      {/* Bottom row: 3 buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(quest.questId)}
                          className="flex-1 text-[11px] font-mono uppercase tracking-wider py-1.5 px-2 rounded bg-[rgba(0,212,255,0.2)] text-[#3cd7ff] border border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.3)] transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(quest.questId, 'Rejected via quick action')}
                          className="w-[70px] text-[11px] font-mono uppercase tracking-wider py-1.5 px-2 rounded border border-[#3c494e] text-[#e5e1e4] hover:border-[#859398] transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingQuestId(quest.questId)}
                          className="w-[70px] text-[11px] font-mono uppercase tracking-wider py-1.5 px-2 rounded border border-[#3c494e] text-[#e5e1e4] hover:border-[#859398] transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* REVIEW ALL button */}
                  {hasMorePending && (
                    <button
                      type="button"
                      onClick={() => setShowAllPendingModal(true)}
                      className="w-full border border-[rgba(0,212,255,0.4)] text-[#3cd7ff] py-3 font-mono uppercase tracking-widest text-sm hover:bg-[rgba(0,212,255,0.05)] transition-colors flex items-center justify-center gap-2 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-base">tune</span>
                      Review All
                    </button>
                  )}
                </div>
              )}

              {/* Rejected Tasks */}
              {(quests?.rejected ?? []).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-xl">cancel</span>
                    <h3 className="font-headline text-base font-bold text-[#e5e1e4]">Rejected Tasks</h3>
                  </div>
                  <div className="space-y-3">
                    {(quests?.rejected ?? []).map((quest) => (
                      <div
                        key={quest.questId}
                        className="rounded-xl border border-red-900/40 bg-red-900/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-[#e5e1e4]">{quest.title}</h4>
                            {quest.description && (
                              <p className="mt-1 text-xs text-[#bbc9cf] line-clamp-2">{quest.description}</p>
                            )}
                            {quest.rejectionReason && (
                              <p className="mt-2 text-xs text-[#ffb4ab]">
                                <span className="font-medium">Reason:</span> {quest.rejectionReason}
                              </p>
                            )}
                          </div>
                          {canResubmitTask(quest, currentMember?.memberId ?? '') && (
                            <button
                              type="button"
                              onClick={() => setResubmitQuest(quest)}
                              className="flex-shrink-0 rounded-lg border border-[rgba(0,212,255,0.4)] bg-[#003642] px-3 py-1.5 text-xs font-medium text-[#3cd7ff] transition-colors hover:shadow-glow hover:border-[#3cd7ff]"
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

              {/* Propose Task promo card */}
              <div className="mt-auto glass-panel p-5 rounded-xl border border-[rgba(0,212,255,0.3)] bg-gradient-to-br from-[#003642]/40 to-transparent shadow-[0_0_20px_rgba(0,212,255,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#3cd7ff] text-xl">add_circle</span>
                  <h4 className="font-headline text-sm font-bold text-[#e5e1e4]">Propose a Quest</h4>
                </div>
                <p className="text-xs text-[#bbc9cf] mb-4">
                  Have an idea? Submit a task proposal for Scrum Master review.
                </p>
                <ProposeTaskForm onSubmit={handlePropose} />
              </div>
            </aside>,
            document.body
          )}

          {/* Mission Control: Bulk Review Modal */}
          {showAllPendingModal && createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 md:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mission-control-title"
            >
              {/* Click backdrop to close */}
              <div
                className="absolute inset-0"
                onClick={() => setShowAllPendingModal(false)}
                aria-hidden="true"
              />

              {/* Modal container */}
              <div className="relative w-full max-w-5xl h-[85vh] bg-[#0e0e10] border border-[rgba(168,232,255,0.2)] flex flex-col overflow-hidden shadow-2xl">
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#3cd7ff]" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#3cd7ff]" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#3cd7ff]" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#3cd7ff]" />

                {/* Header */}
                <div className="p-6 md:p-8 pb-4 border-b border-[rgba(168,232,255,0.1)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 id="mission-control-title" className="font-headline text-[32px] md:text-[48px] font-bold text-[#3cd7ff] leading-tight tracking-tight">
                        Mission Control: Bulk Review
                      </h2>
                      <p className="mt-2 font-mono text-sm text-[#859398]">
                        Initialize final protocols for pending quest proposals...
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllPendingModal(false)}
                      className="p-2 text-[#859398] hover:text-[#3cd7ff] transition-colors"
                      aria-label="Close"
                    >
                      <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4">
                  {pendingTasks.map((quest) => (
                    <div
                      key={quest.questId}
                      className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-[#201f21] border border-[#3c494e]/30 hover:border-[rgba(0,212,255,0.4)] p-5 rounded-lg transition-colors"
                    >
                      {/* Left: avatar + info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Avatar placeholder */}
                        <div className="w-12 h-12 flex-shrink-0 rounded bg-[#3c494e]/30 border border-[#3c494e]/50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#859398] text-xl">person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-headline text-base font-bold text-white leading-tight">
                            {quest.title}
                          </h4>
                          {quest.description && (
                            <p className="mt-1 text-sm text-[#859398] line-clamp-2">
                              {quest.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#3cd7ff]">
                              @{quest.proposerId === currentMember?.memberId ? currentMember?.displayName : (quest.proposerId ?? 'Unknown')}
                            </span>
                            <span className="w-1 h-1 bg-[#3c494e] rounded-full"></span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#bbc9cf] border border-[#3c494e]/50 bg-[#201f21] px-1.5 py-0.5">
                              {(quest.difficulty ?? 'easy').toUpperCase()}
                            </span>
                            <span className="w-1 h-1 bg-[#3c494e] rounded-full"></span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#bbc9cf] border border-[#3c494e]/50 bg-[#201f21] px-1.5 py-0.5">
                              Project: {quest.projectIds.length > 0 ? quest.projectIds.join(', ') : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: difficulty */}
                      <div className="flex flex-col items-center justify-center px-4 md:border-l md:border-r border-[#3c494e]/30 min-w-[100px]">
                        <span className="font-mono text-[10px] text-[#859398] uppercase tracking-wider">
                          Difficulty
                        </span>
                        <span className="font-headline text-lg font-bold text-[#3cd7ff] mt-0.5">
                          {quest.difficulty ?? 'N/A'}
                        </span>
                      </div>

                      {/* Right: action buttons */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReject(quest.questId, 'Rejected via bulk review')}
                          className="px-4 py-2 text-sm font-mono uppercase tracking-wider rounded border border-[#3c494e] text-[#e5e1e4] hover:border-[#ffb4ab] hover:text-[#ffb4ab] transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(quest.questId)}
                          className="px-4 py-2 text-sm font-mono uppercase tracking-wider rounded bg-[rgba(0,212,255,0.2)] text-[#3cd7ff] border border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.3)] hover:shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-[rgba(168,232,255,0.1)] p-4 md:px-8 flex items-center">
                  <div className="inline-flex items-center gap-2 bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] px-4 py-2 rounded-full">
                    {/* Pulsing dot */}
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3cd7ff] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3cd7ff]"></span>
                    </span>
                    <span className="font-mono text-xs text-[#3cd7ff] uppercase tracking-wider">
                      {pendingTasks.length} Pending Actions
                    </span>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Review Detail Modal (triggered from inline Review button) */}
          {reviewingQuestId && (() => {
            const quest = pendingTasks.find((q) => q.questId === reviewingQuestId);
            if (!quest) return null;
            return createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-detail-title"
              >
                <div
                  className="absolute inset-0"
                  onClick={() => setReviewingQuestId(null)}
                  aria-hidden="true"
                />
                <div className="relative w-full max-w-md bg-[#0e0e10] border border-[rgba(168,232,255,0.2)] p-6 shadow-2xl rounded-lg">
                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => setReviewingQuestId(null)}
                    className="absolute right-4 top-4 text-[#859398] hover:text-[#3cd7ff] transition-colors"
                    aria-label="Close"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>

                  <h3 id="review-detail-title" className="font-headline text-lg font-bold text-[#e5e1e4] mb-1">
                    Review Task Proposal
                  </h3>
                  <p className="text-sm text-[#859398] mb-5">Approve or reject this proposed task.</p>

                  {/* Task details */}
                  <div className="bg-[#201f21] border border-[#3c494e]/30 rounded-lg p-4 mb-5">
                    <h4 className="text-sm font-bold text-white">{quest.title}</h4>
                    {quest.description && (
                      <p className="mt-1.5 text-sm text-[#859398]">{quest.description}</p>
                    )}
                    <p className="mt-2 text-xs text-[#bbc9cf]">
                      Proposed by: {quest.proposerId === currentMember?.memberId ? currentMember?.displayName : (quest.proposerId ?? 'Unknown')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleApprove(quest.questId);
                        setReviewingQuestId(null);
                      }}
                      className="flex-1 py-2.5 rounded bg-[rgba(0,212,255,0.2)] text-[#3cd7ff] border border-[rgba(0,212,255,0.3)] font-mono text-sm uppercase tracking-wider hover:bg-[rgba(0,212,255,0.3)] transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReject(quest.questId, 'Rejected via review');
                        setReviewingQuestId(null);
                      }}
                      className="flex-1 py-2.5 rounded border border-[#3c494e] text-[#ffb4ab] font-mono text-sm uppercase tracking-wider hover:border-[#ffb4ab] transition-colors"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            );
          })()}

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
