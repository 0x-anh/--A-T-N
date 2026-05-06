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

export type UserRole = 'admin' | 'developer' | 'qa' | 'viewer';

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles?: UserRole[];
}

export const ROLE_CONFIG: Record<UserRole, { label: string, color: string }> = {
  admin: { label: 'Quản trị viên', color: 'bg-indigo-500' },
  developer: { label: 'Lập trình viên', color: 'bg-emerald-500' },
  qa: { label: 'Kiểm thử viên', color: 'bg-amber-500' },
  viewer: { label: 'Người quan sát', color: 'bg-slate-400' }
};

export const ROLE_PERMISSIONS: Record<UserRole, BugStatus[]> = {
  admin: ['backlog', 'in-progress', 'in-review', 'done'],
  developer: ['backlog', 'in-progress', 'in-review'],
  qa: ['backlog', 'in-review', 'done'],
  viewer: []
};

export const canUserMoveTo = (userRoles: UserRole[] | undefined, targetStatus: BugStatus): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  if (userRoles.includes('admin')) return true;
  
  const allowedStatuses = new Set<BugStatus>();
  userRoles.forEach(role => {
    ROLE_PERMISSIONS[role].forEach(status => allowedStatuses.add(status));
  });
  
  return allowedStatuses.has(targetStatus);
};

export const canEditBug = (userRoles: UserRole[] | undefined, status: BugStatus): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  if (userRoles.includes('admin')) return true;
  
  // Developer can edit while in their active states
  if (userRoles.includes('developer') && (status === 'in-progress' || status === 'in-review')) return true;
  // QA can edit during review or initial backlog setup
  if (userRoles.includes('qa') && (status === 'backlog' || status === 'in-review' || status === 'done')) return true;
  
  return false;
};

export const canDeleteBug = (userRoles: UserRole[] | undefined): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes('admin') || userRoles.includes('qa');
};

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
  dueDate?: string;
  members?: string[];
}

export const STATUS_COLUMNS: { id: BugStatus, label: string }[] = [
  { id: 'backlog', label: 'Hàng Đợi' },
  { id: 'in-progress', label: 'Đang Xử Lý' },
  { id: 'in-review', label: 'Đang Kiểm Tra' },
  { id: 'done', label: 'Đã Hoàn Thành' }
];

export const PRIORITY_CONFIG: Record<BugPriority, { label: string, color: string, icon: any }> = {
  low: { label: 'Thấp [LV-0]', color: 'text-slate-400', icon: Zap },
  medium: { label: 'Trung Bình [LV-1]', color: 'text-blue-400', icon: ChevronUp },
  high: { label: 'Cao [LV-2]', color: 'text-amber-500', icon: AlertTriangle },
  critical: { label: 'Nghiêm Trọng [LV-MAX]', color: 'text-violet-500', icon: AlertCircle }
};
