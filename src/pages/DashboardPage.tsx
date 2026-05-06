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
  setShowProjectModal: (val: boolean) => void;
  setShowInviteModal: (val: boolean) => void;
}

const DashboardPage = ({
  appStats,
  currentTime,
  bugs,
  setShowProjectModal,
  setShowInviteModal
}: DashboardPageProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-6 w-full max-w-7xl mx-auto py-2"
    >
      <header className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
          <div className="space-y-1">
            <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-[0.4em] font-mono leading-none">Command_Protocol</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Telemetry_Sync_Established</span>
            </div>
          </div>
        </div>
        <h2 className="text-base md:text-lg lg:text-xl font-heading font-bold tracking-tight uppercase leading-tight text-slate-950">
          Trung tâm<br/>Điều hành
        </h2>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <p className="text-base md:text-sm text-slate-500 font-medium tracking-tight max-w-xl leading-relaxed">
            Giám sát rơ-le dữ liệu thời gian thực và phân bổ tài nguyên tối ưu cho đội ngũ tinh hoa. 
            <span className="block mt-1 text-[10px] font-black uppercase tracking-[0.4em] font-mono text-slate-300">Nhân_Hệ_Thống v4.2.1</span>
          </p>
          <div className="flex flex-col items-start lg:items-end gap-1 px-6 py-4 bg-white/10 backdrop-blur-3xl border border-white/40 rounded-2xl min-w-[260px] relative overflow-hidden shadow-sm tech-corners">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono leading-none">Đồng_Hồ_Hệ_Thống</span>
             <span className="text-2xl font-heading font-bold text-slate-950 tracking-tight leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
             <div className="flex items-center gap-3 mt-1">
                <div className="w-1 h-1 rounded-full bg-brand-500 animate-ping" />
                <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em] font-mono">ĐỒNG_BỘ_ACTIVE</span>
             </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Năng suất" value={`${appStats.resolutionRate}%`} icon={<Cpu />} trend="ỔN ĐỊNH" />
        <StatsCard label="Xử lý" value={appStats.open} icon={<Activity />} trend="HOẠT ĐỘNG" />
        <StatsCard label="Khẩn cấp" value={appStats.critical} icon={<Zap />} trend="KHẨN CẤP" />
        <StatsCard label="Hoàn thành" value={appStats.resolved} icon={<CheckCircle2 />} trend="ỔN ĐỊNH" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-white/10 backdrop-blur-3xl rounded-[1.5rem] border border-white/40 p-6 shadow-sm tech-corners">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  Lịch trình dự án
                </h3>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">Timeline vận hành cấp độ Delta</p>
              </div>
              <div className="text-[9px] font-bold text-slate-500 bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 uppercase tracking-widest">{currentTime.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</div>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-slate-200/30 border border-slate-200/30 rounded-2xl overflow-hidden">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                <div key={day} className="bg-white/20 py-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest border-r border-white/20 last:border-0">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 2; 
                const isToday = dayNum === currentTime.getDate(); 
                const isCurrentMonth = dayNum > 0 && dayNum <= 30;
                const dateString = `2026-05-${String(dayNum).padStart(2, '0')}`; // Use 05 for May
                const dayBugs = bugs.filter(b => b.dueDate?.startsWith(dateString));
                
                return (
                  <div key={i} className={cn(
                    "min-h-[48px] py-1 px-1.5 bg-white/10 flex flex-col gap-0.5 transition-all hover:bg-white/30 relative group/cell",
                    !isCurrentMonth && "bg-slate-50/5 opacity-30 pointer-events-none"
                  )}>
                    <span className={cn(
                      "text-[10px] font-bold font-mono text-slate-200",
                      isToday && "text-brand-600 font-extrabold"
                    )}>
                      {dayNum > 0 && dayNum <= 30 ? dayNum : (dayNum <= 0 ? 30 + dayNum : dayNum - 30)}
                    </span>
                    <div className="space-y-1.5 mt-2">
                      {dayBugs.slice(0, 3).map(bug => (
                        <div key={bug.id} className={cn(
                          "h-1.5 w-full rounded-full",
                          bug.status === 'done' ? "bg-emerald-400/20" : "bg-brand-500/40"
                        )} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickAction title="Khởi tạo mới" desc="Bắt đầu nhiệm vụ hoặc quy trình vận hành Zenith." icon={<Plus />} onClick={() => setShowProjectModal(true)} />
            <QuickAction title="Đội ngũ" desc="Quản lý nhân sự và phân quyền truy cập hệ thống." icon={<Users />} onClick={() => setShowInviteModal(true)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
