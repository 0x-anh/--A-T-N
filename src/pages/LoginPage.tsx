import React from 'react';
import { motion } from 'motion/react';
import { Orbit, ArrowRight, Zap, Shield, Cpu, Globe, Lock, Terminal, Activity, ChevronRight, Database, Github } from 'lucide-react';

interface LoginPageProps {
  handleLogin: () => void;
}

const LoginPage = ({ handleLogin }: LoginPageProps) => {
  return (
    <div className="relative min-h-screen bg-transparent flex flex-col items-center justify-center overflow-hidden font-sans selection:bg-slate-200 text-slate-600">
      {/* 🔮 CINEMATIC BACKGROUND ELEMENTS - Sync with White Theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(203,213,225,0.2),transparent_70%)]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-slate-200 blur-[120px] rounded-full opacity-50" />
      </div>

      {/* 🛰️ TECHNICAL HEADER */}
      <header className="absolute top-0 left-0 right-0 h-24 px-8 md:px-16 flex items-center justify-between z-50 border-b border-slate-200 backdrop-blur-sm">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center rounded-xl shadow-xl group-hover:bg-slate-800 transition-all duration-500">
            <Orbit size={20} className="group-hover:rotate-180 transition-transform duration-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] leading-none">Zenith_X</span>
            <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-widest opacity-60">System_Protocol::v4.2</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-40">System_Status</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-900 font-mono">ONLINE_SECURED</span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* 🏛️ MAIN CONTENT CONTAINER */}
      <main className="relative z-20 w-full max-w-7xl px-8 md:px-16 flex flex-col lg:flex-row items-center gap-20">
        
        {/* LEFT SIDE: HERO TEXT */}
        <div className="flex-1 flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-8"
          >
            <Activity size={12} className="text-slate-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">Pure Architecture v4.0</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black text-slate-900 tracking-[-0.04em] leading-[0.85] uppercase italic mb-8">
              ZENITH<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-500 to-slate-400 opacity-90">SYSTEM</span>
            </h1>
            
            <div className="w-20 h-1.5 bg-slate-900 mb-8 rounded-full shadow-lg" />
            
            <p className="text-lg md:text-xl text-slate-500 font-medium tracking-tight max-w-xl leading-relaxed">
              Kiến trúc điều hành thế hệ mới với sự tối giản tuyệt đối. 
              Tối ưu hóa quy trình, trực quan hóa dữ liệu trên nền tảng tinh khiết nhất.
            </p>
          </motion.div>
        </div>

        {/* RIGHT SIDE: LOGIN INTERFACE */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-200 to-slate-300 rounded-[2.5rem] blur opacity-30" />
            
            <div className="relative bg-white/70 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50" />
              
              <div className="flex flex-col gap-8">
                <div className="space-y-2 text-center lg:text-left">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Xác thực hệ thống</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-widest font-mono">Project Defense - Nguyễn Đức Anh</p>
                </div>

                <div className="space-y-4">
                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group/item hover:bg-white transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm">
                        <Terminal size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">Terminal_ID</div>
                        <div className="text-sm font-bold text-slate-900 uppercase font-mono">ZN_PURE_7741</div>
                      </div>
                   </div>

                   <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4 group/item hover:bg-white transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm">
                        <Database size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono mb-1">Access_Level</div>
                        <div className="text-sm font-bold text-slate-900 uppercase font-mono">MASTER_ADMIN</div>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleLogin}
                  className="group relative w-full h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-between px-8 font-black uppercase tracking-[0.2em] italic shadow-2xl hover:bg-slate-800 transition-all duration-500 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Lock size={16} strokeWidth={3} />
                    Truy cập Zenith
                  </span>
                  <div className="relative z-10 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <ChevronRight size={20} strokeWidth={3} />
                  </div>
                </button>

                <p className="text-center text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                  Secure Connection: RSA-4096-BIT
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* 📊 TECHNICAL FOOTER */}
      <footer className="absolute bottom-0 left-0 right-0 h-24 px-8 md:px-16 flex items-center justify-between z-50 border-t border-slate-200 backdrop-blur-sm">
        <div className="flex items-center gap-12">
           {[
             { label: 'Uptime', val: '99.9%' },
             { label: 'Latency', val: '0.002ms' },
             { label: 'Design', val: 'MINIMAL' }
           ].map((item, i) => (
             <div key={i} className="flex flex-col gap-1">
                <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">{item.label}</span>
                <span className="text-xs font-black text-slate-900 font-mono italic">{item.val}</span>
             </div>
           ))}
        </div>
        
        <div className="flex items-center gap-6">
          <a 
            href="https://github.com/0x-anh" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 group/git transition-all hover:text-slate-900"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover/git:bg-slate-900 group-hover/git:text-white transition-all">
              <Github size={14} />
            </div>
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.3em] hidden sm:block group-hover/git:text-slate-900 transition-colors">
              © 2026 ZENITH_X SYSTEM - NGUYỄN ĐỨC ANH
            </p>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
