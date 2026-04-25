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
import { Plus, Trash2, GripVertical, Clock, Search, Filter, X, Activity, CheckCircle2, UserPlus, MessageSquare, History, Send, ChevronRight, User as UserIcon, Bug as BugIcon, Terminal, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import { Toaster, toast } from 'sonner';

interface KanbanBoardProps {
  projectId: string;
  userId: string;
  userProfiles: UserProfile[];
  bugs: Bug[];
}

const DraggableAny = Draggable as any;

const BugCard: React.FC<{ bug: Bug, index: number, userProfiles: UserProfile[], onSelect: (bug: Bug) => void }> = ({ bug, index, userProfiles, onSelect }) => {
  const config = PRIORITY_CONFIG[bug.priority];
  const Icon = config.icon;

  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index}>
      {(provided: any, snapshot: any) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "cursor-pointer group relative overflow-hidden transition-all bg-slate-900 border border-white/5 rounded-xl mb-3 hover:border-[#FACC15]/40",
            snapshot.isDragging ? "z-50 border-[#FACC15] shadow-2xl scale-[1.02]" : "shadow-md"
          )}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <div 
            className="p-5"
            onClick={(e) => {
              if (!snapshot.isDragging) {
                onSelect(bug);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 opacity-40">
                <span className="text-[9px] font-mono font-bold text-[#FACC15]">#{bug.id.slice(0, 4).toUpperCase()}</span>
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <span className={cn("text-[8px] font-mono font-bold uppercase tracking-widest", config.color)}>
                   {bug.priority}
                </span>
              </div>
              <h4 className="text-sm font-mono font-bold text-white group-hover:text-[#FACC15] transition-colors line-clamp-2 leading-tight uppercase tracking-tight">
                {bug.title}
              </h4>
            </div>
            <div className={cn("p-1.5 bg-white/5 border border-white/5 rounded-lg", config.color)}>
              <Icon size={12} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                {bug.assigneeId ? (
                  <img 
                    src={userProfiles.find(u => u.userId === bug.assigneeId)?.photoURL} 
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : <UserIcon size={10} className="text-white/20" />}
              </div>
              <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-wider">
                {bug.assigneeId ? userProfiles.find(u => u.userId === bug.assigneeId)?.displayName.split(' ')[0] : 'Chưa giao'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
               {bug.updatedAt && <Clock size={10} className="text-white/10" />}
               <div className="flex gap-0.5">
                  {[1,2,3].map(i => <div key={i} className={cn("w-1.5 h-0.5 rounded-full", i <= (bug.priority === 'critical' ? 3 : bug.priority === 'high' ? 2 : 1) ? config.color.replace('text-', 'bg-') : "bg-white/5")} />)}
               </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </DraggableAny>
  );
};

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

const KanbanColumn: React.FC<ColumnProps> = ({ title, tasks, status, userProfiles, onSelect, isAdding, setIsAdding, newBugTitle, setNewBugTitle, handleAddBug }) => {
  return (
    <div 
      className="w-[320px] shrink-0 flex flex-col h-full bg-slate-900/40 border border-white/5 rounded-2xl mx-2 overflow-hidden backdrop-blur-sm"
    >
      <div className="px-5 py-4 border-b border-white/5 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[#FACC15] rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">{title}</h3>
        </div>
        <div className="text-xs font-mono text-white/20 font-bold">{tasks.length}</div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex-1 p-4 overflow-y-auto custom-scrollbar min-h-[200px]"
          >
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 border border-dashed border-white/5 rounded-xl opacity-20">
                 <span className="text-[9px] font-mono uppercase tracking-widest">Trống</span>
              </div>
            ) : (
              tasks.map((bug, index) => (
                <BugCard key={bug.id} bug={bug} index={index} userProfiles={userProfiles} onSelect={onSelect} />
              ))
            )}
            {provided.placeholder}
            
            {isAdding ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-slate-800 border border-white/10 rounded-xl"
              >
                <input
                  autoFocus
                  className="w-full bg-transparent border-none p-2 text-xs font-mono text-white outline-none uppercase placeholder:text-white/10"
                  placeholder="TIÊU ĐỀ..."
                  value={newBugTitle}
                  onChange={(e) => setNewBugTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddBug(status);
                    if (e.key === 'Escape') setIsAdding(null);
                  }}
                />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleAddBug(status)} className="flex-1 py-1.5 bg-[#FACC15] text-black text-[10px] font-bold uppercase rounded-lg">Lưu</button>
                  <button onClick={() => setIsAdding(null)} className="flex-1 py-1.5 bg-white/5 text-white/40 text-[10px] font-bold uppercase rounded-lg">Hủy</button>
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={() => setIsAdding(status)}
                className="w-full py-3 border border-dashed border-white/5 text-white/20 hover:text-[#FACC15] hover:border-[#FACC15]/20 transition-all flex items-center justify-center gap-2 group rounded-xl"
              >
                <Plus size={12} className="group-hover:rotate-90 transition-transform" />
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Thêm Tác Vụ</span>
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function KanbanBoard({ projectId, userId, userProfiles, bugs }: KanbanBoardProps & { key?: any }) {
  const [enabled, setEnabled] = useState(false);
  const [isAdding, setIsAdding] = useState<BugStatus | null>(null);
  const [newBugTitle, setNewBugTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<BugPriority | 'all'>('all');
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activePanelTab, setActivePanelTab] = useState<'info' | 'comments' | 'history'>('info');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  useEffect(() => {
    if (!selectedBug) {
      setComments([]);
      setActivityLogs([]);
      return;
    }

    const commentsQuery = query(collection(db, 'comments'), where('bugId', '==', selectedBug.id), orderBy('createdAt', 'asc'));
    const logsQuery = query(collection(db, 'activity_logs'), where('bugId', '==', selectedBug.id), orderBy('createdAt', 'desc'));

    const unsubComments = onSnapshot(commentsQuery, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (error) => {
      console.warn("Comments listener failed:", error);
    });

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    }, (error) => {
      console.warn("Logs listener failed:", error);
    });

    return () => {
      unsubComments();
      unsubLogs();
    };
  }, [selectedBug]);

  useEffect(() => {
    if (activePanelTab === 'comments') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activePanelTab]);

  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const titleMatch = bug.title.toLowerCase().includes(searchTerm.toLowerCase());
      const priorityMatch = priorityFilter === 'all' || bug.priority === priorityFilter;
      return titleMatch && priorityMatch;
    });
  }, [bugs, searchTerm, priorityFilter]);

  const logActivity = async (bugId: string, action: string, details: string) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'activity_logs'), {
        bugId,
        projectId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Điều hành viên',
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Log error:", e);
    }
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
      await logActivity(draggableId, 'STATUS_CHANGE', `Trạng thái: ${oldStatus} >> ${newStatus}`);
      toast.success("DI CHUYỂN THÀNH CÔNG", {
        description: `${oldStatus.toUpperCase()} -> ${newStatus.toUpperCase()}`
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      toast.error("DI CHUYỂN THẤT BẠI", {
        description: "Giao thức cập nhập trạng thái bị gián đoạn."
      });
    }
  };

  const handleAddBug = async (status: BugStatus) => {
    if (!newBugTitle.trim() || !auth.currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId,
        title: newBugTitle,
        description: '',
        status,
        priority: 'medium',
        createdAt: serverTimestamp(),
        creatorId: auth.currentUser.uid
      });
      await logActivity(docRef.id, 'CREATE', 'Khởi tạo hồ sơ lỗi mới.');
      toast.success("Tác vụ ĐÃ ĐƯỢC TẠO", {
        description: `Mã số: ${docRef.id.slice(0, 8)}`,
      });
      setNewBugTitle('');
      setIsAdding(null);
    } catch (error) {
      handleFirestoreError(error, 'create', 'bugs');
      toast.error("KHỞI TẠO THẤT BẠI", {
        description: "Truy cập bị từ chối hoặc lỗi liên kết."
      });
    }
  };

  const handleUpdateBugDetails = async (id: string, updates: Partial<Bug>) => {
    try {
      await updateDoc(doc(db, 'bugs', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      const bugToUpdate = bugs.find(b => b.id === id);
      if (updates.priority && bugToUpdate?.priority !== updates.priority) {
        await logActivity(id, 'PRIORITY_UPDATE', `Mức độ ưu tiên: ${updates.priority.toUpperCase()}`);
      }
      if (updates.assigneeId && bugToUpdate?.assigneeId !== updates.assigneeId) {
        const assignee = userProfiles.find(u => u.userId === updates.assigneeId);
        await logActivity(id, 'ASSIGNMENT', `Phân công cho: ${assignee?.displayName || updates.assigneeId}`);
      }

      if (selectedBug && selectedBug.id === id) {
        setSelectedBug(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `bugs/${id}`);
    }
  };

  const handleDeleteBug = async (id: string) => {
    if (!confirm("XÁC NHẬN XÓA TÁC VỤ? Dữ liệu này không thể khôi phục.")) return;
    try {
      await deleteDoc(doc(db, 'bugs', id));
      if (selectedBug?.id === id) setSelectedBug(null);
      toast.info("HỆ THỐNG: ĐÃ XÓA TÁC VỤ", {
        description: `Dữ liệu ${id.slice(0, 6)} đã được dọn sạch khỏi trung tâm điều khiển.`
      });
    } catch (error) {
      handleFirestoreError(error, 'delete', `bugs/${id}`);
      toast.error("LỖI HỆ THỐNG: XÓA THẤT BẠI");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedBug || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'comments'), {
        bugId: selectedBug.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Ẩn danh',
        content: newComment,
        createdAt: serverTimestamp()
      });
      await logActivity(selectedBug.id, 'COMMENT_POSTED', 'Ghi chú kỹ thuật mới được đính kèm.');
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, 'create', 'comments');
    }
  };

  const stats = {
    total: bugs.length,
    critical: bugs.filter(b => b.priority === 'critical').length,
    done: bugs.filter(b => b.status === 'done').length
  };

  const getFilteredTasks = (status: BugStatus) => {
    return filteredBugs.filter(bug => bug.status === status);
  };

  if (!enabled) return null;

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden relative z-10 px-8 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 px-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 bg-[#FACC15] rounded-full" />
             <span className="text-[10px] font-mono font-bold text-[#FACC15] tracking-widest uppercase">Quản Lý Tác Vụ</span>
          </div>
          <h1 className="text-5xl font-mono font-black text-white tracking-widest uppercase">
            Bảng Công Việc
          </h1>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#FACC15] transition-all" />
              <input 
                type="text" placeholder="Tìm kiếm..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 bg-white/5 border border-white/5 rounded-xl pl-12 pr-4 text-xs font-mono font-bold text-white focus:border-[#FACC15]/40 focus:outline-none transition-all w-64 placeholder:text-white/10 uppercase"
              />
           </div>
           <button 
             onClick={() => setIsAdding('backlog')}
             className="bg-[#FACC15] text-black h-11 px-6 rounded-xl font-mono font-bold text-[11px] uppercase hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
           >
             <Plus size={16} />
             Tạo Mới
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex gap-2 h-full min-w-max pb-8">
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
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBug(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden rounded-3xl"
            >
              {/* Sidebar Info */}
              <div className="w-full md:w-72 border-r border-white/5 bg-slate-950/60 p-8 flex flex-col gap-8 shrink-0">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-[#FACC15]/10 text-[#FACC15] rounded-xl flex items-center justify-center">
                    <BugIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-mono font-bold text-white uppercase tracking-widest leading-none">Tác Vụ</h3>
                    <p className="text-[10px] font-mono text-white/20 mt-1 uppercase">#{selectedBug.id.slice(0, 6)}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest mb-2 block">Ưu Tiên</label>
                    <select 
                      value={selectedBug.priority}
                      onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                      className="w-full bg-white/5 border border-white/10 p-3 text-xs font-mono text-white outline-none focus:border-[#FACC15]/40 transition-all rounded-xl"
                    >
                      {Object.keys(PRIORITY_CONFIG).map(p => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest mb-2 block">Trạng Thái</label>
                    <select 
                      value={selectedBug.status}
                      onChange={(e) => handleUpdateBugDetails(selectedBug.id, { status: e.target.value as BugStatus })}
                      className="w-full bg-white/5 border border-white/10 p-3 text-xs font-mono text-white outline-none focus:border-[#FACC15]/40 transition-all rounded-xl"
                    >
                      {['backlog', 'in-progress', 'in-review', 'done'].map(s => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest mb-2 block">Người Thực Hiện</label>
                    <select 
                      value={selectedBug.assigneeId || ''}
                      onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 p-3 text-xs font-mono text-white outline-none focus:border-[#FACC15]/40 transition-all rounded-xl"
                    >
                      <option value="">CHƯA GIAO</option>
                      {userProfiles.map(u => (
                        <option key={u.userId} value={u.userId}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
                  <button 
                    onClick={() => handleDeleteBug(selectedBug.id)}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-bold font-mono transition-all rounded-xl uppercase"
                  >
                    Xóa Tác Vụ
                  </button>
                  <button 
                    onClick={() => setSelectedBug(null)}
                    className="w-full py-3 bg-white/5 text-white/40 hover:text-white text-[10px] font-bold font-mono transition-all rounded-xl uppercase"
                  >
                    Đóng
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col bg-slate-900/40 min-w-0">
                <div className="px-8 h-16 border-b border-white/5 flex items-center shrink-0">
                  <div className="flex gap-4">
                    {['info', 'comments', 'history'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setActivePanelTab(t as any)}
                        className={cn(
                          "px-4 h-9 text-[10px] font-mono font-bold uppercase tracking-wider transition-all rounded-xl",
                          activePanelTab === t ? "bg-[#FACC15] text-black" : "text-white/30 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {t === 'info' ? 'Chi Tiết' : t === 'comments' ? 'Thảo Luận' : 'Lịch Sử'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                  <AnimatePresence mode="wait">
                    {activePanelTab === 'info' && (
                      <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono font-bold text-[#FACC15] uppercase tracking-widest opacity-60">Tiêu Đề</label>
                          <input 
                            className="w-full bg-transparent text-3xl font-mono font-bold text-white outline-none border-none p-0 focus:text-[#FACC15] transition-all uppercase"
                            placeholder="Nhập tiêu đề..."
                            value={selectedBug.title}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-mono font-bold text-[#FACC15] uppercase tracking-widest opacity-60">Mô Tả</label>
                          <textarea 
                            placeholder="Mô tả chi tiết tác vụ..."
                            className="w-full h-72 bg-white/5 border border-white/5 rounded-2xl p-6 text-sm font-mono text-white/80 outline-none focus:border-[#FACC15]/30 transition-all resize-none"
                            value={selectedBug.description || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                          />
                        </div>
                      </motion.div>
                    )}

                    {activePanelTab === 'comments' && (
                      <motion.div key="comments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                        <div className="flex-1 space-y-4 mb-6">
                          {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-10">
                               <MessageSquare size={32} />
                               <span className="text-[10px] font-mono mt-4 uppercase">Chưa có thảo luận</span>
                            </div>
                          ) : comments.map((c) => (
                            <div key={c.id} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-mono font-bold text-[#FACC15]">{c.userName}</span>
                                <span className="text-[9px] font-mono text-white/20">{c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString() : '...'}</span>
                              </div>
                              <p className="text-sm font-mono text-white/70 leading-relaxed uppercase">{c.content}</p>
                            </div>
                          ))}
                          <div ref={bottomRef} />
                        </div>
                        <div className="mt-auto bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                          <textarea 
                            placeholder="Viết phản hồi..."
                            className="w-full bg-transparent border-none p-2 text-sm font-mono text-white outline-none resize-none h-20 uppercase placeholder:text-white/10"
                            value={newComment} onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                          />
                          <div className="flex justify-end pt-2">
                            <button onClick={handleAddComment} className="px-6 py-1.5 bg-[#FACC15] text-black text-[10px] font-bold uppercase rounded-lg hover:scale-105 transition-transform">Gửi</button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activePanelTab === 'history' && (
                      <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex gap-4">
                             <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FACC15]/40" />
                                <div className="w-[1px] flex-1 bg-white/5" />
                             </div>
                             <div className="pb-6">
                                <div className="flex items-center gap-3 mb-1">
                                   <span className="text-[10px] font-mono font-bold text-[#818CF8] uppercase tracking-wider">{log.action}</span>
                                   <span className="text-[8px] font-mono text-white/20 uppercase">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : ''}</span>
                                </div>
                                <p className="text-xs font-mono text-white/40 uppercase tracking-tight">{log.details}</p>
                                <span className="text-[8px] font-mono text-white/10 uppercase mt-2 block">Bởi: {log.userName}</span>
                             </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
