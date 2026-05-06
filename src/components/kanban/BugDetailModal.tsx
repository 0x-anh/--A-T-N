import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShieldCheck, MessageSquare, Clock, Users, Cpu, Activity, Send, AlertCircle, Plus, ChevronRight } from 'lucide-react';
import { 
  Bug, BugPriority, UserProfile, 
  PRIORITY_CONFIG, canDeleteBug, canEditBug 
} from '../../types';
import { cn } from '../../lib/utils';

interface BugDetailModalProps {
  selectedBug: Bug | null;
  onClose: () => void;
  userProfiles: UserProfile[];
  userId: string;
  isAdmin: boolean;
  handleUpdateBugDetails: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  handleDeleteBug: (bugId: string) => Promise<void>;
  logActivity: (bugId: string, type: string, content: string) => Promise<void>;
  comments: any[];
  newComment: string;
  setNewComment: (val: string) => void;
  handleAddComment: () => Promise<void>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  projectMemberIds: string[];
}

const BugDetailModal = ({ 
  selectedBug, 
  onClose, 
  userProfiles, 
  userId, 
  isAdmin,
  handleUpdateBugDetails,
  handleDeleteBug,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  bottomRef,
  projectMemberIds
}: BugDetailModalProps) => {
  const [activeTab, setActiveTab] = React.useState<'details' | 'logs' | 'team'>('details');
  const [isPriorityOpen, setIsPriorityOpen] = React.useState(false);
  const [isMemberOpen, setIsMemberOpen] = React.useState(false);
  
  const [localTitle, setLocalTitle] = React.useState(selectedBug?.title || '');
  const [localDescription, setLocalDescription] = React.useState(selectedBug?.description || '');
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (selectedBug) {
      setLocalTitle(selectedBug.title);
      setLocalDescription(selectedBug.description || '');
    }
  }, [selectedBug?.id]);

  const hasChanges = selectedBug && (localTitle !== selectedBug.title || localDescription !== (selectedBug.description || ''));

  const handleSave = async () => {
    if (!selectedBug || !hasChanges) return;
    setIsSaving(true);
    await handleUpdateBugDetails(selectedBug.id, { 
      title: localTitle, 
      description: localDescription 
    });
    setIsSaving(false);
  };

  if (!selectedBug) return null;

  const projectMembers = userProfiles.filter(u => projectMemberIds.includes(u.userId));
  const currentUser = userProfiles.find(u => u.userId === userId);
  
  // STRICT PERMISSIONS
  const canModifyGeneral = isAdmin || canEditBug(currentUser?.roles, selectedBug.status);
  const canManageTeam = isAdmin || currentUser?.roles?.includes('qa'); // Only Admin/QA can assign team
  const isAssigned = selectedBug.assigneeId === userId || selectedBug.members?.includes(userId);
  
  // Final edit right: Either has role-based edit right OR is assigned to this task (for comments/updates)
  const isEditable = canModifyGeneral || isAssigned;
  
  const assigneeProfiles = userProfiles.filter(u => (selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : [])).includes(u.userId));
  const assigneeIds = selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : []);
  const isOverdue = selectedBug.dueDate && new Date(selectedBug.dueDate) < new Date() && selectedBug.status !== 'done';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 30 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="relative w-full max-w-7xl h-full md:h-[90vh] bg-white/10 border-2 border-slate-950/40 ring-1 ring-slate-950/10 rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col lg:flex-row tech-corners"
        >
          {/* Tech Accents */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-600 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-600/40 to-transparent" />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-600 rounded-tl-[2rem] md:rounded-tl-[3rem]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-600 rounded-br-[2rem] md:rounded-br-[3rem]" />

          {/* Sidebar */}
          <div className="w-full lg:w-[400px] bg-white/20 backdrop-blur-xl border-r-2 border-slate-400/50 flex flex-col p-6 md:p-10 space-y-8 overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-brand-700 uppercase tracking-[0.4em] font-mono mb-2">SYSTEM_NODE_01</span>
                <div className={cn(
                  "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border-2 w-fit",
                  selectedBug.status === 'done' ? "bg-emerald-500/20 text-emerald-700 border-emerald-600/40" : "bg-brand-500/20 text-brand-700 border-brand-600/40"
                )}>
                  {selectedBug.status.replace('-', ' ')}
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-950/5 text-slate-600 hover:text-slate-950 hover:bg-slate-950/10 transition-all border-2 border-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                 <div className="p-4 rounded-2xl bg-white/40 border-2 border-slate-950/50 space-y-2 cursor-pointer group" onClick={() => setIsPriorityOpen(!isPriorityOpen)}>
                    <div className="flex items-center justify-between text-slate-950">
                       <div className="flex items-center gap-2">
                          <AlertCircle size={12} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Độ Ưu Tiên</span>
                       </div>
                       <ChevronRight size={12} className={cn("transition-transform duration-300", isPriorityOpen && "rotate-90")} />
                    </div>
                    <div className={cn("text-xs font-black uppercase flex items-center gap-2", PRIORITY_CONFIG[selectedBug.priority].color)}>
                       {PRIORITY_CONFIG[selectedBug.priority].label}
                    </div>
                 </div>

                 {/* Custom HUD Dropdown */}
                 <AnimatePresence>
                    {isPriorityOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsPriorityOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute top-full left-0 right-0 z-20 bg-white/90 backdrop-blur-2xl border-2 border-slate-950/40 rounded-2xl shadow-2xl overflow-hidden p-1.5 space-y-1"
                        >
                          {(Object.entries(PRIORITY_CONFIG) as [BugPriority, any][]).map(([key, cfg]) => (
                            <button 
                              key={key}
                              disabled={!canModifyGeneral}
                              onClick={() => {
                                handleUpdateBugDetails(selectedBug.id, { priority: key });
                                setIsPriorityOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between p-3 rounded-xl transition-all group/opt",
                                selectedBug.priority === key ? "bg-slate-950 text-white" : "hover:bg-slate-100 text-slate-950 hover:text-slate-950"
                              )}
                            >
                              <span className="text-[10px] font-black uppercase tracking-wider">{cfg.label}</span>
                              <cfg.icon size={14} className={cn(selectedBug.priority === key ? "text-white" : cfg.color)} />
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                 </AnimatePresence>
              </div>

              <div className={cn(
                "p-4 rounded-2xl border-2 space-y-2 transition-all group",
                isOverdue ? "bg-rose-500/20 border-rose-600/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]" : "bg-white/40 border-slate-950/50 hover:bg-white/60 hover:border-slate-950"
              )}>
                 <div className="flex items-center gap-2 text-slate-950">
                    <Clock size={12} className={cn(isOverdue && "text-rose-700")} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Hạn Cuối [T+0]</span>
                 </div>
                 <input 
                    type="datetime-local"
                    value={selectedBug.dueDate || ''}
                    disabled={!canModifyGeneral}
                    onChange={(e) => handleUpdateBugDetails(selectedBug.id, { dueDate: e.target.value })}
                    className="w-full bg-transparent text-[11px] font-black text-slate-950 outline-none cursor-pointer uppercase disabled:cursor-not-allowed appearance-none"
                 />
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-950">
                     <Users size={12} />
                     <span className="text-[8px] font-black uppercase tracking-widest">Đội ngũ thực thi_</span>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2">
                  {assigneeProfiles.map(u => (
                    <div key={u.userId} className="group relative">
                      <img src={u.photoURL} className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-600 shadow-lg shadow-brand-600/20" alt={u.displayName} />
                      {canManageTeam && (
                        <button 
                          onClick={() => {
                            const newMembers = (selectedBug.members || []).filter(id => id !== u.userId);
                            handleUpdateBugDetails(selectedBug.id, { members: newMembers, assigneeId: newMembers[0] || '' });
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform shadow-xl"
                        >
                          <X size={10} strokeWidth={4} />
                        </button>
                      )}
                    </div>
                  ))}
                  {canManageTeam && (
                    <div className="relative">
                      <button 
                        onClick={() => setIsMemberOpen(!isMemberOpen)}
                        className="w-10 h-10 rounded-xl bg-slate-950/5 border-2 border-slate-400 flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-950/10 transition-all shadow-sm"
                      >
                        <Plus size={16} className={cn("transition-transform duration-300", isMemberOpen && "rotate-45")} />
                      </button>

                      <AnimatePresence>
                        {isMemberOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMemberOpen(false)} />
                            <motion.div 
                              initial={{ opacity: 0, x: 20, scale: 0.95 }}
                              animate={{ opacity: 1, x: 10, scale: 1 }}
                              exit={{ opacity: 0, x: 20, scale: 0.95 }}
                              className="absolute left-full top-0 ml-2 z-20 w-64 bg-white/95 backdrop-blur-2xl border-2 border-slate-950/40 rounded-2xl shadow-2xl overflow-hidden p-2 space-y-1"
                            >
                              <div className="px-3 py-2 border-b border-slate-200 mb-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Chọn nhân sự bổ sung_</p>
                              </div>
                              <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                                {projectMembers.filter(u => !assigneeIds.includes(u.userId)).map(u => (
                                  <button 
                                    key={u.userId}
                                    onClick={() => {
                                      const currentMembers = selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : []);
                                      handleUpdateBugDetails(selectedBug.id, { 
                                        members: [...currentMembers, u.userId],
                                        assigneeId: u.userId
                                      });
                                      setIsMemberOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-all text-left group/u"
                                  >
                                    <img src={u.photoURL} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black text-slate-950 uppercase truncate">{u.displayName}</p>
                                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter truncate">{u.email.split('@')[0]}</p>
                                    </div>
                                  </button>
                                ))}
                                {projectMembers.filter(u => !assigneeIds.includes(u.userId)).length === 0 && (
                                  <p className="p-4 text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">Toàn bộ đã tham gia_</p>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
               </div>
            </div>

            <div className="space-y-4 pt-4 border-t-2 border-slate-400/50">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-brand-700" />
                <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest font-mono">CẤU HÌNH NHIỆM VỤ</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/30 border-2 border-slate-300 space-y-4">
                <div className="space-y-1">
                   <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Mã định danh</p>
                   <p className="text-[10px] font-black text-slate-950 font-mono uppercase tracking-tighter">NODE_{selectedBug.id.substring(0, 12)}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Khởi tạo</p>
                   <p className="text-[10px] font-black text-slate-950 font-mono uppercase tracking-tighter">
                    {selectedBug.createdAt?.toDate ? selectedBug.createdAt.toDate().toLocaleString() : 'PENDING_SIGNAL'}
                   </p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
               {(isAdmin || canDeleteBug(currentUser?.roles)) && (
                  <button 
                    onClick={() => handleDeleteBug(selectedBug.id)}
                    className="w-full h-12 flex items-center justify-center gap-3 rounded-2xl bg-rose-100 text-rose-700 border-2 border-rose-300 hover:bg-rose-600 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/10 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Trash2 size={16} />
                    GIẢI PHÓNG NODE
                  </button>
                )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full bg-white/5 backdrop-blur-md">
             <div className="flex items-center px-10 pt-8 gap-8 border-b-2 border-slate-400/30">
                {[
                  { id: 'details', label: 'THÔNG SỐ KỸ THUẬT', icon: Cpu },
                  { id: 'logs', label: 'DỮ LIỆU LOG', icon: Activity },
                  { id: 'team', label: 'ĐỘI NGŨ SQUAD', icon: Users }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "pb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                      activeTab === tab.id ? "text-brand-700" : "text-slate-950 hover:text-slate-950"
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-700" />
                    )}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                {activeTab === 'details' && (
                  <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-[2px] bg-brand-700" />
                           <span className="text-[9px] font-black text-brand-700 uppercase tracking-widest font-mono">MISSION_TITLE</span>
                        </div>
                        <textarea 
                          rows={2}
                          className="w-full text-3xl md:text-5xl font-heading font-black text-slate-950 outline-none border-none p-0 bg-transparent tracking-tighter leading-none resize-none placeholder:text-slate-950/50 disabled:cursor-not-allowed uppercase"
                          placeholder="TIÊU ĐỀ NÚT..."
                          value={localTitle}
                          disabled={!canModifyGeneral || isSaving}
                          onChange={(e) => setLocalTitle(e.target.value)}
                        />
                     </div>

                     <div className="space-y-4 relative group/desc">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-[2px] bg-slate-400" />
                              <span className="text-[9px] font-black text-slate-950 uppercase tracking-widest font-mono">TECHNICAL_SPECIFICATIONS</span>
                           </div>
                           
                           <motion.button 
                             onClick={handleSave}
                             disabled={!hasChanges || isSaving}
                             className={cn(
                               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
                               hasChanges 
                                ? "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/30 ring-2 ring-brand-400/50" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300 shadow-none"
                             )}
                           >
                             {isSaving ? (
                               <Activity size={12} className="animate-spin" />
                             ) : (
                               <Plus size={12} />
                             )}
                             {isSaving ? "ĐANG ĐỒNG BỘ..." : "LƯU THÔNG SỐ"}
                           </motion.button>
                        </div>
                        <div className="relative">
                          <textarea 
                            placeholder="Mô tả chi tiết các thông số kỹ thuật và yêu cầu triển khai..."
                            className="w-full h-80 bg-white/30 border-2 border-slate-300 rounded-3xl p-8 text-base text-slate-950 placeholder:text-slate-950/50 outline-none leading-relaxed resize-none custom-scrollbar focus:border-brand-600 focus:bg-white/60 transition-all font-black disabled:opacity-60 disabled:cursor-not-allowed"
                            value={localDescription}
                            disabled={!canModifyGeneral || isSaving}
                            onChange={(e) => setLocalDescription(e.target.value)}
                          />
                          {hasChanges && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full">
                               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                               <span className="text-[7px] font-black text-slate-950 uppercase tracking-widest">CÓ THAY ĐỔI CHƯA LƯU</span>
                            </div>
                          )}
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-6">
                    {comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 text-center">
                        <MessageSquare size={40} className="text-slate-950 mb-4" />
                        <p className="text-xs font-black text-slate-950 uppercase tracking-[0.2em]">DỮ LIỆU TRUYỀN TẢI TRỐNG_</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {comments.map((c) => (
                          <div key={c.id} className="flex gap-4 group">
                             <img src={userProfiles.find(u => u.userId === c.userId)?.photoURL} className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-slate-300 shadow-sm" alt="" />
                             <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                   <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider">{c.userName}</span>
                                   <span className="text-[8px] font-black text-slate-950 font-mono">
                                     {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString() : 'SIGNAL_RECEIVING...'}
                                   </span>
                                </div>
                                <div className="p-5 bg-white/40 border-2 border-slate-200 rounded-2xl rounded-tl-none group-hover:bg-white/60 transition-all">
                                   <p className="text-xs text-slate-950 leading-relaxed font-black">{c.content}</p>
                                </div>
                             </div>
                          </div>
                        ))}
                        <div ref={bottomRef} className="h-1" />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'team' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectMembers.map(u => {
                      const isSelected = assigneeIds.includes(u.userId);
                      return (
                        <button 
                          key={u.userId}
                          onClick={() => {
                             if (!canManageTeam) return;
                             const currentMembers = selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : []);
                             const newMembers = isSelected 
                               ? currentMembers.filter(id => id !== u.userId)
                               : [...currentMembers, u.userId];
                             handleUpdateBugDetails(selectedBug.id, { 
                               members: newMembers,
                               assigneeId: newMembers[0] || ''
                             });
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left disabled:cursor-not-allowed",
                            isSelected 
                              ? "bg-brand-600/10 border-brand-600 shadow-lg shadow-brand-600/5" 
                              : "bg-white/40 border-slate-300 hover:border-slate-500",
                            !canManageTeam && "opacity-60 grayscale-[0.5]"
                          )}
                          disabled={!canManageTeam}
                        >
                           <img src={u.photoURL} className="w-12 h-12 rounded-xl object-cover" alt="" />
                           <div className="flex-1">
                              <p className="text-xs font-black text-slate-950 uppercase tracking-tight">{u.displayName}</p>
                              <p className="text-[8px] font-bold text-slate-950 uppercase tracking-widest">{u.email.split('@')[0]}</p>
                           </div>
                           {isSelected && <ShieldCheck size={18} className="text-brand-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
             </div>

             {activeTab === 'logs' && (
                <div className="p-8 px-10 bg-white/60 backdrop-blur-2xl border-t-2 border-slate-400/50 flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <textarea 
                      placeholder="Nhập tín hiệu phản hồi vào luồng dữ liệu..."
                      className="w-full bg-white/40 border-2 border-slate-400 rounded-2xl p-5 text-xs font-black text-slate-950 outline-none h-24 placeholder:text-slate-950/80 resize-none custom-scrollbar focus:border-brand-600 transition-all uppercase"
                      value={newComment} 
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim()}
                    className="h-24 w-24 bg-brand-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/30 disabled:opacity-20 group"
                  >
                    <Send size={20} />
                    <span className="text-[8px] font-black uppercase tracking-widest">SEND</span>
                  </button>
                </div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BugDetailModal;
