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
}

const DraggableAny = Draggable as any;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

export default function KanbanBoard({ projectId, userId, userProfiles }: KanbanBoardProps) {
  const [bugs, setBugs] = useState<Bug[]>([]);
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
    console.log("Starting bugs snapshot listener for project:", projectId);
    const q = query(collection(db, 'bugs'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bugList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bug[];
      setBugs(bugList);
    }, (error) => {
      handleFirestoreError(error, 'list', `bugs/${projectId}`);
    });
    return () => unsubscribe();
  }, [projectId]);

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
    });

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
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
        userName: auth.currentUser.displayName || 'Operator',
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
      toast.success("STATUS_MIGRATED", {
        description: `${oldStatus.toUpperCase()} -> ${newStatus.toUpperCase()}`
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      toast.error("MIGRATION_FAILED", {
        description: "Status update protocol interrupted."
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
      toast.success("ENTRY_INITIATED", {
        description: `Ref: ${docRef.id.slice(0, 8)}`,
      });
      setNewBugTitle('');
      setIsAdding(null);
    } catch (error) {
      handleFirestoreError(error, 'create', 'bugs');
      toast.error("INITIALIZATION_FAILED", {
        description: "Sector access denied or link error."
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
    try {
      await deleteDoc(doc(db, 'bugs', id));
      if (selectedBug?.id === id) setSelectedBug(null);
      toast.info("RECORD_PURGED", {
        description: `Sector ${id.slice(0, 6)} cleared.`
      });
    } catch (error) {
      handleFirestoreError(error, 'delete', `bugs/${id}`);
      toast.error("PURGE_FAILED");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedBug || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'comments'), {
        bugId: selectedBug.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
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

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden relative z-10 px-12 py-10 tech-grid-bg">
      <div className="absolute top-0 left-0 w-full h-8 tech-ruler-x z-0" />
      <div className="absolute top-0 right-12 bottom-0 w-4 tech-ruler-y z-0" />
      {/* Header / Utilities */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4 relative z-10">
        <div>
          <div className="font-mono text-[11px] font-bold text-[#FF5F1F] mb-2 uppercase tracking-[0.4em]">Node_Directory_v3</div>
          <h1 className="text-6xl font-black text-black uppercase tracking-tighter leading-none italic">Task_Matrix</h1>
          <p className="text-sm text-black/40 mt-3 font-mono font-bold uppercase tracking-widest">Protocol_ID: {projectId.toUpperCase().slice(0, 12)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="hidden xl:flex flex-col items-end mr-8 font-mono text-[8px] font-bold text-black opacity-20 uppercase tracking-widest leading-tight">
            <div>COORD_X_092</div>
            <div>SECTOR_SIG_0x4F</div>
            <div>STATUS_SYNC_OK</div>
          </div>
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black opacity-30 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" placeholder="FILTER_NODES..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-16 bg-white border-4 border-black pl-16 pr-8 text-xl font-black uppercase tracking-tighter focus:bg-[#FF5F1F]/5 focus:outline-none transition-all w-80 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]"
            />
          </div>
          
          <div className="h-16 bg-white border-4 border-black px-8 flex items-center gap-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
            <Filter size={18} className="text-black" />
            <select 
              value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-black outline-none cursor-pointer"
            >
              <option value="all">[ ALL_PRIORITY ]</option>
              <option value="critical">CRITICAL_FAIL</option>
              <option value="high">HIGH_LOAD</option>
              <option value="medium">STANDARD</option>
              <option value="low">LOW_PRIORITY</option>
            </select>
          </div>

          <button 
            className="btn-protocol h-16 px-10 text-xs mechanical-click"
            onClick={() => setIsAdding('backlog')}
          >
            <Plus size={20} />
            INIT_EXECUTION
          </button>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex gap-8 h-full overflow-x-auto pb-12 custom-scrollbar"
      >
        <DragDropContext onDragEnd={onDragEnd}>
          {STATUS_COLUMNS.map((column) => (
            <div 
              key={column.id} 
              className="flex flex-col w-[400px] shrink-0 select-none relative"
            >
                <div className="absolute -left-2 top-20 bottom-20 w-[1px] bg-black opacity-10" />
                <div className="flex items-center justify-between mb-8 px-6 py-4 bg-black text-white mechanical-click">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-4 h-4",
                      column.id === 'backlog' ? "bg-slate-400" :
                      column.id === 'in-progress' ? "bg-indigo-400" :
                      column.id === 'in-review' ? "bg-amber-400" :
                      "bg-[#FF5F1F]"
                    )} />
                    <span className="text-[12px] font-mono font-bold uppercase tracking-[0.4em]">{column.label}</span>
                  </div>
                  <div className="font-mono text-[14px] font-black text-[#FF5F1F]">
                    {filteredBugs.filter(b => b.status === column.id).length.toString().padStart(2, '0')}
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 flex flex-col gap-6 min-h-[500px] transition-all p-4 border-l-4 border-black/5 pb-32",
                        snapshot.isDraggingOver ? "bg-[#FF5F1F]/5" : "bg-transparent"
                      )}
                    >
                      <AnimatePresence mode="popLayout">
                        {isAdding === column.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_#FF5F1F] z-30"
                          >
                            <label className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4 block opacity-30">Entry_Payload</label>
                            <textarea 
                              autoFocus placeholder="DESCRIBE_ACTION..."
                              className="w-full text-xl outline-none mb-6 font-bold text-black uppercase bg-transparent p-0 border-none transition-all resize-none h-32 tracking-tighter leading-none"
                              value={newBugTitle} onChange={(e) => setNewBugTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddBug(column.id); }
                                if (e.key === 'Escape') setIsAdding(null);
                              }}
                            />
                            <div className="flex gap-4">
                              <button 
                                onClick={() => handleAddBug(column.id)}
                                className="flex-1 bg-black text-white text-[11px] font-mono font-bold uppercase tracking-widest py-4 hover:bg-[#FF5F1F] transition-all"
                              >
                                EXECUTE
                              </button>
                              <button 
                                onClick={() => setIsAdding(null)}
                                className="flex-1 border-4 border-black text-[11px] font-mono font-bold uppercase tracking-widest py-4 hover:bg-black hover:text-white transition-all"
                              >
                                ABORT
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {filteredBugs
                        .filter(bug => bug.status === column.id)
                        .map((bug, index) => (
                          <DraggableAny key={bug.id} draggableId={bug.id} index={index}>
                            {(provided: any, snapshot: any) => (
                              <motion.div
                                layout
                                variants={itemVariants}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedBug(bug)}
                                className={cn(
                                  "group protocol-card p-8 bg-white border-4 border-black transition-all relative cursor-grab",
                                  snapshot.isDragging && "shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rotate-3 z-50",
                                  !snapshot.isDragging && "hover:shadow-[12px_12px_0px_0px_#FF5F1F] hover:-translate-x-1 hover:-translate-y-1"
                                )}
                                style={{ ...provided.draggableProps.style }}
                              >
                                <div className="flex justify-between items-start mb-10">
                                  <div className={cn(
                                    "px-4 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] border-2",
                                    bug.priority === 'critical' ? "bg-black text-white border-black" :
                                    bug.priority === 'high' ? "bg-[#FF5F1F] text-white border-[#FF5F1F]" :
                                    "bg-white text-black border-black/10"
                                  )}>
                                    {bug.priority}
                                  </div>
                                  <div className="w-12 h-12 border-4 border-black bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] group-hover:shadow-[4px_4px_0px_0px_#FF5F1F] transition-all">
                                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${bug.assigneeId || '?'}`} alt="" className="w-full h-full object-cover grayscale brightness-110" />
                                  </div>
                                </div>
                                
                                <h4 className="text-2xl font-black text-black mb-8 leading-none uppercase tracking-tighter italic">
                                  {bug.title}
                                </h4>
                                
                                <div className="flex items-center justify-between pt-6 border-t-4 border-black/5">
                                  <div className="flex items-center gap-4 text-black/30 font-mono font-bold text-[9px] uppercase tracking-widest">
                                    <Clock size={14} className="text-[#FF5F1F]" />
                                    <span>{bug.createdAt?.toDate ? new Date(bug.createdAt.toDate()).toLocaleDateString() : 'SYNC_NODE'}</span>
                                  </div>
                                  <div className="font-mono text-[11px] font-black text-black group-hover:text-[#FF5F1F] transition-colors uppercase">
                                    ID_{bug.id.slice(-6).toUpperCase()}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </DraggableAny>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </DragDropContext>
        </motion.div>

        {/* Selected Bug Detail Panel */}
      <AnimatePresence>
        {selectedBug && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedBug(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[200]"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white border-l-[12px] border-black z-[210] flex flex-col shadow-[-40px_0px_0px_0px_rgba(255,95,31,0.1)] overflow-hidden"
            >
              {/* Panel Header */}
              <div className="p-12 border-b-8 border-black flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-black text-white flex items-center justify-center rotate-6">
                    <BugIcon size={32} />
                  </div>
                  <div>
                    <div className="text-[12px] font-mono font-bold text-[#FF5F1F] uppercase tracking-[0.5em] mb-2 font-black italic">ENTRY_PROTOCOL_v3.0</div>
                    <h3 className="text-3xl font-black text-black uppercase tracking-tighter">NODE_{selectedBug.id.toUpperCase().slice(0, 10)}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBug(null)} 
                  className="w-16 h-16 border-4 border-black flex items-center justify-center text-black hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[6px_6px_0px_0px_#000]"
                >
                  <X size={32} />
                </button>
              </div>

              {/* Panel Navigation */}
              <div className="flex border-b-8 border-black bg-black p-2 shrink-0">
                {[
                  { id: 'info', label: 'CORE_DATA', icon: <Activity size={18} /> },
                  { id: 'comments', label: 'METADATA', icon: <MessageSquare size={18} /> },
                  { id: 'history', label: 'PROTOCOL_HISTORY', icon: <History size={18} /> },
                ].map(tab => (
                  <button
                    key={tab.id} onClick={() => setActivePanelTab(tab.id as any)}
                    className={cn(
                      "flex-1 py-6 text-[11px] font-mono font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all",
                      activePanelTab === tab.id ? "bg-white text-black" : "text-white/40 hover:text-white"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-16 space-y-16 custom-scrollbar bg-white relative">
                <AnimatePresence mode="wait">
                  {activePanelTab === 'info' && (
                    <motion.div 
                      key="info"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-16"
                    >
                      <section>
                        <label className="text-[12px] font-mono font-bold text-black/30 uppercase tracking-[0.4em] mb-6 block">IDENTIFIER_STRING</label>
                        <input 
                          type="text" value={selectedBug.title}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                          className="w-full text-5xl font-black text-black outline-none border-none p-0 bg-transparent tracking-tighter leading-none italic uppercase focus:text-[#FF5F1F] transition-colors"
                        />
                      </section>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <section className="protocol-card p-10 bg-slate-50 border-4 border-black">
                          <label className="text-[11px] font-mono font-bold text-black opacity-40 uppercase tracking-[0.3em] mb-6 block">ASSIGNED_OPERATOR</label>
                          <div className="relative group">
                            <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-black pointer-events-none" />
                            <select 
                              value={selectedBug.assigneeId || ''}
                              onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                              className="w-full bg-white border-4 border-black h-16 pl-14 pr-8 text-sm font-black uppercase outline-none focus:bg-[#FF5F1F]/10 transition-all appearance-none cursor-pointer"
                            >
                              <option value="">UNASSIGNED</option>
                              {userProfiles.map(u => (
                                <option key={u.userId} value={u.userId}>{u.displayName.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                        </section>
                        <section className="protocol-card p-10 bg-slate-50 border-4 border-black">
                          <label className="text-[11px] font-mono font-bold text-black opacity-40 uppercase tracking-[0.3em] mb-6 block">PRIORITY_LOAD</label>
                          <select 
                            value={selectedBug.priority}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                            className="w-full bg-white border-4 border-black h-16 px-6 text-sm font-black uppercase outline-none focus:bg-[#FF5F1F]/10 transition-all appearance-none cursor-pointer"
                          >
                            {Object.keys(PRIORITY_CONFIG).map(p => (
                              <option key={p} value={p}>{PRIORITY_CONFIG[p as BugPriority].label.toUpperCase()}</option>
                            ))}
                          </select>
                        </section>
                      </div>

                      <section className="protocol-card p-12 bg-black text-white">
                        <label className="text-[11px] font-mono font-bold text-[#FF5F1F] uppercase tracking-[0.4em] mb-8 block">DESCRIPTION_BLOB</label>
                        <textarea 
                          placeholder="INPUT_DETAILED_REPORTS..."
                          className="w-full min-h-[300px] bg-transparent border-none p-0 text-2xl font-medium text-white/80 outline-none resize-none leading-tight selection:bg-[#FF5F1F]"
                          value={selectedBug.description || ''}
                          onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                        />
                      </section>
                    </motion.div>
                  )}

                  {activePanelTab === 'comments' && (
                    <motion.div 
                      key="comments"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col h-full space-y-12"
                    >
                      <div className="space-y-12 flex-1">
                        {comments.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-32 border-8 border-dashed border-black/10">
                            <Terminal size={80} className="text-black/10 mb-8" />
                            <p className="text-[12px] font-mono font-bold text-black opacity-20 uppercase tracking-[0.5em]">WAITING_FOR_DATA_PACKETS</p>
                          </div>
                        )}
                        {comments.map((c) => (
                          <div key={c.id} className="protocol-card border-black p-8 bg-white relative">
                            <div className="absolute -top-4 -left-4 px-4 py-1 bg-black text-white font-mono text-[10px] font-bold uppercase">{c.userName}</div>
                            <div className="flex justify-between items-center mb-6 pt-2">
                              <span className="text-[10px] font-mono font-bold text-[#FF5F1F] opacity-60 uppercase tracking-widest">TRANSMISSION_RECV</span>
                              <span className="text-[10px] font-mono font-bold text-black/30 tracking-widest">{c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString() : 'TIMESTAMP_PENDING'}</span>
                            </div>
                            <p className="text-xl font-bold uppercase italic tracking-tighter leading-none">{c.content}</p>
                          </div>
                        ))}
                        <div ref={bottomRef} />
                      </div>

                      <div className="pt-12 border-t-8 border-black">
                        <div className="bg-white border-8 border-black p-2 flex items-end gap-4 focus-within:shadow-[12px_12px_0px_0px_#FF5F1F] transition-all">
                          <textarea 
                            placeholder="TRANSMIT_METADATA..."
                            className="flex-1 bg-transparent border-none py-6 px-8 text-2xl font-black uppercase italic outline-none resize-none h-40 placeholder:text-black/5"
                            value={newComment} onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                          />
                          <button 
                            onClick={handleAddComment}
                            className="w-24 h-24 bg-black text-white flex items-center justify-center hover:bg-[#FF5F1F] transition-all mb-2 mr-2"
                          >
                            <Send size={40} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activePanelTab === 'history' && (
                    <motion.div 
                      key="history"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-12"
                    >
                      {activityLogs.map((log) => (
                        <div key={log.id} className="relative pl-12 border-l-8 border-black">
                          <div className="absolute -left-5 top-0 w-8 h-8 bg-[#FF5F1F] border-4 border-black" />
                          <div className="pb-12">
                            <div className="flex items-center gap-6 mb-4">
                              <span className={cn(
                                "px-4 py-1 bg-black text-white font-mono text-[10px] font-black uppercase tracking-widest",
                                log.action === 'CREATE' ? "shadow-[4px_4px_0px_0px_#10b981]" :
                                log.action === 'STATUS_CHANGE' ? "shadow-[4px_4px_0px_0px_#FF5F1F]" :
                                "shadow-[4px_4px_0px_0px_#000]"
                              )}>
                                {log.action}
                              </span>
                              <span className="text-[12px] font-mono font-bold text-black/30">
                                [{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : 'now'}]
                              </span>
                            </div>
                            <p className="text-2xl font-black uppercase leading-tight italic mb-3 tracking-tighter">{log.details}</p>
                            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#FF5F1F]">OPERATOR // {log.userName.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-16 border-t-8 border-black flex gap-8 bg-white shrink-0">
                <button 
                  onClick={() => handleDeleteBug(selectedBug.id)}
                  className="flex-1 h-24 border-8 border-black text-xl font-black uppercase hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-4 italic"
                >
                  <Trash2 size={32} />
                  PURGE_ENTRY
                </button>
                <button 
                  onClick={() => setSelectedBug(null)}
                  className="flex-1 h-24 bg-black text-white text-xl font-black uppercase hover:bg-[#FF5F1F] transition-all flex items-center justify-center gap-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)]"
                >
                  <CheckCircle2 size={32} />
                  SYNC_TERMINATE
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
