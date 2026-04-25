/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Code2, Rocket, ArrowRight, Layout, LayoutGrid, FolderKanban, PieChart, 
  Zap, LogIn, LogOut, ShieldAlert, Bug as BugIcon, Activity, Cpu, Globe, Database, 
  Terminal, FolderPlus, ChevronDown, ChevronRight, Users, Bell, Search, Plus, 
  Filter, MessageSquare, History, Settings, Lock, CheckCircle2, Check, Shield, X 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import { auth, db, handleFirestoreError, testConnection } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp, where, orderBy, getDocFromServer, limit } from 'firebase/firestore';
import KanbanBoard from './components/KanbanBoard';
import { cn } from './lib/utils';
import { Project, UserProfile, Bug } from './types';

import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'settings' | 'terminal'>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [jitter, setJitter] = useState(false);

  useEffect(() => {
    const triggerJitter = () => {
      setJitter(true);
      setTimeout(() => setJitter(false), 300);
      const nextTime = Math.random() * 15000 + 10000;
      setTimeout(triggerJitter, nextTime);
    };
    const timer = setTimeout(triggerJitter, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            userId: u.uid,
            displayName: u.displayName || 'Anonymous User',
            email: u.email,
            photoURL: u.photoURL || ''
          }, { merge: true });
        } catch (e) {
          console.error("Profile sync failed:", e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen for projects
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }
    // Secure query: Only projects where user is owner or member
    const q = query(
      collection(db, 'projects'), 
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
      setProjects(projList);
      if (projList.length > 0 && !selectedProject) {
        const lastId = localStorage.getItem('lastProjectId');
        const found = projList.find(p => p.id === lastId);
        setSelectedProject(found || projList[0]);
      }
    }, (error) => {
      handleFirestoreError(error, 'list', 'projects');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('lastProjectId', selectedProject.id);
    }
  }, [selectedProject]);

  // Listen for all users
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.warn("Limited user profile access:", error.message);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedProject) {
      setBugs([]);
      return;
    }
    const q = query(
      collection(db, 'bugs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bug[]);
    }, (error) => {
      console.error("Bugs listener error:", error);
    });
    return () => unsubscribe();
  }, [user, selectedProject]);

  const handleLogin = async (startTab?: typeof activeTab) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      if (startTab) setActiveTab(startTab);
      toast.success("Khởi động hệ thống thành công");
    } catch (error: any) {
      // Don't show error if user just closed the popup
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Lỗi đăng nhập:", error);
      toast.error("Không thể khởi động hệ thống. Vui lòng thử lại.");
    }
  };

  const handleLogout = () => auth.signOut();

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  // Listen for project logs (used for notifications too)
  useEffect(() => {
    if (!user || !selectedProject) return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("Project logs listener failed:", error);
    });
    return () => unsubscribe();
  }, [user, selectedProject, activeTab]);

  useEffect(() => {
    if (projectLogs.length > 0) {
      const latest = projectLogs[0];
      const logMsg = `[${new Date().toLocaleTimeString()}] TRUY XUẤT: ${latest.action} - ${latest.details}`;
      setTerminalLogs(prev => {
        if (prev[0] === logMsg) return prev;
        return [logMsg, ...prev].slice(0, 50);
      });
    }
  }, [projectLogs]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'Industrial Bug Tracking Space',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      toast.success(`SYSTEM_INIT: Project '${newProjectName}' deployed.`, {
        description: `Ref: ${docRef.id}`,
      });
      setNewProjectName('');
      setShowProjectModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("DEPLOYMENT_FAILED: Error initializing project node.");
    }
  };

  const handleInviteMember = async () => {
    if (!user || !selectedProject || !inviteEmail.trim()) return;
    
    // Find user profile by email
    const targetUser = userProfiles.find(p => p.email.toLowerCase() === inviteEmail.toLowerCase().trim());
    
    if (!targetUser) {
      toast.error("Không tìm thấy người dùng với email này.");
      return;
    }
    
    if (selectedProject.members.includes(targetUser.userId)) {
      toast.error("Người dùng này đã là thành viên.");
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const newMembers = [...selectedProject.members, targetUser.userId];
      await setDoc(projectRef, { members: newMembers }, { merge: true });
      
      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        userId: user.uid,
        action: 'INVITE',
        details: `Đã mời ${targetUser.displayName} tham gia dự án`,
        createdAt: serverTimestamp()
      });

      toast.success(`Đã thêm ${targetUser.displayName} vào dự án.`);
      setInviteEmail('');
    } catch (error) {
      handleFirestoreError(error, 'update', 'projects');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !selectedProject || memberId === selectedProject.ownerId) return;

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const newMembers = selectedProject.members.filter(m => m !== memberId);
      await setDoc(projectRef, { members: newMembers }, { merge: true });
      
      const targetUser = userProfiles.find(p => p.userId === memberId);

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        userId: user.uid,
        action: 'REMOVE_MEMBER',
        details: `Đã xóa ${targetUser?.displayName || memberId} khỏi dự án`,
        createdAt: serverTimestamp()
      });

      toast.success("Đã xóa thành viên.");
    } catch (error) {
      handleFirestoreError(error, 'update', 'projects');
    }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    setIsUpdatingProject(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { 
        name: selectedProject.name,
        description: selectedProject.description || ''
      }, { merge: true });
      toast.success("Đã cập nhật dự án.");
    } catch (error) {
      handleFirestoreError(error, 'update', 'projects');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
  }, [selectedProject]);

  const handleDeleteProject = async () => {
    if (!user || !selectedProject) return;

    try {
      toast.info("Yêu cầu xóa dự án đang được xử lý...");
      const projectRef = doc(db, 'projects', selectedProject.id);
      await deleteDoc(projectRef); 
      
      toast.success("Dự án đã được xóa.");
      setSelectedProject(null);
      setActiveTab('board');
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, 'delete', 'projects');
    }
  };

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center font-mono text-[#FACC15] overflow-hidden relative">
        <div className="fixed inset-0 pointer-events-none opacity-20">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)] z-10" />
           <div className="grid grid-cols-20 gap-1">
              {Array.from({ length: 400 }).map((_, i) => (
                <div key={i} className="text-[10px] opacity-10 animate-pulse" style={{ animationDelay: `${Math.random() * 5}s` }}>
                  {Math.random() > 0.5 ? '1' : '0'}
                </div>
              ))}
           </div>
        </div>

        <div className="mb-16 relative p-16 border border-[#FACC15]/20 bg-white/[0.02] backdrop-blur-3xl shadow-[0_0_100px_rgba(250,204,21,0.05)]" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}>
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Zap size={100} className="fill-current glow-text-amber" />
          </motion.div>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#FACC15] text-black text-[10px] font-bold tracking-[0.5em] uppercase">INIT_OPERATIONS_v3.5</div>
        </div>

        <div className="space-y-6 text-center z-10">
           <div className="w-96 h-[2px] bg-white/5 relative overflow-hidden">
             <motion.div 
               className="absolute top-0 left-0 h-full bg-[#FACC15] shadow-[0_0_20px_#FACC15]"
               initial={{ width: 0 }} animate={{ width: "100%" }}
               transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
             />
           </div>
           <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.8em] text-[#FACC15]/60">SYNCHRONIZING_NODE_TRAIL...</div>
              <div className="text-[9px] font-mono text-white/10 uppercase tracking-widest flex items-center justify-center gap-4">
                 <span>SECURE_SHELL_ENABLED</span>
                 <span className="w-1 h-1 bg-[#FACC15] rounded-full animate-ping" />
                 <span>ELITE_ACCESS_LEVEL_5</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tech-mesh text-[#E2E8F0] font-sans flex flex-col">
      <Toaster position="top-right" richColors theme="dark" />
      
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="absolute inset-0 atmospheric-nebula opacity-10" />
        <div className="scanline" />
        <div className="scanning-laser" />
        <div className="heavy-grain" />
      </div>

      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            className="w-full min-h-screen relative z-10 flex flex-col overflow-x-hidden"
          >
            {/* Immersive Background Nodes */}
            <div className="fixed inset-0 pointer-events-none z-0">
               <div 
                 className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00F0FF]/10 blur-[120px] rounded-full animate-pulse" 
                 style={{ animationDuration: '10s' }}
               />
               <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full" />
            </div>

            <motion.div 
              animate={{ 
                x: mousePos.x - 250,
                y: mousePos.y - 250,
              }}
              transition={{ type: "spring", damping: 50, stiffness: 20, mass: 1 }}
              className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#00F0FF]/5 blur-[100px] rounded-full pointer-events-none z-0 opacity-50"
            />
            
            {/* Hyper-Industrial Asymmetrical Header */}
            <header className="fixed top-0 w-full h-24 flex items-center justify-between px-10 md:px-20 z-[100] border-b border-white/[0.05] bg-black/80 backdrop-blur-3xl">
               <div className="flex items-center gap-24">
                  <div className="flex items-center gap-6 cursor-pointer group">
                     <div className="relative w-12 h-12 bg-white text-black flex items-center justify-center transition-all duration-700 group-hover:bg-[#FACC15] group-hover:rotate-45" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}>
                        <Zap size={22} className="fill-current" />
                     </div>
                     <span className="text-2xl font-display font-extrabold tracking-[-0.08em] text-white leading-none">TQ_PRO_v3.5</span>
                  </div>
                  <nav className="hidden xl:flex items-center gap-12">
                     <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">Cấp độ Truy cập</span>
                        <span className="text-[10px] font-mono font-black text-[#FACC15] tracking-[0.2em] uppercase">LEVEL_04_CLEARANCE</span>
                     </div>
                     <div className="h-8 w-[1px] bg-white/10" />
                     <div className="flex gap-8">
                       {[
                         { label: 'HẠ TẦNG', action: () => setShowNetworkStats(true) },
                         { label: 'HƯỚNG DẪN', action: () => setShowGuide(true) },
                         { label: 'BẢO MẬT', action: () => toast.info("Hệ thống tường lửa đang ở mức tối đa.") }
                       ].map(item => (
                         <button 
                           key={item.label} 
                           onClick={item.action}
                           className="text-[9px] font-mono font-bold text-white/40 tracking-[0.3em] hover:text-[#FACC15] transition-all relative group uppercase cursor-pointer"
                         >
                           {item.label}
                           <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#FACC15] transition-all group-hover:w-full" />
                         </button>
                       ))}
                     </div>
                  </nav>
               </div>
               
               <div className="flex items-center gap-12">
                  <div className="hidden md:flex flex-col items-end">
                     <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">Trạng thái Đồng bộ</span>
                     <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-mono font-bold text-emerald-500">LIVE_CONNECTION</span>
                     </div>
                  </div>
                  <button onClick={handleLogin} className="btn-cyber">
                    KHỞI CHẠY HỆ THỐNG_
                  </button>
               </div>
            </header>

            {/* Cinematic Hero composition */}
            <div className="w-full flex flex-col items-center pt-72 pb-64 relative z-10 overflow-hidden">
               {/* Vertical Decorative Elements */}
               <div className="absolute left-[5%] top-0 h-full w-[1px] bg-white/[0.03] hidden xl:block" />
               <div className="absolute left-[5.5%] top-40 vertical-label">GIAO THỨC_ĐÃ_THIẾT_LẬP</div>
               <div className="absolute right-[5%] top-0 h-full w-[1px] bg-white/[0.03] hidden xl:block" />
               <div className="absolute right-[5.5%] top-80 vertical-label text-[#FACC15]">KẾT_NỐI_ỔN_ĐỊNH_99.9</div>

               <motion.div 
                 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                 className="px-8 py-3 bg-white/[0.03] border border-white/10 mb-16 flex items-center gap-4"
                 style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
               >
                 <div className="w-2 h-2 bg-[#FACC15] shadow-[0_0_15px_#FACC15]" />
                 <div className="relative mb-12">
                  <div className="absolute inset-0 bg-[#FACC15]/5 blur-[80px] rounded-full" />
                  <h1 className="text-[6rem] md:text-[10rem] font-sans font-black tracking-[-0.1em] text-white leading-[0.8] relative z-10 uppercase text-center">
                    ELITE<span className="text-[#FACC15]">.</span>OS
                  </h1>
               </div>
               </motion.div>

               {/* Tactical Grid Visualization - Compacted */}
               <div className="w-full max-w-5xl h-[280px] mb-16 relative px-10 group mt-4">
                  <div className="absolute inset-0 border border-white/5 rounded-[32px] bg-white/[0.01] backdrop-blur-sm" style={{ maskImage: 'radial-gradient(circle at center, black, transparent 80%)' }} />
                  
                  <svg className="w-full h-full opacity-30">
                     <defs>
                        <pattern id="grid-dots-small" width="30" height="30" patternUnits="userSpaceOnUse">
                           <circle cx="1.5" cy="1.5" r="0.5" fill="white" fillOpacity="0.1" />
                        </pattern>
                     </defs>
                     <rect width="100%" height="100%" fill="url(#grid-dots-small)" />
                  </svg>
                  
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6 w-full max-w-xl text-center">
                     <p className="text-sm md:text-base font-mono text-white/20 uppercase tracking-[0.4em] leading-relaxed">
                        Hệ thống <span className="text-white/40">Quản trị Tác vụ</span> & <span className="text-[#FACC15]">Tối ưu hóa</span> Dự án.
                     </p>
                     
                     <div className="flex gap-4">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-medium text-emerald-500/60 font-mono tracking-widest uppercase">Mã hóa Live</div>
                        <div className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-medium text-[#FACC15]/60 font-mono tracking-widest uppercase">Lõi Elite</div>
                     </div>
                  </div>
               </div>

               {/* Operational Dashboard - Balanced Bento Grid */}
               <div className="w-full max-w-6xl px-10 grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Main Access Node - Expanded */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-8 bg-white/[0.02] border border-white/5 rounded-3xl p-10 relative overflow-hidden group min-h-[340px] flex flex-col justify-between"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#FACC15]/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="flex flex-col gap-12 relative z-10">
                       <div className="flex justify-between items-start">
                          <div className="space-y-1.5">
                             <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.4em]">Hệ Thống Trực Tuyến</span>
                             </div>
                             <h3 className="text-5xl font-display font-black text-white tracking-tighter uppercase leading-none">TRUNG TÂM_ <br /><span className="text-[#FACC15]">ĐIỀU HÀNH</span></h3>
                          </div>
                       </div>

                       <div className="flex flex-wrap items-center gap-8">
                          <button 
                            onClick={() => handleLogin()}
                            className="h-14 px-12 bg-[#FACC15] text-black font-black text-[11px] uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group/btn relative overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.15)]"
                          >
                            KÍCH HOẠT QUYỀN TRUY CẬP_
                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                          
                          <div className="flex items-center gap-4">
                             <div className="flex -space-x-3">
                                {[...Array(3)].map((_, i) => (
                                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#05070a] bg-white/5 flex items-center justify-center overflow-hidden">
                                     <div className="w-full h-full bg-slate-800" />
                                  </div>
                                ))}
                             </div>
                             <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">+8 ADMIN ĐANG ONLINE</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex gap-6 mt-8 border-t border-white/5 pt-8 relative z-10">
                       <div className="flex items-center gap-2">
                          <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Node:</div>
                          <div className="text-[9px] font-mono text-white/60 font-bold">AS-SE-CORE-01</div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Latency:</div>
                          <div className="text-[9px] font-mono text-emerald-500 font-bold">14ms</div>
                       </div>
                    </div>
                  </motion.div>

                  {/* System Health Node */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-4 bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex flex-col justify-between group overflow-hidden"
                  >
                    <div className="flex justify-between items-center text-white/20">
                       <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]">Sức khỏe CPU</span>
                       <Activity size={16} />
                    </div>

                    <div className="h-32 flex items-end gap-1 px-1">
                       {[...Array(12)].map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [20, 100, 20, 60, 20].map(v => v + '%') }}
                            transition={{ duration: 1.5 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                            className="flex-1 bg-white/5 group-hover:bg-[#FACC15]/20 rounded-sm transition-colors"
                          />
                       ))}
                    </div>

                    <div className="space-y-1">
                       <div className="text-[9px] font-mono text-white/20 uppercase">Tải trọng hiện tại</div>
                       <div className="text-3xl font-display font-black text-white">42.8%</div>
                    </div>
                  </motion.div>

                  {/* Security Status - Row 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-4 bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex flex-col gap-6 group hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#FACC15]">
                       <Shield size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-display font-black text-white uppercase tracking-tight">Giao thức Bảo mật_</h4>
                       <p className="text-[10px] font-mono text-white/30 uppercase mt-1 leading-relaxed">Mã hóa Quantum-Link kích hoạt. Cấp độ bảo mật tối đa.</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                       <span className="text-[8px] font-mono text-emerald-500/60 uppercase font-black uppercase tracking-widest">ACTIVE PROTECT</span>
                    </div>
                  </motion.div>

                  {/* Core StorageNode - Row 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="md:col-span-4 bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex flex-col justify-between group"
                  >
                    <div className="flex justify-between items-center text-white/20">
                       <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]">Bộ nhớ Lõi</span>
                       <Cpu size={16} />
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-end">
                          <span className="text-3xl font-display font-black text-white">88.4%</span>
                          <span className="text-[9px] font-mono text-white/20 mb-2 font-bold uppercase tracking-widest">ĐÃ DÙNG</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: '88.4%' }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-white/30 group-hover:bg-[#FACC15] transition-colors"
                          />
                       </div>
                    </div>
                  </motion.div>

                  {/* Operational Feed - Row 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="md:col-span-4 bg-[#0A0C10] border border-white/5 rounded-3xl p-8 flex flex-col gap-4 overflow-hidden relative"
                  >
                    <div className="flex justify-between items-center relative z-10">
                       <span className="text-[9px] font-mono font-bold text-[#FACC15] uppercase tracking-widest">Hoạt động thời gian thực</span>
                       <div className="flex gap-1">
                          <div className="w-1 h-1 bg-[#FACC15] rounded-full animate-ping" />
                       </div>
                    </div>
                    <div className="space-y-3 relative z-10">
                       {[
                         { label: 'UPLINK', val: 'CONNECTED', color: 'text-emerald-500' },
                         { label: 'GATEWAY', val: 'SECURE', color: 'text-white/60' },
                         { label: 'DB_SYNC', val: 'IDLE', color: 'text-indigo-400' }
                       ].map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">{item.label}</span>
                            <span className={`text-[9px] font-mono font-black ${item.color} uppercase`}>{item.val}</span>
                         </div>
                       ))}
                    </div>
                  </motion.div>
               </div>

               {/* Live Terminal Feed */}
               <div className="mt-40 w-full max-w-6xl px-10">
                  <div className="border-t border-white/5 pt-8 flex items-start gap-12 overflow-hidden">
                     <div className="shrink-0 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#FACC15] rounded-full animate-pulse" />
                        <span className="text-[10px] font-mono font-black text-white uppercase tracking-widest">Global_Feed</span>
                     </div>
                     <div className="flex-1">
                        <motion.div 
                          animate={{ x: [0, -1000] }}
                          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                          className="flex gap-16 whitespace-nowrap"
                        >
                          {[
                            "SYS_CHECK::OK", "NODE_04_STABLE", "ENCRYPT_LAYER_7_ACTIVE", "SYNCING_WITH_FIREBASE_REALTIME",
                            "DB_QUOTA_88.4%_REMAINING", "USER_ADMIN_SIGNAL_STRENGTH_MAX", "LATENCY_44MS", "UPLINK_ESTABLISHED",
                            "TRUY CẬP HỆ THỐNG::THÀNH CÔNG", "DỮ LIỆU ĐANG ĐƯỢC BẢO MẬT", "PHIÊN BẢN v3.5.0.1", "TỐI ƯU HÓA LÕI::HOÀN TẤT"
                          ].map((log, i) => (
                            <span key={i} className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">{log}</span>
                          ))}
                        </motion.div>
                     </div>
                  </div>
               </div>

               {/* Mission Briefing Modal */}
               <AnimatePresence>
                 {showGuide && (
                   <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.9, y: 20 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 20 }}
                       className="w-full max-w-2xl bg-slate-900 border border-[#FACC15]/20 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(250,204,21,0.05)]"
                     >
                       <div className="px-8 py-6 bg-[#FACC15]/5 border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-[#FACC15]">
                             <Shield size={20} />
                           </div>
                           <div>
                             <h4 className="text-sm font-bold text-white uppercase tracking-widest">HƯỚNG DẪN NHIỆM VỤ</h4>
                             <p className="text-[9px] font-mono text-[#FACC15]/60 uppercase tracking-tighter">Gia nhập hệ thống Elite v3.5</p>
                           </div>
                         </div>
                         <button onClick={() => setShowGuide(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                           <X size={16} />
                         </button>
                       </div>
                       
                       <div className="p-8 space-y-10">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-4">
                             <h5 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                               <LayoutGrid size={12} className="text-[#FACC15]" />
                               01. Quản lý Bảng
                             </h5>
                             <p className="text-xs text-white/50 leading-relaxed font-mono uppercase">
                               Kéo thả các thẻ Bug qua các trạng thái: Chờ xử lý, Đang thực hiện và Đã hoàn thành.
                             </p>
                           </div>
                           <div className="space-y-4">
                             <h5 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                               <Plus size={12} className="text-[#FACC15]" />
                               02. Khởi tạo Bug
                             </h5>
                             <p className="text-xs text-white/50 leading-relaxed font-mono uppercase">
                               Gán mức độ ưu tiên: Thấp, Cao hoặc Nghiêm trọng để đội ngũ xử lý kịp thời.
                             </p>
                           </div>
                           <div className="space-y-4">
                             <h5 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                               <Cpu size={12} className="text-[#FACC15]" />
                               03. Tương tác AI
                             </h5>
                             <p className="text-xs text-white/50 leading-relaxed font-mono uppercase">
                               Hệ thống tự động phân tích và gán nhãn cho các báo cáo lỗi dựa trên dữ liệu lịch sử.
                             </p>
                           </div>
                           <div className="space-y-4">
                             <h5 className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                               <Activity size={12} className="text-[#FACC15]" />
                               04. Nhật ký Thực tế
                             </h5>
                             <p className="text-xs text-white/50 leading-relaxed font-mono uppercase">
                               Mọi hành động đều được lưu vết trong thời gian thực tại bảng điều khiển trung tâm.
                             </p>
                           </div>
                         </div>

                         <div className="pt-8 border-t border-white/5">
                           <button 
                             onClick={() => setShowGuide(false)}
                             className="w-full h-14 bg-[#FACC15] text-black font-black text-xs uppercase rounded-2xl hover:scale-[1.01] transition-all active:scale-95 shadow-xl shadow-[#FACC15]/10"
                           >
                             TÔI ĐÃ HIỂU NHIỆM VỤ_
                           </button>
                         </div>
                       </div>
                     </motion.div>
                   </div>
                 )}
               </AnimatePresence>

               {/* Network Infrastructure Modal */}
               <AnimatePresence>
                 {showNetworkStats && (
                   <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.9, y: 20 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 20 }}
                       className="w-full max-w-xl bg-slate-900 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.05)]"
                     >
                       <div className="px-8 py-6 bg-emerald-500/5 border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                             <Globe size={20} />
                           </div>
                           <div>
                             <h4 className="text-sm font-bold text-white uppercase tracking-widest">HẠ TẦNG CHIẾN DỊCH</h4>
                             <p className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-tighter">Trạng thái mạng lưới toàn cầu</p>
                           </div>
                         </div>
                         <button onClick={() => setShowNetworkStats(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                           <X size={16} />
                         </button>
                       </div>
                       
                       <div className="p-8 space-y-8">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Băng thông</div>
                             <div className="text-lg font-mono font-bold text-white">1.2 GB/s</div>
                           </div>
                           <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Độ trễ</div>
                             <div className="text-lg font-mono font-bold text-emerald-500">24ms</div>
                           </div>
                           <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Nút mạng</div>
                             <div className="text-lg font-mono font-bold text-white">ACTIVE: 12</div>
                           </div>
                           <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Mã hóa</div>
                             <div className="text-lg font-mono font-bold text-white">AES-256</div>
                           </div>
                         </div>

                         <div className="space-y-3">
                           <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase">
                             <span>Tải trọng máy chủ</span>
                             <span className="text-emerald-500">42%</span>
                           </div>
                           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-[42%] rounded-full animate-pulse" />
                           </div>
                         </div>

                         <div className="pt-4">
                           <button 
                             onClick={() => setShowNetworkStats(false)}
                             className="w-full h-12 bg-white/5 border border-white/10 text-white/60 font-bold text-[10px] uppercase rounded-xl hover:bg-white/10 transition-all"
                           >
                             QUAY LẠI GIAO DIỆN CHÍNH_
                           </button>
                         </div>
                       </div>
                     </motion.div>
                   </div>
                 )}
               </AnimatePresence>
            </div>

            {/* Industrial Feature Matrix */}
            <div className="w-full max-w-7xl mx-auto px-10 pb-64 relative z-10">
               <div className="flex flex-col gap-24">
                  <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/5 pb-12">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#FACC15] rounded-full animate-pulse" />
                           <span className="text-[10px] font-mono font-black text-white uppercase tracking-[0.5em]">HỆ SINH THÁI NODE</span>
                        </div>
                        <h2 className="text-6xl font-display font-black text-white tracking-tighter uppercase whitespace-nowrap">HẠ TẦNG <br /><span className="text-white/20">SIÊU CẤP.</span></h2>
                     </div>
                     <p className="text-sm font-mono text-white/30 max-w-sm uppercase leading-relaxed text-right">
                        Được trang bị các giao thức xử lý song song, đảm bảo tính vẹn toàn của dữ liệu trên toàn bộ mạng lưới phân tán.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 overflow-hidden rounded-[32px]">
                     {[
                       { label: 'THIẾT LẬP', title: 'FAST_SYNC', desc: 'Đồng bộ hóa 24ms liên khu vực.', icon: <Zap />, node: '001', color: '#FACC15' },
                       { label: 'AN NINH', title: 'SSL_ELITE', desc: 'Mã hóa lượng tử đa lớp.', icon: <ShieldAlert />, node: '002', color: '#818CF8' },
                       { label: 'QUẢN TRỊ', title: 'TASK_GRID', desc: 'Ma trận tác vụ đa tầng.', icon: <LayoutGrid />, node: '003', color: '#10B981' },
                       { label: 'GIAO THỨC', title: 'API_OPEN', desc: 'Kết nối node không giới hạn.', icon: <Code2 />, node: '004', color: '#F43F5E' }
                     ].map((item, i) => (
                       <motion.div 
                         key={i} 
                         whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                         className="bg-slate-950 p-12 flex flex-col gap-12 relative group min-h-[400px]"
                       >
                          <div className="flex justify-between items-start">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:scale-110 group-hover:border-white/20 transition-all duration-500">
                                {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                             </div>
                             <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">NODE_{item.node}</span>
                          </div>

                          <div className="space-y-4">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.4em] mb-2" style={{ color: item.color }}>{item.label}</span>
                                <h4 className="text-3xl font-display font-black text-white tracking-tight group-hover:translate-x-1 transition-transform">{item.title}</h4>
                             </div>
                             <p className="text-xs font-mono text-white/30 uppercase leading-relaxed tracking-tight">{item.desc}</p>
                          </div>

                          <div className="mt-auto pt-12 border-t border-white/5 flex items-center justify-between">
                             <div className="flex gap-1">
                                {[...Array(3)].map((_, j) => (
                                   <div key={j} className="w-3 h-1 bg-white/10 rounded-full" />
                                ))}
                             </div>
                             <div className="text-[8px] font-mono text-white/10 uppercase">STATUS::NOMINAL</div>
                          </div>

                          {/* Hover Accent */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       </motion.div>
                     ))}
                  </div>
               </div>
            </div>

            <footer className="w-full py-20 px-8 border-t border-white/5">
               <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-3">
                     <Zap size={18} className="text-[#00F0FF]" />
                     <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-[0.2em]">© 2026 NGUYỄN ĐỨC ANH_</span>
                  </div>
                  <div className="flex gap-10 text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
                     <a href="#" className="hover:text-white transition-colors">Twitter</a>
                     <a href="#" className="hover:text-white transition-colors">GitHub</a>
                     <a href="#" className="hover:text-white transition-colors">Security</a>
                  </div>
               </div>
            </footer>
          </motion.div>
        ) : (
          <div className={cn(
            "flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0f18] relative",
            jitter && "brightness-110"
          )}>
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.02]">
                <div className="absolute inset-0 cyber-grid" />
            </div>

            <header className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/5 bg-slate-950/80 backdrop-blur-md z-[100] relative">
              <div className="flex items-center gap-10 relative z-10">
                <div 
                  className="flex items-center gap-3 cursor-pointer group" 
                  onClick={() => setActiveTab('board')}
                >
                  <div className="w-9 h-9 bg-[#FACC15] text-black flex items-center justify-center rounded-lg">
                    <Zap size={18} className="fill-current" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-lg font-mono font-black text-white tracking-widest leading-none uppercase">VORTEX</span>
                     <span className="text-[8px] font-mono text-[#FACC15] tracking-[0.3em] uppercase opacity-60">System Ready</span>
                  </div>
                </div>

                <div className="h-6 w-[1px] bg-white/10 hidden lg:block" />

                <div className="relative hidden lg:block">
                  <button 
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className={cn(
                      "flex items-center gap-3 px-4 h-10 bg-white/[0.03] border border-white/10 rounded-lg transition-all font-mono font-bold text-[10px] tracking-wider uppercase",
                      showProjectDropdown ? "border-[#FACC15] text-[#FACC15]" : "text-white/40 hover:border-white/20"
                    )}
                  >
                    <FolderKanban size={14} className="opacity-40" />
                    <span className="truncate max-w-[120px]">{selectedProject?.name || 'Chọn Dự Án'}</span>
                    <ChevronDown size={12} className={cn("transition-transform", showProjectDropdown && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {showProjectDropdown && (
                      <div className="absolute top-12 left-0 w-72 z-[200]">
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="p-2 rounded-xl bg-slate-900 border border-white/10 shadow-2xl"
                        >
                           <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-1">
                             {projects.map(p => (
                               <button 
                                 key={p.id}
                                 onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }}
                                 className={cn(
                                   "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all",
                                   selectedProject?.id === p.id 
                                     ? "bg-[#FACC15]/10 text-[#FACC15]" 
                                     : "text-white/40 hover:bg-white/5 hover:text-white"
                                 )}
                               >
                                 <span className="text-[10px] font-mono font-bold uppercase">{p.name}</span>
                               </button>
                             ))}
                           </div>
                           <button 
                             onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }}
                             className="w-full mt-2 py-2.5 bg-white/5 text-white/60 text-[10px] font-bold uppercase rounded-lg hover:bg-[#FACC15] hover:text-black transition-all"
                           >
                             Tạo Dự Án Mới
                           </button>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end hidden lg:flex">
                    <span className="text-[11px] font-mono font-bold text-white/90">{user.displayName || user.email?.split('@')[0]}</span>
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest leading-none">Admin</span>
                  </div>
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center transition-all relative",
                        showNotifications ? "text-[#FACC15]" : "text-white/30 hover:text-white"
                      )}
                    >
                      <Bell size={18} />
                      {projectLogs.length > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-600 rounded-full border border-slate-950 animate-pulse" />
                      )}
                    </button>

                    <AnimatePresence>
                      {showNotifications && (
                        <>
                          <div 
                            className="fixed inset-0 z-[190]" 
                            onClick={() => setShowNotifications(false)}
                          />
                          <div className="absolute top-12 right-0 w-80 z-[200]">
                            <motion.div 
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              className="bg-slate-900 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                            >
                              <div className="px-5 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                                <span className="text-[10px] font-mono font-black text-white uppercase tracking-widest">Trung tâm Thông báo</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-[#FACC15] rounded-full animate-pulse" />
                                  <span className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">Live Sync</span>
                                </div>
                              </div>
                              <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2 space-y-1 bg-slate-950/40">
                                {projectLogs.length === 0 ? (
                                  <div className="p-12 text-center">
                                    <Bell size={24} className="mx-auto text-white/5 mb-3" />
                                    <div className="text-white/10 font-mono text-[9px] uppercase tracking-widest">Không có dữ liệu mới</div>
                                  </div>
                                ) : (
                                  projectLogs.slice(0, 8).map((log) => (
                                    <div key={log.id} className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all group cursor-default">
                                      <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 bg-[#FACC15]/40 rounded-full mt-1.5 shrink-0 group-hover:bg-[#FACC15] transition-colors" />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[10px] font-bold text-white/80 leading-snug uppercase tracking-tight line-clamp-2">{log.action}: {log.details}</div>
                                          <div className="text-[8px] font-mono text-white/20 uppercase mt-1">
                                            {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="p-3 bg-white/5 border-t border-white/10">
                                <button 
                                  onClick={() => { setActiveTab('logs'); setShowNotifications(false); }}
                                  className="w-full py-2 bg-white/5 rounded-lg text-[9px] font-mono text-white/40 uppercase font-black hover:text-white hover:bg-white/10 transition-all"
                                >
                                  Mở nhật ký đầy đủ
                                </button>
                              </div>
                            </motion.div>
                          </div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-9 h-9 flex items-center justify-center text-red-500/60 hover:text-red-400 transition-all"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative bg-[#06080c]">
              <nav className="w-16 lg:w-60 border-r border-white/5 flex flex-col p-3 gap-1 bg-slate-950/40 backdrop-blur-md z-20">
                 <NavButton icon={LayoutGrid} label="BẢNG CÔNG VIỆC" active={activeTab === 'board'} onClick={() => setActiveTab('board')} />
                 <NavButton icon={Terminal} label="TERMINAL" active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
                 <NavButton icon={Activity} label="HOẠT ĐỘNG" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                 <NavButton icon={PieChart} label="THỐNG KÊ" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
                 
                 <div className="mt-6 mb-1 px-4 text-[8px] font-mono font-bold text-white/10 uppercase tracking-widest hidden lg:block">System</div>
                 <NavButton icon={Users} label="THÀNH VIÊN" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
                 <NavButton icon={Settings} label="CÀI ĐẶT" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
              </nav>

              <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {!selectedProject ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center relative"
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#818CF8]/5 blur-[120px] rounded-full pointer-events-none" />
                      
                      <div className="w-40 h-40 cyber-panel flex items-center justify-center mb-16 relative group" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)' }}>
                        <div className="absolute inset-0 bg-[#FACC15]/5 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                        <FolderKanban size={56} className="text-[#FACC15] relative z-10" />
                      </div>
                      
                      <h2 className="text-6xl font-display font-bold mb-8 text-white tracking-tighter uppercase italic">KHÔNG_TÌM_THẤY_NÚT.</h2>
                      <p className="text-white/20 max-w-sm mx-auto mb-16 font-mono font-medium leading-relaxed tracking-tight">
                        TRÌNH ĐIỀU KHIỂN CHƯA ĐƯỢC LIÊN KẾT VỚI DỮ LIỆU. VUI LÒNG KHỞI TẠO MA TRẬN MỚI ĐỂ BẮT ĐẦU.
                      </p>
                      <button 
                        onClick={() => setShowProjectModal(true)}
                        className="btn-cyber h-20 px-16"
                      >
                        KHỞI_TẠO_MA_TRẬN_MỚI_
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {activeTab === 'board' && <KanbanBoard key={selectedProject.id} projectId={selectedProject.id} userId={user.uid} userProfiles={userProfiles} bugs={bugs} />}
                      
                      {activeTab === 'logs' && (
                        <div className="flex-1 p-8 overflow-auto custom-scrollbar max-w-6xl mx-auto w-full">
                           <div className="flex items-center gap-6 mb-12">
                              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#FACC15]">
                                 <Activity size={24} />
                              </div>
                              <div>
                                 <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tight">Hoạt Động</h2>
                                 <p className="text-white/20 text-sm font-mono tracking-tight mt-1">Dữ liệu vận hành thời gian thực.</p>
                              </div>
                           </div>
                           <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/20 backdrop-blur-sm">
                              <table className="w-full text-left">
                                 <thead className="bg-white/5 text-white/30 text-[9px] font-mono font-bold uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                       <th className="px-6 py-5">Thời Gian</th>
                                       <th className="px-6 py-5">Sự Kiện</th>
                                       <th className="px-6 py-5">Chi Tiết</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-white/[0.03] text-sm">
                                    {projectLogs.length === 0 ? (
                                       <tr><td colSpan={3} className="px-6 py-20 text-center text-white/10 font-mono text-xs italic">Không có dữ liệu</td></tr>
                                    ) : projectLogs.map((log) => (
                                       <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                                          <td className="px-6 py-5 text-white/30 font-mono text-xs">
                                             {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString('vi-VN') : '--:--:--'}
                                          </td>
                                          <td className="px-6 py-5">
                                             <span className="px-2.5 py-1 bg-[#FACC15]/10 text-[#FACC15] text-[10px] font-mono font-bold rounded-lg uppercase">{log.action}</span>
                                          </td>
                                          <td className="px-6 py-5 text-white/60 font-mono text-xs tracking-tight">[{log.details}]</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                      )}
                      
                      {activeTab === 'metrics' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="flex-1 p-8 overflow-auto custom-scrollbar max-w-6xl mx-auto w-full"
                        >
                           <div className="flex items-center gap-6 mb-12">
                              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#FACC15]">
                                 <PieChart size={24} />
                              </div>
                              <div>
                                 <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tight">Thống Kê</h2>
                                 <p className="text-white/20 text-sm font-mono tracking-tight mt-1">Phân tích ma trận dự án hiện tại.</p>
                              </div>
                           </div>
                           
                           <div className="space-y-10">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                 {[
                                   { label: 'Tổng Tác Vụ', val: bugs.length, color: 'text-white' },
                                   { label: 'Đang Xử Lý', val: bugs.filter(b => b.status === 'in-progress' || b.status === 'in-review').length, color: 'text-blue-400' },
                                   { label: 'Hoàn Thành', val: bugs.length > 0 ? Math.round((bugs.filter(b => b.status === 'done').length / bugs.length) * 100) : 0, unit: '%', color: 'text-emerald-400' },
                                   { label: 'Khẩn Cấp', val: bugs.filter(b => b.priority === 'critical').length, color: 'text-red-500' },
                                 ].map((s, i) => (
                                   <div key={i} className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-colors">
                                      <div className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-[0.2em] mb-3">{s.label}</div>
                                      <div className={cn("text-4xl font-mono font-black", s.color)}>
                                        {s.val}{s.unit}
                                      </div>
                                   </div>
                                 ))}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col min-h-[450px]">
                                    <label className="text-[11px] font-mono font-bold text-[#FACC15] tracking-[0.3em] uppercase mb-10 block opacity-60">Trạng Thái Xử Lý</label>
                                    <div className="flex-1 min-h-[300px]">
                                       <ResponsiveContainer width="100%" height="100%">
                                          <BarChart data={[
                                             { name: 'BACKLOG', value: bugs.filter(b => b.status === 'backlog').length },
                                             { name: 'ACTION', value: bugs.filter(b => b.status === 'in-progress').length },
                                             { name: 'REVIEW', value: bugs.filter(b => b.status === 'in-review').length },
                                             { name: 'DONE', value: bugs.filter(b => b.status === 'done').length },
                                          ]}>
                                             <XAxis dataKey="name" stroke="#ffffff10" fontSize={10} tick={{ fill: '#ffffff30' }} axisLine={false} tickLine={false} />
                                             <YAxis stroke="#ffffff10" fontSize={10} tick={{ fill: '#ffffff30' }} axisLine={false} tickLine={false} />
                                             <Tooltip 
                                                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', padding: '12px' }}
                                                itemStyle={{ color: '#FACC15', fontFamily: 'monospace', fontWeight: 'bold' }}
                                             />
                                             <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                <Cell fill="#475569" />
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#a855f7" />
                                                <Cell fill="#10b981" />
                                             </Bar>
                                          </BarChart>
                                       </ResponsiveContainer>
                                    </div>
                                 </div>

                                 <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col min-h-[450px] relative">
                                    <label className="text-[11px] font-mono font-bold text-[#FACC15] tracking-[0.3em] uppercase mb-10 block opacity-60">Mức Độ Ưu Tiên</label>
                                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                                       <ResponsiveContainer width="100%" height="100%">
                                          <RePieChart>
                                             <Pie
                                                data={[
                                                   { name: 'KHẨN CẤP', value: bugs.filter(b => b.priority === 'critical').length },
                                                   { name: 'TIÊU CHUẨN', value: bugs.length - bugs.filter(b => b.priority === 'critical').length }
                                                ]}
                                                cx="50%" cy="50%"
                                                innerRadius={80}
                                                outerRadius={110}
                                                paddingAngle={10}
                                                dataKey="value"
                                                stroke="none"
                                             >
                                                <Cell fill="#ef4444" />
                                                <Cell fill="#1e293b" />
                                             </Pie>
                                             <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                                             />
                                          </RePieChart>
                                       </ResponsiveContainer>
                                       <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-12">
                                          <span className="text-5xl font-mono font-black text-white">{bugs.filter(b => b.priority === 'critical').length}</span>
                                          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] mt-1">Crits</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                      )}

                      {activeTab === 'terminal' && (
                        <div className="flex-1 p-8 overflow-hidden flex flex-col max-w-6xl mx-auto w-full">
                           <div className="flex items-center gap-6 mb-8 shrink-0">
                              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#FACC15]">
                                 <Terminal size={24} />
                              </div>
                              <div>
                                 <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tight">Hệ Thống Terminal</h2>
                                 <p className="text-white/20 text-sm font-mono tracking-tight mt-1">Giao diện dòng lệnh trung tâm.</p>
                              </div>
                           </div>
                           
                           <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[11px] overflow-auto custom-scrollbar-mono flex flex-col-reverse">
                              <div className="space-y-2">
                                 {terminalLogs.length === 0 ? (
                                    <div className="text-[#FACC15]/40 animate-pulse">ĐANG CHỜ TÍN HIỆU TỪ HỆ THỐNG...</div>
                                 ) : (
                                    terminalLogs.map((log, i) => (
                                       <motion.div 
                                         key={i} 
                                         initial={{ opacity: 0, x: -10 }} 
                                         animate={{ opacity: 1, x: 0 }}
                                         className={cn(
                                           "py-1 border-l-2 pl-3",
                                           i === 0 ? "border-[#FACC15] text-[#FACC15]" : "border-white/10 text-white/40"
                                         )}
                                       >
                                          {log}
                                       </motion.div>
                                    ))
                                 )}
                                 <div className="flex items-center gap-2 text-[#FACC15]">
                                    <span className="animate-pulse">_</span>
                                    <span>VORTEX-OS v3.5 READY</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}

                      {activeTab === 'members' && (
                        <div className="flex-1 p-8 overflow-auto custom-scrollbar max-w-4xl mx-auto w-full">
                           <div className="flex items-center gap-6 mb-12">
                              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#FACC15]">
                                 <Users size={24} />
                              </div>
                              <div>
                                 <h2 className="text-3xl font-mono font-bold text-white uppercase tracking-tight">Thành Viên</h2>
                                 <p className="text-white/20 text-sm font-mono tracking-tight mt-1">Quản lý đội ngũ phát triển.</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="md:col-span-1 space-y-6">
                                <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl">
                                   <h4 className="text-[10px] font-mono font-bold text-[#FACC15] tracking-[0.2em] uppercase mb-4">Mời Thành Viên</h4>
                                   <div className="space-y-4">
                                     <input 
                                       type="email" 
                                       placeholder="Email người dùng..."
                                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:border-[#FACC15]/40 outline-none"
                                       value={inviteEmail}
                                       onChange={(e) => setInviteEmail(e.target.value)}
                                     />
                                     <button 
                                       onClick={handleInviteMember}
                                       className="w-full py-3 bg-[#FACC15] text-black text-[11px] font-bold uppercase rounded-xl hover:scale-[1.02] transition-transform"
                                     >
                                       Gửi Lời Mời
                                     </button>
                                   </div>
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <div className="space-y-3">
                                  {selectedProject.members.map(memberId => {
                                    const profile = userProfiles.find(p => p.userId === memberId);
                                    const isOwner = memberId === selectedProject.ownerId;
                                    const isSelf = memberId === user.uid;

                                    return (
                                      <div key={memberId} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between group">
                                         <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                             <img src={profile?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${memberId}`} alt="" className="w-full h-full object-cover" />
                                           </div>
                                           <div>
                                             <div className="flex items-center gap-2">
                                               <span className="text-xs font-mono font-bold text-white">{profile?.displayName || "Đang tải..."}</span>
                                               {isOwner && <span className="text-[8px] font-mono bg-[#FACC15] text-black px-1.5 py-0.5 rounded font-bold">OWNER</span>}
                                               {isSelf && <span className="text-[8px] font-mono bg-white/10 text-white px-1.5 py-0.5 rounded font-bold">BẠN</span>}
                                             </div>
                                             <div className="text-[10px] font-mono text-white/20">{profile?.email || memberId}</div>
                                           </div>
                                         </div>
                                         {!isOwner && user.uid === selectedProject.ownerId && (
                                           <button 
                                             onClick={() => handleRemoveMember(memberId)}
                                             className="p-2 text-red-500 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                           >
                                             <Lock size={14} />
                                           </button>
                                         )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                           </div>
                        </div>
                      )}

                      {activeTab === 'settings' && (
                        <div className="flex-1 p-4 lg:p-10 overflow-auto custom-scrollbar">
                           <div className="max-w-6xl mx-auto space-y-8">
                              {/* Header & Quick Sync */}
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                                 <div>
                                    <h2 className="text-4xl font-sans font-black text-white tracking-tighter uppercase mb-2">Trung tâm Điều khiển</h2>
                                    <p className="text-white/30 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                       Máy chủ: stable-core-v4  /  Người dùng: {userProfiles.find(p => p.userId === user?.uid)?.displayName || 'Quản trị viên'}
                                    </p>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                       <div className="text-[10px] font-mono text-white/20 uppercase">Mã Dự án</div>
                                       <div className="text-xs font-mono text-white font-bold">{selectedProject.id.slice(0, 8)}</div>
                                    </div>
                                    {user.uid === selectedProject.ownerId && (
                                       <button 
                                         onClick={handleUpdateProject}
                                         disabled={isUpdatingProject}
                                         className="h-12 px-8 bg-[#FACC15] text-black font-black text-[11px] uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-[#FACC15]/10 flex items-center gap-2"
                                       >
                                          <Check size={14} />
                                          {isUpdatingProject ? "Đang lưu..." : "Đồng bộ cấu hình"}
                                       </button>
                                    )}
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                 {/* Left Column: Context & Stats */}
                                 <div className="lg:col-span-4 space-y-6">
                                    {/* Personal Card */}
                                    <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl relative overflow-hidden group">
                                       <div className="absolute top-0 right-0 w-32 h-32 bg-[#FACC15]/5 rounded-full -translate-y-16 translate-x-16 blur-3xl group-hover:bg-[#FACC15]/10 transition-colors" />
                                       <div className="relative z-10 flex flex-col items-center text-center">
                                          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10 mb-4 shadow-2xl">
                                             <img src={user?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.uid}`} alt="" className="w-full h-full object-cover" />
                                          </div>
                                          <h4 className="text-lg font-bold text-white mb-1">{userProfiles.find(p => p.userId === user?.uid)?.displayName}</h4>
                                          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{user?.email}</p>
                                          
                                          <div className="mt-6 pt-6 border-t border-white/5 w-full grid grid-cols-2 gap-4">
                                             <div className="text-left">
                                                <div className="text-[9px] font-mono text-white/20 uppercase mb-1">Dự án quản lý</div>
                                                <div className="text-xl font-mono font-bold text-white">{projects.filter(p => p.ownerId === user?.uid).length}</div>
                                             </div>
                                             <div className="text-left">
                                                <div className="text-[9px] font-mono text-white/20 uppercase mb-1">Tổng Bug xử lý</div>
                                                <div className="text-xl font-mono font-bold text-[#FACC15]">{bugs.length}</div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Project Health Index */}
                                    <div className="p-6 bg-slate-900/60 border border-white/5 rounded-3xl backdrop-blur-xl">
                                       <h5 className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                                          <Activity size={12} className="text-[#FACC15]" />
                                          Chỉ số dự án
                                       </h5>
                                       <div className="space-y-4">
                                          <div className="space-y-2">
                                             <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
                                                <span>Tiến độ hoàn thành</span>
                                                <span className="text-white">{bugs.length > 0 ? Math.round((bugs.filter(b => b.status === 'done').length / bugs.length) * 100) : 0}%</span>
                                             </div>
                                             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                   className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                                   style={{ width: `${bugs.length > 0 ? (bugs.filter(b => b.status === 'done').length / bugs.length) * 100 : 0}%` }}
                                                />
                                             </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 pt-4">
                                             <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Mức nghiêm trọng</div>
                                                <div className="text-sm font-mono font-bold text-red-500">{bugs.filter(b => b.priority === 'critical').length}</div>
                                             </div>
                                             <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                                                <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Đang chờ xử lý</div>
                                                <div className="text-sm font-mono font-bold text-white">{bugs.filter(b => b.status === 'todo').length}</div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Right Column: Main Configuration */}
                                 <div className="lg:col-span-8 space-y-8">
                                    <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                       <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-[#FACC15]/10 rounded-xl flex items-center justify-center text-[#FACC15]">
                                                <LayoutGrid size={20} />
                                             </div>
                                             <div>
                                                <h4 className="text-sm font-bold text-white">Tham số Dự án</h4>
                                                <p className="text-[10px] font-mono text-white/30 uppercase mt-0.5 tracking-tighter">Cấu hình thực thể: {selectedProject.name}</p>
                                             </div>
                                          </div>
                                          {user.uid !== selectedProject.ownerId && (
                                             <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                                <Lock size={10} className="text-red-500" />
                                                <span className="text-[9px] font-mono text-red-500 font-bold uppercase">Chỉ xem</span>
                                             </div>
                                          )}
                                       </div>
                                       
                                       <div className="p-8 space-y-8">
                                          <div className="space-y-3 px-1">
                                             <label className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest ml-1">Tên bí danh dự án</label>
                                             <input 
                                               type="text" 
                                               className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-base font-mono text-white focus:border-[#FACC15] outline-none transition-all placeholder:text-white/5"
                                               value={selectedProject.name}
                                               placeholder="Ví dụ: Hệ thống Alpha..."
                                               onChange={(e) => user.uid === selectedProject.ownerId && setSelectedProject({...selectedProject, name: e.target.value})}
                                               disabled={user.uid !== selectedProject.ownerId}
                                             />
                                          </div>

                                          <div className="space-y-3 px-1">
                                             <label className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest ml-1">Mục tiêu Chiến lược / Mô tả</label>
                                             <textarea 
                                               rows={5}
                                               className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-5 text-sm font-mono text-white focus:border-[#FACC15] outline-none transition-all resize-none leading-relaxed placeholder:text-white/5"
                                               value={selectedProject.description || ''}
                                               placeholder="Mô tả các mục tiêu kỹ thuật hoặc tầm nhìn của dự án..."
                                               onChange={(e) => user.uid === selectedProject.ownerId && setSelectedProject({...selectedProject, description: e.target.value})}
                                               disabled={user.uid !== selectedProject.ownerId}
                                             />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Danger Zone */}
                                    {user.uid === selectedProject.ownerId && (
                                       <div className="bg-red-600/5 border border-red-600/20 rounded-3xl p-8 group hover:bg-red-600/10 transition-colors duration-500">
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                             <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-red-500 uppercase tracking-tight flex items-center gap-2">
                                                   <ShieldAlert size={16} />
                                                   Giao thức Tiêu hủy Dữ liệu
                                                </h4>
                                                <p className="text-xs text-white/20 font-mono leading-relaxed max-w-sm uppercase">
                                                   Xóa vĩnh viễn thực thể dự án này khỏi Firestore. Mọi báo cáo lỗi và lịch sử sẽ bị tiêu hủy hoàn toàn.
                                                </p>
                                             </div>
                                             
                                             {!showDeleteConfirm ? (
                                                <button 
                                                  onClick={() => setShowDeleteConfirm(true)}
                                                  className="shrink-0 h-14 px-10 bg-transparent border border-red-500/30 text-red-500 text-[11px] font-black uppercase rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5 active:scale-95"
                                                >
                                                   Khởi tạo lệnh xóa
                                                </button>
                                             ) : (
                                                <div className="flex items-center gap-3">
                                                   <button 
                                                     onClick={() => setShowDeleteConfirm(false)}
                                                     className="h-14 px-6 bg-white/5 border border-white/10 text-white/40 text-[11px] font-bold uppercase rounded-2xl hover:text-white transition-all"
                                                   >
                                                      Hủy lệnh
                                                   </button>
                                                   <button 
                                                     onClick={handleDeleteProject}
                                                     className="h-14 px-10 bg-red-600 text-white text-[11px] font-black uppercase rounded-2xl animate-pulse shadow-2xl shadow-red-600/20 active:scale-95"
                                                   >
                                                      Xác nhận Xóa
                                                   </button>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProjectModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 p-10 rounded-3xl z-10 shadow-2xl"
            >
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 bg-[#FACC15] text-black rounded-2xl flex items-center justify-center">
                  <Plus size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-mono font-bold text-white uppercase tracking-tight">Tạo Dự Án</h3>
                  <p className="text-white/20 text-sm font-mono mt-1">Khởi tạo không gian làm việc mới.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                <div className="group">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/20 mb-3 block group-focus-within:text-[#FACC15] transition-colors">Tên Dự Án</label>
                  <input 
                    autoFocus type="text" value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nhập tên dự án..."
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-xl font-mono text-white focus:bg-white/10 focus:border-[#FACC15]/40 focus:outline-none transition-all placeholder:text-white/10 uppercase tracking-wider"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowProjectModal(false)} className="flex-1 h-14 text-[11px] font-mono font-bold text-white/30 hover:text-white transition-all uppercase tracking-widest">
                    Hủy Bỏ
                  </button>
                  <button 
                    onClick={handleCreateProject} disabled={!newProjectName.trim()}
                    className="btn-cyber flex-1 h-14"
                  >
                    Khởi Tạo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {user && <SystemOverlay />}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group mb-1",
        active ? "bg-[#FACC15] text-black shadow-lg" : "text-white/40 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon size={18} className={cn("transition-colors", active ? "text-black" : "opacity-50 group-hover:opacity-100")} />
      <span className="text-[11px] font-mono font-bold uppercase tracking-wider hidden lg:inline">{label}</span>
      {active && (
         <div className="absolute right-3 w-1 h-1 bg-black rounded-full" />
      )}
    </button>
  );
}

function SystemOverlay() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-12 bg-slate-950/80 backdrop-blur-3xl border border-white/5 rounded-2xl z-[200] flex items-center px-8 gap-10 shadow-2xl overflow-hidden group">
       {/* Background accent */}
       <div className="absolute inset-0 bg-[#FACC15]/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
       
       <div className="flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.2em]">CORE_STABLE</span>
       </div>
       
       <div className="h-4 w-[1px] bg-white/10" />
       
       <div className="flex-1 overflow-hidden">
          <motion.div 
            animate={{ x: [0, -400] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="flex gap-12 whitespace-nowrap"
          >
             {[
               "NODE_05::SYNC_OK", "CPU_LOAD::24%", "MEM_USAGE::1.4GB", "LATENCY::12MS", 
               "ENCRYPT_ACTIVE::AES-256", "HỆ_THỐNG_BẢO_MẬT::SẴN_SÀNG", "UPLINK::STABLE", 
               "DỮ_LIỆU_THỜI_GIAN_THỰC::ON", "PHIÊN_BẢN::v3.5.0", "HẠ_TẦNG::ELITE"
             ].map((stat, i) => (
                <span key={i} className="text-[9px] font-mono text-white/20 uppercase tracking-[0.1em]">{stat}</span>
             ))}
          </motion.div>
       </div>
       
       <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
       
       <div className="flex items-center gap-6 hidden md:flex shrink-0">
          <div className="flex items-center gap-3">
             <div className="text-[8px] font-mono text-white/20 uppercase">Network</div>
             <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#FACC15] w-[75%] rounded-full opacity-60" />
             </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-[8px] font-mono text-white/20 uppercase">Load</div>
             <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-[30%] rounded-full opacity-60" />
             </div>
          </div>
       </div>
    </div>
  );
}
