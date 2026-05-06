import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Activity, Cpu, Shield, Globe, Zap, Layers, Database, Lock, User, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocsModalProps {
  show: boolean;
  onClose: () => void;
}

const DocsModal = ({ show, onClose }: DocsModalProps) => {
  if (!show) return null;

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 0.6, 
        ease: [0.23, 1, 0.32, 1],
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" 
      />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative z-[710] bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_32px_64px_rgba(0,0,0,0.2)] rounded-[3rem]"
      >
        {/* HEADER AREA */}
        <div className="px-10 py-8 md:px-14 md:py-10 flex items-center justify-between border-b border-slate-200/50 bg-white/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
               <Cpu size={28} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-950 tracking-[-0.05em] uppercase leading-none">GIAO THỨC VẬN HÀNH</h3>
              <p className="text-[9px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono mt-2">NGUYỄN ĐỨC ANH • ZENITH_OS_MANUAL</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center text-slate-500 hover:text-slate-950"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
        
        {/* CONTENT SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-10 md:p-14 space-y-12 custom-scrollbar">
          
          {/* INTRO SECTION */}
          <motion.section variants={itemVariants} className="max-w-3xl">
             <h4 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono mb-4">KHỞI CHẠY HỆ THỐNG</h4>
             <h2 className="text-4xl font-black text-slate-900 leading-[0.9] uppercase tracking-tighter mb-6">
                CẨM NANG <span className="text-slate-400">VẬN HÀNH CHIẾN LƯỢC</span>
             </h2>
             <p className="text-lg text-slate-500 font-medium leading-relaxed tracking-tight">
                Chào mừng bạn đến với Zenith. Đây là hướng dẫn chi tiết để bạn làm chủ toàn bộ hệ thống quản trị do <span className="text-slate-900 font-bold">Nguyễn Đức Anh</span> thiết lập.
             </p>
          </motion.section>

          {/* DETAILED PROTOCOLS */}
          <div className="space-y-12">
             {/* STEP 1 */}
             <motion.div variants={itemVariants} className="group flex gap-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 font-black text-xl font-mono group-hover:bg-slate-950 group-hover:text-white transition-colors">01</div>
                <div className="space-y-4">
                   <h5 className="text-xl font-black text-slate-900 uppercase tracking-tight">KHỞI TẠO KHÔNG GIAN (WORKSPACE)</h5>
                   <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Bắt đầu bằng cách nhấn vào nút <span className="text-slate-900 font-bold">"Dự án mới"</span> tại Dashboard. Đặt tên gợi nhớ cho mục tiêu của bạn. Sau khi khởi tạo, bạn có thể mời cộng sự thông qua Email để cùng phối hợp trong thời gian thực.
                   </p>
                   <ul className="grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      <li className="flex items-center gap-2"><ChevronRight size={12} className="text-brand-500" /> Tùy chỉnh tên Node</li>
                      <li className="flex items-center gap-2"><ChevronRight size={12} className="text-brand-500" /> Phân quyền Admin/User</li>
                   </ul>
                </div>
             </motion.div>

             {/* STEP 2 */}
             <motion.div variants={itemVariants} className="group flex gap-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 font-black text-xl font-mono group-hover:bg-slate-950 group-hover:text-white transition-colors">02</div>
                <div className="space-y-4">
                   <h5 className="text-xl font-black text-slate-900 uppercase tracking-tight">ĐIỀU PHỐI MA TRẬN KANBAN</h5>
                   <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Tại Bảng công việc, hãy thêm các "Nhiệm vụ" (Nodes). Bạn có thể kéo-thả chúng qua các cột trạng thái. Đặc biệt:
                   </p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                         <div className="text-[9px] font-black text-rose-500 uppercase mb-1">Critical</div>
                         <div className="text-[10px] font-bold text-slate-700">Ưu tiên tối cao, cần xử lý ngay lập tức.</div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                         <div className="text-[9px] font-black text-indigo-500 uppercase mb-1">Quick Add</div>
                         <div className="text-[10px] font-bold text-slate-700">Thêm nhiệm vụ nhanh bằng phím tắt hệ thống.</div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                         <div className="text-[9px] font-black text-emerald-500 uppercase mb-1">Sync</div>
                         <div className="text-[10px] font-bold text-slate-700">Tự động đồng bộ với mọi thành viên.</div>
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* STEP 3 */}
             <motion.div variants={itemVariants} className="group flex gap-8 p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-500">
                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 font-black text-xl font-mono group-hover:bg-slate-950 group-hover:text-white transition-colors">03</div>
                <div className="space-y-4">
                   <h5 className="text-xl font-black text-slate-900 uppercase tracking-tight">GIÁM SÁT & TRUY XUẤT NHẬT KÝ</h5>
                   <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Hệ thống Zenith cung cấp cái nhìn toàn cảnh tại tab <span className="text-slate-900 font-bold">Phân tích</span>. Tại đây, bạn có thể lọc dữ liệu theo từng dự án hoặc xem <span className="text-brand-600 font-bold">Hệ thống tổng quát</span> để đánh giá hiệu suất tổng. Mọi thao tác nhỏ nhất đều được lưu lại tại tab Nhật ký để đảm bảo tính minh bạch.
                   </p>
                </div>
             </motion.div>
          </div>

          {/* GRID FEATURES QUICK VIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <motion.div variants={itemVariants} className="p-8 rounded-[2rem] bg-slate-950 text-white flex items-center gap-6 shadow-2xl">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Shield className="text-brand-400" /></div>
                <div>
                   <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Security_Layer</h6>
                   <p className="text-sm font-bold uppercase tracking-tight">Mã hóa RSA-4096-BIT bảo vệ dữ liệu.</p>
                </div>
             </motion.div>
             <motion.div variants={itemVariants} className="p-8 rounded-[2rem] bg-indigo-600 text-white flex items-center gap-6 shadow-2xl">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Zap className="text-yellow-300" /></div>
                <div>
                   <h6 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest font-mono">Performance</h6>
                   <p className="text-sm font-bold uppercase tracking-tight">Xử lý thời gian thực với độ trễ gần bằng 0.</p>
                </div>
             </motion.div>
          </div>

          {/* TECHNICAL TELEMETRY */}
          <motion.section variants={itemVariants} className="p-10 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-slate-900 relative overflow-hidden">
             <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="space-y-4 text-center md:text-left">
                   <div className="flex items-center justify-center md:justify-start gap-3 text-brand-600 font-mono text-[10px] font-black uppercase tracking-[0.5em]">
                      <Activity size={14} className="animate-pulse" /> SYSTEM_READY
                   </div>
                   <h4 className="text-3xl font-black uppercase tracking-tighter">TRẠNG THÁI ZENITH_OS</h4>
                   <p className="text-slate-500 text-xs font-mono uppercase tracking-widest max-w-xs">Hệ thống đang vận hành ổn định trên nền tảng đám mây.</p>
                </div>

                <div className="grid grid-cols-2 gap-8 md:gap-16">
                   <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Uptime</div>
                      <div className="text-3xl font-black tracking-tighter tabular-nums text-slate-900">99.99<span className="text-brand-600">%</span></div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Latency</div>
                      <div className="text-3xl font-black tracking-tighter tabular-nums text-slate-900">0.2<span className="text-brand-600">ms</span></div>
                   </div>
                </div>
             </div>
          </motion.section>

          {/* FOOTER INFO */}
          <motion.div variants={itemVariants} className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                   <User size={14} className="text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PHÁT TRIỂN ĐỘC LẬP BỞI NGUYỄN ĐỨC ANH</span>
             </div>
             <button 
               onClick={onClose}
               className="px-8 py-3 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-600 transition-all shadow-lg"
             >
               Xác nhận Giao thức
             </button>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
};

export default DocsModal;
