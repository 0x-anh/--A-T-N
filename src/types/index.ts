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

export type UserRole = 'editor' | 'tester' | 'viewer'; 

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  roles?: UserRole[];
}

export const ROLE_CONFIG: Record<UserRole, { label: string, color: string }> = {
  editor: { label: 'Điều hành viên', color: 'bg-indigo-500' },
  tester: { label: 'Kiểm thử viên', color: 'bg-amber-500' },
  viewer: { label: 'Người quan sát', color: 'bg-slate-400' }
};

export const ROLE_PERMISSIONS: Record<UserRole, BugStatus[]> = {
  editor: ['backlog', 'in-progress', 'in-review', 'done'],
  tester: ['backlog', 'in-review', 'done'],
  viewer: []
};

export const canUserMoveTo = (userRoles: UserRole[] | undefined, fromStatus: BugStatus, toStatus: BugStatus): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  
  // Editor logic: Điều hành viên làm việc chính
  if (userRoles.includes('editor')) {
    if (fromStatus === 'backlog' && toStatus === 'in-progress') return true;
    if (fromStatus === 'in-progress' && toStatus === 'in-review') return true;
    // Editor không được tự ý Done hoặc tự ý bỏ vào Review từ Backlog mà không qua In-progress
    // Nhưng để linh hoạt, cho phép Editor di chuyển trong phạm vi công việc của họ
    if (toStatus === 'done') return false; 
  }
  
  // Tester logic: Kiểm thử viên chốt kết quả hoặc bác bỏ
  if (userRoles.includes('tester')) {
    if (fromStatus === 'in-review') {
      if (toStatus === 'done' || toStatus === 'backlog') return true;
    }
  }
  
  return false;
};

export const canEditBug = (userRoles: UserRole[] | undefined, status: BugStatus): boolean => {
  if (!userRoles || userRoles.length === 0) return false;
  // Editor chỉ có thể sửa khi đang làm việc (Backlog/In-progress)
  if (userRoles.includes('editor')) {
    return status === 'backlog' || status === 'in-progress';
  }
  if (userRoles.includes('tester') && status === 'in-review') return true;
  return false;
};

export const canDeleteBug = (userRoles: UserRole[] | undefined): boolean => {
  return false; // Chỉ Owner mới có quyền xóa (logic xử lý tại component)
};

export const canCreateTask = (userRoles: UserRole[] | undefined, isAdmin: boolean): boolean => {
  if (isAdmin) return true;
  if (!userRoles || userRoles.length === 0) return false;
  // Chỉ Editor và Tester mới được tạo nhiệm vụ/lỗi mới. Viewer chỉ được xem.
  return userRoles.includes('editor') || userRoles.includes('tester');
};

export const canManageTeam = (userRoles: UserRole[] | undefined, isAdmin: boolean, isOwner: boolean): boolean => {
  if (isAdmin || isOwner) return true;
  // Thường chỉ Admin/Owner mới được quản lý nhân sự. Editor không có quyền này.
  return false;
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
  ownerId?: string;
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
