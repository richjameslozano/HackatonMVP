import type { Quest, Member, LarkMessage } from '../types';
import { sendMessage } from './lark-bot.service';

// ─── Result Type ────────────────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean;
  warning?: string;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Validates that a recipient has a resolvable openId.
 * Returns a failure result if the recipient cannot be reached.
 */
function validateRecipient(recipient: Member): NotificationResult | null {
  if (!recipient.openId || recipient.openId.trim() === '') {
    return {
      success: false,
      warning: `Cannot deliver notification: recipient "${recipient.displayName}" has no resolvable open_id`,
    };
  }
  return null;
}

/**
 * Builds a text LarkMessage from a plain string.
 */
function buildTextMessage(text: string): LarkMessage {
  return {
    msg_type: 'text',
    content: JSON.stringify({ text }),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Sends a task proposal notification to the assigned Scrum Master.
 * Message contains the task title and proposer (developer) name.
 *
 * Never throws. Returns a NotificationResult indicating success or a warning.
 */
export async function notifyTaskProposal(
  quest: Quest,
  developer: Member,
  scrumMaster: Member
): Promise<NotificationResult> {
  const recipientError = validateRecipient(scrumMaster);
  if (recipientError) return recipientError;

  const text = `📋 New task proposal: "${quest.title}" proposed by ${developer.displayName}. Please review.`;
  const message = buildTextMessage(text);

  const result = await sendMessage(scrumMaster.openId, message);

  if (!result.success) {
    return {
      success: false,
      warning: `Failed to notify Scrum Master "${scrumMaster.displayName}": ${result.error ?? 'Unknown error'}`,
    };
  }

  return { success: true };
}

/**
 * Sends an approval notification to the Developer who proposed the task.
 * Message contains the task title and approving Scrum Master name.
 *
 * Never throws. Returns a NotificationResult indicating success or a warning.
 */
export async function notifyApproval(
  quest: Quest,
  scrumMaster: Member,
  developer: Member
): Promise<NotificationResult> {
  const recipientError = validateRecipient(developer);
  if (recipientError) return recipientError;

  const text = `Your task "${quest.title}" has been approved by ${scrumMaster.displayName}.`;
  const message = buildTextMessage(text);

  const result = await sendMessage(developer.openId, message);

  if (!result.success) {
    return {
      success: false,
      warning: `Failed to notify Developer "${developer.displayName}": ${result.error ?? 'Unknown error'}`,
    };
  }

  return { success: true };
}

/**
 * Sends a rejection notification to the Developer who proposed the task.
 * Message contains the task title, rejecting Scrum Master name, and rejection reason.
 *
 * Never throws. Returns a NotificationResult indicating success or a warning.
 */
export async function notifyRejection(
  quest: Quest,
  scrumMaster: Member,
  developer: Member,
  reason: string
): Promise<NotificationResult> {
  const recipientError = validateRecipient(developer);
  if (recipientError) return recipientError;

  const text = `Your task "${quest.title}" has been rejected by ${scrumMaster.displayName}. Reason: ${reason}`;
  const message = buildTextMessage(text);

  const result = await sendMessage(developer.openId, message);

  if (!result.success) {
    return {
      success: false,
      warning: `Failed to notify Developer "${developer.displayName}": ${result.error ?? 'Unknown error'}`,
    };
  }

  return { success: true };
}
