import React from 'react';
import { LayoutGrid, List, Clock, Search, Plus, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Bug } from '../../types';
import { useTranslation } from 'react-i18next';

interface KanbanHeaderProps {
  viewMode: 'board' | 'list';
  setViewMode: (mode: 'board' | 'list') => void;
  showOverdueOnly: boolean;
  setShowOverdueOnly: (val: boolean) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  bugs: Bug[];
  setShowQuickAdd: (val: boolean) => void;
  setShowTeamModal?: (val: boolean) => void;
}

const KanbanHeader = ({
  viewMode,
  setViewMode,
  showOverdueOnly,
  setShowOverdueOnly,
  searchTerm,
  setSearchTerm,
  bugs,
  setShowQuickAdd,
  setShowTeamModal
}: KanbanHeaderProps) => {
  const { t } = useTranslation();

  // Safe calculation for overdue count
  const overdueCount = bugs?.filter(b => {
    if (!b.dueDate || b.status === 'done') return false;
    try {
      return new Date(b.dueDate).getTime() < Date.now();
    } catch (e) {
      return false;
    }
  }).length || 0;

  return (
    <div className="h-20 px-6 md:px-10 flex items-center justify-between border-b border-slate-200 bg-white z-50 relative">
      <div className="flex items-center gap-8">
         <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">
              {t('sidebar.board')}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{t('sidebar.system_stable')}</p>
         </div>
      </div>

      <div className="flex items-center gap-4">
        {setShowTeamModal && (
          <button 
            onClick={() => setShowTeamModal(true)}
            className="h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Users size={14} />
            <span className="hidden lg:inline">{t('kanban.team')}</span>
          </button>
        )}

        <button 
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          className={cn(
            "h-10 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border",
            showOverdueOnly 
              ? "bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-500/20" 
              : "bg-white border-slate-200 text-slate-400 hover:text-rose-600"
          )}
        >
          <Clock size={14} />
          <span className="hidden sm:inline">{t('kanban.overdue')}</span>
          {overdueCount > 0 && (
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 ml-1", showOverdueOnly && "bg-rose-500 text-white")}>
              {overdueCount.toString().padStart(2, '0')}
            </span>
          )}
        </button>

        <div className="relative flex items-center">
           <Search className="absolute left-3 w-4 h-4 text-slate-400" />
           <input 
             type="text" 
             placeholder={t('topbar.search_placeholder')} 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="h-10 bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all w-48 md:w-64 outline-none"
           />
        </div>

        <button 
          onClick={() => setShowQuickAdd(true)}
          className="h-10 px-4 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 uppercase tracking-wider"
        >
           <Plus size={16} strokeWidth={3} /> 
           <span className="hidden lg:inline">{t('kanban.deploy_task')}</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanHeader;
