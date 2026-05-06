import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PieChart as PieIcon, TrendingUp, Cpu, BarChart3, Target, Activity, Zap, CheckCircle2, AlertCircle, Clock, ArrowUpRight, Layers, Radio, ShieldCheck, Database, Terminal, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import { Bug } from '../types';
import { cn } from '../lib/utils';

interface MetricsPageProps {
  bugs: Bug[];
  appStats: any;
  setActiveTab: (tab: 'board' | 'metrics' | 'logs' | 'members' | 'dashboard') => void;
}

const MetricsPage = ({ bugs, appStats, setActiveTab }: MetricsPageProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Bar Chart Data Calculation
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dateStr: d.toLocaleDateString('vi-VN')
      });
    }

    const stats = days.map(day => {
      const count = bugs.filter(b => {
        if (!b.createdAt) return false;
        const bugDate = (b.createdAt as any).toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt);
        return bugDate.toLocaleDateString('vi-VN') === day.dateStr;
      }).length;
      return { name: day.label, value: count };
    });

    const actualMax = Math.max(...stats.map(s => s.value), 0);
    const scaleMax = actualMax || 1; 
    
    return { stats, max: scaleMax, actualMax };
  }, [bugs]);

  // Pie Chart Data Calculation
  const pieData = useMemo(() => {
    const total = bugs.length || 1;
    const done = bugs.filter(b => b.status === 'done').length;
    const overdue = bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < currentTime).length;
    const inProgress = bugs.filter(b => (b.status === 'in-progress' || b.status === 'in-review') && (!b.dueDate || new Date(b.dueDate) >= currentTime)).length;
    const backlog = bugs.filter(b => b.status === 'backlog' && (!b.dueDate || new Date(b.dueDate) >= currentTime)).length;

    return {
      done: { val: done, per: Math.round((done / total) * 100) },
      overdue: { val: overdue, per: Math.round((overdue / total) * 100) },
      inProgress: { val: inProgress, per: Math.round((inProgress / total) * 100) },
      backlog: { val: backlog, per: Math.round((backlog / total) * 100) },
      total: bugs.length
    };
  }, [bugs, currentTime]);

  // Smart Analytics Logic
  const systemInsight = useMemo(() => {
    if (pieData.overdue.val > 0) {
      return {
        label: "CRITICAL_RISK",
        title: "CẢNH BÁO RỦI RO",
        msg: `${pieData.overdue.val} Node trễ hạn`,
        action: "XỬ_LÝ_NGAY",
        color: "rose",
        target: "board" as const
      };
    }
    if (pieData.done.per > 75) {
      return {
        label: "PERF_OPTIMIZED",
        title: "HIỆU SUẤT TỐI ƯU",
        msg: "Vận hành ổn định",
        action: "KIỂM_TRA",
        color: "emerald",
        target: "board" as const
      };
    }
    return {
      label: "ACTIVE_DEPLOY",
      title: "VẬN HÀNH TÍCH CỰC",
      msg: "Đang triển khai Node...",
      action: "XEM_TIẾN_ĐỘ",
      color: "brand",
      target: "board" as const
    };
  }, [pieData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8 w-full max-w-7xl mx-auto py-6 font-sans selection:bg-brand-500/20 px-4"
    >
      {/* Header */}
      <header className="flex flex-col gap-8 mb-8 relative">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">PHÂN TÍCH HỆ THỐNG</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                HIỆU NĂNG <span className="text-slate-400">TÀI NGUYÊN</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 group cursor-default">
             <div className="flex items-baseline gap-2">
                <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-brand-500/5 border border-brand-500/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-[8px] font-black text-brand-600 uppercase tracking-[0.2em] font-mono">DỮ LIỆU ĐỒNG BỘ</span>
             </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Hiệu năng xử lý', value: `${appStats.resolutionRate}%`, icon: <Cpu />, trend: 'ỔN ĐỊNH' },
          { label: 'Tổng Node khởi tạo', value: bugs.length, icon: <TrendingUp />, trend: 'TĂNG TRƯỞng' },
          { label: 'Nhiệm vụ Quá hạn', value: pieData.overdue.val, icon: <AlertCircle className="text-rose-500" />, trend: 'RỦI RO' },
          { label: 'Tỉ lệ xác thực', value: `${Math.round(appStats.resolved / (bugs.length || 1) * 100)}%`, icon: <Target />, trend: 'XÁC THỰC' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/40 backdrop-blur-3xl p-6 rounded-3xl border border-white/60 shadow-sm tech-corners group hover:bg-white transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg uppercase tracking-widest font-mono">
                {s.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</span>
              <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter tabular-nums">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        {/* Main Bar Chart Section */}
        <div className="lg:col-span-2">
          <div className="bg-white/30 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-8 h-full shadow-sm overflow-hidden relative group tech-corners flex flex-col min-h-[450px]">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-12 relative z-10 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                    <BarChart3 size={20} />
                 </div>
                 <div>
                    <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.2em] font-heading">THÔNG LƯỢNG KHỞI TẠO</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mt-0.5">RESOURCE_THROUGHPUT_MAP</p>
                 </div>
              </div>
              <div className="text-[9px] font-black text-slate-900 bg-white/50 px-3 py-1.5 rounded-lg border border-white/80 uppercase tracking-widest font-mono shadow-sm">
                 7_DAY_DATA
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch h-full relative z-10">
               <div className="md:col-span-8 flex flex-col justify-end relative h-full">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-4">
                     {[1, 2, 3, 4, 5].map(line => (
                        <div key={line} className="w-full h-[1px] bg-slate-200/40 border-t border-dashed border-slate-200" />
                     ))}
                  </div>

                  <div className="relative z-10 h-full flex items-end justify-between gap-3 pb-10 px-2 pt-10">
                    {chartData.stats.map((s, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group/bar">
                        <div className="w-full relative flex flex-col items-center justify-end h-full">
                           <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${(s.value / chartData.max) * 100}%` }}
                              transition={{ delay: i * 0.1, duration: 1, ease: [0.23, 1, 0.32, 1] }}
                              className={cn(
                                "w-full max-w-[36px] bg-slate-950 rounded-t-xl transition-all duration-500 relative group-hover/bar:bg-brand-600 min-h-[4px]",
                                s.value > 0 ? "shadow-2xl group-hover/bar:shadow-brand-500/40" : "opacity-30"
                              )}
                           >
                              {s.value > 0 && <div className="absolute top-0 left-0 w-full h-2 bg-white/20 rounded-t-xl" />}
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all transform group-hover/bar:-translate-y-2 shadow-2xl border border-white/10 whitespace-nowrap z-50">
                                {s.value} UNIT
                              </div>
                           </motion.div>
                        </div>
                        <div className="mt-4 flex flex-col items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-950 uppercase tracking-widest font-mono">{s.name}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/bar:bg-brand-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Sidebar - INDUSTRIAL SMART ANALYTICS */}
               <div className="md:col-span-4 flex flex-col justify-center gap-6 border-l border-slate-100/50 pl-8 pb-10 hidden md:flex h-full relative">
                  <div className="space-y-4">
                     {[
                        { label: 'CAO ĐIỂM TRONG TUẦN', val: chartData.actualMax, icon: <ArrowUpRight size={14} />, color: 'bg-brand-50 text-brand-600' },
                        { label: 'CƠ SỞ DỮ LIỆU TỔNG', val: bugs.length, icon: <Database size={14} />, color: 'bg-slate-50 text-slate-400' }
                     ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-white/80 hover:bg-white transition-all shadow-sm">
                           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                              {item.icon}
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">{item.label}</p>
                              <p className="text-xl font-black text-slate-950 tabular-nums leading-none">{item.val} NODE</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* INDUSTRIAL ANALYTICS STRIP with working setActiveTab logic */}
                  <div className={cn(
                    "mt-4 p-0 rounded-xl border-l-4 overflow-hidden shadow-2xl transition-all duration-500 group/strip",
                    systemInsight.color === 'rose' ? "bg-slate-950 border-rose-500" : "bg-slate-950 border-brand-500"
                  )}>
                    <div className="p-6 bg-gradient-to-br from-white/[0.05] to-transparent relative">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                             <span className={cn("text-[9px] font-black font-mono tracking-[0.2em]", systemInsight.color === 'rose' ? "text-rose-500" : "text-brand-400")}>
                               {systemInsight.label}
                             </span>
                             <div className={cn("w-1 h-1 rounded-full animate-ping", systemInsight.color === 'rose' ? "bg-rose-500" : "bg-brand-500")} />
                          </div>
                          <Terminal size={14} className="text-white/20" />
                        </div>

                        <div className="space-y-4">
                           <div className="space-y-1">
                              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">{systemInsight.title}</h4>
                              <p className="text-xl font-black text-white leading-tight tracking-tighter">
                                {systemInsight.msg}
                              </p>
                           </div>

                           <div className="pt-4 border-t border-white/5">
                              <motion.div 
                                 onClick={() => setActiveTab(systemInsight.target)}
                                 whileHover={{ x: 5 }}
                                 className={cn(
                                    "inline-flex items-center gap-3 px-4 py-2 border text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                                    systemInsight.color === 'rose' 
                                       ? "border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-white" 
                                       : "border-brand-500/30 text-brand-400 bg-brand-500/5 hover:bg-brand-500 hover:text-white"
                                 )}
                              >
                                {systemInsight.action}
                                <ChevronRight size={12} />
                              </motion.div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Pie Chart Section */}
        <div className="lg:col-span-1">
           <div className="bg-white/30 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-10 h-full shadow-sm tech-corners relative group flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between mb-10">
                 <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] font-heading">PHÂN BỔ MỤC TIÊU</h3>
                    <div className="w-8 h-1 bg-brand-500/20" />
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-xl">
                    <PieIcon size={18} />
                 </div>
              </div>

              {/* Visual Pie Chart */}
              <div className="relative w-48 h-48 mx-auto mb-10 flex items-center justify-center">
                 <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 scale-110">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="#94a3b8" strokeWidth="14" strokeDasharray="251.2" initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 251.2 - (251.2 * (pieData.backlog.per + pieData.inProgress.per + pieData.overdue.per + pieData.done.per)) / 100 }} transition={{ duration: 1.5, ease: "easeOut" }} strokeLinecap="round" />
                    <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="14" strokeDasharray="251.2" initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 251.2 - (251.2 * (pieData.inProgress.per + pieData.overdue.per + pieData.done.per)) / 100 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }} strokeLinecap="round" />
                    <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="#f43f5e" strokeWidth="14" strokeDasharray="251.2" initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 251.2 - (251.2 * (pieData.overdue.per + pieData.done.per)) / 100 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} strokeLinecap="round" />
                    <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="14" strokeDasharray="251.2" initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 251.2 - (251.2 * pieData.done.per) / 100 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} strokeLinecap="round" />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-950 leading-none tabular-nums">{pieData.total}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">NODE</span>
                 </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 mt-auto">
                 {[
                   { label: 'HOÀN TẤT', val: pieData.done.val, per: pieData.done.per, color: 'bg-emerald-500', text: 'text-emerald-600', icon: <CheckCircle2 size={10} /> },
                   { label: 'QUÁ HẠN', val: pieData.overdue.val, per: pieData.overdue.per, color: 'bg-rose-500', text: 'text-rose-600', icon: <Clock size={10} /> },
                   { label: 'TIẾN HÀNH', val: pieData.inProgress.val, per: pieData.inProgress.per, color: 'bg-brand-500', text: 'text-brand-600', icon: <Zap size={10} /> },
                   { label: 'HÀNG ĐỢI', val: pieData.backlog.val, per: pieData.backlog.per, color: 'bg-slate-400', text: 'text-slate-400', icon: <Activity size={10} /> },
                 ].map((item, i) => (
                   <div key={i} className="flex items-center justify-between p-2.5 bg-white/40 rounded-2xl border border-white/60 hover:bg-white transition-all group/item">
                      <div className="flex items-center gap-3">
                         <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm", item.color)}>
                            {item.icon}
                         </div>
                         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-950 font-mono tabular-nums">{item.val}</span>
                         <div className="w-[1px] h-3 bg-slate-200" />
                         <span className={cn("text-[10px] font-black font-mono tabular-nums", item.text)}>{item.per}%</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricsPage;
