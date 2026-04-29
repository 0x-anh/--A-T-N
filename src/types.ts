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
  admin: { label: 'Admin / Quản trị', color: 'bg-indigo-500' },
  developer: { label: 'Dev / Lập trình', color: 'bg-emerald-500' },
  qa: { label: 'QA / Kiểm thử', color: 'bg-amber-500' },
  viewer: { label: 'View / Quan sát', color: 'bg-slate-400' }
};

export const ROLE_PERMISSIONS: Record<UserRole, BugStatus[]> = {
  admin: ['backlog', 'in-progress', 'in-review', 'done'],
  developer: ['in-progress', 'in-review'],
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
  dueDate?: string; // YYYY-MM-DDTHH:mm
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
