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
import { Plus, Bug as BugIcon, Search, LayoutDashboard, ListFilter, Activity, Grid, List, Terminal, LayoutList } from 'lucide-react';
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
      className="h-[calc(100vh-100px)] flex flex-col overflow-hidden space-y-2"
    >
      {/* Overview Style Header */}
      <header className="flex flex-col gap-4 mb-2 relative px-4 pt-2 shrink-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
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

          <div className="flex flex-col items-end gap-6">
             <div className="flex items-center gap-4 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 shadow-inner backdrop-blur-sm">
                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
                    <Search size={14} strokeWidth={3} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="TÌM KIẾM NHIỆM VỤ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-950 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/50 transition-all w-[240px] uppercase tracking-widest"
                  />
                </div>

                <div className="h-8 w-[1px] bg-slate-200" />

                {/* Main Add Button - High Fidelity Version */}
                <button 
                  onClick={() => setShowQuickAdd(true)}
                  className="group relative h-10 px-6 bg-slate-950 text-white rounded-xl text-[10px] font-black overflow-hidden transition-all active:scale-95 shadow-xl shadow-slate-950/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center gap-2 whitespace-nowrap tracking-[0.2em]">
                    <Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
                    TRIỂN KHAI NHIỆM VỤ
                  </div>
                </button>

                <div className="h-8 w-[1px] bg-slate-200" />

                {/* View Toggle */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button 
                    onClick={() => setViewMode('board')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest flex items-center gap-2",
                      viewMode === 'board' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Grid size={12} />
                    BẢNG
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[9px] font-black transition-all uppercase tracking-widest flex items-center gap-2",
                      viewMode === 'list' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <List size={12} />
                    DANH SÁCH
                  </button>
                </div>
             </div>

             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] font-mono">DỮ LIỆU_ĐANG_XỬ_LÝ: RT_SYNC_OK</span>
                </div>
                
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-heading font-black tracking-tighter tabular-nums leading-none text-slate-950">
                     {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col gap-6"
            >
              {/* Header Manifest - High Visibility HUD */}
              <div className="flex items-center justify-between bg-slate-950/60 backdrop-blur-xl p-6 rounded-2xl border border-brand-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent" />
                
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-14 h-14 bg-slate-900 border-2 border-brand-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                    <Terminal size={28} className="text-brand-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-[0.5em] leading-none mb-2 drop-shadow-md">
                      STRATEGIC_DATA_STREAM
                    </h2>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest font-mono">SYS_STATUS: ACTIVE</span>
                       <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">UPLINK_SECURE</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-10 font-mono relative z-10">
                   <div className="text-right">
                      <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">TOTAL_NODES</div>
                      <div className="text-xl font-black text-white drop-shadow-md">{filteredBugs.length}</div>
                   </div>
                   <div className="h-12 w-[2px] bg-brand-500/30" />
                   <div className="w-32">
                      <div className="flex justify-between text-[8px] font-black text-slate-500 mb-1.5">
                         <span>CPU_LOAD</span>
                         <span className="text-brand-400">74%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                         <div className="h-full bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" style={{ width: '74%' }} />
                      </div>
                   </div>
                </div>
              </div>

              {/* Manifest Content - High Contrast Cards */}
              <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4">
                {filteredBugs.map((bug, index) => (
                  <motion.div
                    key={bug.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group relative flex items-center gap-8 bg-slate-950/70 backdrop-blur-lg p-5 rounded-xl border border-white/10 hover:border-brand-500/50 transition-all duration-300"
                  >
                    {/* ID & Status Glow */}
                    <div className="w-40 shrink-0 relative flex items-center gap-4 border-r border-white/5 pr-6">
                       <div className={cn(
                         "w-1.5 h-10 rounded-full shadow-2xl",
                         bug.status === 'done' ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" :
                         bug.status === 'in-progress' ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]" :
                         "bg-brand-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]"
                       )} />
                       <div>
                          <div className="text-[12px] font-black font-mono text-brand-400 tracking-[0.2em] group-hover:text-brand-300 transition-colors drop-shadow-sm">
                            #{bug.id.substring(0, 8).toUpperCase()}
                          </div>
                          <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5">NODE_IDENTIFIER</div>
                       </div>
                    </div>

                    {/* Mission Title - Bold White with Overflow Fix */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedBug(bug)}>
                      <h3 className="text-[15px] font-black text-white group-hover:text-brand-400 transition-colors uppercase tracking-widest leading-none mb-2.5 drop-shadow-md truncate line-clamp-1 break-all">
                        {bug.title}
                      </h3>
                      <div className="flex items-center gap-5">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SEQ_{index + 100}</span>
                         </div>
                         <div className="w-[1px] h-3 bg-slate-800" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SEC_DELTA_09</span>
                      </div>
                    </div>

                    {/* Cyber Status Controller */}
                    <div className="flex items-center bg-slate-900/80 p-1.5 rounded-xl border border-white/5 gap-1.5 shadow-2xl">
                      {['backlog', 'in-progress', 'in-review', 'done'].map((st) => (
                        <button
                          key={st}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBugDetails(bug.id, { status: st as BugStatus });
                            logActivity(bug.id, 'STATUS_UPDATE', `CMD_EXEC: ${st.toUpperCase()}`);
                            toast.success(`NODE_SYNCED: ${st.toUpperCase()}`);
                          }}
                          className={cn(
                            "px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                            bug.status === st 
                              ? (st === 'backlog' ? "bg-slate-700 text-white shadow-xl" :
                                 st === 'in-progress' ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]" :
                                 st === 'in-review' ? "bg-brand-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]" :
                                 "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]")
                              : "text-slate-500 hover:text-white hover:bg-white/10"
                          )}
                        >
                          {st === 'in-progress' ? 'WORK' : st === 'in-review' ? 'VIEW' : st === 'backlog' ? 'WAIT' : 'DONE'}
                        </button>
                      ))}
                    </div>

                    {/* Primary Operator */}
                    <div className="w-56 flex items-center justify-end gap-5 border-l border-white/5 pl-8">
                       <div className="text-right">
                          <div className="text-[12px] font-black text-white uppercase tracking-widest group-hover:text-brand-400 transition-colors mb-1.5 drop-shadow-sm">
                             {userProfiles.find(p => p.userId === bug.assigneeId)?.displayName || 'UNASSIGNED'}
                          </div>
                          <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                             <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest font-mono">STATUS_ONLINE</span>
                          </div>
                       </div>
                       <div className="w-12 h-12 rounded-xl bg-slate-900 border-2 border-slate-800 p-0.5 shadow-2xl group-hover:border-brand-500 transition-all overflow-hidden">
                         {userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL ? (
                           <img src={userProfiles.find(p => p.userId === bug.assigneeId)?.photoURL} className="w-full h-full object-cover rounded-lg" />
                         ) : (
                           <div className="w-full h-full bg-slate-800 rounded-lg flex items-center justify-center">
                              <Activity size={18} className="text-slate-600" />
                           </div>
                         )}
                       </div>
                    </div>
                  </motion.div>
                ))}
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
