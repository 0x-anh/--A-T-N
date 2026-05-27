import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Activity, Users, Plus } from 'lucide-react';
import { 
  Bug, UserProfile, 
  canEditBug 
} from '../../types';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import BugSidebar from './BugSidebar';
import BugLogsTab from './BugLogsTab';

interface BugDetailModalProps {
  selectedBug: Bug | null;
  onClose: () => void;
  userProfiles: UserProfile[];
  userId: string;
  isAdmin: boolean;
  onUpdateBugDetails: (bugId: string, updates: Partial<Bug>) => Promise<void>;
  onDeleteBug: (bugId: string) => Promise<void>;
  logActivity: (bugId: string, type: string, content: string) => Promise<void>;
  comments: any[];
  newComment: string;
  setNewComment: (val: string) => void;
  onAddComment: () => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  projectMemberIds: string[];
  isOwner: boolean;
}

const BugDetailModal = ({ 
  selectedBug, 
  onClose, 
  userProfiles, 
  userId, 
  isAdmin,
  onUpdateBugDetails,
  onDeleteBug,
  logActivity,
  comments,
  newComment,
  setNewComment,
  onAddComment,
  onDeleteComment,
  bottomRef,
  projectMemberIds,
  isOwner
}: BugDetailModalProps) => {
  const { t } = useTranslation();
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
    await onUpdateBugDetails(selectedBug.id, { 
      title: localTitle, 
      description: localDescription 
    });
    setIsSaving(false);
  };

  if (!selectedBug) return null;

  const projectMembers = userProfiles.filter(u => projectMemberIds.includes(u.userId));
  const currentUser = userProfiles.find(u => u.userId === userId);
  
  const canModifyGeneral = isAdmin || isOwner || canEditBug(currentUser?.roles, selectedBug.status);
  const canManageTeam = isAdmin || isOwner;
  const isAssigned = selectedBug.assigneeId === userId || selectedBug.members?.includes(userId);
  const isOverdue = !!(selectedBug.dueDate && new Date(selectedBug.dueDate) < new Date() && selectedBug.status !== 'done');

  const priorityLabels: any = {
    'low': t('kanban.priority_low'),
    'medium': t('kanban.priority_medium'),
    'high': t('kanban.priority_high'),
    'critical': t('kanban.priority_critical')
  };

  const assigneeProfiles = userProfiles.filter(u => 
    (selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : [])).includes(u.userId) &&
    projectMemberIds.includes(u.userId)
  );
  const assigneeIds = (selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : [])).filter(id => projectMemberIds.includes(id));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" />

        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="relative w-full max-w-7xl h-full md:h-[90vh] bg-white/10 border-2 border-slate-950/40 ring-1 ring-slate-950/10 rounded-[2rem] md:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col lg:flex-row tech-corners"
        >
          <BugSidebar 
            selectedBug={selectedBug} onClose={onClose} t={t} isAdmin={isAdmin} isOwner={isOwner} currentUser={currentUser} projectMembers={projectMembers} assigneeProfiles={assigneeProfiles} assigneeIds={assigneeIds} isOverdue={isOverdue} priorityLabels={priorityLabels} isPriorityOpen={isPriorityOpen} setIsPriorityOpen={setIsPriorityOpen} isMemberOpen={isMemberOpen} setIsMemberOpen={setIsMemberOpen} onUpdateBugDetails={onUpdateBugDetails} onDeleteBug={onDeleteBug} canManageTeam={canManageTeam}
          />

          <div className="flex-1 flex flex-col h-full bg-slate-50">
             <div className="flex items-center px-10 pt-8 gap-8 border-b-2 border-slate-400/30">
                {[
                  { id: 'details', label: t('kanban.tech_specs'), icon: Cpu },
                  { id: 'logs', label: t('kanban.log_data'), icon: Activity },
                  { id: 'team', label: t('kanban.squad_team'), icon: Users }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("pb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative", activeTab === tab.id ? "text-brand-700" : "text-slate-950 hover:text-slate-950")}>
                    <tab.icon size={14} /> {tab.label}
                    {activeTab === tab.id && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-700" />}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                {activeTab === 'details' && (
                  <div className="space-y-12">
                     <div className="space-y-4">
                        <div className="flex items-center gap-3"><div className="w-8 h-[2px] bg-brand-700" /><span className="text-[9px] font-black text-brand-700 uppercase tracking-widest font-mono">MISSION_TITLE</span></div>
                        <textarea rows={2} className="w-full text-3xl md:text-5xl font-heading font-black text-slate-950 outline-none border-none py-2 bg-transparent tracking-tighter leading-normal resize-none placeholder:text-slate-950/50 disabled:cursor-not-allowed uppercase" placeholder={t('kanban.node_title_placeholder')} value={localTitle} disabled={!canModifyGeneral || isSaving} onChange={(e) => setLocalTitle(e.target.value)} />
                     </div>

                     <div className="space-y-4 relative group/desc">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-8 h-[2px] bg-slate-400" /><span className="text-[9px] font-black text-slate-950 uppercase tracking-widest font-mono">TECHNICAL_SPECIFICATIONS</span></div>
                           <motion.button onClick={handleSave} disabled={!hasChanges || isSaving} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl", hasChanges ? "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/30 ring-2 ring-brand-400/50" : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300 shadow-none")}>
                             {isSaving ? <Activity size={12} className="animate-spin" /> : <Plus size={12} />} {isSaving ? t('kanban.syncing') : t('kanban.save_specs')}
                           </motion.button>
                        </div>
                        <div className="relative">
                          <textarea placeholder={t('kanban.specs_placeholder')} className="w-full h-56 bg-white/30 border-2 border-slate-300 rounded-3xl p-8 text-base text-slate-950 placeholder:text-slate-950/50 outline-none leading-relaxed resize-none custom-scrollbar focus:border-brand-600 focus:bg-white/60 transition-all font-black disabled:opacity-60 disabled:cursor-not-allowed" value={localDescription} disabled={!canModifyGeneral || isSaving} onChange={(e) => setLocalDescription(e.target.value)} />
                          {hasChanges && <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /><span className="text-[7px] font-black text-slate-950 uppercase tracking-widest">{t('kanban.unsaved_changes')}</span></div>}
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'logs' && (
                  <BugLogsTab comments={comments} userProfiles={userProfiles} userId={userId} isAdmin={isAdmin} onDeleteComment={onDeleteComment} bottomRef={bottomRef} newComment={newComment} setNewComment={setNewComment} onAddComment={onAddComment} t={t} />
                )}

                {activeTab === 'team' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectMembers.map(u => (
                      <button key={u.userId} onClick={() => { if (!canManageTeam) return; const currentMembers = selectedBug.members || (selectedBug.assigneeId ? [selectedBug.assigneeId] : []); const newMembers = assigneeIds.includes(u.userId) ? currentMembers.filter(id => id !== u.userId) : [...currentMembers, u.userId]; onUpdateBugDetails(selectedBug.id, { members: newMembers, assigneeId: newMembers[0] || '' }); }} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left disabled:cursor-not-allowed", assigneeIds.includes(u.userId) ? "bg-brand-600/10 border-brand-600 shadow-lg shadow-brand-600/5" : "bg-white/40 border-slate-300 hover:border-slate-500", !canManageTeam && "opacity-60 grayscale-[0.5]")} disabled={!canManageTeam}>
                         <img src={u.photoURL} className="w-12 h-12 rounded-xl object-cover" alt="" />
                         <div className="flex-1"><p className="text-xs font-black text-slate-950 uppercase tracking-tight">{u.displayName}</p><p className="text-[8px] font-bold text-slate-950 uppercase tracking-widest">{u.email.split('@')[0]}</p></div>
                         {assigneeIds.includes(u.userId) && <Users size={18} className="text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BugDetailModal;
