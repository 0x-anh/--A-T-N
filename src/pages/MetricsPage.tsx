import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart, TrendingUp, Cpu, BarChart3, Target } from 'lucide-react';
import { Bug } from '../types';
import { StatsCard } from '../components/ui/Cards';

interface MetricsPageProps {
  bugs: Bug[];
  appStats: any;
}

const MetricsPage = ({ bugs, appStats }: MetricsPageProps) => {
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
        // Handle Firestore Timestamp or Date
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
      className="max-w-7xl mx-auto py-6"
    >
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
            <PieChart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase italic leading-none">Phân_Tích_Tài_Nguyên</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Resource_Throughput_Analytics</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatsCard label="Hiệu năng" value={`${appStats.resolutionRate}%`} icon={<Cpu />} trend="ỔN ĐỊNH" />
        <StatsCard label="Tổng Node" value={bugs.length} icon={<TrendingUp />} trend="TĂNG TRƯỞNG" />
        <StatsCard label="Đúng hạn" value={`${Math.round(appStats.resolved / (bugs.length || 1) * 100)}%`} icon={<Target />} trend="XÁC THỰC" />
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
           <BarChart3 size={200} />
        </div>
        
        <div className="flex items-center justify-between mb-12">
          <div className="space-y-1">
             <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest italic">Năng suất khởi tạo</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight font-mono">7_Day_Moving_Average</p>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between gap-4 md:gap-8 pt-10">
          {chartData.stats.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-6 group/bar">
              <div className="w-full relative flex flex-col items-center justify-end h-full">
                 <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(s.value / chartData.max) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 1, ease: [0.23, 1, 0.32, 1] }}
                    className="w-full max-w-[40px] bg-slate-950 rounded-t-xl group-hover/bar:bg-brand-600 transition-colors shadow-2xl relative"
                 >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {s.value}
                    </div>
                 </motion.div>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default MetricsPage;
