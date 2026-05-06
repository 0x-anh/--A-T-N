import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Shield, Trash2, Crown, Mail, ChevronRight, Activity, Users, Zap, CheckCircle2, Cpu } from 'lucide-react';
import { UserProfile, Project } from '../types';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface MembersPageProps {
  userProfiles: UserProfile[];
  selectedProject: Project | null;
  isAdmin: boolean;
  isOwner: boolean;
  userId: string;
  setShowInviteModal: (val: boolean) => void;
  handleRemoveMember: (userId: string) => void;
  handleUpdateUserRoles: (id: string, roles: string[]) => void;
  sentInvitations?: any[];
}

const MembersPage = ({
  userProfiles,
  selectedProject,
  isAdmin,
  isOwner,
  userId,
  setShowInviteModal,
  handleRemoveMember,
  handleUpdateUserRoles,
  sentInvitations = []
}: MembersPageProps) => {
  const { t } = useTranslation();
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingRemovals, setPendingRemovals] = useState<Record<string, any>>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  const projectMembers = React.useMemo(() => {
    if (!selectedProject || !selectedProject.members) return [];
    return userProfiles.filter(profile => 
      selectedProject.members.includes(profile.userId) && !removingIds.includes(profile.userId)
    );
  }, [userProfiles, selectedProject, removingIds]);

  const stats = {
    total: projectMembers.length,
    admins: projectMembers.filter(p => p.roles?.includes('editor')).length,
    active: 100,
    status: t('members.node_optimal')
  };

  if (!selectedProject) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-12 relative">
          <div className="absolute inset-0 bg-brand-500/5 blur-[120px] rounded-full" />
          
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 border border-brand-500/30 rounded-full shadow-2xl">
               <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
               <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.3em] font-mono">NODE_CONTROL_STANDBY</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tight uppercase leading-tight text-slate-950">
              {t('kanban.team').split(' ')[0]} <br/> <span className="text-slate-300">{t('kanban.team').split(' ')[1] || 'STRATEGIC'}</span>
            </h2>

            <p className="max-w-md mx-auto text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">
              {t('dashboard.no_projects')}
            </p>

            <div className="pt-8">
               <button 
                onClick={() => (window as any).triggerProjectModal?.()}
                className="group relative h-16 px-12 bg-slate-950 text-white rounded-3xl text-sm font-black overflow-hidden transition-all active:scale-95 shadow-2xl shadow-slate-950/40"
               >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center gap-4 tracking-[0.3em]">
                    <Zap size={20} className="text-brand-400 group-hover:text-white transition-colors" />
                    {t('dashboard.new_project').toUpperCase()}
                  </div>
               </button>
            </div>
          </div>

          <div className="pt-20 grid grid-cols-3 gap-8 opacity-40">
             {[
               { label: 'STAFF_SYNC', value: 'OFFLINE' },
               { label: 'ROLE_ENGINE', value: 'IDLE' },
               { label: 'ACCESS_LEVEL', value: 'RESTRICTED' }
             ].map((s, i) => (
               <div key={i} className="text-center">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</div>
                  <div className="text-xs font-black text-slate-900 font-mono tracking-tighter">{s.value}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8 w-full max-w-7xl mx-auto py-6 font-sans selection:bg-brand-500/20"
    >
      {/* Overview Style Header */}
      <header className="flex flex-col gap-8 mb-8 relative px-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">{t('members.administrators')}</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                {t('members.team_management').split(' ')[0]} <span className="text-slate-400">{t('members.team_management').split(' ')[1]}</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                {t('members.search_members')} {selectedProject?.name}.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
             {(isAdmin || isOwner) && (
               <button 
                 onClick={() => setShowInviteModal(true)}
                 className="h-10 px-6 bg-slate-950 text-white rounded-xl flex items-center gap-3 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/20 transition-all duration-300 active:scale-95"
               >
                 <UserPlus size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{t('members.invite_member')}</span>
               </button>
             )}

             <div className="flex flex-col items-end gap-1 group cursor-default">
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                     {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] font-mono">{t('members.active')} ONLINE</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {[
          { label: t('members.total_members'), value: stats.total, icon: <Users />, trend: 'TEAM' },
          { label: t('members.administrators'), value: stats.admins, icon: <Shield />, trend: 'ACCESS' },
          { label: t('members.project_coverage'), value: `${stats.active}%`, icon: <Zap />, trend: 'EFFICIENCY' },
          { label: t('members.node_status'), value: stats.status, icon: <CheckCircle2 />, trend: 'SYSTEM' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/40 backdrop-blur-3xl p-6 rounded-3xl border border-white/60 shadow-sm tech-corners group hover:bg-white transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg uppercase tracking-widest font-mono">
                {s.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</span>
              <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 pt-4">
        <AnimatePresence mode="popLayout">
          {projectMembers.map((profile, idx) => {
            const isTargetOwner = profile.userId === selectedProject.ownerId;
            const isSelf = profile.userId === userId;
            const currentRole = profile.roles?.[0] || 'viewer';
            
            return (
              <motion.div 
                layout
                key={profile.userId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/40 backdrop-blur-3xl rounded-[2rem] border border-white/60 p-6 hover:bg-white hover:shadow-2xl hover:border-brand-500/30 transition-all duration-500 group tech-corners relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors" />
                 
                 <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="relative">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg group-hover:ring-brand-50 transition-all duration-500">
                          <img 
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                            src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} 
                            alt="" 
                          />
                       </div>
                       {isTargetOwner && (
                         <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 text-white rounded-xl flex items-center justify-center shadow-xl border-2 border-white animate-bounce-slow">
                           <Crown size={14} />
                         </div>
                       )}
                    </div>
                    
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest">NODE_{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                       <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-black text-emerald-600 tracking-tighter uppercase font-mono">{t('members.active')}</span>
                       </div>
                    </div>
                 </div>

                 <div className="mb-8 relative z-10">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight truncate flex items-center gap-2">
                      {profile.displayName}
                      {isSelf && <span className="text-[8px] py-0.5 px-2 bg-slate-900 text-white rounded-lg font-black tracking-widest">YOU</span>}
                    </h4>
                    <div className="flex items-center gap-2 text-slate-400 mt-1.5">
                       <Mail size={12} className="shrink-0 opacity-50" />
                       <span className="text-[10px] font-bold font-mono lowercase tracking-tight truncate">{profile.email}</span>
                    </div>
                 </div>

                 {/* Protocol Control Area */}
                 <div className="space-y-3 mb-6 relative z-10">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">{t('members.access_level')}</span>
                       {isTargetOwner && <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">OWNER</span>}
                    </div>
                    
                    {(isAdmin || isOwner) && !isSelf && !isTargetOwner ? (
                      <div className="p-1.5 bg-slate-100/50 backdrop-blur-md rounded-2xl flex gap-1 border border-white/50">
                         {['editor', 'tester', 'viewer'].map((roleOption) => (
                           <button
                             key={roleOption}
                             onClick={() => handleUpdateUserRoles(profile.userId, [roleOption])}
                             className={cn(
                               "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                               currentRole === roleOption 
                                 ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-200" 
                                 : "text-slate-400 hover:text-slate-600"
                             )}
                           >
                             {roleOption.toUpperCase()}
                           </button>
                         ))}
                      </div>
                    ) : (
                      <div className="py-3 px-5 bg-slate-950 rounded-2xl flex items-center justify-between shadow-2xl shadow-slate-900/30">
                         <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-mono">
                           {isTargetOwner ? t('members.system_owner') : `${currentRole.toUpperCase()}_ACCESS`}
                         </span>
                         <div className={cn(
                           "w-2 h-2 rounded-full shadow-[0_0_10px]",
                           currentRole === 'editor' ? "bg-indigo-400 shadow-indigo-500" :
                           currentRole === 'tester' ? "bg-amber-400 shadow-amber-500" :
                           "bg-slate-400 shadow-slate-500"
                         )} />
                      </div>
                    )}
                 </div>

                 <div className="flex items-center justify-between pt-5 border-t border-slate-100/50 relative z-10">
                    <div className="flex items-center gap-2 text-slate-400">
                       <Shield size={12} className="opacity-50" />
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono">{t('members.secured_node')}</span>
                    </div>
                    
                    <div className="flex gap-2">
                       {(isAdmin || isOwner) && !isSelf && !isTargetOwner && (
                         <button 
                            onClick={() => {
                              const mId = profile.userId;
                              const mName = profile.displayName;
                              
                              // 1. Hide immediately from UI
                              setRemovingIds(prev => [...prev, mId]);
                              
                              // 2. Set a timer for actual deletion
                              const timer = setTimeout(() => {
                                handleRemoveMember(mId);
                                setRemovingIds(prev => prev.filter(id => id !== mId));
                                setPendingRemovals(prev => {
                                  const next = { ...prev };
                                  delete next[mId];
                                  return next;
                                });
                              }, 5000); // 5 seconds to undo

                              // 3. Store timer to allow cancellation
                              setPendingRemovals(prev => ({ ...prev, [mId]: timer }));

                              // 4. Show Toast with UNDO button
                              import('sonner').then(({ toast }) => {
                                toast.warning(`${t('topbar.loading')} ${mName}...`, {
                                  duration: 5000,
                                  action: {
                                    label: t('common.undo'),
                                    onClick: () => {
                                      // Cancel deletion
                                      clearTimeout(timer);
                                      setRemovingIds(prev => prev.filter(id => id !== mId));
                                      setPendingRemovals(prev => {
                                        const next = { ...prev };
                                        delete next[mId];
                                        return next;
                                      });
                                      toast.success(`${t('common.success')}: ${mName}`);
                                    }
                                  }
                                });
                              });
                            }}
                            className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all flex items-center justify-center group/del"
                            title={t('members.remove_member')}
                          >
                            <Trash2 size={16} />
                          </button>
                       )}
                       <button className="w-9 h-9 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-100 transition-all flex items-center justify-center">
                          <ChevronRight size={16} />
                       </button>
                    </div>
                 </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pending Invitations Section */}
      {sentInvitations.length > 0 && (
        <div className="px-4 space-y-6 pt-8 border-t-2 border-slate-200/50">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em]">{t('modals.invite_title').toUpperCase()}_</h3>
             <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black">{sentInvitations.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sentInvitations.map((invite) => {
              const targetProfile = userProfiles.find(u => u.userId === invite.targetUserId);
              return (
                <div key={invite.id} className="bg-slate-50/50 backdrop-blur-xl rounded-[2rem] border-2 border-dashed border-slate-300 p-6 flex items-center gap-4 group opacity-70 hover:opacity-100 transition-opacity">
                   <div className="relative">
                      <img 
                        src={targetProfile?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${invite.targetUserId}`} 
                        className="w-12 h-12 rounded-xl object-cover grayscale opacity-50" 
                        alt="" 
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-600 uppercase truncate">{targetProfile?.displayName || t('topbar.loading')}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">STATUS: PENDING</p>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MembersPage;
