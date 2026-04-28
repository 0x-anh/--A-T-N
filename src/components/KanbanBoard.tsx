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
import { Bug, BugStatus, BugPriority, STATUS_COLUMNS, PRIORITY_CONFIG, UserProfile, Comment, ActivityLog } from '../types';
import { Plus, Trash2, Clock, Search, X, MessageSquare, MoreHorizontal, UserPlus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  userId: string;
  userProfiles: UserProfile[];
  bugs: Bug[];
}

const DraggableAny = Draggable as any;

const BugCard: React.FC<{ bug: Bug, index: number, userProfiles: UserProfile[], onSelect: (bug: Bug) => void }> = ({ bug, index, userProfiles, onSelect }) => {
  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index}>
      {(provided: any, snapshot: any) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-4 outline-none transition-all",
            snapshot.isDragging ? "z-[210] scale-[1.05]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <div 
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "surface-precision p-6 bg-white hover:bg-slate-50 transition-all duration-300 cursor-grab active:cursor-grabbing border-slate-200 hover:border-brand-500/20 group select-none relative overflow-hidden",
               snapshot.isDragging ? "shadow-2xl border-brand-500/40 rotate-[1deg]" : ""
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      bug.priority === 'critical' ? "bg-rose-500" : 
                      bug.priority === 'high' ? "bg-amber-500" : "bg-brand-500"
                    )} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">#{bug.id.slice(-4).toUpperCase()}</span>
                 </div>
                 <div className="flex -space-x-1.5 items-center gap-2">
                   {bug.assigneeId ? (
                     <>
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mr-1 max-w-[80px] truncate">
                         {userProfiles.find(u => u.userId === bug.assigneeId)?.displayName || '??'}
                       </span>
                       <img 
                         src={userProfiles.find(u => u.userId === bug.assigneeId)?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                         className="w-7 h-7 rounded-lg border-2 border-white bg-slate-50 shadow-sm" 
                         alt=""
                       />
                     </>
                   ) : (
                     <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <UserPlus size={12} />
                     </div>
                   )}
                 </div>
              </div>
 
              <h4 className="text-sm font-bold text-slate-900 leading-relaxed tracking-tight group-hover:text-brand-600 transition-colors">
                {bug.title}
              </h4>
 
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                    {bug.comments?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={12} className="text-slate-300" />
                        <span>{bug.comments.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-300" />
                      <span>{bug.updatedAt ? new Date((bug.updatedAt as any).toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'VỪA XONG'}</span>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DraggableAny>
  );
};

const KanbanColumn: React.FC<ColumnProps> = ({ title, tasks, status, userProfiles, onSelect, isAdding, setIsAdding, newBugTitle, setNewBugTitle, handleAddBug }) => {
   return (
    <div className="w-[340px] shrink-0 h-full flex flex-col px-3">
      <div className="py-8 flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-500/40" />
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{tasks.length}</span>
           <button 
             onClick={() => setIsAdding(isAdding ? null : status)}
             className={cn("w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm", isAdding && "bg-brand-500 text-white border-transparent")}
           >
             <Plus size={14} />
           </button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 overflow-y-auto custom-scrollbar transition-all bg-white/50 rounded-2xl p-4 border border-slate-100 shadow-inner",
              snapshot.isDraggingOver && "bg-brand-50/50 border-brand-200"
            )}
          >
            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-1 bg-brand-500/10 border border-brand-500/20 rounded-2xl mb-6 shadow-xl shadow-brand-500/5">
                  <div className="p-5 bg-white rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-4 font-mono">Khởi tạo mục mới</div>
                    <input
                      autoFocus
                      className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300 mb-6"
                      placeholder="Tiêu đề..."
                      value={newBugTitle}
                      onChange={(e) => setNewBugTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddBug(status);
                        if (e.key === 'Escape') setIsAdding(null);
                      }}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddBug(status)} className="flex-1 h-9 bg-brand-500 text-white rounded-lg text-[10px] font-bold hover:bg-brand-600 transition-all uppercase tracking-widest">Triển khai</button>
                      <button onClick={() => setIsAdding(null)} className="h-9 px-4 text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest">Hủy bỏ</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[100px]">
              {tasks.map((bug, index) => (
                <BugCard key={bug.id} bug={bug} index={index} userProfiles={userProfiles} onSelect={onSelect} />
              ))}
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
   );
};

