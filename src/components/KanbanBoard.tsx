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

  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index} isDragDisabled={!canMove}>
      {(provided: any, snapshot: any) => (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-4 outline-none",
            snapshot.isDragging ? "z-[210]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <motion.div 
            whileHover={!snapshot.isDragging ? { y: -4, scale: 1.01 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "relative overflow-hidden group p-5 bg-white border border-slate-100 rounded-[1.75rem] transition-all duration-300",
               snapshot.isDragging ? "shadow-2xl shadow-brand-500/30 border-brand-500/40 rotate-[1deg] scale-[1.05] bg-white/95 backdrop-blur-md" : "shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-brand-500/20 active:scale-[0.98]",
               !canMove && "opacity-80 grayscale-[0.2] cursor-default"
            )}
          >
            {/* Background Accent */}
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 duration-700",
              bug.priority === 'critical' ? "bg-rose-500" : 
              bug.priority === 'high' ? "bg-amber-500" : "bg-brand-500"
            )} />

            {!canMove && (
               <div className="absolute top-4 right-4 p-1.5 bg-slate-50 rounded-lg text-slate-300 opacity-40 group-hover:opacity-100 transition-opacity">
                 <Lock size={10} />
               </div>
            )}

            <div className="space-y-4 relative">
              <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      bug.priority === 'critical' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : 
                      bug.priority === 'high' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                    )} />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">#{bug.id.slice(-4).toUpperCase()}</span>
                 </div>
                 
                 {bug.assigneeId && (
                   <div className="flex items-center gap-2 group/assignee">
                      <div className="flex flex-col items-end opacity-0 group-hover/assignee:opacity-100 transition-opacity translate-x-2 group-hover/assignee:translate-x-0 duration-300">
                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[80px]">
                          {assignee?.displayName.split(' ')[0]}
                        </span>
                      </div>
                      <img 
                        src={assignee?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                        className="w-7 h-7 rounded-xl border-2 border-white bg-slate-50 shadow-md transform hover:scale-110 transition-transform" 
                        alt=""
                      />
                   </div>
                 )}
              </div>
  
              <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight group-hover:text-brand-600 transition-colors">
                {bug.title}
              </h4>
  
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex flex-wrap items-center gap-4">
                    {bug.comments?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">{bug.comments.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={13} className="text-slate-200" />
                      <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                        {bug.updatedAt ? new Date((bug.updatedAt as any).toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'VỪA XONG'}
                      </span>
                    </div>
                  </div>

                  {bug.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all",
                      bug.status !== 'done' && new Date(bug.dueDate) < new Date() 
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25" 
                        : "bg-slate-50 text-slate-400 border border-slate-100"
                    )}>
                      <Calendar size={11} className={cn(bug.status !== 'done' && new Date(bug.dueDate) < new Date() ? "text-white" : "text-slate-300")} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">
                        {new Date(bug.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
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
    <div className="w-[360px] shrink-0 h-full flex flex-col px-4">
      <div className="py-8 flex items-center justify-between group px-1">
        <div className="flex items-center gap-4">
           <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-100 shadow-sm">
             <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
           </div>
           <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.25em]">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm font-mono">{tasks.length}</span>
           <button 
             onClick={() => setIsAdding(isAdding ? null : status)}
             className={cn(
               "w-9 h-9 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-90", 
               isAdding && "bg-brand-500 text-white border-transparent shadow-lg shadow-brand-500/20"
             )}
           >
             <Plus size={16} strokeWidth={2.5} />
           </button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 overflow-y-auto custom-scrollbar transition-all bg-slate-100/30 rounded-[2.5rem] p-4 border border-slate-200/40 shadow-inner",
              snapshot.isDraggingOver && "bg-indigo-50/50 border-indigo-200"
            )}
          >
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -20, scale: 0.95 }} 
                  className="p-1 bg-white border border-indigo-200/50 rounded-[2rem] mb-6 shadow-2xl shadow-brand-500/10"
                >
                  <div className="p-6">
                    <div className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-4 font-mono opacity-60 flex items-center gap-2">
                       <Plus size={10} /> Khởi tạo nhiệm vụ
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-200 mb-6 resize-none"
                      placeholder="Dán hoặc nhập tiêu đề nhiệm vụ mới..."
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
                        className="flex-1 h-11 bg-brand-600 text-white rounded-[1.25rem] text-[10px] font-black hover:bg-brand-700 transition-all uppercase tracking-[0.2em] shadow-lg shadow-brand-600/20 active:scale-95"
                      >
                        Triển khai
                      </button>
                      <button 
                        onClick={() => setIsAdding(null)} 
                        className="h-11 px-5 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-[0.2em]"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[150px] space-y-0.5">
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
      return bug.title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [bugs, searchTerm]);

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

    if (!canUserMoveTo(currentUserProfile?.roles, newStatus)) {
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
      <div className="h-24 px-10 flex items-center justify-between border-b border-slate-100 bg-white/70 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-10">
           <div className="flex flex-col">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Zenith Command Center
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">Workspace / Task Protocol v2.5</p>
           </div>

           <div className="h-8 w-px bg-slate-100" />
           
           <div className="flex items-center bg-slate-50 border border-slate-100 p-1.5 rounded-[1.25rem] shadow-inner">
             <button 
               onClick={() => setViewMode('board')}
               className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                 viewMode === 'board' ? "bg-white text-brand-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
               )}
             >
               <LayoutGrid size={13} />
               <span>Matrix</span>
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={cn(
                 "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                 viewMode === 'list' ? "bg-white text-brand-600 shadow-md ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-600"
               )}
             >
               <List size={13} />
               <span>Database</span>
             </button>
           </div>
           
           <div className="flex items-center gap-5">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                 <input 
                   type="text" placeholder="Tìm kiếm tài liệu..." value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="h-11 bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-6 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all w-72 outline-none placeholder:text-slate-300 font-mono"
                 />
              </div>

              {isAdmin && (
                <button 
                  onClick={() => setShowTeamManagement(true)}
                  className="h-11 px-6 flex items-center gap-3 bg-white border border-slate-100 rounded-[1.25rem] hover:bg-slate-50 hover:border-indigo-300 transition-all text-[9px] font-black text-slate-600 uppercase tracking-widest shadow-sm active:scale-95"
                >
                  <Shield size={14} className="text-indigo-400" />
                  Security Matrix
                </button>
              )}
           </div>
        </div>

        <button 
          onClick={() => setShowQuickAdd(true)}
          className="h-12 px-8 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-95 uppercase tracking-[0.2em] border-b-4 border-indigo-800"
        >
           <Plus size={16} strokeWidth={3} /> Khởi tạo ngay
        </button>
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
              className="relative w-full max-w-4xl h-[90vh] bg-white rounded-[3rem] shadow-5xl overflow-hidden border border-slate-100 flex flex-col"
            >
              <div className="px-12 h-28 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                     <Shield size={28} />
                   </div>
                   <div>
                     <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.2em]">Cơ sở dữ liệu nhân sự</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Control Panel / Security Matrix v4.0</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowTeamManagement(false)} 
                  className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all group"
                >
                  <X size={24} className="text-slate-300 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-6 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-1 gap-4">
                  {userProfiles.map(profile => {
                    const isGlobalAdmin = profile.email === 'jokerducanh@gmail.com';
                    return (
                      <div key={profile.userId} className="group p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-indigo-400/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                         <div className="flex items-center gap-10">
                           <div className="flex items-center gap-6 w-72 shrink-0">
                             <div className="relative">
                               <img src={profile.photoURL} alt="" className={cn(
                                 "w-16 h-16 rounded-[1.5rem] shadow-xl border-4 border-white transition-transform group-hover:scale-105 duration-500",
                                 isGlobalAdmin && "ring-4 ring-amber-400/20"
                               )} />
                               {isGlobalAdmin && (
                                 <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white">
                                   <Shield size={12} fill="currentColor" />
                                 </div>
                               )}
                             </div>
                             <div className="min-w-0">
                               <div className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight truncate">{profile.displayName}</div>
                               <div className="text-[9px] font-bold text-slate-400 truncate uppercase mt-1 tracking-widest font-mono opacity-50">{profile.email}</div>
                             </div>
                           </div>
                           
                           <div className="flex-1 flex flex-wrap gap-3">
                             {(Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                               const isAssigned = profile.roles?.includes(role);
                               const isDisabled = isGlobalAdmin && role === 'admin'; // Cannot remove admin from global owner

                               return (
                                 <button
                                   key={role}
                                   disabled={isDisabled}
                                   onClick={() => handleUpdateUserRoles(profile.userId, profile.roles || [], role)}
                                   className={cn(
                                     "px-5 h-11 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-2 transition-all border outline-none active:scale-95 disabled:opacity-50",
                                     isAssigned 
                                       ? cn(ROLE_CONFIG[role].color, "text-white border-transparent shadow-xl shadow-current/20")
                                       : "bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600 hover:bg-white"
                                   )}
                                 >
                                   {isAssigned ? <Check size={14} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-slate-300" />}
                                   {ROLE_CONFIG[role].label.split(' / ')[0]}
                                 </button>
                               );
                             })}
                           </div>

                           <div className="w-40 text-right opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Authorized Access_</span>
                           </div>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-12 py-8 bg-white border-t border-slate-50 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                       <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocol Secured</span>
                    </div>
                    <div className="h-4 w-px bg-slate-100" />
                    <span className="text-[9px] font-bold text-slate-300 font-mono">Encryption: AES-256-Bit_</span>
                 </div>
                 <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Matrix Personnel Records</div>
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
            <div className="flex h-full p-12 gap-10 min-w-fit mx-auto justify-center items-start pb-20">
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
            <div className="p-12 max-w-7xl mx-auto w-full space-y-20 pb-32">
              {STATUS_COLUMNS.map(col => {
                const columnTasks = getFilteredTasks(col.id);
                return (
                  <div key={col.id} className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shadow-lg shadow-brand-500/20" />
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{col.label}</h3>
                          <span className="text-xs font-bold text-slate-300 font-mono">/ {columnTasks.length}</span>
                       </div>
                    </div>
                    
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                      <div className="grid grid-cols-[48px_1fr_120px_150px_150px_120px] bg-slate-50/50 border-b border-slate-100">
                        <div className="px-6 py-4"></div>
                        <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mục tiêu</div>
                        <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</div>
                        <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mức ưu tiên</div>
                        <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân sự</div>
                        <div className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hạn chót</div>
                      </div>

                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef} 
                            {...provided.droppableProps}
                            className={cn(
                              "divide-y divide-slate-50 min-h-[80px] transition-all duration-300",
                              snapshot.isDraggingOver && "bg-brand-50/40"
                            )}
                          >
                            {columnTasks.length === 0 ? (
                              <div className="flex items-center justify-center h-20 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic select-none">
                                Thả mục vào đây để cập nhật sang {col.label}
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
                                        "grid grid-cols-[48px_1fr_120px_150px_150px_120px] items-center hover:bg-slate-50/80 cursor-grab active:cursor-grabbing transition-colors group bg-white",
                                        draggableSnapshot.isDragging && "shadow-3xl z-[500] relative ring-2 ring-brand-500/20 rounded-xl",
                                        !canMove && "opacity-70 cursor-default"
                                      )}
                                      style={{ ...draggableProvided.draggableProps.style }}
                                    >
                                      <div className="px-6 py-5">
                                        <div className="text-slate-200 group-hover:text-brand-400 transition-colors">
                                          {!canMove ? <Lock size={12} /> : <MoreHorizontal size={14} />}
                                        </div>
                                      </div>
                                      <div className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[9px] font-bold text-slate-300 font-mono tracking-tighter">#{bug.id.slice(-4).toUpperCase()}</span>
                                          <span className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">{bug.title}</span>
                                        </div>
                                      </div>
                                      <div className="px-6 py-5 flex justify-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-0.5 rounded-lg bg-slate-50/50">
                                          {col.label}
                                        </span>
                                      </div>
                                      <div className="px-6 py-5">
                                         <div className="flex items-center gap-3">
                                           <div className={cn(
                                             "w-1.5 h-1.5 rounded-full shadow-sm",
                                             bug.priority === 'critical' ? "bg-rose-500" : 
                                             bug.priority === 'high' ? "bg-amber-500" : "bg-brand-500"
                                           )} />
                                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                                             {PRIORITY_CONFIG[bug.priority].label}
                                           </span>
                                         </div>
                                      </div>
                                      <div className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                          {bug.assigneeId ? (
                                            <>
                                              <img 
                                                src={assignee?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                                                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 shadow-sm" 
                                                alt=""
                                              />
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter truncate max-w-[80px]">
                                                  {assignee?.displayName}
                                                </span>
                                                <div className="flex gap-0.5 mt-0.5">
                                                  {assignee?.roles?.map(role => (
                                                    <div key={role} className={cn("w-2 h-0.5 rounded-full", ROLE_CONFIG[role]?.color || "bg-slate-300")} />
                                                  ))}
                                                </div>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex items-center gap-2 opacity-30">
                                              <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200" />
                                              <span className="text-[9px] font-bold text-slate-400 italic uppercase">- Trống -</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    <div className="px-6 py-5 text-right">
                                      {bug.dueDate ? (
                                        <div className={cn(
                                          "text-[10px] font-bold font-mono tracking-tighter",
                                          bug.status !== 'done' && new Date(bug.dueDate) < new Date() ? "text-rose-500" : "text-slate-400"
                                        )}>
                                          {new Date(bug.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-200">---</span>
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
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white rounded-[3rem] shadow-5xl flex flex-col overflow-hidden border border-slate-100"
            >
              <div className="px-10 h-20 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                     <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] font-mono">Bug-ID: {selectedBug.id.slice(-6).toUpperCase()}</span>
                   </div>
                   <div className="h-3 w-px bg-slate-200" />
                   <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">System Diagnostics_</span>
                </div>
                <button 
                  onClick={() => setSelectedBug(null)}
                  className="group w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all"
                >
                  <X size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left: Detail Section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-16 space-y-12 bg-white">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                            selectedBug.priority === 'critical' ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            {selectedBug.priority.toUpperCase()}
                          </div>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Priority Segment</span>
                        </div>
                        {canDeleteBug(userProfiles.find(u => u.userId === userId)?.roles) && (
                          <button 
                            onClick={async () => {
                              if (confirm('Bạn có chắc chắn muốn xóa thẻ này?')) {
                                try {
                                  await deleteDoc(doc(db, 'bugs', selectedBug.id));
                                  setSelectedBug(null);
                                  toast.success("Đã xóa thẻ thành công");
                                } catch (e) {
                                  toast.error("Lỗi khi xóa thẻ");
                                }
                              }
                            }}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <div className="relative group/title">
                        <textarea 
                          rows={2}
                          className="w-full text-4xl font-black text-slate-900 outline-none border-none p-0 bg-transparent tracking-tight leading-tight resize-none placeholder:text-slate-100 disabled:cursor-not-allowed"
                          placeholder="Nội dung tiêu đề..."
                          value={selectedBug.title}
                          disabled={!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                        />
                        {!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && (
                          <div className="absolute -left-6 top-2 text-slate-300 opacity-20 group-hover/title:opacity-100 transition-opacity">
                            <Lock size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8 py-8 border-y border-slate-50">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</label>
                        <select 
                          value={selectedBug.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as BugStatus;
                            const currentUserProfile = userProfiles.find(u => u.userId === userId);
                            if (!canUserMoveTo(currentUserProfile?.roles, newStatus)) {
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
                          {!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                        </label>
                        <select 
                          value={selectedBug.priority}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                          disabled={!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                          className={cn(
                            "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                            !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
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
                          {!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                        </label>
                        <div className="space-y-2">
                          <select 
                            value={selectedBug.assigneeId || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                            disabled={!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                            className={cn(
                              "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                              !canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
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
                          {!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status) && <Lock size={10} className="text-slate-300" />}
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
                        disabled={!canEditBug(userProfiles.find(u => u.userId === userId)?.roles, selectedBug.status)}
                        onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Interaction Log Section */}
                <div className="w-[400px] border-l border-slate-100 flex flex-col bg-slate-50">
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
