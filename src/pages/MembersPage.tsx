import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Shield, Trash2, Crown, Mail, ChevronRight, Activity, Users, Zap, CheckCircle2, Cpu } from 'lucide-react';
import { UserProfile, Project } from '../types';
import { cn } from '../lib/utils';

interface MembersPageProps {
  userProfiles: UserProfile[];
  selectedProject: Project | null;
  isAdmin: boolean;
  userId: string;
  setShowInviteModal: (val: boolean) => void;
  handleRemoveMember: (userId: string) => void;
  handleUpdateUserRoles: (id: string, roles: string[]) => void;
}

const MembersPage = ({
  userProfiles,
  selectedProject,
  isAdmin,
  userId,
  setShowInviteModal,
  handleRemoveMember,
  handleUpdateUserRoles
}: MembersPageProps) => {
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    admins: projectMembers.filter(p => p.roles?.includes('admin')).length,
    active: 100,
    status: 'OPTIMAL'
  };

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
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">CHỈ HUY NHÂN SỰ</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                QUẢN TRỊ <span className="text-slate-400">NHÂN SỰ</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Giám sát và phân quyền nhân sự vận hành trên các Node của dự án {selectedProject?.name}.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
             <button 
               onClick={() => setShowInviteModal(true)}
               className="h-10 px-6 bg-slate-950 text-white rounded-xl flex items-center gap-3 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/20 transition-all duration-300 active:scale-95"
             >
               <UserPlus size={16} />
               <span className="text-[10px] font-black uppercase tracking-widest">Mời nhân sự</span>
             </button>

             <div className="flex flex-col items-end gap-1 group cursor-default">
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                     {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] font-mono">ĐỘI NGŨ ONLINE</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {[
          { label: 'Tổng nhân sự', value: stats.total, icon: <Users />, trend: 'ĐỘI NGŨ' },
          { label: 'Quản trị viên', value: stats.admins, icon: <Shield />, trend: 'QUYỀN HẠN' },
          { label: 'Độ phủ dự án', value: `${stats.active}%`, icon: <Zap />, trend: 'HIỆU SUẤT' },
          { label: 'Trạng thái Node', value: stats.status, icon: <CheckCircle2 />, trend: 'HỆ THỐNG' },
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
            const isOwner = selectedProject?.ownerId === profile.userId;
            const isSelf = profile.userId === userId;
            const roles = profile.roles || ['viewer'];
            const currentRole = roles[0];
            
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
                       {isOwner && (
                         <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 text-white rounded-xl flex items-center justify-center shadow-xl border-2 border-white animate-bounce-slow">
                           <Crown size={14} />
                         </div>
                       )}
                    </div>
                    
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest">NODE_{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                       <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-black text-emerald-600 tracking-tighter uppercase font-mono">ACTIVE</span>
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
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">PROTOCOL_LEVEL</span>
                       {isOwner && <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-widest">OWNER</span>}
                    </div>
                    
                    {(!isSelf && !isOwner) ? (
                      <div className="p-1.5 bg-slate-100/50 backdrop-blur-md rounded-2xl flex gap-1 border border-white/50">
                         {['admin', 'editor', 'viewer'].map((roleOption) => (
                           <button
                             key={roleOption}
                             disabled={!isAdmin}
                             onClick={() => handleUpdateUserRoles(profile.userId, [roleOption])}
                             className={cn(
                               "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                               currentRole === roleOption 
                                 ? "bg-white text-slate-900 shadow-xl ring-1 ring-slate-200" 
                                 : "text-slate-400 hover:text-slate-600"
                             )}
                           >
                             {roleOption}
                           </button>
                         ))}
                      </div>
                    ) : (
                      <div className="py-3 px-5 bg-slate-950 rounded-2xl flex items-center justify-between shadow-2xl shadow-slate-900/30">
                         <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-mono">
                           {isOwner ? "SYSTEM OWNER" : `${currentRole.toUpperCase()}_ACCESS`}
                         </span>
                         <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_10px_#10b981]" />
                      </div>
                    )}
                 </div>

                 <div className="flex items-center justify-between pt-5 border-t border-slate-100/50 relative z-10">
                    <div className="flex items-center gap-2 text-slate-400">
                       <Shield size={12} className="opacity-50" />
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] font-mono">SECURED_NODE</span>
                    </div>
                    
                    <div className="flex gap-2">
                       {isAdmin && !isSelf && !isOwner && (
                         <button 
                           onClick={() => {
                             setRemovingIds(prev => [...prev, profile.userId]);
                             handleRemoveMember(profile.userId);
                             setTimeout(() => {
                               setRemovingIds(prev => prev.filter(id => id !== profile.userId));
                             }, 7000);
                           }}
                           className="w-9 h-9 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all flex items-center justify-center group/del"
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
    </motion.div>
  );
};

export default MembersPage;
