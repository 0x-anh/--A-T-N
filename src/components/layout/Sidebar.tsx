import React from 'react';
import { motion } from 'motion/react';
import { 
  Orbit, LayoutGrid, FolderKanban, PieChart, Activity, Users, LogOut
} from "lucide-react";
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: any;
  handleLogout: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, user, handleLogout }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'TỔNG QUAN' },
    { id: 'board', icon: FolderKanban, label: 'BẢNG CÔNG VIỆC' },
    { id: 'metrics', icon: PieChart, label: 'PHÂN TÍCH' },
    { id: 'logs', icon: Activity, label: 'NHẬT KÝ' },
    { id: 'members', icon: Users, label: 'ĐỘI NGŨ' },
  ];

  return (
    <aside className="hidden md:flex w-64 h-full flex-col bg-white/40 backdrop-blur-md border-r border-slate-200/50 relative z-50 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
      <div className="p-6 pb-8 flex items-center gap-5 relative">
        <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-[1.25rem] shadow-3xl shadow-slate-950/20 group transition-all duration-700">
          <Orbit size={24} strokeWidth={2.5} className="group-hover:animate-spin-slow" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-950 tracking-tight uppercase leading-none group-hover:text-brand-600 transition-colors">ZENITH</span>
          <span className="text-[9px] font-bold text-brand-600 uppercase tracking-[0.4em] font-mono mt-1.5 opacity-60">SYSTEM_X</span>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1 mt-2">
        {menuItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "relative flex items-center gap-4 w-full px-4 py-2.5 rounded-xl transition-all duration-300 group outline-none",
              activeTab === item.id 
                ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10" 
                : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/50"
            )}
          >
            <item.icon 
              size={18} 
              strokeWidth={activeTab === item.id ? 2.5 : 2}
              className={cn(
                "transition-all duration-300",
                activeTab === item.id ? "text-white" : "group-hover:scale-110"
              )}
            />
            <span className="text-[12px] font-bold uppercase tracking-wide">{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="activeTabIndicator" className="absolute right-4 w-1 h-1 rounded-full bg-brand-400" />
            )}
          </button>
        ))}
      </div>

      <div className="p-8 mt-auto border-t border-slate-50 space-y-4">
        <div className="flex items-center gap-3 py-6 px-1 border-t border-slate-100/50 group/profile">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm transition-transform duration-500 group-hover/profile:scale-105">
              <img 
                src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email || 'user'}`} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>
          
          <div className="min-w-0 flex-1">
             <div className="text-[14px] font-bold text-slate-950 leading-none tracking-tight mb-1.5 truncate" title={user?.displayName || 'User'}>
               {user?.displayName || 'Guest User'}
             </div>
             <div className="flex items-center gap-3">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] font-mono">
                 {user?.email ? 'Authorized' : 'Guest Mode'}
               </span>
               <button 
                 onClick={handleLogout}
                 className="flex items-center gap-1 text-[9px] font-bold text-rose-500 hover:text-rose-700 transition-colors uppercase tracking-widest font-mono opacity-60 group-hover/profile:opacity-100 flex-shrink-0"
               >
                 <LogOut size={10} />
                 [EXIT]
               </button>
             </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1 pt-2 opacity-30">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] font-mono text-center">
            ZENITH_X • SYSTEM_STABLE
          </p>
          <p className="text-[7px] font-medium text-slate-300 uppercase tracking-[0.2em] text-center">
            DEVELOPED BY NGUYỄN ĐỨC ANH
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
