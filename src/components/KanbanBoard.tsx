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
import { Plus, Trash2, Clock, Search, X, MessageSquare, MoreHorizontal, UserPlus } from 'lucide-react';
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
            "mb-6 outline-none transition-all",
            snapshot.isDragging ? "z-[210] scale-[1.05]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <div 
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "bg-white border border-slate-200/60 rounded-[2rem] p-8 transition-all duration-700 cursor-grab active:cursor-grabbing hover:border-brand-500/20 group select-none relative overflow-hidden",
               snapshot.isDragging ? "shadow-[0_40px_80px_rgba(0,0,0,0.1)] ring-2 ring-brand-500/10 border-transparent rotate-[1deg]" : "hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)]"
            )}
          >
            {/* PRIORITY ACCENT BAR */}
            <div className={cn(
              "absolute top-0 right-0 bottom-0 w-2",
              bug.priority === 'critical' ? "bg-rose-500 shadow-[-4px_0_15px_rgba(244,63,94,0.3)]" : bug.priority === 'high' ? "bg-amber-500 shadow-[-4px_0_15px_rgba(245,158,11,0.2)]" : "bg-brand-500 shadow-[-4px_0_15px_rgba(124,58,237,0.2)]"
            )} />

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                 <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] font-mono leading-none">Node Hash</span>
                       <span className="text-[10px] font-black text-slate-950 uppercase tracking-[0.1em] font-mono leading-none mt-1">{bug.id.slice(-6).toUpperCase()}</span>
                    </div>
                 </div>
                 <div className="flex -space-x-2">
                   {bug.assigneeId ? (
                     <img 
                       src={userProfiles.find(u => u.userId === bug.assigneeId)?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                       className="w-10 h-10 rounded-xl border-4 border-white bg-white shadow-xl transition-transform group-hover:scale-110" 
                       alt=""
                     />
                   ) : (
                     <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <UserPlus size={16} />
                     </div>
                   )}
                 </div>
              </div>

              <h4 className="text-[17px] font-black text-slate-900 leading-[1.35] tracking-tight font-display italic group-hover:text-brand-600 transition-colors">
                {bug.title}
              </h4>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50/50">
                 <div className="flex items-center gap-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] font-mono">
                    {bug.comments?.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg text-slate-500">
                        <MessageSquare size={14} className="text-slate-400" strokeWidth={2.5} />
                        <span>{bug.comments.length}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-300" strokeWidth={2.5} />
                      <span>{bug.updatedAt ? new Date((bug.updatedAt as any).toDate()).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'NOW'}</span>
                    </div>
                 </div>
                 <MoreHorizontal size={18} className="text-slate-200 group-hover:text-slate-400 transition-colors cursor-pointer" />
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
    <div className="w-[360px] shrink-0 h-full flex flex-col px-4">
      <div className="py-10 flex items-center justify-between group">
        <div className="flex items-center gap-5">
          <div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
          <div>
             <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.4em] font-display italic leading-none">{title}</h3>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 font-mono">Channel {status.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[11px] font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-xl shadow-inner">{tasks.length} Nodes</span>
           <button 
             onClick={() => setIsAdding(status)}
             className={cn("w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:shadow-2xl transition-all", isAdding && "bg-brand-600 text-white border-transparent")}
           >
             <Plus size={20} strokeWidth={3} />
           </button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 overflow-y-auto custom-scrollbar transition-all bg-slate-50/50 rounded-[3rem] p-6 border border-slate-200/40 shadow-inner",
              snapshot.isDraggingOver && "bg-brand-50/30 border-brand-500/20 shadow-2xl shadow-brand-500/5"
            )}
          >
            <AnimatePresence>
              {isAdding && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-brand-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-brand-500/10 mb-10">
                  <div className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-4 font-mono">Khởi tạo Packet mới</div>
                  <input
                    autoFocus
                    className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-950 outline-none placeholder:text-slate-300 mb-10 font-display italic"
                    placeholder="Định danh vụ việc..."
                    value={newBugTitle}
                    onChange={(e) => setNewBugTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddBug(status);
                      if (e.key === 'Escape') setIsAdding(null);
                    }}
                  />
                  <div className="flex gap-4">
                    <button onClick={() => handleAddBug(status)} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[11px] font-black shadow-2xl shadow-slate-950/20 active:scale-95 transition-all uppercase tracking-widest">Deploy Node</button>
                    <button onClick={() => setIsAdding(null)} className="h-14 px-6 text-[11px] font-black text-slate-400 hover:text-slate-950 transition-all uppercase tracking-widest">Abort</button>
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
  }, [selectedBug]);

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
      await logActivity(draggableId, 'STATUS_UPDATE', `Thay đổi trạng thái từ ${oldStatus} sang ${newStatus}`);
      toast.success("Đã đồng bộ cập nhật bảng");
    } catch (error) { toast.error("Cập nhật thất bại"); }
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
      await logActivity(docRef.id, 'CREATE', 'Đã khởi tạo vụ việc mới.');
      toast.success("Đã khởi tạo Node");
      setNewBugTitle('');
      setIsAdding(null);
    } catch (error) { toast.error("Khởi tạo thất bại"); }
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
    if (!confirm("Xác nhận tiêu hủy vụ việc này?")) return;
    try {
      await deleteDoc(doc(db, 'bugs', id));
      if (selectedBug?.id === id) setSelectedBug(null);
      toast.info("Node đã được giải phóng");
    } catch (error) { toast.error("Giải phóng thất bại"); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedBug || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'comments'), {
        bugId: selectedBug.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Operator',
        content: newComment,
        createdAt: serverTimestamp()
      });
      await logActivity(selectedBug.id, 'COMMENT', 'Đã ghi nhận phản hồi.');
      setNewComment('');
    } catch (error) { console.error(error); }
  };

  const getFilteredTasks = (status: BugStatus) => {
    return filteredBugs.filter(bug => bug.status === status);
  };

  if (!enabled) return null;

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden bg-[#FBFBFE]">
      <div className="h-24 px-12 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-12">
           <h2 className="text-2xl font-black text-slate-950 tracking-tight font-display italic">CHẾ ĐỘ MA TRẬN</h2>
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
              <input 
                type="text" placeholder="Tìm kiếm trong ma trận..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 text-sm font-black text-slate-900 focus:bg-white focus:ring-8 focus:ring-brand-500/5 transition-all w-96 outline-none placeholder:text-slate-300 font-mono"
              />
           </div>
        </div>

        <button 
          onClick={() => setIsAdding('todo')}
          className="h-12 px-8 bg-slate-950 text-white rounded-2xl text-[10px] font-black hover:bg-brand-600 transition-all flex items-center gap-3 shadow-2xl shadow-slate-950/20 active:scale-95 uppercase tracking-widest"
        >
           <Plus size={18} strokeWidth={3} /> Đăng vụ việc
        </button>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar">
        <div className="flex h-full p-12 gap-10">
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
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-2xl h-full bg-white rounded-[4rem] shadow-4xl flex flex-col overflow-hidden border border-white/20"
            >
              <div className="px-12 h-28 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-8">
                   <div className="text-[11px] font-black text-brand-600 uppercase tracking-[0.4em] bg-brand-50 px-4 py-1.5 rounded-xl font-mono">MÃ-{selectedBug.id.slice(-4).toUpperCase()}</div>
                   <div className="h-6 w-px bg-slate-100" />
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic font-display">TRUNG TÂM CHI TIẾT</span>
                </div>
                <button 
                  onClick={() => setSelectedBug(null)}
                  className="w-14 h-14 flex items-center justify-center rounded-3xl hover:bg-slate-50 text-slate-300 hover:text-slate-950 transition-all border border-transparent hover:border-slate-100"
                >
                  <X size={28} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 lg:p-16 space-y-16 custom-scrollbar">
                <div className="space-y-12">
                   <textarea 
                     rows={2}
                     className="w-full text-5xl font-black text-slate-950 outline-none border-none p-0 bg-transparent tracking-tight font-display italic leading-tight resize-none"
                     placeholder="Định danh..."
                     value={selectedBug.title}
                     onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                   />
                   
                   <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 font-display italic">MA TRẬN ƯU TIÊN</label>
                        <div className="relative">
                          <select 
                            value={selectedBug.priority}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                            className="w-full h-16 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-8 text-sm font-black text-slate-900 outline-none hover:border-brand-300 transition-all appearance-none cursor-pointer uppercase tracking-widest font-mono"
                          >
                            {(Object.entries(PRIORITY_CONFIG) as [BugPriority, any][]).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.label === 'Critical' ? 'KHẨN CẤP' : cfg.label === 'High' ? 'CAO' : 'TRUNG BÌNH'}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 font-display italic">NÚT VẬN HÀNH</label>
                        <div className="relative">
                          <select 
                            value={selectedBug.assigneeId || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                            className="w-full h-16 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-8 text-sm font-black text-slate-900 outline-none hover:border-brand-300 transition-all appearance-none cursor-pointer uppercase tracking-widest"
                          >
                            <option value="">CHƯA CHỈ ĐỊNH</option>
                            {userProfiles.map(u => <option key={u.userId} value={u.userId}>{u.displayName.toUpperCase()}</option>)}
                          </select>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1 font-display italic">BẢO MẬT GIAO THỨC</label>
                  <textarea 
                    placeholder="Nhập thông tin chi tiết vào bản ghi viễn thám..."
                    className="w-full h-64 bg-slate-50/50 border border-slate-100 rounded-[2.5rem] p-10 text-base text-slate-600 outline-none focus:bg-white focus:border-brand-200 focus:ring-12 focus:ring-brand-500/5 transition-all leading-relaxed font-medium"
                    value={selectedBug.description || ''}
                    onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                  />
                </div>

                <div className="space-y-12 pt-12 border-t border-slate-50">
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] flex items-center gap-4 font-display italic">
                    <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]" /> SỔ CÁI TƯƠNG TÁC
                  </h3>

                  <div className="space-y-12">
                    <div className="space-y-10">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-8 group/comment">
                          <div className="relative shrink-0">
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${c.userId}`} className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm" alt="" />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-baseline justify-between gap-4">
                              <span className="text-sm font-black text-slate-950 italic font-display">{c.userName}</span>
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] font-mono">{c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'VỪA XONG'}</span>
                            </div>
                            <div className="text-sm text-slate-600 font-medium leading-[1.6] bg-slate-50/50 p-8 rounded-[2rem] border border-transparent group-hover:bg-white group-hover:border-slate-100 transition-all">
                               {c.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-8 pt-12 border-t border-slate-50">
                        <textarea 
                          placeholder="Ghi nhận tương tác mới vào ledger..."
                          className="w-full bg-slate-50/40 border border-slate-100 rounded-[2rem] p-8 text-sm text-slate-950 outline-none focus:bg-white focus:border-brand-200 transition-all h-36 font-medium shadow-inner"
                          value={newComment} onChange={(e) => setNewComment(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <button 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim()}
                            className="h-14 px-12 bg-slate-950 text-white rounded-2xl text-[10px] font-black shadow-2xl shadow-slate-950/20 hover:bg-brand-600 transition-all disabled:opacity-30 active:scale-95 uppercase tracking-[0.2em]"
                          >
                            ĐĂNG BẢN GHI
                          </button>
                          <button 
                            onClick={() => handleDeleteBug(selectedBug.id)}
                            className="flex items-center gap-2 text-[10px] font-black text-rose-300 hover:text-rose-500 transition-all uppercase tracking-[0.3em] font-display italic"
                          >
                            <Trash2 size={16} /> TIÊU HỦY VỤ VIỆC
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
