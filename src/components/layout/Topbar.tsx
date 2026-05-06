import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Plus, UserPlus, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Project } from '../../types';

interface TopbarProps {
  selectedProject: Project | null;
  projects: Project[];
  setSelectedProject: (project: Project) => void;
  setShowProjectModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  activeTab: string;
}

const Topbar = ({
  selectedProject,
  projects,
  setSelectedProject,
  setShowProjectModal,
  setShowInviteModal,
  setShowSettingsModal,
  activeTab
}: TopbarProps) => {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  return (
    <header className="h-16 md:h-20 bg-white/40 backdrop-blur-md shrink-0 border-b border-slate-100/80 flex items-center justify-between px-6 md:px-10 relative z-[60] shadow-sm">
      <div className="flex items-center gap-6">
        {(activeTab === 'dashboard' || activeTab === 'metrics' || activeTab === 'logs') ? (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900 text-white rounded-lg shadow-lg shadow-slate-900/10 border border-slate-800">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] font-mono">HỆ THỐNG TỔNG QUÁT</span>
          </div>
        ) : null}
        
        {!['dashboard', 'metrics', 'logs'].includes(activeTab) && (
          <div className="relative">
            <button 
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/80 rounded-lg border border-white/40 transition-all font-sans bg-white/50 shadow-sm"
            >
               <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
               <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{selectedProject?.name || 'Loading...'}</span>
               <ChevronDown size={12} className={cn("text-slate-400 transition-transform", showProjectDropdown && "rotate-180")} />
            </button>
            
            <AnimatePresence>
               {showProjectDropdown && (
                 <motion.div 
                   initial={{ opacity: 0, y: 8 }} 
                   animate={{ opacity: 1, y: 0 }} 
                   exit={{ opacity: 0, y: 8 }} 
                   className="absolute top-full left-0 mt-2 w-56 z-[110] bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden p-1.5"
                 >
                   <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dự án</div>
                   <div className="space-y-0.5">
                     {projects.map(p => (
                       <button 
                          key={p.id} 
                          onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} 
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all", 
                            selectedProject?.id === p.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                         {p.name}
                         {selectedProject?.id === p.id && <Check size={12} />}
                       </button>
                     ))}
                     <div className="h-px bg-slate-100 my-1.5 mx-1.5" />
                     <button 
                       onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} 
                       className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-600 font-semibold hover:bg-brand-50 rounded-xl transition-colors"
                     >
                       <Plus size={14} /> Tạo dự án
                     </button>
                   </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        )}

        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'dashboard' ? 'Tổng quan' : activeTab === 'metrics' ? 'Phân tích' : activeTab}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={() => setShowInviteModal(true)} className="h-9 px-4 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all flex items-center gap-2">
           <UserPlus size={14} /> 
           <span className="hidden sm:inline">Mời</span>
        </button>
        <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
           <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
