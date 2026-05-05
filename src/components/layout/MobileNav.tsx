import React from 'react';
import { LayoutGrid, FolderKanban, PieChart, Activity, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

const MobileNav = ({ activeTab, setActiveTab }: MobileNavProps) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid },
    { id: 'board', icon: FolderKanban },
    { id: 'metrics', icon: PieChart },
    { id: 'logs', icon: Activity },
    { id: 'members', icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex md:hidden items-center justify-around px-4 z-[50]">
      {menuItems.map(item => (
        <button 
          key={item.id} 
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "w-11 h-11 flex items-center justify-center rounded-2xl transition-all active:scale-90",
            activeTab === item.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
          )}
        >
          <item.icon size={20} />
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
