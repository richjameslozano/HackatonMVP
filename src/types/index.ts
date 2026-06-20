// ─── Role and Category Types ────────────────────────────────────────────────

export type Role = 'agent' | 'developer';

export type TargetRole = Role | 'all';

export type QuestCategory = 'onboarding' | 'daily' | 'milestone' | 'sprint';

export type QuestStatus = 'active' | 'pending' | 'rejected';

export type AssignmentType = 'all' | 'assigned' | 'open';

export type CompletionMode = 'multiple' | 'first-claim';

// ─── Domain Interfaces ──────────────────────────────────────────────────────

export interface Member {
  memberId: string;
  displayName: string;
  openId: string;
  roles: Role[];
  primaryRole: Role;
  scrumMasterId: string | null;
}

export interface Quest {
  questId: string;
  title: string;
  description: string;
  category: QuestCategory;
  targetRole: TargetRole;
  status: QuestStatus;
  assignmentType: AssignmentType;
  assigneeId: string | null;
  completionMode: CompletionMode;
  proposerId: string | null;
  createdAt: Date;
}

export interface QuestCompletion {
  completionId: string;
  memberId: string;
  questId: string;
  completedAt: Date;
}

export interface Badge {
  badgeId: string;
  name: string;
  iconUrl: string;
  targetRole: Role;
  requiredCompletions: number;
  description: string;
}

export interface BadgeEarned {
  earnedId: string;
  memberId: string;
  badgeId: string;
  earnedAt: Date;
}

// ─── View/Composite Interfaces ──────────────────────────────────────────────

export interface CategorizedQuests {
  onboarding?: Quest[];
  daily?: Quest[];
  milestones?: Quest[];
  sprint?: Quest[];
  pending?: Quest[];
  open?: Quest[];
  assigned?: Quest[];
}

export interface BadgeCollectionView {
  badges: Array<{
    badge: Badge;
    earned: boolean;
    earnedAt?: Date;
  }>;
  earnedCount: number;
  totalCount: number;
  qualifyingCompletions: number;
  nextBadge: Badge | null;
  nextBadgeProgress: number; // completions toward next badge threshold
  nextBadgeRequired: number; // total required for next badge
}

export interface LeaderboardEntry {
  member: Member;
  badgeCount: number;
  rank: number;
}

// ─── Lark API Types ─────────────────────────────────────────────────────────

export interface LarkFilter {
  conjunction: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface FilterCondition {
  field_name: string;
  operator: 'is' | 'isNot' | 'contains' | 'isGreater' | 'isLess';
  value: string[];
}

export interface LarkSort {
  field_name: string;
  order: 'asc' | 'desc';
}

export interface LarkRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface LarkMessage {
  msg_type: 'text' | 'interactive';
  content: string; // JSON-stringified message content
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
