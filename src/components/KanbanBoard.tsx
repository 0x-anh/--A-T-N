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
  userProfiles: UserProfile[];
}

const DraggableAny = Draggable as any;

export default function KanbanBoard({ projectId, userProfiles }: KanbanBoardProps) {
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
    <div className="flex-1 w-full flex flex-col overflow-hidden relative z-10 px-8 py-6">
      {/* Header / Utilities */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Issues</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium italic">Project ID: {projectId.slice(0, 8)}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" placeholder="Search issues..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 text-xs font-medium focus:border-indigo-500 focus:outline-none transition-all w-48 focus:w-64"
            />
          </div>
          
          <div className="h-10 bg-slate-900 border border-slate-800 rounded-lg px-3 flex items-center gap-2">
            <Filter size={14} className="text-slate-600" />
            <select 
              value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-400 outline-none cursor-pointer"
            >
              <option value="all">Filters</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button 
            className="h-10 px-4 bg-white text-slate-950 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all shadow-lg"
            onClick={() => setIsAdding('backlog')}
          >
            Create Issue
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 flex gap-4 h-full overflow-x-auto pb-4 custom-scrollbar">
            {STATUS_COLUMNS.map((column) => (
              <div key={column.id} className="flex flex-col w-[300px] shrink-0 p-1">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">{column.label}</span>
                    <span className="text-[10px] font-bold text-slate-600 ml-1">
                      {filteredBugs.filter(b => b.status === column.id).length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={cn(
                        "flex-1 flex flex-col gap-3 min-h-[400px] transition-all p-1 pb-20 rounded-xl",
                        snapshot.isDraggingOver && "bg-slate-900/30"
                      )}
                    >
                      <AnimatePresence>
                        {isAdding === column.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl shadow-xl z-30"
                          >
                            <textarea 
                              autoFocus placeholder="New issue title..."
                              className="w-full text-xs outline-none mb-3 font-semibold text-white placeholder:text-slate-700 bg-slate-950 p-3 rounded-lg border border-slate-800 focus:border-indigo-500 transition-all resize-none h-20"
                              value={newBugTitle} onChange={(e) => setNewBugTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddBug(column.id); }
                                if (e.key === 'Escape') setIsAdding(null);
                              }}
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAddBug(column.id)}
                                className="flex-1 bg-white text-slate-950 text-[10px] font-bold uppercase tracking-widest py-2 rounded hover:bg-slate-200 transition-all active:scale-95"
                              >
                                Add
                              </button>
                              <button 
                                onClick={() => setIsAdding(null)}
                                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                              >
                                Cancel
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
                                layoutId={bug.id}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedBug(bug)}
                                className={cn(
                                  "group saas-card p-4 rounded-xl transition-all relative cursor-pointer",
                                  snapshot.isDragging && "scale-[1.02] z-50 ring-2 ring-indigo-500/40 opacity-100",
                                  !snapshot.isDragging && "hover:border-slate-700/80 hover:bg-slate-800/40"
                                )}
                                style={{ ...provided.draggableProps.style }}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className={cn(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.15em] border",
                                    bug.priority === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                    bug.priority === 'high' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                    bug.priority === 'medium' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                                    "bg-slate-800 text-slate-500 border-slate-700/50"
                                  )}>
                                    {bug.priority}
                                  </div>
                                  <div className="w-5 h-5 rounded-full border border-slate-800 bg-slate-900 overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
                                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${bug.assigneeId || '?'}`} alt="" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                                
                                <h4 className="text-[12px] font-semibold text-slate-200 mb-4 leading-relaxed line-clamp-2">
                                  {bug.title}
                                </h4>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <Clock size={11} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">
                                      {bug.createdAt?.toDate ? new Date(bug.createdAt.toDate()).toLocaleDateString() : 'now'}
                                    </span>
                                  </div>
                                  <div className="text-slate-700 opacity-60 text-[9px] font-mono group-hover:text-indigo-400 group-hover:opacity-100 mt-0.5">
                                    #{bug.id.slice(-4).toUpperCase()}
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
          </div>
        </DragDropContext>

        {/* Selected Bug Detail Panel */}
        <AnimatePresence>
          {selectedBug && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSelectedBug(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div 
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#020617] border-l border-slate-800/80 z-[210] flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-8 border-b border-slate-800/50 flex justify-between items-center bg-[#020617]/80 backdrop-blur-xl shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center">
                      <BugIcon size={20} className="text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-1">Issue Overview</div>
                      <h3 className="text-sm font-bold text-white tracking-tight">#{selectedBug.id.toUpperCase().slice(0, 8)}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedBug(null)} 
                    className="w-10 h-10 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-all bg-slate-900/50"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Panel Navigation */}
                <div className="flex border-b border-slate-800 bg-[#020617] shrink-0 p-1">
                  {[
                    { id: 'info', label: 'Overview', icon: <Activity size={12} /> },
                    { id: 'comments', label: 'Discussion', icon: <MessageSquare size={12} /> },
                    { id: 'history', label: 'History', icon: <History size={12} /> },
                  ].map(tab => (
                    <button
                      key={tab.id} onClick={() => setActivePanelTab(tab.id as any)}
                      className={cn(
                        "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-lg",
                        activePanelTab === tab.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[#020617] relative">
                  <AnimatePresence mode="wait">
                    {activePanelTab === 'info' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-10"
                      >
                        <section>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 block">Title</label>
                          <input 
                            type="text" value={selectedBug.title}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                            className="w-full text-xl font-bold text-white outline-none focus:text-indigo-400 transition-all border-none p-0 bg-transparent tracking-tight leading-relaxed"
                          />
                        </section>

                        <div className="grid grid-cols-2 gap-8">
                          <section>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Assignee</label>
                            <div className="relative group">
                              <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
                              <select 
                                value={selectedBug.assigneeId || ''}
                                onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg h-10 pl-9 pr-4 text-xs font-semibold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer text-slate-300"
                              >
                                <option value="">Unassigned</option>
                                {userProfiles.map(u => (
                                  <option key={u.userId} value={u.userId}>{u.displayName}</option>
                                ))}
                              </select>
                            </div>
                          </section>
                          <section>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Priority</label>
                            <select 
                              value={selectedBug.priority}
                              onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg h-10 px-4 text-xs font-semibold outline-none focus:border-indigo-500 transition-all text-slate-300 appearance-none cursor-pointer"
                            >
                              {Object.keys(PRIORITY_CONFIG).map(p => (
                                <option key={p} value={p}>{p.toUpperCase()}</option>
                              ))}
                            </select>
                          </section>
                        </div>

                        <section>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Description</label>
                          <textarea 
                            placeholder="Add details..."
                            className="w-full min-h-[150px] bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm font-medium text-slate-300 outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                            value={selectedBug.description || ''}
                            onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
                          />
                        </section>
                      </motion.div>
                    )}

                    {activePanelTab === 'comments' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col h-full space-y-8"
                      >
                        <div className="space-y-6 flex-1">
                          {comments.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20">
                              <MessageSquare size={32} className="text-slate-800 mb-4" />
                              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">No activity</p>
                            </div>
                          )}
                          {comments.map((c) => (
                            <div key={c.id} className="flex gap-4 group">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${c.userName}`} alt="" className="w-full h-full" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-200">{c.userName}</span>
                                  <span className="text-[9px] font-bold text-slate-600 tracking-tighter">{c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString() : 'now'}</span>
                                </div>
                                <p className="text-[13px] text-slate-400 font-medium leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          <div ref={bottomRef} />
                        </div>

                        <div className="pt-8 border-t border-slate-800/50">
                          <div className="bg-slate-900 rounded-xl p-1 flex items-end gap-2 border border-slate-800/80 focus-within:border-indigo-500 transition-all">
                            <textarea 
                              placeholder="Add comment..."
                              className="flex-1 bg-transparent border-none py-3 px-4 text-sm font-medium text-slate-200 focus:outline-none resize-none h-24 placeholder:text-slate-700"
                              value={newComment} onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                            />
                            <button 
                              onClick={handleAddComment}
                              className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all mb-1 mr-1"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activePanelTab === 'history' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        {activityLogs.map((log) => (
                          <div key={log.id} className="flex gap-4 group">
                            <div className="flex flex-col items-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-indigo-500 transition-all" />
                              <div className="w-[1px] h-full bg-slate-900/50 mt-1" />
                            </div>
                            <div className="pb-6">
                              <div className="flex items-center gap-3 mb-1">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                                  log.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                  log.action === 'STATUS_CHANGE' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                                  "bg-slate-900 text-slate-500 border-slate-800"
                                )}>
                                  {log.action}
                                </span>
                                <span className="text-[9px] font-bold text-slate-700 font-mono tracking-tighter">
                                  {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : 'now'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-400 mb-0.5">{log.details}</p>
                              <div className="text-[9px] font-bold text-slate-600">by {log.userName}</div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-8 border-t border-slate-800 flex gap-4 bg-[#020617] shrink-0">
                  <button 
                    onClick={() => handleDeleteBug(selectedBug.id)}
                    className="flex-1 h-12 rounded-lg border border-slate-800 text-xs font-bold text-slate-600 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button 
                    onClick={() => setSelectedBug(null)}
                    className="flex-1 h-12 rounded-lg bg-white text-slate-950 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Done
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
