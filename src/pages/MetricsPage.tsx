import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { PieChart, TrendingUp, Cpu, BarChart3, Target, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { Bug } from '../types';
import { cn } from '../lib/utils';

interface MetricsPageProps {
  bugs: Bug[];
  appStats: any;
}

const MetricsPage = ({ bugs, appStats }: MetricsPageProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        label: d.toLocaleDateString([], { weekday: 'short' }),
        date: d.toLocaleDateString()
      };
    }).reverse();

    const stats = last7Days.map(day => {
      const count = bugs.filter(b => {
        if (!b.createdAt) return false;
        const date = (b.createdAt as any).toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt);
        return date.toLocaleDateString() === day.date;
      }).length;
      return { name: day.label, value: count };
    });

    const max = Math.max(...stats.map(s => s.value), 5);
    return { stats, max };
  }, [bugs]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8 w-full max-w-7xl mx-auto py-6 font-sans selection:bg-brand-500/20"
    >
      {/* Overview Style Header */}
      <header className="flex flex-col gap-8 mb-8 relative px-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">PHÂN TÍCH HỆ THỐNG</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                HIỆU NĂNG <span className="text-slate-400">TÀI NGUYÊN</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Đo lường thông lượng dữ liệu, hiệu quả xử lý và phân bổ nguồn lực tối ưu trên các Node.
              </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {[
          { label: 'Hiệu năng xử lý', value: `${appStats.resolutionRate}%`, icon: <Cpu />, trend: 'ỔN ĐỊNH' },
          { label: 'Tổng Node khởi tạo', value: bugs.length, icon: <TrendingUp />, trend: 'TĂNG TRƯỞNG' },
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
              <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="px-4">
        <div className="bg-white/30 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative group tech-corners">
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
             <BarChart3 size={200} />
          </div>
          
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div className="space-y-1">
               <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.3em] font-heading flex items-center gap-3">
                 THÔNG LƯỢNG KHỞI TẠO
               </h3>
               <div className="w-12 h-1 bg-brand-500/20" />
            </div>
            <div className="text-[10px] font-black text-slate-900 bg-white/50 px-4 py-2 rounded-xl border border-white/80 uppercase tracking-[0.2em] font-mono shadow-sm">
              7_DAY_MOVING_AVERAGE
            </div>
          </div>

          <div className="h-72 flex items-end justify-between gap-4 md:gap-8 pt-10 relative z-10 px-4">
            {chartData.stats.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-6 group/bar">
                <div className="w-full relative flex flex-col items-center justify-end h-full">
                   <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(s.value / chartData.max) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 1, ease: [0.23, 1, 0.32, 1] }}
                      className="w-full max-w-[42px] bg-slate-950 rounded-t-2xl group-hover/bar:bg-brand-600 transition-all duration-500 shadow-2xl relative overflow-hidden"
                   >
                      <div className="absolute top-0 left-0 w-full h-2 bg-white/20" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all transform group-hover/bar:-translate-y-2 shadow-xl border border-white/10 whitespace-nowrap">
                        {s.value} ĐƠN VỊ
                      </div>
                   </motion.div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest font-mono">{s.name}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-200 group-hover/bar:bg-brand-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {/* Decorative Bottom Bar */}
          <div className="mt-12 flex items-center justify-between pt-6 border-t border-slate-100/50">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-950" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sản lượng thực tế</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-brand-500" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đỉnh hiệu năng</span>
                </div>
             </div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest font-mono">
               ZENITH_METRICS_PROTOCOL_V.1.0
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricsPage;
