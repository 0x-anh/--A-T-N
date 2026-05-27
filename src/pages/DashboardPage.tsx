import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Activity, Zap, CheckCircle2, Plus, Users, ChevronRight } from 'lucide-react';
import { StatsCard, QuickAction } from '../components/ui/Cards';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Bug, UserProfile, canCreateTask, canManageTeam } from '../types';

interface DashboardPageProps {
  appStats: any;
  currentTime: Date;
  bugs: Bug[];
  events: any[];
  overdueTasks: any[];
  userProfiles: any[];
  currentUserProfile?: UserProfile;
  isAdmin: boolean;
  projects: any[];
  pendingInvitations: any[];
  handleAcceptInvitation: (id: string) => void;
  handleDeclineInvitation: (id: string) => void;
  setActiveTab: (tab: 'board' | 'metrics' | 'logs' | 'members' | 'dashboard') => void;
  setShowProjectModal: (val: boolean) => void;
  setShowInviteModal: (val: boolean) => void;
  setShowQuickAdd: (val: boolean) => void;
}

const DashboardPage = ({
  appStats,
  currentTime,
  bugs,
  events,
  overdueTasks,
  userProfiles,
  currentUserProfile,
  isAdmin,
  projects,
  pendingInvitations,
  handleAcceptInvitation,
  handleDeclineInvitation,
  setActiveTab,
  setShowProjectModal,
  setShowInviteModal,
  setShowQuickAdd
}: DashboardPageProps) => {
  const { t, i18n } = useTranslation();
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-12 w-full max-w-6xl mx-auto py-10 px-4"
    >
      <header className="flex flex-col gap-8 mb-8 relative">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">{t('kanban.coordination_center')}</h3>
              <h2 className="text-3xl md:text-4xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                {t('dashboard.project_management').split(' ')[0]} <span className="text-slate-400">{t('dashboard.project_management').split(' ')[1]}</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                {t('kanban.description')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 group cursor-default">
             <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] font-mono transition-colors group-hover:text-brand-500">TIME_SYNC_OK</div>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
                <span className="text-sm font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] font-mono">{t('sidebar.system_stable')}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Zenith Invitation Console - Proper Invite Flow */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-950 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden mb-8 border border-slate-800"
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
               <div className="w-10 h-1 bg-brand-500 shadow-[0_0_15px_#10b981]" />
               <h3 className="text-sm font-black uppercase tracking-[0.4em] font-mono text-brand-500">SYSTEM_INVITE_PENDING</h3>
               <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black font-mono">
                 {pendingInvitations.length} {t('topbar.notifications').toUpperCase()}
               </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {pendingInvitations.map((invite) => (
                 <div key={invite.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all group">
                    <div className="flex items-start justify-between mb-6">
                       <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">PROJECT_DEPLOYMENT</span>
                          <h4 className="text-2xl font-black tracking-tighter uppercase leading-none group-hover:text-brand-400 transition-colors">
                            {invite.projectName}
                          </h4>
                       </div>
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                          <Users size={20} className="text-slate-400" />
                       </div>
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                       <div className="w-2 h-2 rounded-full bg-brand-500" />
                       <p className="text-[11px] font-bold text-slate-300">
                         {t('members.invite_member')}: <span className="text-white font-black uppercase tracking-wider">{invite.inviterName}</span>
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <button 
                         onClick={() => handleAcceptInvitation(invite.id)}
                         className="py-4 bg-brand-500 text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                       >
                         {t('common.success').toUpperCase()}
                       </button>
                       <button 
                         onClick={() => handleDeclineInvitation(invite.id)}
                         className="py-4 bg-transparent text-white border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:border-rose-500 transition-all active:scale-95"
                       >
                         {t('common.cancel').toUpperCase()}
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Global Alerts Row - Full Width for Balance */}
      {overdueTasks.length > 0 && (
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-rose-50/50 backdrop-blur-3xl rounded-3xl border border-rose-200 p-6 shadow-sm relative overflow-hidden group mb-8"
        >
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-rose-500/5 to-transparent" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
                <Zap size={24} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-[0.3em] mb-1">{t('kanban.overdue')} ALERT</h3>
                <p className="text-[11px] font-bold text-rose-400 font-mono">{t('common.error').toUpperCase()} {overdueTasks.length} NODE(S) DETECTED</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 flex-1 max-w-2xl min-w-0">
              {overdueTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex-1 min-w-[180px] max-w-[240px] p-3 bg-white/60 border border-rose-100 rounded-xl flex items-center justify-between group/task hover:bg-white transition-all overflow-hidden shadow-sm">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-2">
                    <span className="text-[11px] font-black text-slate-800 line-clamp-1 truncate break-all">{task.title}</span>
                    <span className="text-[9px] font-bold text-rose-500 font-mono">{t('kanban.due_date').toUpperCase()}: {task.dueDate ? new Date(task.dueDate).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US') : '---'}</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('board')}
                    className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
              {overdueTasks.length > 3 && (
                <button onClick={() => setActiveTab('board')} className="px-4 text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors whitespace-nowrap">
                  + {overdueTasks.length - 3} MORE
                </button>
              )}
            </div>
          </div>
        </motion.section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatsCard label={t('metrics.completion_rate')} value={`${appStats.resolutionRate}%`} icon={<Cpu />} trend={t('sidebar.system_stable').split(' ')[1]} />
        <StatsCard label={t('logs.action')} value={appStats.open} icon={<Activity />} trend={t('members.active')} />
        <StatsCard label={t('kanban.priority')} value={appStats.critical} icon={<Zap />} trend={t('kanban.priority_critical')} />
        <StatsCard label={t('kanban.done')} value={appStats.resolved} icon={<CheckCircle2 />} trend={t('common.success').toUpperCase()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/60 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-[13px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                  <div className="w-8 h-[2px] bg-brand-500" />
                  {t('logs.title')}
                </h3>
                {/* Color Legend */}
                <div className="flex items-center gap-4 pl-11 pt-2">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.created_at')}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)] animate-pulse" />
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{t('kanban.due_date')}</span>
                   </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-white/80 rounded-2xl border border-slate-100 shadow-sm self-start">
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">
                  {i18n.language === 'vi' ? `Tháng ${currentTime.getMonth() + 1} Năm ${currentTime.getFullYear()}` : `${currentTime.toLocaleString('default', { month: 'long' })} ${currentTime.getFullYear()}`}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 bg-slate-200/20 p-1 rounded-2xl border border-white/40 relative z-10">
              {(i18n.language === 'vi' ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']).map(day => (
                <div key={day} className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 2; 
                const isToday = dayNum === currentTime.getDate(); 
                const isCurrentMonth = dayNum > 0 && dayNum <= 31;
                
                // Data filtering logic
                const dateStr = isCurrentMonth ? `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}` : null;
                
                // Tasks created on this day
                const createdTasks = bugs.filter(b => {
                  if (!dateStr || !b.createdAt) return false;
                  // Handle both Firestore Timestamp and JS Date
                  const createdDate = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                  return createdDate.toISOString().startsWith(dateStr);
                });

                // Tasks due on this day
                const dueTasks = bugs.filter(b => b.dueDate && b.dueDate.startsWith(dateStr || 'never'));

                return (
                  <div key={i} className={cn(
                    "min-h-[60px] p-2.5 rounded-xl flex flex-col gap-1.5 transition-all group/cell relative overflow-hidden",
                    isCurrentMonth ? "bg-white/40 hover:bg-white/80 cursor-pointer border border-white/40 hover:border-brand-500/30 shadow-sm" : "bg-transparent opacity-5 pointer-events-none",
                    isToday && "ring-2 ring-brand-500/50 bg-white/90 shadow-lg shadow-brand-500/10"
                  )}>
                    <div className="flex justify-between items-start relative z-10">
                      <span className={cn(
                        "text-[11px] font-black font-mono",
                        isToday ? "text-brand-600" : "text-slate-950"
                      )}>
                        {isCurrentMonth ? dayNum : ''}
                      </span>
                      
                      <div className="flex gap-1">
                        {createdTasks.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                        )}
                        {dueTasks.length > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)] animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div className="mt-auto relative z-10">
                      {(createdTasks.length > 0 || dueTasks.length > 0) ? (
                        <div className="space-y-1 w-full">
                           <div className="h-1 bg-slate-200/50 rounded-full overflow-hidden flex">
                              {createdTasks.length > 0 && <div className="h-full bg-blue-500" style={{ width: '50%' }} />}
                              {dueTasks.length > 0 && <div className="h-full bg-rose-500" style={{ width: '50%' }} />}
                           </div>
                           <div className="flex justify-between items-center text-[7px] font-black text-slate-400 uppercase font-mono tracking-tighter">
                             <span>OPS</span>
                             <span className="text-slate-900">{createdTasks.length + dueTasks.length}</span>
                           </div>
                        </div>
                      ) : isCurrentMonth && (
                        <div className="text-[6px] font-bold text-slate-300 uppercase tracking-tighter opacity-0 group-hover/cell:opacity-100 transition-opacity">CLEAR_</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className={cn(
            "grid gap-8",
            canManageTeam(currentUserProfile?.roles, isAdmin, false) ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            <QuickAction title={t('dashboard.new_project')} desc={t('dashboard.create_project_desc')} icon={<Plus />} onClick={() => setShowProjectModal(true)} />
            
            {canManageTeam(currentUserProfile?.roles, isAdmin, false) && (
              <QuickAction title={t('members.team_management')} desc={t('members.search_members')} icon={<Users />} onClick={() => setShowInviteModal(true)} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex-1 bg-white/30 backdrop-blur-3xl rounded-3xl border border-white/60 p-8 shadow-sm tech-corners flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] font-heading">{t('logs.title')}</h3>
                <div className="w-8 h-1 bg-brand-500/30" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xl shadow-slate-950/20">
                <Activity size={18} />
              </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10 max-h-[420px]">
              {events && events.length > 0 ? events.slice(0, 3).map((log, i) => (
                <div key={log.id} className="relative pl-8 group/log">
                  {/* Timeline Node */}
                  <div className="absolute left-0 top-1 w-4 h-4 flex items-center justify-center">
                    <div className="w-[2px] h-[calc(100%+24px)] bg-slate-100 absolute top-4 left-1/2 -translate-x-1/2 group-last/log:hidden" />
                    <div className="w-2 h-2 rounded-full bg-white border-2 border-brand-500 z-10 group-hover/log:scale-150 transition-transform shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  </div>

                  <div className="space-y-3 pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 uppercase tracking-tighter font-mono">
                           {log.type?.replace('_', ' ') || 'SYSTEM'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono tabular-nums opacity-60">
                          {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover/log:opacity-100 transition-opacity">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-600 font-mono">SYNC_OK</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl group-hover/log:bg-white/80 group-hover/log:border-brand-500/30 transition-all duration-500 shadow-sm overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 leading-relaxed mb-3 break-all whitespace-pre-wrap">
                        {log.message || log.details || log.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <img 
                             src={userProfiles.find(u => u.userId === log.userId)?.photoURL || log.userPhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${log.userId || 'system'}`} 
                             className="w-5 h-5 rounded-lg border border-white shadow-sm ring-2 ring-slate-50"
                             alt=""
                           />
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                             {log.userName?.split(' ').pop() || 'SYSTEM'}
                           </span>
                        </div>
                        <div className="text-[8px] font-bold text-slate-300 font-mono tracking-tighter">
                          ID {log.id?.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                     <CheckCircle2 size={24} className="text-slate-300" />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('logs.filter_all')}</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab('logs')}
              className="mt-6 relative group/btn w-full overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 bg-slate-950 translate-y-[101%] group-hover/btn:translate-y-0 transition-transform duration-500" />
              <div className="relative py-4 border border-slate-200 group-hover/btn:border-slate-950 transition-colors text-[10px] font-black text-slate-400 group-hover/btn:text-white uppercase tracking-[0.2em] font-mono">
                {t('logs.view_all')}
              </div>
            </button>

            {/* System Resource Monitor - Filling the gap beautifully */}
            <div className="mt-auto pt-8 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">NODE_MONITOR</span>
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                   <span className="text-[9px] font-bold text-blue-600 font-mono">REALTIME</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 font-mono">
                    <span>CPU_LOAD</span>
                    <span>24%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: '24%' }} 
                      transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                      className="h-full bg-slate-950" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500 font-mono">
                    <span>RAM_ALLOC</span>
                    <span>1.2GB</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: '45%' }}
                      className="h-full bg-brand-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase font-mono">{t('dashboard.node_status')}</span>
                  <span className="text-[10px] font-black text-slate-800 font-mono">STABLE 0.002MS</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`w-1 h-3 rounded-full ${i <= 3 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
