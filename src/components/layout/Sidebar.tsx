import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Cpu,
  Terminal,
  Grid
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { User } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  handleLogout: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, user, handleLogout }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'TỔNG QUAN', icon: <LayoutDashboard size={20} /> },
    { id: 'board', label: 'BẢNG CÔNG VIỆC', icon: <Grid size={20} /> },
    { id: 'members', label: 'ĐỘI NGŨ', icon: <Users size={20} /> },
    { id: 'metrics', label: 'PHÂN TÍCH', icon: <Activity size={20} /> },
    { id: 'logs', label: 'NHẬT KÝ', icon: <Terminal size={20} /> },
  ];

  return (
    <aside className="w-80 h-screen bg-white border-r border-slate-100 flex flex-col sticky top-0 z-50">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-4 mb-12 group cursor-pointer">
          <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20 group-hover:scale-110 transition-transform duration-500">
            <Zap className="text-brand-400 fill-brand-400" size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-heading font-black tracking-tighter text-slate-950 leading-none">
              ZENITH <span className="text-brand-500">X</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">NODE_ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6 pl-4">OPERATIONS</p>
          {[menuItems[0], menuItems[3], menuItems[4]].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-900/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className={cn(
                "transition-transform duration-500 group-hover:scale-110 relative z-10",
                activeTab === item.id ? "text-brand-400" : ""
              )}>
                {item.icon}
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wide relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="activeTabIndicator" className="absolute right-4 w-1 h-1 rounded-full bg-brand-400" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-10 space-y-1.5">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-6 pl-4">NODE CONTROL</p>
          {[menuItems[1], menuItems[2]].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-900/20" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className={cn(
                "transition-transform duration-500 group-hover:scale-110 relative z-10",
                activeTab === item.id ? "text-brand-400" : ""
              )}>
                {item.icon}
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wide relative z-10">{item.label}</span>
              {activeTab === item.id && (
                <motion.div layoutId="activeTabIndicator" className="absolute right-4 w-1 h-1 rounded-full bg-brand-400" />
              )}
            </button>
          ))}
        </div>
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
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono whitespace-nowrap">
                  {user?.email ? 'Đã xác thực' : 'Chế độ khách'}
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
        
        <div className="flex flex-col gap-1.5 pt-4 opacity-50">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono text-center">
            ZENITH X • HỆ THỐNG ỔN ĐỊNH
          </p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono text-center">
            PHÁT TRIỂN BỞI NGUYỄN ĐỨC ANH
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
