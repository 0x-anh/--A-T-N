import React from 'react';
import { motion } from 'motion/react';
import { Cpu, Activity, Zap, CheckCircle2, Plus, Users } from 'lucide-react';
import { StatsCard, QuickAction } from '../components/ui/Cards';
import { cn } from '../lib/utils';
import { Bug } from '../types';

interface DashboardPageProps {
  appStats: any;
  currentTime: Date;
  bugs: Bug[];
  events: any[];
  userProfiles: any[];
  setActiveTab: (tab: 'board' | 'metrics' | 'logs' | 'members' | 'dashboard') => void;
  setShowProjectModal: (val: boolean) => void;
  setShowInviteModal: (val: boolean) => void;
}

const DashboardPage = ({
  appStats,
  currentTime,
  bugs,
  events,
  userProfiles,
  setActiveTab,
  setShowProjectModal,
  setShowInviteModal
}: DashboardPageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8 w-full max-w-7xl mx-auto py-6"
    >
      <header className="flex flex-col gap-8 mb-8 relative">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">OPERATIONAL_COMMAND</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                TRUNG TÂM <span className="text-slate-400">ĐIỀU HÀNH</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Giám sát rơ-le dữ liệu thời gian thực và phân bổ tài nguyên tối ưu.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 group cursor-default">
             <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] font-mono transition-colors group-hover:text-brand-500">SYS_TIME_SYNC</div>
             <div className="flex items-baseline gap-2">
                <span className="text-4xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
                <span className="text-sm font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] font-mono">CONNECTION_STABLE</span>
             </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard label="Năng suất" value={`${appStats.resolutionRate}%`} icon={<Cpu />} trend="ỔN ĐỊNH" />
        <StatsCard label="Xử lý" value={appStats.open} icon={<Activity />} trend="HOẠT ĐỘNG" />
        <StatsCard label="Khẩn cấp" value={appStats.critical} icon={<Zap />} trend="CẢNH BÁO" />
        <StatsCard label="Hoàn thành" value={appStats.resolved} icon={<CheckCircle2 />} trend="HOÀN TẤT" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section className="bg-white/30 backdrop-blur-3xl rounded-3xl border border-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.02)] tech-corners relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] font-heading flex items-center gap-3">
                  LỊCH TRÌNH VẬN HÀNH
                </h3>
                <div className="w-12 h-1 bg-brand-500/20" />
              </div>
              <div className="text-[10px] font-black text-slate-900 bg-white/50 px-4 py-2 rounded-xl border border-white/80 uppercase tracking-[0.2em] font-mono shadow-sm">
                {currentTime.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 bg-slate-200/20 p-1 rounded-2xl border border-white/40 relative z-10">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 2; 
                const isToday = dayNum === currentTime.getDate(); 
                const isCurrentMonth = dayNum > 0 && dayNum <= 31;
                
                return (
                  <div key={i} className={cn(
                    "min-h-[64px] p-2 rounded-xl flex flex-col gap-2 transition-all group/cell relative overflow-hidden",
                    isCurrentMonth ? "bg-white/40 hover:bg-white/80 cursor-pointer border border-white/40 hover:border-brand-500/30" : "bg-transparent opacity-10 pointer-events-none",
                    isToday && "ring-2 ring-brand-500/50 bg-white/90 shadow-lg shadow-brand-500/10"
                  )}>
                    <div className="flex justify-between items-start">
                      <span className={cn(
                        "text-[12px] font-black font-mono",
                        isToday ? "text-brand-600" : "text-slate-950"
                      )}>
                        {dayNum > 0 && dayNum <= 31 ? dayNum : ''}
                      </span>
                      {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {isCurrentMonth && Math.random() > 0.6 && (
                        <div className="w-full h-1 bg-brand-500/20 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 w-[60%]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <QuickAction title="KHỞI TẠO MỚI" desc="Bắt đầu nhiệm vụ hoặc quy trình vận hành Zenith." icon={<Plus />} onClick={() => setShowProjectModal(true)} />
            <QuickAction title="QUẢN LÝ ĐỘI NGŨ" desc="Phân quyền và giám sát nhân sự vận hành." icon={<Users />} onClick={() => setShowInviteModal(true)} />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex-1 bg-white/30 backdrop-blur-3xl rounded-3xl border border-white/60 p-8 shadow-sm tech-corners flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] font-heading">NHẬT KÝ VẬN HÀNH</h3>
                <div className="w-8 h-1 bg-brand-500/30" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xl shadow-slate-950/20">
                <Activity size={18} />
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 max-h-[380px]">
              {events && events.length > 0 ? events.slice(0, 3).map((log) => (
                <div key={log.id} className="p-4 bg-white/40 hover:bg-white/70 border border-white/60 rounded-2xl transition-all duration-300 group/item cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest font-mono bg-slate-100 text-slate-500 border border-slate-200">
                       {log.type || 'Activity'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 font-mono">
                      {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 line-clamp-1 group-hover/item:text-brand-600 transition-colors leading-relaxed">
                    {log.message || log.details || log.content || 'Hoạt động hệ thống.'}
                  </h4>
                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 text-white rounded-xl shadow-lg shadow-slate-950/10 self-start md:self-center">
                    <img 
                      src={userProfiles.find(u => u.userId === log.userId)?.photoURL || log.userPhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${log.userId || 'system'}`} 
                      className="w-5 h-5 rounded-lg border border-white/20"
                      alt=""
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest">{log.userName || 'System'}</span>
                  </div>
                </div>
              )) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 py-12">
                   <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                     <CheckCircle2 size={24} className="text-slate-300" />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống sạch</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setActiveTab('logs')}
              className="mt-8 w-full py-4 bg-white/50 border border-white/80 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:bg-slate-950 hover:text-white transition-all duration-500 font-mono shadow-sm active:scale-[0.98]"
            >
              XEM TOÀN BỘ NHẬT KÝ
            </button>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
