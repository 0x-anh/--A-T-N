import React from 'react';
import { LayoutGrid, List, Clock, Search, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Bug } from '../../types';

interface KanbanHeaderProps {
  viewMode: 'board' | 'list';
  setViewMode: (mode: 'board' | 'list') => void;
  showOverdueOnly: boolean;
  setShowOverdueOnly: (val: boolean) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  bugs: Bug[];
  setShowQuickAdd: (val: boolean) => void;
}

const KanbanHeader = ({
  viewMode,
  setViewMode,
  showOverdueOnly,
  setShowOverdueOnly,
  searchTerm,
  setSearchTerm,
  bugs,
  setShowQuickAdd
}: KanbanHeaderProps) => {
  return (
    <div className="min-h-[5.5rem] md:h-20 px-6 md:px-10 flex flex-col md:flex-row items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-3xl shrink-0 z-20 gap-4 md:gap-0 relative py-4 md:py-0">
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
      
      <div className="flex items-center justify-between md:justify-start gap-4 md:gap-12 w-full md:w-auto relative z-10">
         <div className="flex items-center gap-5">
             <div className="flex flex-col">
                <h2 className="text-base md:text-xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase leading-none">
                  <span>QUẢN LÝ CÔNG VIỆC</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]" />
                </h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">Zenith Enterprise System</p>
             </div>
         </div>

         <div className="hidden xl:block h-8 w-px bg-slate-100" />
         
         <div className="hidden md:flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
            <button 
              onClick={() => setViewMode('board')}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                viewMode === 'board' ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={14} />
              <span>BẢNG</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                viewMode === 'list' ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <List size={14} />
              <span>DANH SÁCH</span>
            </button>
          </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto relative z-10">
        <button 
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          className={cn(
            "h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2.5 border-2",
            showOverdueOnly 
              ? "bg-rose-50 border-rose-200 text-rose-600 shadow-lg shadow-rose-500/10" 
              : "bg-white border-slate-100 text-slate-400 hover:border-rose-200 hover:text-rose-600"
          )}
        >
          <Clock size={14} className={cn(showOverdueOnly ? "text-rose-600" : "text-slate-300")} />
          <span className="hidden sm:inline">QUÁ HẠN</span>
          {bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date()).length > 0 && (
             <span className={cn("text-[9px] font-mono px-2 py-0.5 rounded-lg", showOverdueOnly ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-600")}>
                {bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date()).length.toString().padStart(2, '0')}
             </span>
          )}
        </button>

        <div className="relative group flex-1 md:flex-none">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
           <input 
             type="text" placeholder="Tìm kiếm..." value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="h-10 bg-slate-100/50 border border-slate-200/50 rounded-2xl pl-11 pr-5 text-[13px] font-medium text-slate-900 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all w-full md:w-56 outline-none placeholder:text-slate-400"
           />
        </div>

        <button 
          onClick={() => setShowQuickAdd(true)}
          className="h-10 px-6 bg-slate-900 text-white rounded-2xl text-[10px] font-black hover:bg-indigo-600 shadow-lg shadow-slate-900/10 hover:shadow-indigo-500/20 transition-all flex items-center gap-2.5 uppercase tracking-wider group shrink-0"
        >
           <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> 
           <span className="hidden lg:inline">KHỞI TẠO CÔNG VIỆC</span>
           <span className="lg:hidden">THÊM</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanHeader;
