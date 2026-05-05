import React from 'react';
import { motion } from 'motion/react';
import { Users, UserPlus, Shield, Mail, Trash2, Crown } from 'lucide-react';
import { UserProfile, Project } from '../types';
import { cn } from '../lib/utils';

interface MembersPageProps {
  userProfiles: UserProfile[];
  selectedProject: Project | null;
  isAdmin: boolean;
  userId: string;
  setShowInviteModal: (val: boolean) => void;
  handleRemoveMember: (userId: string) => void;
}

const MembersPage = ({
  userProfiles,
  selectedProject,
  isAdmin,
  userId,
  setShowInviteModal,
  handleRemoveMember
}: MembersPageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl mx-auto py-6"
    >
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase italic leading-none">Danh_Sách_Nhân_Sự</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Active_Personnel_Nodes</p>
          </div>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="h-14 px-8 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 transition-all shadow-xl flex items-center gap-3 active:scale-95"
        >
          <UserPlus size={18} />
          <span>Mời Nhân Sự</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userProfiles.map((profile) => (
          <motion.div 
            key={profile.userId}
            whileHover={{ y: -5 }}
            className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm group hover:shadow-2xl hover:shadow-slate-900/5 transition-all duration-500"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="relative">
                <img 
                  className="w-20 h-20 rounded-[1.75rem] border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-500" 
                  src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} 
                  alt="" 
                />
                {selectedProject?.ownerId === profile.userId && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <Crown size={16} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {profile.roles?.map(role => (
                   <span key={role} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">
                      {role}
                   </span>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight italic truncate">{profile.displayName}</h3>
                <div className="flex items-center gap-2 mt-1 text-slate-400">
                  <Mail size={12} />
                  <span className="text-[10px] font-bold truncate tracking-tight">{profile.email}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Trạng_Thái_Online</span>
                </div>
                {isAdmin && profile.userId !== userId && profile.userId !== selectedProject?.ownerId && (
                  <button 
                    onClick={() => handleRemoveMember(profile.userId)}
                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default MembersPage;
