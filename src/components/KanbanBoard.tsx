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
import { Plus, Bug as BugIcon, Search, LayoutDashboard, ListFilter, Activity, Grid, List, Terminal } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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

  // Mapping labels
  const statusLabels: Record<BugStatus, string> = {
    'backlog': 'HÀNG ĐỢI MỚI',
    'in-progress': 'ĐANG THỰC HIỆN',
    'in-review': 'ĐANG KIỂM TRA',
    'done': 'ĐÃ HOÀN TẤT'
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

  // Firebase Logic
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
        userEmail: profile?.email || '',
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
    const bugToDelete = bugs.find(b => b.id === bugId);
    const bugTitle = bugToDelete?.title || "Nút dữ liệu";

    const deleteTimeout = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'bugs', bugId));
        logActivity(bugId, 'BUG_DELETED', `Đã xóa nút dữ liệu: ${bugTitle}`);
        setSelectedBug(null);
        toast.success(`Đã chính thức giải phóng ${bugTitle}.`);
      } catch (e) { toast.error("Lỗi giải phóng dữ liệu."); }
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="h-[calc(100vh-120px)] flex flex-col overflow-hidden space-y-6"
    >
      {/* Overview Style Header */}
      <header className="flex flex-col gap-8 mb-4 relative px-4 pt-4 shrink-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">TRUNG TÂM ĐIỀU PHỐI</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                BẢNG <span className="text-slate-400">CHIẾN LƯỢC</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Quản lý tiến trình vận hành, phân bổ nhiệm vụ và giám sát chất lượng thực thi.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
             <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-950 transition-colors">
                    <Search size={14} strokeWidth={3} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="TÌM KIẾM NHIỆM VỤ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl text-[10px] font-black text-slate-950 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50 transition-all w-[200px] md:w-[280px] uppercase tracking-widest"
                  />
                </div>

                <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />

                {/* View Toggle */}
                <div className="flex items-center bg-white/60 backdrop-blur-md p-1 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setViewMode('board')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest flex items-center gap-2",
                      viewMode === 'board' ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Grid size={12} />
                    BẢNG
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest flex items-center gap-2",
                      viewMode === 'list' ? "bg-slate-950 text-white shadow-xl shadow-slate-950/20" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <List size={12} />
                    DANH SÁCH
                  </button>
                </div>
             </div>

             <div className="flex flex-col items-end gap-1 group cursor-default">
                <div className="flex items-baseline gap-2 text-slate-950">
                   <span className="text-3xl font-heading font-black tracking-tighter tabular-nums leading-none">
                     {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-500/5 border border-brand-500/10 rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                   <span className="text-[8px] font-black text-brand-600 uppercase tracking-[0.2em] font-mono">DỮ LIỆU ĐANG XỬ LÝ</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-8 pb-4 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {viewMode === 'board' ? (
            <motion.div 
              key="board"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full"
            >
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex h-full gap-6 overflow-x-auto no-scrollbar pb-2">
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
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white/40 backdrop-blur-3xl rounded-2xl border border-white/60 h-full overflow-hidden flex flex-col shadow-sm"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-2xl shadow-slate-950/20">
                    <LayoutDashboard size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest italic">DANH SÁCH NHIỆM VỤ</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mt-1">OPERATIONAL_DATA_STREAM</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-slate-950 bg-white/60 px-5 py-2 rounded-xl border border-slate-200 uppercase tracking-widest font-mono">
                  TỔNG_CỘNG: {filteredBugs.length} NODE
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">
                      <th className="px-6 pb-4">MÃ_SỐ</th>
                      <th className="px-6 pb-4">CHIẾN_LƯỢC_VẬN_HÀNH</th>
                      <th className="px-6 pb-4 text-center">TRẠNG_THÁI</th>
                      <th className="px-6 pb-4 text-center">ƯU_TIÊN</th>
                      <th className="px-6 pb-4">NHÂN_SỰ_THỰC_THI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBugs.map(bug => (
                      <tr 
                        key={bug.id} 
                        onClick={() => setSelectedBug(bug)}
                        className="group cursor-pointer hover:translate-x-2 transition-all duration-500"
                      >
                        <td className="px-6 py-5 bg-white/60 backdrop-blur-md first:rounded-l-xl border-y border-l border-slate-200 text-[10px] font-black font-mono text-slate-400 group-hover:bg-white transition-colors">
                          {bug.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="px-6 py-5 bg-white/60 backdrop-blur-md border-y border-slate-200 text-xs font-black text-slate-950 group-hover:bg-white transition-colors">
                          {bug.title}
                        </td>
                        <td className="px-6 py-5 bg-white/60 backdrop-blur-md border-y border-slate-200 text-center group-hover:bg-white transition-colors">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            bug.status === 'backlog' ? "bg-slate-100 text-slate-500 border-slate-200" :
                            bug.status === 'in-progress' ? "bg-amber-50 text-amber-600 border-amber-100" :
                            bug.status === 'in-review' ? "bg-brand-50 text-brand-600 border-brand-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                            {statusLabels[bug.status]}
                          </span>
                        </td>
                        <td className="px-6 py-5 bg-white/60 backdrop-blur-md border-y border-slate-200 text-center group-hover:bg-white transition-colors">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest font-mono",
                            bug.priority === 'high' ? "text-rose-600" :
                            bug.priority === 'medium' ? "text-amber-600" : "text-slate-400"
                          )}>
                            {bug.priority === 'high' ? 'CRITICAL' : bug.priority === 'medium' ? 'STABLE' : 'LOW'}
                          </span>
                        </td>
                        <td className="px-6 py-5 bg-white/60 backdrop-blur-md last:rounded-r-xl border-y border-r border-slate-200 group-hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden ring-1 ring-slate-200 shadow-sm">
                              {userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL ? (
                                <img src={userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[8px] font-black text-white">
                                  {userProfiles.find(p => p.userId === bug.assigneeId)?.displayName?.substring(0, 1) || '?'}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight group-hover:text-slate-950 transition-colors">
                              {userProfiles.find(p => p.userId === bug.assigneeId)?.displayName || 'CHƯA_PHÂN_CÔNG'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        projectMemberIds={selectedProject?.members || []}
      />
    </motion.div>
  );
};

export default KanbanBoard;