export default function KanbanBoard({ projectId, userId, userProfiles, bugs }: KanbanBoardProps & { key?: any }) {
  const [enabled, setEnabled] = useState(false);
  const [isAdding, setIsAdding] = useState<BugStatus | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddStatus, setQuickAddStatus] = useState<BugStatus>('backlog');
  const [quickAddAssignee, setQuickAddAssignee] = useState<string>('');
  const [newBugTitle, setNewBugTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activePanelTab, setActivePanelTab] = useState<'info' | 'comments' | 'history'>('info');
  const bottomRef = useRef<HTMLDivElement>(null);

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

    const oldStatus = source.droppableId;
    const newStatus = destination.droppableId;
    const bugRef = doc(db, 'bugs', draggableId);
    try {
      await updateDoc(bugRef, {
        status: newStatus as BugStatus,
        updatedAt: serverTimestamp()
      });
      await logActivity(draggableId, 'STATUS_UPDATE', `Trạng thái thay đổi từ ${oldStatus} sang ${newStatus}`);
      toast.success("Bảng điều khiển đã đồng bộ");
    } catch (error) { toast.error("Cập nhật thất bại"); }
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
        assigneeId: quickAddAssignee || null
      });
      await logActivity(docRef.id, 'CREATE', `Mục mới đã được khởi tạo trong [${status}]${quickAddAssignee ? ` và giao cho nhân sự.` : '.'}`);
      toast.success("Nút đã được khởi tạo thành công");
      setNewBugTitle('');
      setQuickAddAssignee('');
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
      <div className="h-24 px-12 flex items-center justify-between border-b border-slate-200 bg-white/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-12">
           <h2 className="text-xl font-bold text-slate-900 tracking-widest uppercase">Giao diện Workspace</h2>
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
              <input 
                type="text" placeholder="Tìm kiếm mục..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 bg-white border border-slate-200 rounded-xl pl-12 pr-6 text-xs font-bold text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all w-80 outline-none placeholder:text-slate-300 font-mono"
              />
           </div>
        </div>

        <button 
          onClick={() => setShowQuickAdd(true)}
          className="h-11 px-8 bg-brand-500 text-white rounded-xl text-[10px] font-bold hover:bg-brand-600 transition-all flex items-center gap-2 shadow-2xl shadow-brand-500/20 active:scale-95 uppercase tracking-widest"
        >
           <Plus size={16} /> Mục mới
        </button>
      </div>

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

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex h-full p-8 gap-8">
          <DragDropContext onDragEnd={onDragEnd}>
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
               />
            ))}
          </DragDropContext>
        </div>
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
              className="relative w-full max-w-2xl h-full bg-white rounded-[2.5rem] shadow-4xl flex flex-col overflow-hidden border border-slate-200"
            >
              <div className="px-10 h-24 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 shrink-0">
                <div className="flex items-center gap-6">
                   <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-lg font-mono border border-brand-100">ID-{selectedBug.id.slice(-4).toUpperCase()}</div>
                   <div className="h-4 w-px bg-slate-200" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chi tiết</span>
                </div>
                <button 
                  onClick={() => setSelectedBug(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
 
              <div className="flex-1 overflow-y-auto p-10 lg:p-12 space-y-12 custom-scrollbar">
                <div className="space-y-8">
                   <textarea 
                     rows={2}
                     className="w-full text-4xl font-bold text-slate-900 outline-none border-none p-0 bg-transparent tracking-tight leading-tight resize-none placeholder:text-slate-200"
                     placeholder="Title..."
                     value={selectedBug.title}
                     onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                   />
                   
                   <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ưu tiên</label>
                        <div className="relative">
                          <select 
                            value={selectedBug.priority}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none hover:border-brand-500/30 transition-all appearance-none cursor-pointer uppercase tracking-widest"
                          >
                            {(Object.entries(PRIORITY_CONFIG) as [BugPriority, any][]).map(([key, cfg]) => (
                               <option key={key} value={key} className="bg-white">{cfg.label.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Người đảm nhận</label>
                        <div className="relative">
                          <select 
                            value={selectedBug.assigneeId || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none hover:border-brand-500/30 transition-all appearance-none cursor-pointer uppercase tracking-widest"
                          >
                            <option value="" className="bg-white">CHƯA GIAO</option>
                            {userProfiles.map(u => <option key={u.userId} value={u.userId} className="bg-white">{u.displayName.toUpperCase()}</option>)}
                          </select>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Calendar size={12} className="text-brand-500" /> Hạn hoàn thành
                      </label>
                      <input 
                        type="date"
                        value={selectedBug.dueDate || ''}
                        onChange={(e) => handleUpdateBugDetails(selectedBug.id, { dueDate: e.target.value })}
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-6 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500/20 transition-all uppercase font-mono tracking-widest"
                      />
                   </div>
                </div>
 
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chi tiết giao thức</label>
                  <textarea 
                    placeholder="Nhập chi tiết kỹ thuật..."
                    className="w-full h-48 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm text-slate-600 outline-none focus:bg-white focus:border-brand-500/20 transition-all leading-relaxed placeholder:text-slate-300"
                    value={selectedBug.description || ''}
                    onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                  />
                </div>
 
                <div className="space-y-10 pt-10 border-t border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-600" /> Bản ghi tương tác
                  </h3>
 
                  <div className="space-y-8">
                    <div className="space-y-8">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-6 group/comment">
                          <div className="relative shrink-0">
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${c.userId}`} className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100" alt="" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-xs font-bold text-slate-900">{c.userName}</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">{c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'VỪA XONG'}</span>
                            </div>
                            <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-transparent group-hover:border-slate-100 transition-all shadow-sm">
                               {c.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
 
                    <div className="flex flex-col gap-6 pt-10 border-t border-slate-100">
                        <textarea 
                          placeholder="Ghi nhận mục mới..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm text-slate-900 outline-none focus:bg-white focus:border-brand-500/20 transition-all h-28 placeholder:text-slate-300"
                          value={newComment} onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim()}
                            className="h-10 px-8 bg-brand-500 text-white rounded-lg text-[10px] font-bold hover:bg-brand-600 transition-all disabled:opacity-30 active:scale-95 uppercase tracking-widest"
                          >
                            Đăng tin
                          </button>
                          <button 
                            onClick={() => handleDeleteBug(selectedBug.id)}
                            className="flex items-center gap-2 text-[10px] font-bold text-rose-500/50 hover:text-rose-500 transition-all uppercase tracking-widest"
                          >
                            <Trash2 size={14} /> Hủy bỏ mục
                          </button>
                        </div>
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
}
