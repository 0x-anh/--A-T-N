export type BugStatus = 'backlog' | 'in-progress' | 'in-review' | 'done';
export type BugPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: any;
  ownerId: string;
  members: string[];
}

export interface Comment {
  id: string;
  bugId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  bugId: string;
  userId: string;
  action: string;
  details: string;
  createdAt: any;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface Bug {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: BugStatus;
  priority: BugPriority;
  createdAt: any;
  creatorId: string;
  assigneeId?: string;
}

export const STATUS_COLUMNS: { id: BugStatus, label: string }[] = [
  { id: 'backlog', label: 'Mới' },
  { id: 'in-progress', label: 'Đang xử lý' },
  { id: 'in-review', label: 'Chờ duyệt' },
  { id: 'done', label: 'Hoàn thành' }
];

export const PRIORITY_CONFIG: Record<BugPriority, { label: string, color: string }> = {
  low: { label: 'Thấp', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Vừa', color: 'bg-blue-50 text-blue-600' },
  high: { label: 'Cao', color: 'bg-orange-50 text-orange-600' },
  critical: { label: 'Nghiêm trọng', color: 'bg-red-50 text-red-600' }
};
