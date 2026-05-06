import React from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Shield, Trash2, Crown } from 'lucide-react';
import { UserProfile, Project, ROLE_CONFIG } from '../types';
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
  // Optimistic UI: Track which members are being removed to hide them immediately
  const [removingIds, setRemovingIds] = React.useState<string[]>([]);

  // THE CRITICAL LOGIC FIX: Filter users to only show members of the selected project
  const projectMembers = React.useMemo(() => {
    if (!selectedProject || !selectedProject.members) return [];
    return userProfiles.filter(profile => 
      selectedProject.members.includes(profile.userId) && !removingIds.includes(profile.userId)
    );
  }, [userProfiles, selectedProject, removingIds]);

  return (
    <div className="min-h-screen -m-8 p-12 relative font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-[1700px] mx-auto relative z-10 space-y-12"
      >
        {/* Zenith Command Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 border-b border-slate-200/50 pb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
               <div className="w-12 h-[2px] bg-brand-500 shadow-[0_0_15_#10b981]" />
               <span className="text-[11px] font-black text-brand-600 uppercase tracking-[0.6em] font-mono">PERSONNEL_CORE_LOGIC</span>
            </div>
            <h2 className="text-7xl font-black text-slate-950 tracking-[-0.05em] leading-none uppercase">
              QUẢN TRỊ <span className="text-slate-400 font-light italic">Nhân Sự.</span>
            </h2>
          </div>

          <div className="flex items-center gap-8">
             <div className="flex gap-10 py-5 px-10 border border-white/60 rounded-2xl bg-white/30 backdrop-blur-3xl shadow-sm tech-corners">
                <div className="text-center">
                   <span className="block text-[8px] font-black text-brand-600 uppercase tracking-[0.3em] font-mono mb-1">TOTAL_NODES</span>
                   <span className="text-3xl font-black text-slate-950 leading-none tracking-tighter">{projectMembers.length}</span>
                </div>
                <div className="text-center">
                   <span className="block text-[8px] font-black text-brand-600 uppercase tracking-[0.3em] font-mono mb-1">PRIVILEGED</span>
                   <span className="text-3xl font-black text-emerald-500 leading-none tracking-tighter">
                     {projectMembers.filter(p => p.roles?.includes('admin')).length}
                   </span>
                </div>
             </div>

             <button 
               onClick={() => setShowInviteModal(true)}
               className="h-20 px-10 bg-slate-950 text-white rounded-2xl flex items-center gap-5 shadow-2xl hover:bg-brand-600 hover:scale-105 transition-all duration-500 tech-corners group relative z-50"
             >
               <UserPlus size={24} className="group-hover:rotate-12 transition-transform" />
               <span className="text-[12px] font-black uppercase tracking-[0.3em]">MỜI THÀNH VIÊN</span>
             </button>
          </div>
        </header>

        {/* Operational Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {projectMembers.map((profile, idx) => {
            const isOwner = selectedProject?.ownerId === profile.userId;
            const isSelf = profile.userId === userId;
            const roles = profile.roles || ['viewer'];
            const currentRole = roles[0];
            
            return (
              <motion.div 
                key={profile.userId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04, duration: 0.5 }}
                className="tech-corners bg-white/20 backdrop-blur-3xl p-8 rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(99,102,241,0.1)] transition-all duration-700 group relative overflow-hidden"
              >
                {/* Background Decorative Icon */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-all group-hover:scale-125 group-hover:rotate-12 duration-700 pointer-events-none">
                   <Shield size={120} />
                </div>
                
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-[1px] bg-brand-500/30 group-hover:w-16 transition-all duration-700" />
                <div className="absolute top-0 left-0 w-[1px] h-8 bg-brand-500/30 group-hover:h-16 transition-all duration-700" />

                <div className="relative z-10 flex flex-col h-full">
                   {/* Avatar & Basic Info */}
                   <div className="flex items-start justify-between mb-8">
                      <div className="relative">
                         <div className="w-20 h-20 rounded-2xl bg-white/40 border border-white/80 overflow-hidden shadow-sm group-hover:border-brand-500/50 transition-colors">
                            <img 
                              className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500" 
                              src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} 
                              alt="" 
                            />
                         </div>
                         {isOwner && (
                           <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 text-amber-950 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
                             <Crown size={14} />
                           </div>
                         )}
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest uppercase">NODE_0{idx + 1}</span>
                         <span className="text-[8px] font-bold text-slate-400 font-mono italic">ID: {profile.userId.substring(0, 6)}</span>
                         <div className="mt-1 bg-slate-950/5 px-2 py-1 rounded border border-slate-950/10">
                            <span className="text-[7px] font-black text-brand-600 uppercase tracking-tighter font-mono">UID: {profile.userId}</span>
                         </div>
                      </div>
                   </div>

                   <div className="mb-8">
                      <h4 className="text-3xl font-heading font-black text-slate-950 tracking-tighter leading-tight uppercase group-hover:text-brand-600 transition-colors truncate">
                        {profile.displayName}
                        {isSelf && <span className="ml-2 text-[10px] text-brand-500">(BẠN)</span>}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-400 font-mono tracking-tight lowercase truncate mt-1">
                        {profile.email}
                      </p>
                   </div>

                   {/* ROLE CONTROLLER */}
                   <div className="space-y-3 mb-10 pt-6 border-t border-slate-100/50">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest font-mono">PHÂN QUYỀN HỆ THỐNG</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                         {['admin', 'editor', 'viewer'].map((roleOption) => (
                           <button
                             key={roleOption}
                             disabled={!isAdmin || isOwner || isSelf}
                             onClick={() => handleUpdateUserRoles(profile.userId, [roleOption])}
                             className={cn(
                               "py-2 rounded-xl text-[8px] font-black uppercase tracking-wider font-mono border transition-all",
                               currentRole === roleOption 
                                 ? "bg-slate-950 text-white border-transparent shadow-lg" 
                                 : "bg-white/40 text-slate-400 border-white/60 hover:border-brand-500/30"
                             )}
                           >
                             {roleOption}
                           </button>
                         ))}
                      </div>
                   </div>

                   {/* KILL PROTOCOL & SECURITY */}
                   <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="w-1 h-3 bg-brand-500 rounded-full" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">ENCRYPTED_SYNC</span>
                      </div>

                      <div className="flex gap-2">
                         {isAdmin && !isSelf && !isOwner && (
                           <button 
                             onClick={() => {
                               // OPTIMISTIC HIDE: Disappear immediately
                               setRemovingIds(prev => [...prev, profile.userId]);
                               handleRemoveMember(profile.userId);
                               
                               // Safety net: re-show if not actually removed after 7s
                               setTimeout(() => {
                                 setRemovingIds(prev => prev.filter(id => id !== profile.userId));
                               }, 7000);
                             }}
                             className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100"
                           >
                             <Trash2 size={20} />
                           </button>
                         )}
                         <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-xl group-hover:bg-brand-600 transition-colors">
                            <Shield size={20} />
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default MembersPage;
