import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Shield, Trash2, Crown, Mail, ChevronRight, Activity } from 'lucide-react';
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="w-full min-h-full p-4 lg:p-8 font-sans selection:bg-brand-500/20 space-y-12"
    >
      {/* Refined Pro Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border-2 border-slate-300/40 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 blur-[80px] rounded-full -mr-32 -mt-32 transition-colors group-hover:bg-brand-100/50" />
        
        <div className="relative z-10 space-y-2">
           <div className="flex items-center gap-2 text-brand-600">
              <Shield size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Hệ thống Zenith</span>
           </div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
             QUẢN TRỊ <span className="text-slate-400 font-light">NHÂN SỰ</span>
           </h2>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-8">
           <div className="flex items-center gap-8 px-8 border-l border-slate-100">
              <div className="text-center">
                 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thành viên</span>
                 <span className="text-2xl font-black text-slate-900">{projectMembers.length}</span>
              </div>
              <div className="text-center">
                 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quản trị viên</span>
                 <span className="text-2xl font-black text-brand-600">
                    {projectMembers.filter(p => p.roles?.includes('admin')).length}
                 </span>
              </div>
           </div>

           <button 
             onClick={() => setShowInviteModal(true)}
             className="h-14 px-8 bg-slate-900 text-white rounded-xl flex items-center gap-3 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/20 transition-all duration-300"
           >
             <UserPlus size={18} />
             <span className="text-xs font-bold uppercase tracking-wider">Mời nhân sự</span>
           </button>
        </div>
      </header>

      {/* Pro Member Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03 }}
              >
                <div className="bg-white/60 backdrop-blur-xl rounded-[1.5rem] border-2 border-slate-300/40 p-6 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-300 group">
                   
                   <div className="flex items-start justify-between mb-6">
                      <div className="relative">
                         <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-slate-50 group-hover:ring-brand-50 transition-all">
                            <img 
                              className="w-full h-full object-cover" 
                              src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} 
                              alt="" 
                            />
                         </div>
                         {isOwner && (
                           <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                             <Crown size={12} />
                           </div>
                         )}
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <span className="text-[9px] font-bold text-slate-300 font-mono">NODE_0{idx + 1}</span>
                         <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[7px] font-black text-emerald-600 tracking-widest uppercase">ACTIVE</span>
                         </div>
                      </div>
                   </div>

                   <div className="mb-8">
                      <h4 className="text-xl font-black text-slate-900 tracking-tight truncate flex items-center gap-2">
                        {profile.displayName}
                        {isSelf && <span className="text-[8px] py-0.5 px-1.5 bg-brand-50 text-brand-600 rounded-md font-black tracking-widest">YOU</span>}
                      </h4>
                      <div className="flex items-center gap-2 text-slate-400 mt-1">
                         <Mail size={12} className="shrink-0" />
                         <span className="text-[10px] font-medium truncate">{profile.email}</span>
                      </div>
                   </div>

                   {/* Role Selector Dashboard Style */}
                   <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Protocol Level</span>
                         {isOwner && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Highest Authority</span>}
                      </div>
                      
                      {(!isSelf && !isOwner) ? (
                        <div className="p-1.5 bg-slate-50 rounded-xl flex gap-1">
                           {['admin', 'editor', 'viewer'].map((roleOption) => (
                             <button
                               key={roleOption}
                               disabled={!isAdmin}
                               onClick={() => handleUpdateUserRoles(profile.userId, [roleOption])}
                               className={cn(
                                 "flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all",
                                 currentRole === roleOption 
                                   ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                                   : "text-slate-400 hover:text-slate-600"
                               )}
                             >
                               {roleOption}
                             </button>
                           ))}
                        </div>
                      ) : (
                        <div className="py-2.5 px-4 bg-slate-900 rounded-xl flex items-center justify-between shadow-lg shadow-slate-200">
                           <span className="text-[9px] font-black text-white uppercase tracking-[0.1em]">
                             {isOwner ? "PROJECT OWNER" : currentRole.toUpperCase()}
                           </span>
                           <Activity size={12} className="text-brand-400" />
                        </div>
                      )}
                   </div>

                   <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-slate-400">
                         <Shield size={12} />
                         <span className="text-[8px] font-bold uppercase tracking-tighter">SECURED_NODE</span>
                      </div>
                      
                      <div className="flex gap-1">
                         {isAdmin && !isSelf && !isOwner && (
                           <button 
                             onClick={() => {
                               setRemovingIds(prev => [...prev, profile.userId]);
                               handleRemoveMember(profile.userId);
                               setTimeout(() => {
                                 setRemovingIds(prev => prev.filter(id => id !== profile.userId));
                               }, 7000);
                             }}
                             className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                           >
                             <Trash2 size={16} />
                           </button>
                         )}
                         <button className="w-8 h-8 rounded-lg text-slate-300 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center">
                            <ChevronRight size={16} />
                         </button>
                      </div>
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
