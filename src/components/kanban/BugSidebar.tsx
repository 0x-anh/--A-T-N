import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, ChevronRight, Clock, Users, Plus, Cpu, Trash2 } from 'lucide-react';
import { Bug, BugPriority, UserProfile, PRIORITY_CONFIG, canDeleteBug } from '../../types';
import { cn } from '../../lib/utils';

interface BugSidebarProps {
  selectedBug: Bug;
  onClose: () => void;
  t: (key: string) => string;
  isAdmin: boolean;
  isOwner: boolean;
  currentUser: UserProfile | undefined;
  projectMembers: UserProfile[];
  assigneeProfiles: UserProfile[];
  assigneeIds: string[];
  isOverdue: boolean | null;
  priorityLabels: Record<BugPriority, string>;
  isPriorityOpen: boolean;
  setIsPriorityOpen: (open: boolean) => void;
  isMemberOpen: boolean;
  setIsMemberOpen: (open: boolean) => void;
  onUpdateBugDetails: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  onDeleteBug: (bugId: string) => Promise<void>;
  canManageTeam: boolean;
}

const BugSidebar = ({
  selectedBug,
  onClose,
  t,
  isAdmin,
  isOwner,
  currentUser,
  projectMembers,
  assigneeProfiles,
  assigneeIds,
  isOverdue,
  priorityLabels,
  isPriorityOpen,
  setIsPriorityOpen,
  isMemberOpen,
  setIsMemberOpen,
  onUpdateBugDetails,
  onDeleteBug,
  canManageTeam
}: BugSidebarProps) => {
  return (
    <div className="w-full lg:w-[400px] bg-white border-r-2 border-slate-300 flex flex-col p-6 md:p-10 space-y-8 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-brand-700 uppercase tracking-[0.4em] font-mono mb-2">SYSTEM_NODE_01</span>
          <div className={cn(
            "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border-2 w-fit",
            selectedBug.status === 'done' ? "bg-emerald-500/20 text-emerald-700 border-emerald-600/40" : "bg-brand-500/20 text-brand-700 border-brand-600/40"
          )}>
            {t(`kanban.${selectedBug.status.replace('-', '_')}`)}
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
           <div 
             className={cn(
               "p-4 rounded-2xl bg-white/40 border-2 border-slate-950/50 space-y-2 transition-all group",
               (isAdmin || isOwner) ? "cursor-pointer hover:bg-white/60 hover:border-slate-950" : "cursor-not-allowed opacity-80"
             )}
             onClick={() => (isAdmin || isOwner) && setIsPriorityOpen(!isPriorityOpen)}
           >
              <div className="flex items-center justify-between text-slate-950">
                 <div className="flex items-center gap-2">
                    <AlertCircle size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">{t('kanban.priority')}</span>
                 </div>
                 <ChevronRight size={12} className={cn("transition-transform duration-300", isPriorityOpen && "rotate-90")} />
              </div>
              <div className={cn("text-xs font-black uppercase flex items-center gap-2", PRIORITY_CONFIG[selectedBug.priority].color)}>
                 {priorityLabels[selectedBug.priority]}
              </div>
           </div>

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
                        disabled={!(isAdmin || isOwner)}
                        onClick={() => {
                          onUpdateBugDetails(selectedBug.id, { priority: key });
                          setIsPriorityOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all group/opt",
                          selectedBug.priority === key ? "bg-slate-950 text-white" : "hover:bg-slate-100 text-slate-950 hover:text-slate-950"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider">{priorityLabels[key]}</span>
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
              <span className="text-[8px] font-black uppercase tracking-widest">{t('kanban.due_date')} [T+0]</span>
           </div>
           <input 
              type="datetime-local"
              value={selectedBug.dueDate || ''}
              disabled={!(isAdmin || isOwner)}
              onChange={(e) => onUpdateBugDetails(selectedBug.id, { dueDate: e.target.value })}
              className="w-full bg-transparent text-[11px] font-black text-slate-950 outline-none cursor-pointer uppercase disabled:cursor-not-allowed appearance-none"
           />
        </div>
      </div>

      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-950">
               <Users size={12} />
               <span className="text-[8px] font-black uppercase tracking-widest">{t('kanban.execution_team')}_</span>
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
                      onUpdateBugDetails(selectedBug.id, { members: newMembers, assigneeId: newMembers[0] || '' });
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
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('kanban.select_additional_staff')}_</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
                          {projectMembers.filter(u => !assigneeIds.includes(u.userId)).map(u => (
                            <button 
                              key={u.userId}
                              onClick={() => {
                                const currentMembers = selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : []);
                                onUpdateBugDetails(selectedBug.id, { 
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
          <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest font-mono">{t('kanban.task_config')}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white/30 border-2 border-slate-300 space-y-4">
          <div className="space-y-1">
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{t('kanban.id_prefix')}</p>
             <p className="text-[10px] font-black text-slate-950 font-mono uppercase tracking-tighter">NODE_{selectedBug.id.substring(0, 12)}</p>
          </div>
          <div className="space-y-1">
             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{t('dashboard.created_at')}</p>
             <p className="text-[10px] font-black text-slate-950 font-mono uppercase tracking-tighter">
              {selectedBug.createdAt?.toDate ? selectedBug.createdAt.toDate().toLocaleString() : 'PENDING_SIGNAL'}
             </p>
          </div>
        </div>
      </div>

      <div className="mt-auto">
         {(isAdmin || canDeleteBug(currentUser?.roles)) && (
            <button 
              onClick={() => onDeleteBug(selectedBug.id)}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-2xl bg-rose-100 text-rose-700 border-2 border-rose-300 hover:bg-rose-600 hover:text-white transition-all duration-500 shadow-lg shadow-rose-500/10 font-black text-[10px] uppercase tracking-widest"
            >
              <Trash2 size={16} />
              {t('kanban.release_node')}
            </button>
          )}
      </div>
    </div>
  );
};

export default BugSidebar;
