import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  updateDoc, doc, addDoc, collection, serverTimestamp, deleteDoc, 
  query, where, orderBy, onSnapshot 
} from 'firebase/firestore';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  Bug, BugStatus, BugPriority, STATUS_COLUMNS, 
  UserProfile, Project, UserRole, canUserMoveTo 
} from '../types';
import { toast } from 'sonner';
import { Plus, Bug as BugIcon, Search, LayoutDashboard, ListFilter } from 'lucide-react';
import { cn } from '../lib/utils';

// Import sub-components
import KanbanHeader from './kanban/KanbanHeader';
import KanbanColumn from './kanban/KanbanColumn';
import TeamManagementModal from './kanban/TeamManagementModal';
import BugDetailModal from './kanban/BugDetailModal';

interface KanbanBoardProps {
  selectedProject: Project | null;
  userId: string;
  userProfiles: UserProfile[];
  bugs: Bug[];
  isAdmin: boolean;
  setShowQuickAdd: (val: boolean) => void;
  currentTime: Date;
  handleUpdateUserRoles: (userId: string, currentRoles: UserRole[], role: UserRole) => void;
  handleRemoveMember: (memberId: string) => void;
}

const KanbanBoard = ({ 
  selectedProject, userId, userProfiles, bugs, isAdmin, 
  setShowQuickAdd, currentTime, handleUpdateUserRoles, handleRemoveMember 
}: KanbanBoardProps) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<BugPriority | 'all'>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [isAdding, setIsAdding] = useState<BugStatus | null>(null);
  const [newBugTitle, setNewBugTitle] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mapping labels directly to avoid lookup issues
  const statusLabels: Record<BugStatus, string> = {
    'backlog': 'HÀNG ĐỢI CHIẾN LƯỢC',
    'in-progress': 'TIẾN TRÌNH VẬN HÀNH',
    'in-review': 'KIỂM SOÁT CHẤT LƯỢNG',
    'done': 'HOÀN TẤT MỤC TIÊU'
  };

  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchesSearch = bug.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || bug.priority === filterPriority;
      const matchesOverdue = !showOverdueOnly || (bug.status !== 'done' && bug.dueDate && new Date(bug.dueDate) < currentTime);
      return matchesSearch && matchesPriority && matchesOverdue;
    });
  }, [bugs, searchQuery, filterPriority, showOverdueOnly, currentTime]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<BugStatus, Bug[]> = {
      'backlog': [],
      'in-progress': [],
      'in-review': [],
      'done': []
    };
    filteredBugs.forEach(bug => {
      if (groups[bug.status]) groups[bug.status].push(bug);
    });
    return groups;
  }, [filteredBugs]);

  // Firebase Activity & Comments logic
  useEffect(() => {
    if (!selectedBug) return;
    const q = query(
      collection(db, 'bugs', selectedBug.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedBug]);

  const logActivity = async (bugId: string, type: string, content: string) => {
    if (!selectedProject || !userId) return;
    try {
      const profile = userProfiles.find(u => u.userId === userId);
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        bugId,
        action: type,
        details: content,
        userId,
        userName: profile?.displayName || 'Unknown',
        userPhoto: profile?.photoURL || '',
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error("Activity log failed:", e); }
  };

  const handleUpdateBugDetails = async (bugId: string, updates: Partial<Bug>) => {
    try {
      await updateDoc(doc(db, 'bugs', bugId), { ...updates, updatedAt: serverTimestamp() });
      if (selectedBug?.id === bugId) setSelectedBug({ ...selectedBug, ...updates });
    } catch (e) { toast.error("Cập nhật thất bại"); }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const newStatus = destination.droppableId as BugStatus;
    const currentUserProfile = userProfiles.find(u => u.userId === userId);

    if (!isAdmin && !canUserMoveTo(currentUserProfile?.roles, newStatus)) {
      toast.error("Truy cập bị từ chối: Bạn không có quyền chuyển sang trạng thái này");
      return;
    }

    try {
      await updateDoc(doc(db, 'bugs', draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      logActivity(draggableId, 'STATUS_CHANGE', `Chuyển trạng thái từ ${source.droppableId} sang ${newStatus}`);
      toast.success(`Đã chuyển sang ${newStatus.toUpperCase()}`);
    } catch (e) { toast.error("Lỗi đồng bộ dữ liệu"); }
  };

  const handleAddBug = async (status: BugStatus) => {
    if (!newBugTitle.trim() || !selectedProject) return;
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId: selectedProject.id, 
        title: newBugTitle.trim(), 
        status, 
        priority: 'low',
        ownerId: userId, 
        members: [userId], 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp()
      });
      logActivity(docRef.id, 'BUG_CREATED', `Khởi tạo nhiệm vụ: ${newBugTitle.trim()}`);
      setNewBugTitle('');
      setIsAdding(null);
      toast.success("Nút dữ liệu mới đã được khởi tạo");
    } catch (e) { toast.error("Lỗi khởi tạo"); }
  };

  const handleDeleteBug = async (bugId: string) => {
    // Advanced Undo Logic: Explicit setTimeout for stability
    const bugToDelete = bugs.find(b => b.id === bugId);
    const bugTitle = bugToDelete?.title || "Nút dữ liệu";

    const deleteTimeout = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'bugs', bugId));
        logActivity(bugId, 'BUG_DELETED', `Đã xóa nút dữ liệu: ${bugTitle}`);
        setSelectedBug(null);
        toast.success(`Đã chính thức giải phóng ${bugTitle}.`);
      } catch (e) {
        toast.error("Lỗi giải phóng dữ liệu.");
      }
      delete (window as any)[`timeout_bug_${bugId}`];
    }, 5000);

    (window as any)[`timeout_bug_${bugId}`] = deleteTimeout;

    toast(`Đang giải phóng ${bugTitle}...`, {
      duration: 5000,
      action: {
        label: "HOÀN TÁC",
        onClick: () => {
          const tId = (window as any)[`timeout_bug_${bugId}`];
          if (tId) {
            clearTimeout(tId);
            delete (window as any)[`timeout_bug_${bugId}`];
            toast.info(`Đã khôi phục ${bugTitle}.`);
          }
        }
      }
    });
  };

  const handleAddComment = async () => {
    if (!selectedBug || !newComment.trim()) return;
    try {
      const profile = userProfiles.find(u => u.userId === userId);
      await addDoc(collection(db, 'bugs', selectedBug.id, 'comments'), {
        userId,
        userName: profile?.displayName || 'Unknown',
        content: newComment.trim(), 
        createdAt: serverTimestamp()
      });
      logActivity(selectedBug.id, 'COMMENT_ADDED', `Thêm phản hồi: ${newComment.trim().slice(0, 20)}...`);
      setNewComment('');
    } catch (e) { toast.error("Gửi phản hồi thất bại"); }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden bg-slate-50" style={{ position: 'relative', zIndex: 10 }}>
      {/* Header section */}
      <div className="px-4 md:px-8 py-6 bg-white border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
            <BugIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase">Bảng Quản Trị</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hệ thống theo dõi vận hành • Zenith v4.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-950 transition-colors">
              <Search size={14} strokeWidth={3} />
            </div>
            <input 
              type="text" 
              placeholder="Tìm kiếm công việc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-950 outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all w-[200px] md:w-[300px]"
            />
          </div>
          
          <div className="h-8 w-[1px] bg-slate-100 mx-1" />
          
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                viewMode === 'board' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Bảng
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                viewMode === 'list' ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Danh sách
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 md:p-4 pb-10 overflow-hidden">
        {viewMode === 'board' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 overflow-x-auto no-scrollbar pb-4">
              {(['backlog', 'in-progress', 'in-review', 'done'] as BugStatus[]).map(status => (
                <KanbanColumn 
                  key={status}
                  title={statusLabels[status]}
                  status={status}
                  tasks={tasksByStatus[status]}
                  userProfiles={userProfiles}
                  onSelect={setSelectedBug}
                  isAdding={isAdding === status}
                  setIsAdding={setIsAdding}
                  newBugTitle={newBugTitle}
                  setNewBugTitle={setNewBugTitle}
                  handleAddBug={handleAddBug}
                  userId={userId}
                  isAdmin={isAdmin}
                  currentTime={currentTime}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-100 h-full overflow-hidden flex flex-col shadow-sm">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                  <LayoutDashboard size={14} />
                </div>
                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider">Danh sách công việc</h2>
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-100">
                Tổng cộng: {filteredBugs.length} nhiệm vụ
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-4 pb-4">Mã số</th>
                    <th className="px-4 pb-4">Công việc</th>
                    <th className="px-4 pb-4">Trạng thái</th>
                    <th className="px-4 pb-4">Độ ưu tiên</th>
                    <th className="px-4 pb-4">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBugs.map(bug => (
                    <tr 
                      key={bug.id} 
                      onClick={() => setSelectedBug(bug)}
                      className="group cursor-pointer hover:translate-x-1 transition-all"
                    >
                      <td className="px-4 py-4 bg-slate-50 first:rounded-l-2xl border-y border-l border-slate-100 text-[10px] font-bold font-mono text-slate-400">
                        {bug.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-4 bg-slate-50 border-y border-slate-100 text-xs font-bold text-slate-950">
                        {bug.title}
                      </td>
                      <td className="px-4 py-4 bg-slate-50 border-y border-slate-100">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                          bug.status === 'backlog' ? "bg-slate-200 text-slate-600" :
                          bug.status === 'in-progress' ? "bg-amber-100 text-amber-600" :
                          bug.status === 'in-review' ? "bg-brand-100 text-brand-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {statusLabels[bug.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 bg-slate-50 border-y border-slate-100">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          bug.priority === 'high' ? "text-rose-500" :
                          bug.priority === 'medium' ? "text-amber-500" : "text-slate-400"
                        )}>
                          {bug.priority === 'high' ? 'Cao' : bug.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </td>
                      <td className="px-4 py-4 bg-slate-50 last:rounded-r-2xl border-y border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                            {userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL ? (
                              <img src={userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-slate-400">
                                {userProfiles.find(p => p.userId === bug.assigneeId)?.displayName?.substring(0, 1) || '?'}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-600">
                            {userProfiles.find(p => p.userId === bug.assigneeId)?.displayName || 'Chưa phân công'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <TeamManagementModal 
        show={showTeamModal} 
        onClose={() => setShowTeamModal(false)}
        userProfiles={userProfiles}
        selectedProject={selectedProject}
        isAdmin={isAdmin}
        handleUpdateUserRoles={handleUpdateUserRoles}
        handleRemoveMember={handleRemoveMember}
        userId={userId}
      />

      <BugDetailModal 
        selectedBug={selectedBug} 
        onClose={() => setSelectedBug(null)}
        userProfiles={userProfiles} 
        userId={userId} 
        isAdmin={isAdmin}
        handleUpdateBugDetails={handleUpdateBugDetails}
        handleDeleteBug={handleDeleteBug}
        logActivity={logActivity}
        comments={comments} 
        newComment={newComment} 
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        bottomRef={bottomRef}
      />
    </div>
  );
};

export default KanbanBoard;
