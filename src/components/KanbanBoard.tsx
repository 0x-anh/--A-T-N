import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  where,
  orderBy
} from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { 
  Bug, BugStatus, BugPriority, STATUS_COLUMNS, PRIORITY_CONFIG, 
  UserProfile, Comment, ActivityLog, UserRole, ROLE_CONFIG, 
  canUserMoveTo, ROLE_PERMISSIONS, canEditBug, canDeleteBug 
} from '../types';
import { Plus, Trash2, Clock, Search, X, MessageSquare, MoreHorizontal, UserPlus, Calendar, LayoutGrid, List, Shield, Settings2, Users, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  userId: string;
  userProfiles: UserProfile[];
  bugs: Bug[];
  isProjectOwner?: boolean;
}

const DraggableAny = Draggable as any;

const BugCard: React.FC<{ bug: Bug, index: number, userProfiles: UserProfile[], onSelect: (bug: Bug) => void, userId: string, isAdmin: boolean }> = ({ bug, index, userProfiles, onSelect, userId, isAdmin }) => {
  const assignee = userProfiles.find(u => u.userId === bug.assigneeId);
  const currentUser = userProfiles.find(u => u.userId === userId);
  
  const canMove = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUser?.roles) return false;
    return STATUS_COLUMNS.some(col => col.id !== bug.status && canUserMoveTo(currentUser.roles, col.id));
  }, [currentUser?.roles, bug.status, isAdmin]);

  const isOverdue = useMemo(() => bug.status !== 'done' && bug.dueDate && new Date(bug.dueDate) < new Date(), [bug.status, bug.dueDate]);

  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index} isDragDisabled={!canMove}>
      {(provided: any, snapshot: any) => (
        <motion.div
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-6 outline-none",
            snapshot.isDragging ? "z-[210]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <motion.div 
            whileHover={!snapshot.isDragging ? { y: -4, x: 2, scale: 1.01 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "relative overflow-hidden group p-6 rounded-[1.75rem] border transition-all duration-500",
               snapshot.isDragging 
                ? "shadow-5xl shadow-slate-950/20 border-slate-950/30 rotate-[0.5deg] scale-105 bg-white z-[300]" 
                : "bg-white/80 backdrop-blur-md border-slate-200/60 hover:border-brand-500/30 hover:shadow-2xl hover:shadow-slate-200/60",
               !canMove && "opacity-60 cursor-default",
               isOverdue && !snapshot.isDragging && "border-rose-200 bg-rose-50/20"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-brand-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="space-y-5 relative">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-1.5 h-4 rounded-full transition-all duration-500 group-hover:scale-y-125",
                      isOverdue ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
                      bug.priority === 'critical' ? "bg-rose-500" : 
                      bug.priority === 'high' ? "bg-amber-400" : "bg-emerald-400"
                    )} />
                    <span className="text-[10px] font-bold text-slate-300 font-mono tracking-widest uppercase opacity-60">NODE::0x{bug.id.slice(-4).toUpperCase()}</span>
                 </div>
                 
                 {bug.assigneeId && (
                   <div className="relative group/avatar">
                      <img 
                        src={assignee?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                        className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all duration-500 group-hover:rotate-6 group-hover:scale-110" 
                        alt=""
                      />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full scale-0 group-hover/avatar:scale-100 transition-transform" />
                   </div>
                 )}
              </div>
  
              <h4 className="text-base font-semibold text-slate-900 leading-snug tracking-tight group-hover:text-brand-600 transition-colors line-clamp-2">
                {bug.title}
              </h4>
  
              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {bug.comments?.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 transition-colors group-hover:bg-brand-50 group-hover:border-brand-100">
                        <MessageSquare size={10} className="text-slate-400 group-hover:text-brand-500" />
                        <span className="text-[9px] font-bold text-slate-500 font-mono group-hover:text-brand-600">{bug.comments.length}</span>
                      </div>
                    )}
                    <div className="px-2 py-0.5 rounded border border-slate-100 text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono group-hover:text-slate-600 transition-colors">
                       {bug.priority.toUpperCase()}
                    </div>
                  </div>

                  {bug.dueDate && (
                    <div className={cn(
                      "flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest font-mono",
                      bug.status !== 'done' && new Date(bug.dueDate) < new Date() ? "text-rose-500 animate-pulse" : "text-slate-400"
                    )}>
                      <Clock size={10} />
                      {new Date(bug.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </DraggableAny>
  );
};

const KanbanColumn: React.FC<ColumnProps & { isAdmin: boolean }> = ({ title, tasks, status, userProfiles, onSelect, isAdding, setIsAdding, newBugTitle, setNewBugTitle, handleAddBug, userId, isAdmin }) => {
   return (
    <div className="w-[320px] md:w-[460px] shrink-0 h-full flex flex-col px-4 md:px-8">
      <div className="py-12 md:py-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
           <div className="relative flex items-center justify-center">
              <div className={cn(
                "w-1 h-6 rounded-full relative z-10 transition-all duration-700",
                status === 'backlog' ? "bg-slate-950" :
                status === 'in-progress' ? "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]" :
                status === 'in-review' ? "bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              )} />
           </div>
           <div>
              <h3 className="text-2xl font-heading font-extrabold text-slate-900 uppercase tracking-tight leading-none mb-2">{title}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] font-mono leading-none opacity-50">NODE_STATUS::0{['backlog', 'in-progress', 'in-review', 'done'].indexOf(status)}</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold font-mono shadow-lg shadow-slate-950/10">
              {tasks.length.toString().padStart(2, '0')}
           </div>
           <button 
             onClick={() => setIsAdding(isAdding ? null : status)}
             className={cn(
               "w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-300 hover:text-slate-950 hover:bg-slate-50 transition-all duration-500 group relative overflow-hidden", 
               isAdding && "bg-slate-950 text-white border-transparent"
             )}
           >
             <Plus size={20} strokeWidth={3} className={cn("transition-transform duration-700 relative z-10", isAdding ? "rotate-45" : "group-hover:rotate-90")} />
           </button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 overflow-y-auto no-scrollbar transition-all duration-700 bg-white/20 backdrop-blur-3xl rounded-[3.5rem] p-8 border border-white/40 shadow-[inset_0_-20px_40px_-20px_rgba(0,0,0,0.02)]",
              snapshot.isDraggingOver && "bg-slate-100/30 border-brand-200/40 translate-y-[-2px]"
            )}
          >
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: 30, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -30, scale: 0.9 }} 
                  className="p-1 bg-white border border-brand-500/20 rounded-[2.5rem] mb-8 shadow-3xl shadow-brand-500/10 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="text-[9px] font-bold text-brand-600 uppercase tracking-[0.2em] mb-4 font-mono flex items-center gap-2">
                       <div className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" />
                       ENTRY_LOG
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      className="w-full bg-transparent border-none p-0 text-base font-medium text-slate-950 outline-none placeholder:text-slate-200 mb-6 resize-none font-sans tracking-tight"
                      placeholder="Ghi chú nhiệm vụ..."
                      value={newBugTitle}
                      onChange={(e) => setNewBugTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddBug(status);
                        }
                        if (e.key === 'Escape') setIsAdding(null);
                      }}
                    />
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAddBug(status)} 
                        className="flex-1 h-11 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-brand-600 transition-all uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 active:scale-95"
                      >
                        Khởi tạo
                      </button>
                      <button 
                        onClick={() => setIsAdding(null)} 
                        className="h-11 px-6 text-[10px] font-bold text-slate-400 hover:text-slate-950 transition-all uppercase tracking-widest font-mono"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[200px] space-y-0.5 pb-20">
              {tasks.map((bug, index) => (
                <BugCard key={bug.id} bug={bug} index={index} userProfiles={userProfiles} onSelect={onSelect} userId={userId} isAdmin={isAdmin} />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
   );
};

export default function KanbanBoard({ projectId, userId, userProfiles, bugs, isProjectOwner }: KanbanBoardProps & { key?: any }) {
  const [enabled, setEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [isAdding, setIsAdding] = useState<BugStatus | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddStatus, setQuickAddStatus] = useState<BugStatus>('backlog');
  const [quickAddAssignee, setQuickAddAssignee] = useState<string>('');
  const [quickAddDueDate, setQuickAddDueDate] = useState<string>('');
  const [newBugTitle, setNewBugTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activePanelTab, setActivePanelTab] = useState<'info' | 'comments' | 'history'>('info');
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = useMemo(() => {
    const profile = userProfiles.find(u => u.userId === userId);
    return profile?.roles?.includes('admin') || 
           profile?.email === 'jokerducanh@gmail.com' || 
           isProjectOwner;
  }, [userProfiles, userId, isProjectOwner]);

  const handleUpdateUserRoles = async (targetUserId: string, currentRoles: UserRole[], role: UserRole) => {
    if (!isAdmin) return;
    
    const isGlobalAdmin = userProfiles.find(u => u.userId === targetUserId)?.email === 'jokerducanh@gmail.com';
    if (isGlobalAdmin && role === 'admin' && currentRoles.includes('admin')) {
      toast.error("Không thể gỡ bỏ vai trò quản trị của chủ sở hữu hệ thống");
      return;
    }

    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    // Safety check for self-demotion
    if (targetUserId === userId && role === 'admin' && currentRoles.includes('admin') && !newRoles.includes('admin')) {
      if (!confirm("Bạn đang tự gỡ quyền Admin của chính mình. Bạn sẽ mất quyền quản lý nhân sự sau hành động này. Tiếp tục?")) return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUserId), {
        roles: newRoles
      });
      toast.success("Cập nhật phân quyền thành công");
    } catch (e) {
      toast.error("Lỗi cập nhật quyền: " + (e instanceof Error ? e.message : "Security Policy Violation"));
    }
  };

  useEffect(() => {
    setEnabled(true);
    return () => setEnabled(false);
  }, []);

  useEffect(() => {
    if (!selectedBug) {
      setComments([]);
      setActivityLogs([]);
      return;
    }

    const commentsQuery = query(collection(db, 'comments'), where('bugId', '==', selectedBug.id), orderBy('createdAt', 'asc'));
    const logsQuery = query(collection(db, 'activity_logs'), 
      where('bugId', '==', selectedBug.id), 
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const unsubComments = onSnapshot(commentsQuery, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (error) => { handleFirestoreError(error, 'list', 'comments'); });

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    }, (error) => { handleFirestoreError(error, 'list', 'activity_logs'); });

    return () => { unsubComments(); unsubLogs(); };
  }, [selectedBug, projectId]);

  useEffect(() => {
    if (activePanelTab === 'comments') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activePanelTab]);

  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOverdue = !showOverdueOnly || (bug.status !== 'done' && bug.dueDate && new Date(bug.dueDate) < new Date());
      return matchesSearch && matchesOverdue;
    });
  }, [bugs, searchTerm, showOverdueOnly]);

  const logActivity = async (bugId: string, action: string, details: string) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'activity_logs'), {
        bugId,
        projectId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Operator',
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error("Log error:", e); }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const currentUserProfile = userProfiles.find(u => u.userId === userId);
    const newStatus = destination.droppableId as BugStatus;

    if (!isAdmin && !canUserMoveTo(currentUserProfile?.roles, newStatus)) {
      toast.error("Truy cập bị từ chối: Bạn không có quyền chuyển sang trạng thái này");
      return;
    }

    const oldStatus = source.droppableId;
    
    // Optimistic UI update could be handled here if needed, 
    // but Firestore onSnapshot handles it pretty fast.
    
    const bugRef = doc(db, 'bugs', draggableId);
    try {
      await updateDoc(bugRef, {
        status: newStatus as BugStatus,
        updatedAt: serverTimestamp()
      });
      await logActivity(draggableId, 'STATUS_UPDATE', `Trạng thái thay đổi từ ${oldStatus} sang ${newStatus}`);
      toast.success("Hệ thống đã ghi nhận thay đổi vị trí");
    } catch (error) { 
      toast.error("Không thể đồng bộ thay đổi");
      console.error(error);
    }
  };

  const handleAddBug = async (status: BugStatus, titleOverride?: string) => {
    const title = titleOverride || newBugTitle;
    if (!title.trim() || !auth.currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId,
        title: title,
        description: '',
        status,
        priority: 'medium',
        createdAt: serverTimestamp(),
        creatorId: auth.currentUser.uid,
        assigneeId: quickAddAssignee || null,
        dueDate: quickAddDueDate || null
      });
      await logActivity(docRef.id, 'CREATE', `Mục mới đã được khởi tạo trong [${status}]${quickAddAssignee ? ` và giao cho nhân sự.` : '.'}`);
      toast.success("Nút đã được khởi tạo thành công");
      setNewBugTitle('');
      setQuickAddAssignee('');
      setQuickAddDueDate('');
      setIsAdding(null);
      setShowQuickAdd(false);
    } catch (error) { 
      toast.error("Khởi tạo thất bại");
      handleFirestoreError(error, 'create', 'bugs');
    }
  };

  const handleUpdateBugDetails = async (id: string, updates: Partial<Bug>) => {
    try {
      await updateDoc(doc(db, 'bugs', id), { ...updates, updatedAt: serverTimestamp() });
      if (selectedBug && selectedBug.id === id) {
        setSelectedBug(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteBug = async (id: string) => {
    if (!window.confirm("Xác nhận hủy bỏ mục này?")) return;
    try {
      await deleteDoc(doc(db, 'bugs', id));
      if (selectedBug?.id === id) setSelectedBug(null);
      toast.info("Nút đã được giải phóng");
    } catch (error) { toast.error("Giải phóng thất bại"); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedBug || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'comments'), {
        bugId: selectedBug.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Nhân sự',
        content: newComment,
        createdAt: serverTimestamp()
      });
      await logActivity(selectedBug.id, 'COMMENT', 'Phản hồi đã được ghi lại.');
      setNewComment('');
    } catch (error) { console.error(error); }
  };

  const getFilteredTasks = (status: BugStatus) => {
    return filteredBugs.filter(bug => bug.status === status);
  };

  if (!enabled) return null;

   return (
     <div className="flex-1 w-full flex flex-col overflow-hidden bg-slate-50">
      <div className="h-28 md:h-36 px-6 md:px-14 flex flex-col items-center justify-center md:flex-row md:justify-between border-b border-slate-100 bg-white/80 backdrop-blur-2xl shrink-0 z-20 gap-4 md:gap-0 shadow-sm relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
           <LayoutGrid size={120} />
        </div>
        <div className="flex items-center justify-between md:justify-start gap-10 md:gap-14 w-full md:w-auto mt-2 md:mt-0">
          <div className="flex flex-col">
              <h2 className="text-lg md:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-3 uppercase">
                <span>Task_Matrix</span>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              </h2>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] font-mono mt-1.5 opacity-60">Distribution_Relay / Node_0x{projectId.slice(0, 4).toUpperCase()}</p>
           </div>

           <div className="hidden lg:block h-8 w-px bg-slate-100" />
           
           <div className="flex items-center bg-slate-50 border border-slate-100 p-1 rounded-2xl shadow-sm shrink-0 self-center">
             <button 
               onClick={() => setViewMode('board')}
               className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-3",
                 viewMode === 'board' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-900 hover:bg-white"
               )}
             >
               <LayoutGrid size={14} />
               <span className="hidden sm:inline">Visual_Grid</span>
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-3",
                 viewMode === 'list' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-400 hover:text-slate-900 hover:bg-white"
               )}
             >
               <List size={14} />
               <span className="hidden sm:inline">Data_Stream</span>
             </button>
           </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto overflow-x-auto no-scrollbar pb-3 md:pb-0">
          <button 
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={cn(
              "h-10 md:h-14 px-5 md:px-8 rounded-2xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 border shrink-0 italic",
              showOverdueOnly 
                ? "bg-rose-500 text-white border-transparent shadow-2xl shadow-rose-500/20 animate-pulse" 
                : "bg-white text-slate-400 border-slate-100 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/10"
            )}
          >
            <Clock size={14} className={showOverdueOnly ? "text-white" : "text-rose-400"} />
            <span className="whitespace-nowrap">Overdue {bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date()).length > 0 && `:: 0${bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date()).length}`}</span>
          </button>

          <div className="relative group shrink-0 self-center">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
             <input 
               type="text" placeholder="Matrix_Search..." value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="h-10 md:h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 text-[10px] md:text-sm font-bold text-slate-950 focus:bg-white focus:border-brand-500 transition-all w-32 md:w-72 outline-none font-mono italic"
             />
          </div>

          <button 
            onClick={() => setShowQuickAdd(true)}
            className="h-10 md:h-14 px-6 md:px-10 bg-slate-950 text-white rounded-2xl text-[9px] md:text-[11px] font-black hover:bg-brand-600 hover:translate-y-[-2px] transition-all flex items-center gap-3 shadow-2xl shadow-slate-950/20 active:translate-y-[1px] uppercase tracking-widest md:tracking-[0.3em] italic group"
          >
             <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> 
             <span className="hidden sm:inline">DEPLOY_NODE</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showTeamManagement && (
          <div className="fixed inset-0 z-[500] flex items-center justify-end p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowTeamManagement(false)}
              className="absolute inset-0 bg-slate-100/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-4xl h-[95vh] md:h-[90vh] bg-white rounded-t-3xl md:rounded-[3rem] shadow-5xl overflow-hidden border border-slate-100 flex flex-col mt-auto md:mt-0"
            >
              <div className="px-6 md:px-12 h-24 md:h-28 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4 md:gap-6">
                   <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                     <Shield size={20} md:size={28} />
                   </div>
                   <div>
                     <h2 className="text-sm md:text-xl font-bold text-slate-900 uppercase tracking-widest md:tracking-[0.2em]">Cơ sở dữ liệu nhân sự</h2>
                     <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Control Panel / Security v4.0</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTeamManagement(false)} 
                  className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all group"
                >
                  <X size={24} className="text-slate-300 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-4 md:space-y-6 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-1 gap-4">
                  {userProfiles.map(profile => {
                    const isGlobalAdmin = profile.email === 'jokerducanh@gmail.com';
                    return (
                      <div key={profile.userId} className="group p-6 md:p-8 bg-white border border-slate-100 rounded-3xl md:rounded-[2.5rem] hover:border-indigo-400/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                         <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                           <div className="flex items-center gap-4 md:gap-6 w-full md:w-72 shrink-0">
                             <div className="relative">
                               <img src={profile.photoURL} alt="" className={cn(
                                 "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] shadow-xl border-4 border-white",
                                 isGlobalAdmin && "ring-4 ring-amber-400/20"
                               )} />
                               {isGlobalAdmin && (
                                 <div className="absolute -top-2 -right-2 w-6 h-6 md:w-7 md:h-7 bg-amber-400 rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white">
                                   <Shield size={10} md:size={12} fill="currentColor" />
                                 </div>
                               )}
                             </div>
                             <div className="min-w-0">
                               <div className="text-sm md:text-base font-bold text-slate-900 uppercase tracking-tight truncate">{profile.displayName}</div>
                               <div className="text-[8px] md:text-[9px] font-bold text-slate-400 truncate mt-1 tracking-widest font-mono opacity-50">{profile.email}</div>
                             </div>
                           </div>
                           
                           <div className="flex-1 flex flex-wrap gap-2 md:gap-3">
                             {isGlobalAdmin ? (
                               <div className="flex items-center gap-3 px-4 py-2 md:px-6 md:py-3 bg-amber-50 border border-amber-100 rounded-xl md:rounded-2xl">
                                 <Shield size={14} md:size={16} className="text-amber-500" />
                                 <span className="text-[8px] md:text-[10px] font-bold text-amber-700 uppercase tracking-widest md:tracking-[0.2em]">Cấp quyền tối cao</span>
                               </div>
                             ) : (
                               (Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                 const isAssigned = profile.roles?.includes(role);
                                 return (
                                   <button
                                     key={role}
                                     onClick={() => handleUpdateUserRoles(profile.userId, profile.roles || [], role)}
                                     className={cn(
                                       "px-3 md:px-5 h-8 md:h-11 rounded-lg md:rounded-[1.25rem] text-[8px] md:text-[10px] font-bold uppercase tracking-widest md:tracking-[0.15em] flex items-center gap-1.5 md:gap-2 transition-all border outline-none active:scale-95",
                                       isAssigned 
                                         ? cn(ROLE_CONFIG[role].color, "text-white border-transparent shadow-lg shadow-current/20")
                                         : "bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white"
                                     )}
                                   >
                                     {isAssigned ? <Check size={12} md:size={14} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-slate-300" />}
                                     {ROLE_CONFIG[role].label.split(' / ')[0]}
                                   </button>
                                 );
                               })
                             )}
                           </div>

                           <div className="hidden md:block w-40 text-right opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">Authorized Access_</span>
                           </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 md:px-12 py-6 md:py-8 bg-white border-t border-slate-50 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2 md:gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       <span className="text-[8px] md:text-[10px] font-bold text-slate-900 uppercase tracking-widest">Protocol Secured</span>
                    </div>
                    <div className="hidden sm:block h-4 w-px bg-slate-100" />
                    <span className="hidden sm:block text-[8px] md:text-[9px] font-bold text-slate-300 font-mono">Encryption: AES-256-Bit_</span>
                 </div>
                 <div className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.4em]">Matrix Personnel Records</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuickAdd && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-3xl p-10 shadow-4xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Khởi tạo nhanh</h3>
                <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên mục</label>
                  <input 
                    autoFocus
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-500 transition-all"
                    placeholder="VD: Kiểm tra lại giao thức truyền tin..."
                    value={newBugTitle}
                    onChange={(e) => setNewBugTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái đích</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_COLUMNS.map(col => (
                      <button 
                        key={col.id}
                        onClick={() => setQuickAddStatus(col.id)}
                        className={cn(
                          "h-10 px-4 rounded-lg text-[9px] font-bold uppercase tracking-tighter border transition-all",
                          quickAddStatus === col.id ? "bg-brand-500 border-transparent text-white" : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giao cho nhân sự</label>
                  <select 
                    value={quickAddAssignee}
                    onChange={(e) => setQuickAddAssignee(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-500 appearance-none cursor-pointer uppercase tracking-widest"
                  >
                    <option value="">CHƯA GIAO</option>
                    {userProfiles.map(u => (
                      <option key={u.userId} value={u.userId}>{u.displayName.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời hạn hoàn thành</label>
                  <input 
                    type="datetime-local"
                    value={quickAddDueDate}
                    onChange={(e) => setQuickAddDueDate(e.target.value)}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none focus:border-brand-500 transition-all font-mono"
                  />
                </div>
                <button 
                  onClick={() => handleAddBug(quickAddStatus)}
                  className="w-full h-12 bg-brand-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-600 transition-all shadow-lg"
                >
                  Triển khai ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <DragDropContext onDragEnd={onDragEnd}>
          {viewMode === 'board' ? (
            <div className="flex h-full p-6 md:p-20 gap-6 md:gap-16 min-w-fit mx-auto justify-start items-start pb-40 overflow-x-auto no-scrollbar">
              {STATUS_COLUMNS.map(col => (
                 <KanbanColumn 
                    key={col.id}
                    title={col.label}
                    tasks={getFilteredTasks(col.id)}
                    status={col.id}
                    userProfiles={userProfiles}
                    onSelect={setSelectedBug}
                    isAdding={isAdding === col.id}
                    setIsAdding={setIsAdding}
                    newBugTitle={newBugTitle}
                    setNewBugTitle={setNewBugTitle}
                    handleAddBug={handleAddBug}
                    userId={userId}
                    isAdmin={isAdmin}
                 />
              ))}
            </div>
          ) : (
            <div className="p-6 md:p-20 max-w-[1400px] mx-auto w-full space-y-20 md:space-y-32 pb-40">
              {STATUS_COLUMNS.map(col => {
                const columnTasks = getFilteredTasks(col.id);
                return (
                  <div key={col.id} className="space-y-10">
                    <div className="flex items-center justify-between px-6 border-l-2 border-brand-500">
                       <div className="flex flex-col">
                          <h3 className="text-xl font-heading font-bold text-slate-900 uppercase tracking-tight leading-none">{col.label}</h3>
                          <span className="text-[8px] font-bold text-slate-300 font-mono tracking-[0.2em] mt-1.5 ">Matrix_Protocol::Nodes</span>
                       </div>
                       <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-heading font-bold text-slate-900 leading-none">{columnTasks.length.toString().padStart(2, '0')}</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest font-mono">Nodes</span>
                       </div>
                    </div>
                    
                    <div className="bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-slate-200/50 overflow-hidden shadow-sm">
                      <div className="grid grid-cols-[80px_1fr_140px_180px_180px_140px] bg-slate-50 text-slate-400 border-b border-slate-100">
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono">ID</div>
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono text-slate-600">Objective</div>
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono text-center">Status</div>
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono">Priority</div>
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono">Operator</div>
                        <div className="px-8 py-5 text-[9px] font-bold uppercase tracking-[0.2em] font-mono text-right">Deadline</div>
                      </div>

                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className={cn(
                              "divide-y divide-slate-50 min-h-[120px] transition-all duration-700",
                              snapshot.isDraggingOver && "bg-brand-50/20"
                            )}
                          >
                            {columnTasks.length === 0 ? (
                              <div className="flex items-center justify-center h-40 text-[11px] font-bold text-slate-200 uppercase tracking-[0.5em] select-none">
                                Thả mục tiêu vào đây để đồng bộ sang {col.label.toUpperCase()}
                              </div>
                            ) : columnTasks.map((bug, index) => (
                                <DraggableAny 
                                  key={bug.id} 
                                  draggableId={bug.id} 
                                  index={index}
                                  isDragDisabled={!isAdmin && !canUserMoveTo(userProfiles.find(u => u.userId === userId)?.roles, bug.status)}
                                >
                                  {(draggableProvided, draggableSnapshot) => {
                                    const assignee = userProfiles.find(u => u.userId === bug.assigneeId);
                                    const canMove = isAdmin || canUserMoveTo(userProfiles.find(u => u.userId === userId)?.roles, bug.status);

                                    return (
                                    <div 
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      onClick={() => !draggableSnapshot.isDragging && setSelectedBug(bug)}
                                      className={cn(
                                        "grid grid-cols-[80px_1fr_140px_180px_180px_140px] items-center hover:bg-slate-50/80 cursor-grab active:cursor-grabbing transition-all duration-500 group bg-white",
                                        draggableSnapshot.isDragging && "shadow-5xl z-[500] relative ring-2 ring-brand-500 rounded-3xl scale-[1.02]",
                                        !canMove && "opacity-60 cursor-default"
                                      )}
                                      style={{ ...draggableProvided.draggableProps.style }}
                                    >
                                      <div className="px-8 py-8">
                                         <span className="text-[10px] font-black text-slate-300 font-mono italic">#{bug.id.slice(-4).toUpperCase()}</span>
                                      </div>
                                      <div className="px-8 py-8">
                                        <div className="flex flex-col gap-2">
                                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em] font-mono leading-none opacity-0 group-hover:opacity-100 transition-opacity">Task_Header_id</span>
                                          <span className="text-lg font-heading font-bold text-slate-900 group-hover:text-brand-600 transition-colors uppercase leading-none">{bug.title}</span>
                                        </div>
                                      </div>
                                      <div className="px-8 py-8 flex justify-center">
                                        <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">
                                          {col.label.toUpperCase()}
                                        </div>
                                      </div>
                                      <div className="px-8 py-8">
                                         <div className="flex items-center gap-4">
                                           <div className={cn(
                                             "w-2 h-2 rounded-full shadow-sm ring-4 ring-transparent",
                                             bug.priority === 'critical' ? "bg-rose-500 ring-rose-500/10" : 
                                             bug.priority === 'high' ? "bg-amber-500 ring-amber-500/10" : "bg-emerald-500 ring-emerald-500/10"
                                           )} />
                                           <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.2em] font-mono italic">
                                             {PRIORITY_CONFIG[bug.priority].label.split(' / ')[0].toUpperCase()}
                                           </span>
                                         </div>
                                      </div>
                                      <div className="px-8 py-8">
                                        <div className="flex items-center gap-4">
                                          {bug.assigneeId ? (
                                            <>
                                              <img 
                                                src={assignee?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                                                className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-md group-hover:scale-110 transition-transform duration-500" 
                                                alt=""
                                              />
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-black text-slate-950 uppercase tracking-tighter truncate leading-none">
                                                  {assignee?.displayName}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1.5 font-mono">Agent_ACTIVE</span>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex items-center gap-4 opacity-20">
                                              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200" />
                                              <span className="text-[9px] font-black text-slate-400 italic uppercase font-mono tracking-widest">OFFLINE</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    <div className="px-8 py-8 text-right">
                                      {bug.dueDate ? (
                                        <div className={cn(
                                          "text-[10px] font-black font-mono tracking-widest uppercase italic",
                                          bug.status !== 'done' && new Date(bug.dueDate) < new Date() ? "text-rose-500 underline underline-offset-4" : "text-slate-400"
                                        )}>
                                          {new Date(bug.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-black text-slate-100 font-mono tracking-[0.5em]">---</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }}
                            </DraggableAny>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DragDropContext>
      </div>

      <AnimatePresence>
        {selectedBug && (
          <div className="fixed inset-0 z-[300] flex items-center justify-end p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBug(null)}
              className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: '100%', opacity: 0 }} 
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-5xl h-[95vh] md:h-[90vh] bg-white rounded-t-3xl md:rounded-[2.5rem] shadow-5xl flex flex-col overflow-hidden border border-slate-100 mt-auto md:mt-0"
            >
              <div className="px-6 md:px-12 h-24 md:h-28 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4 md:gap-10">
                   <div className="flex items-center gap-4">
                     <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                     <div className="flex flex-col">
                       <span className="text-[10px] md:text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] font-mono leading-none">NODE_ID: {selectedBug.id.slice(-6).toUpperCase()}</span>
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono leading-none mt-1.5">v4.2.0::ACTIVE</span>
                     </div>
                   </div>
                   <div className="hidden sm:block h-6 w-px bg-slate-100" />
                   <div className="hidden lg:flex flex-col">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] font-mono italic">SyncStatus::Established</span>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedBug(null)}
                  className="group w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition-all border border-slate-100"
                >
                  <X size={24} className="text-slate-400 group-hover:text-slate-950 group-hover:rotate-90 transition-all duration-500" />
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden overflow-y-auto md:overflow-hidden">
                {/* Left: Detail Section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-14 lg:p-20 space-y-12 md:space-y-16 bg-white text-left">
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            selectedBug.priority === 'critical' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-500 border-slate-100"
                          )}>
                            {selectedBug.priority.toUpperCase()}
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Priority</span>
                        </div>
                        {(isAdmin || canDeleteBug(userProfiles.find(u => u.userId === userId)?.roles)) && (
                          <button 
                            onClick={async () => {
                              if (confirm('Xác nhận xóa nút dữ liệu?')) {
                                try {
                                  await deleteDoc(doc(db, 'bugs', selectedBug.id));
                                  setSelectedBug(null);
                                  toast.success("Nút dữ liệu đã được giải phóng");
                                } catch (e) {
                                  toast.error("Lỗi vận hành hệ thống");
                                }
                              }
                            }}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-sm"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                      <div className="relative group/title">
                        <textarea 
                          rows={2}
                          className="w-full text-3xl md:text-5xl font-heading font-black text-slate-950 outline-none border-none p-0 bg-transparent tracking-tighter leading-tight resize-none placeholder:text-slate-100 disabled:cursor-not-allowed uppercase"
                          placeholder="TIÊU ĐỀ NÚT..."
                          value={selectedBug.title}
                          disabled={!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                        />
                        {!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && (
                          <div className="absolute -left-8 top-3 text-slate-300 opacity-20 group-hover/title:opacity-100 transition-opacity hidden md:block">
                            <Lock size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 py-10 border-y border-slate-50">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</label>
                        <select 
                          value={selectedBug.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as BugStatus;
                            const currentUserProfile = userProfiles.find(u => u.userId === userId);
                            if (!isAdmin && !canUserMoveTo(currentUserProfile?.roles, newStatus)) {
                              toast.error("Truy cập bị từ chối: Bạn không có quyền chuyển sang trạng thái này");
                              return;
                            }
                            handleUpdateBugDetails(selectedBug.id, { status: newStatus });
                            logActivity(selectedBug.id, 'STATUS_UPDATE', `Di chuyển sang ${newStatus} qua bảng điều khiển detail`);
                          }}
                          className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none cursor-pointer uppercase tracking-widest appearance-none hover:border-brand-500 transition-all"
                        >
                          {STATUS_COLUMNS.map(col => (
                            <option key={col.id} value={col.id}>{col.label.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          Độ ưu tiên
                          {!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                        </label>
                        <select 
                          value={selectedBug.priority}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                          disabled={!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                          className={cn(
                            "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                            !isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
                          )}
                        >
                          {(Object.entries(PRIORITY_CONFIG) as [BugPriority, any][]).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          Nhân sự
                          {!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                        </label>
                        <div className="space-y-2">
                          <select 
                            value={selectedBug.assigneeId || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                            disabled={!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                            className={cn(
                              "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                              !isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
                            )}
                          >
                            <option value="">CHƯA GIAO</option>
                            {userProfiles.map(u => <option key={u.userId} value={u.userId}>{u.displayName.toUpperCase()}</option>)}
                          </select>
                          {selectedBug.assigneeId && (
                            <div className="flex flex-wrap gap-1 px-1">
                              {userProfiles.find(u => u.userId === selectedBug.assigneeId)?.roles?.map(role => (
                                <div 
                                  key={role} 
                                  className={cn("px-2 py-0.5 rounded-md text-[8px] font-black text-white uppercase tracking-tighter", ROLE_CONFIG[role].color)}
                                >
                                  {ROLE_CONFIG[role].label.split(' / ')[0]}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                        <label className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                          Chi tiết kỹ thuật
                          {!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={10} className="text-slate-300" />}
                        </label>
                        <div className="flex gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                           <div className="w-1.5 h-1.5 rounded-full bg-slate-100" />
                        </div>
                      </div>
                      <textarea 
                        placeholder="Mô tả chi tiết các thông số kỹ thuật và các bước tái hiện..."
                        className="w-full h-48 bg-transparent border-none p-0 text-sm text-slate-600 outline-none leading-relaxed placeholder:text-slate-200 resize-none custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed"
                        value={selectedBug.description || ''}
                        disabled={!isAdmin && !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                        onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Interaction Log Section */}
                <div className="w-full md:w-[320px] lg:w-[400px] border-t md:border-t-0 md:border-l border-slate-100 flex flex-col bg-slate-50">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-3 bg-brand-500 rounded-full" />
                      <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Protocol Log</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-slate-400 uppercase font-mono tracking-tighter">Sync Active_</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <div className="w-12 h-12 border-2 border-slate-300 rounded-2xl flex items-center justify-center mb-4 rotate-12">
                          <MessageSquare size={20} className="text-slate-400" />
                        </div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Empty Log Sequence_</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {comments.map((c) => (
                          <div key={c.id} className="group/log relative">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[9px] font-bold text-brand-600 shadow-sm">
                                {c.userName?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">{c.userName}</span>
                              <span className="text-[8px] font-bold text-slate-300 font-mono ml-auto">
                                {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NOW_'}
                              </span>
                            </div>
                            <div className="pl-[30px] relative">
                               <div className="absolute left-[11px] top-0 bottom-0 w-px bg-slate-200 group-last:bg-transparent" />
                               <div className="p-4 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm group-hover/log:border-brand-200 group-hover/log:shadow-md transition-all">
                                 <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                   {c.content}
                                 </p>
                               </div>
                            </div>
                          </div>
                        ))}
                        <div ref={bottomRef} className="h-1" />
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-white border-t border-slate-100 space-y-4">
                    <div className="relative group">
                       <textarea 
                        placeholder="Tham gia thảo luận..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs font-bold text-slate-900 outline-none h-32 placeholder:text-slate-200 resize-none custom-scrollbar focus:border-brand-500 transition-all focus:bg-white"
                        value={newComment} 
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <div className="absolute top-4 right-4 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                         <span className="text-[8px] font-bold text-slate-300 bg-white px-2 py-1 border border-slate-100 rounded-md">⏎ Enter to send</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleAddComment} 
                      disabled={!newComment.trim()}
                      className="w-full h-11 bg-slate-900 text-white rounded-xl text-[9px] font-black hover:bg-black transition-all shadow-xl shadow-slate-900/10 disabled:opacity-20 active:scale-95 uppercase tracking-[0.3em] flex items-center justify-center gap-2"
                    >
                      Xác nhận gửi phản hồi
                    </button>
                    <div className="flex justify-center">
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest font-mono">Terminal Input v1.0.4</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ColumnProps {
  title: string;
  tasks: Bug[];
  status: BugStatus;
  userProfiles: UserProfile[];
  onSelect: (bug: Bug) => void;
  isAdding: boolean;
  setIsAdding: (status: BugStatus | null) => void;
  newBugTitle: string;
  setNewBugTitle: (val: string) => void;
  handleAddBug: (status: BugStatus) => void;
  userId: string;
}
