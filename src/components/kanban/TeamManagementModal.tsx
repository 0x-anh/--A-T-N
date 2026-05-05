import React from 'react';
import { motion } from 'motion/react';
import { X, Shield, ShieldCheck, UserPlus, Trash2, Check } from 'lucide-react';
import { UserProfile, Project, UserRole, ROLE_CONFIG } from '../../types';
import { cn } from '../../lib/utils';

interface TeamManagementModalProps {
  show: boolean;
  onClose: () => void;
  userProfiles: UserProfile[];
  selectedProject: Project | null;
  isAdmin: boolean;
  handleUpdateUserRoles: (userId: string, currentRoles: UserRole[], role: UserRole) => void;
  handleRemoveMember: (memberId: string) => void;
  userId: string | undefined;
}

const TeamManagementModal = ({
  show,
  onClose,
  userProfiles,
  selectedProject,
  isAdmin,
  handleUpdateUserRoles,
  handleRemoveMember,
  userId
}: TeamManagementModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-end p-8">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        onClick={onClose}
        className="absolute inset-0 bg-slate-100/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '100%', opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        className="relative w-full max-w-4xl h-[95vh] md:h-[90vh] bg-white rounded-t-3xl md:rounded-[3rem] shadow-5xl overflow-hidden border border-slate-100 flex flex-col mt-auto md:mt-0"
      >
        <div className="px-6 md:px-12 h-24 md:h-28 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
             <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
               <Shield size={24} />
             </div>
             <div>
               <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-widest md:tracking-[0.2em]">Cơ sở dữ liệu nhân sự</h2>
               <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Control Panel / Security v4.0</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all group"
          >
            <X size={24} className="text-slate-300 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-4 md:space-y-6 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-1 gap-4">
            {userProfiles.map(profile => {
              const isGlobalAdmin = profile.email === 'jokerducanh@gmail.com';
              const isCurrentMember = selectedProject?.members.includes(profile.userId);
              
              if (!isCurrentMember && !isAdmin) return null;

              return (
                <div key={profile.userId} className="group p-6 md:p-8 bg-white border border-slate-100 rounded-3xl md:rounded-[2.5rem] hover:border-indigo-400/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500">
                   <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                     <div className="flex items-center gap-4 md:gap-6 w-full md:w-72 shrink-0">
                       <div className="relative">
                         <img src={profile.photoURL} alt="" className={cn(
                           "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] shadow-xl border-4 border-white",
                           isGlobalAdmin && "ring-4 ring-amber-400/20"
                         )} />
                         {isGlobalAdmin && (
                           <div className="absolute -top-2 -right-2 w-6 h-6 md:w-7 md:h-7 bg-amber-400 rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white">
                             <Shield size={12} fill="currentColor" />
                           </div>
                         )}
                       </div>
                       <div className="min-w-0">
                         <div className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight truncate">{profile.displayName}</div>
                         <div className="text-[8px] md:text-[9px] font-bold text-slate-400 truncate mt-1 tracking-widest font-mono opacity-50">{profile.email}</div>
                       </div>
                     </div>

                     <div className="flex-1 flex flex-wrap gap-2">
                        {(['admin', 'developer', 'reviewer'] as UserRole[]).map(role => {
                          const hasRole = profile.roles?.includes(role);
                          const config = ROLE_CONFIG[role];
                          return (
                            <button
                              key={role}
                              disabled={!isAdmin || isGlobalAdmin}
                              onClick={() => handleUpdateUserRoles(profile.userId, profile.roles || [], role)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                hasRole 
                                  ? "bg-slate-900 border-transparent text-white shadow-lg shadow-slate-900/10" 
                                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                              )}
                            >
                               {hasRole ? <ShieldCheck size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-slate-200" />}
                               {config.label}
                            </button>
                          );
                        })}
                     </div>

                     <div className="flex items-center gap-3 md:pl-6 md:border-l border-slate-50">
                        {isAdmin && profile.userId !== selectedProject?.ownerId && !isGlobalAdmin && (
                          <button 
                            onClick={() => handleRemoveMember(profile.userId)}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {profile.userId === selectedProject?.ownerId && (
                           <div className="px-4 py-2 rounded-xl bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2">
                              <ShieldCheck size={12} />
                              Chủ dự án
                           </div>
                        )}
                     </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TeamManagementModal;
