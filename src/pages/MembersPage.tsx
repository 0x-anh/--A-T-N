import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Shield, Trash2, Crown, Fingerprint, Activity, Zap, Cpu } from 'lucide-react';
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
  const [removingIds, setRemovingIds] = React.useState<string[]>([]);

  const projectMembers = React.useMemo(() => {
    if (!selectedProject || !selectedProject.members) return [];
    return userProfiles.filter(profile => 
      selectedProject.members.includes(profile.userId) && !removingIds.includes(profile.userId)
    );
  }, [userProfiles, selectedProject, removingIds]);

  return (
    <div className="min-h-screen -m-8 p-12 relative font-sans selection:bg-brand-500/30 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
         <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-brand-500/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="max-w-[1700px] mx-auto relative z-10 space-y-16"
      >
        {/* Cinematic Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-slate-950/5 pb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-brand-500/50 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-brand-500/20 rounded-full" />
               </div>
               <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.8em] font-mono">PERSONNEL_CORE_v2.0</span>
            </div>
            <h2 className="text-8xl font-black text-slate-950 tracking-[-0.06em] leading-[0.85] uppercase">
              QUẢN TRỊ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 to-slate-500">NHÂN SỰ</span>
            </h2>
            <p className="text-slate-400 font-medium tracking-tight max-w-md text-lg">
              Điều động và phân quyền các nút dữ liệu trong hệ thống vận hành Zenith.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
             <div className="flex gap-1 border-l-2 border-brand-500 pl-8 py-2">
                <div className="px-6 py-2">
                   <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">NODES_ONLINE</span>
                   <span className="text-5xl font-black text-slate-950 leading-none tracking-tighter">{projectMembers.length}</span>
                </div>
                <div className="px-6 py-2 border-l border-slate-100">
                   <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">PRIVILEGED</span>
                   <span className="text-5xl font-black text-brand-500 leading-none tracking-tighter">
                     {projectMembers.filter(p => p.roles?.includes('admin')).length}
                   </span>
                </div>
             </div>

             <button 
               onClick={() => setShowInviteModal(true)}
               className="h-24 px-12 bg-slate-950 text-white rounded-[2rem] flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-brand-600 hover:translate-y-[-4px] transition-all duration-500 group relative overflow-hidden"
             >
               <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <UserPlus size={28} className="group-hover:rotate-12 transition-transform duration-500" />
               <div className="text-left">
                  <span className="block text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">COMMAND</span>
                  <span className="text-sm font-black uppercase tracking-[0.2em]">MỜI NHÂN SỰ</span>
               </div>
             </button>
          </div>
        </header>

        {/* Operational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
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
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: idx * 0.05 
                  }}
                  className="group relative"
                >
                  {/* The Card */}
                  <div className="relative z-10 bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(16,185,129,0.15)] transition-all duration-700 hover:translate-y-[-8px] flex flex-col h-full overflow-hidden">
                    
                    {/* Security Overlay Pattern */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                    
                    {/* Top HUD Row */}
                    <div className="flex items-center justify-between mb-10 relative z-20">
                       <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                            isOwner ? "bg-amber-100 text-amber-600 shadow-lg shadow-amber-200/50" : "bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500"
                          )}>
                             {isOwner ? <Crown size={20} /> : <Cpu size={20} />}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-300 font-mono tracking-widest uppercase">NODE_0{idx + 1}</span>
                             <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[8px] font-bold text-slate-500 font-mono">STATUS: ACTIVE</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[8px] font-black text-slate-400 font-mono tracking-tighter">SEC_ID: {profile.userId.substring(0, 8).toUpperCase()}</span>
                       </div>
                    </div>

                    {/* Profile Section */}
                    <div className="flex items-center gap-6 mb-10 relative z-20">
                       <div className="relative group/avatar">
                          <div className="w-24 h-24 rounded-3xl bg-slate-100 p-1 transition-all duration-700 group-hover/avatar:rotate-[10deg]">
                             <div className="w-full h-full rounded-[1.2rem] overflow-hidden border-2 border-white shadow-inner">
                                <img 
                                  className="w-full h-full object-cover transition-all duration-700 group-hover/avatar:scale-110" 
                                  src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} 
                                  alt="" 
                                />
                             </div>
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-xl flex items-center justify-center text-brand-500 border border-slate-50 group-hover:scale-110 transition-transform">
                             <Fingerprint size={20} />
                          </div>
                       </div>
                       
                       <div className="flex-1 min-w-0">
                          <h4 className="text-2xl font-black text-slate-950 tracking-tighter leading-tight uppercase group-hover:text-brand-600 transition-colors truncate">
                            {profile.displayName}
                          </h4>
                          <div className="flex items-center gap-2 text-slate-400 mt-1">
                             <Activity size={12} className="text-brand-500" />
                             <span className="text-[10px] font-medium font-mono lowercase truncate">{profile.email}</span>
                          </div>
                          {isSelf && (
                            <div className="mt-2 inline-flex px-2 py-0.5 bg-brand-50 text-brand-600 rounded text-[8px] font-black tracking-widest uppercase">
                               AUTH_NODE (BẠN)
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Access Level Grid */}
                    <div className="bg-slate-50/50 rounded-3xl p-6 mb-8 border border-slate-100 relative z-20">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             <Zap size={14} className="text-brand-500" />
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">ACCESS_PROTOCOL</span>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 font-mono">LVL_0{currentRole === 'admin' ? '3' : currentRole === 'editor' ? '2' : '1'}</span>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-2">
                          {['admin', 'editor', 'viewer'].map((roleOption) => (
                            <button
                              key={roleOption}
                              disabled={!isAdmin || isOwner || isSelf}
                              onClick={() => handleUpdateUserRoles(profile.userId, [roleOption])}
                              className={cn(
                                "h-10 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono transition-all relative overflow-hidden",
                                currentRole === roleOption 
                                  ? "bg-slate-950 text-white shadow-xl shadow-slate-200 scale-105 z-10" 
                                  : "bg-white text-slate-400 border border-slate-200 hover:border-brand-500/50 hover:text-brand-600"
                              )}
                            >
                              {roleOption}
                              {currentRole === roleOption && (
                                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-brand-500 rounded-bl-lg" />
                              )}
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-auto flex items-center justify-between relative z-20">
                       <div className="flex items-center gap-3">
                          <div className="flex -space-x-1">
                             {[1,2,3].map(i => (
                               <div key={i} className="w-1.5 h-4 bg-brand-500/20 rounded-full group-hover:bg-brand-500/40 transition-colors" style={{ transitionDelay: `${i*100}ms` }} />
                             ))}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">ENCRYPTED_SYNC</span>
                       </div>

                       <div className="flex gap-3">
                          {isAdmin && !isSelf && !isOwner && (
                            <button 
                              onClick={() => {
                                setRemovingIds(prev => [...prev, profile.userId]);
                                handleRemoveMember(profile.userId);
                                setTimeout(() => {
                                  setRemovingIds(prev => prev.filter(id => id !== profile.userId));
                                }, 7000);
                              }}
                              className="w-14 h-14 rounded-2xl bg-white border border-rose-100 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-sm group/trash active:scale-90"
                              title="Giải phóng Node"
                            >
                              <Trash2 size={22} className="group-hover/trash:rotate-12 transition-transform" />
                            </button>
                          )}
                          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-2xl group-hover:bg-brand-600 transition-all duration-500 group-hover:rotate-[360deg]">
                             <Shield size={22} />
                          </div>
                       </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default MembersPage;
