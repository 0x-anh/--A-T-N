import { AlertCircle, AlertTriangle, ChevronUp, Zap } from 'lucide-react';

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
  updatedAt?: any;
  creatorId: string;
  assigneeId?: string;
  dueDate?: any;
}

export const STATUS_COLUMNS: { id: BugStatus, label: string }[] = [
  { id: 'backlog', label: 'Hàng Đợi / Nghỉ' },
  { id: 'in-progress', label: 'Đang Xử Lý' },
  { id: 'in-review', label: 'Đang Xác Minh' },
  { id: 'done', label: 'Đã Giải Quyết' }
];

export const PRIORITY_CONFIG: Record<BugPriority, { label: string, color: string, icon: any }> = {
  low: { label: 'P-04 / Thường Nhật', color: 'text-slate-400', icon: Zap },
  medium: { label: 'P-03 / Bình Thường', color: 'text-blue-400', icon: ChevronUp },
  high: { label: 'P-02 / Ưu Tiên Cao', color: 'text-orange-400', icon: AlertTriangle },
  critical: { label: 'P-01 / Nghiêm Trọng', color: 'text-red-400', icon: AlertCircle }
};
