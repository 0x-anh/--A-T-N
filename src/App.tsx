/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Code2, Rocket, Layout, LayoutGrid, FolderKanban, PieChart, Zap, LogIn, LogOut, ShieldAlert, Bug, Activity, Cpu, Globe, Database, Terminal, FolderPlus, ChevronDown, ChevronRight, Users, Bell, Search, Plus, Filter, MessageSquare, History, Settings, Lock, CheckCircle2 } from "lucide-react";
import { auth, db, handleFirestoreError, testConnection } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp, where, orderBy, getDocFromServer, limit } from 'firebase/firestore';
import KanbanBoard from './components/KanbanBoard';
import { cn } from './lib/utils';
import { Project, UserProfile } from './types';

import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs'>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

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

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
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

  // Listen for project logs
  useEffect(() => {
    if (!user || !selectedProject || activeTab !== 'logs') return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, selectedProject, activeTab]);

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-mono text-black tech-grid-bg">
        <div className="mb-12 relative p-8 border-4 border-black bg-white shadow-[12px_12px_0px_0px_#000]">
          <Bug size={80} className="text-[#FF5F1F]" />
          <div className="absolute -top-3 -left-3 px-2 bg-black text-white text-[8px] font-bold tracking-[0.3em]">INIT_LOADER</div>
        </div>
        <div className="w-80 h-4 bg-white border-4 border-black relative overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-[#FF5F1F]"
            initial={{ width: 0 }} animate={{ width: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="mt-8 text-[12px] font-bold text-black uppercase tracking-[0.6em]">Protocol.Initialization...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen tech-grid-bg text-black font-sans selection:bg-black selection:text-[#FF5F1F] flex flex-col">
      <Toaster position="top-right" richColors theme="light" />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="w-full min-h-screen relative z-10 font-sans"
          >
            <motion.div 
              animate={{ 
                x: mousePos.x - 200,
                y: mousePos.y - 200,
              }}
              transition={{ type: "spring", damping: 50, stiffness: 40, mass: 1 }}
              className="fixed top-0 left-0 w-[400px] h-[400px] bg-[#FF5F1F]/5 blur-[120px] rounded-full pointer-events-none z-0"
            />
            
            {/* Protocol Navigation */}
            <header className="sticky top-0 w-full h-24 flex items-center justify-between px-8 md:px-16 z-[100] bg-white border-b-4 border-black">
               <div className="flex items-center gap-12">
                  <div className="flex items-center gap-4 cursor-pointer group">
                     <div className="w-12 h-12 bg-black text-white flex items-center justify-center transition-all group-hover:bg-[#FF5F1F] shadow-[4px_4px_0px_0px_#FF5F1F]">
                        <Rocket size={24} />
                     </div>
                     <span className="text-2xl font-black text-black tracking-tighter uppercase">Linearis.Protocol</span>
                  </div>
                  <nav className="hidden lg:flex gap-10 text-[11px] font-mono font-bold text-black uppercase tracking-[0.3em] opacity-40">
                     <a href="#" className="hover:opacity-100 transition-opacity underline decoration-[#FF5F1F] decoration-2 underline-offset-8">Infrastructure</a>
                     <a href="#" className="hover:opacity-100 transition-opacity">Archive_v2</a>
                     <a href="#" className="hover:opacity-100 transition-opacity">Node_Pricing</a>
                  </nav>
               </div>
               
               <div className="flex items-center gap-8">
                  <button onClick={handleLogin} className="text-[11px] font-mono font-bold text-black uppercase tracking-[0.3em] hover:text-[#FF5F1F] transition-colors">
                     [ Auth_Connect ]
                  </button>
                  <button 
                    onClick={handleLogin} 
                    className="btn-protocol"
                  >
                     Deploy System <ChevronRight size={16} />
                  </button>
               </div>
            </header>

            {/* Brutalist Hero Section */}
            <div className="w-full max-w-7xl mx-auto pt-32 px-6 pb-40">
               
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start mb-40">
                  <motion.div 
                    initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-8"
                  >
                     <div className="meta-label mb-10 text-[#FF5F1F]">
                        <div className="w-2 h-2 bg-[#FF5F1F]" />
                        v3.0.0_STABLE // SYSTEM_ACTIVE
                     </div>
                     <h1 className="text-protocol mb-16">
                        Quản trị <br /> <span className="px-6 py-2 bg-black text-white italic">Dự Án</span> <br /> Chuyên Sâu.
                     </h1>
                     <p className="text-2xl text-black leading-tight font-medium max-w-2xl mb-16 border-l-8 border-black pl-8 italic uppercase tracking-tighter">
                        Hệ thống điều hành tác vụ hiệu năng cao. <br /> Không dư thừa. Không thỏa hiệp.
                     </p>
                     <div className="flex flex-wrap gap-8">
                        <button onClick={handleLogin} className="btn-protocol h-20 px-16 text-lg">
                           Truy cập Terminal
                        </button>
                        <div className="h-20 px-8 border-4 border-black flex items-center gap-4 text-black text-[12px] font-mono font-bold uppercase tracking-widest bg-white">
                           NODE: SOUTH_EAST_1 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                     </div>
                  </motion.div>

                  <div className="lg:col-span-4 hidden lg:block sticky top-32">
                     <div className="protocol-card aspect-square flex flex-col justify-end p-10 bg-black text-white hover:bg-white hover:text-black group transition-colors duration-500">
                        <div className="absolute top-6 left-6 text-[10px] font-mono font-bold text-[#FF5F1F] uppercase tracking-[0.4em]">Node_01</div>
                        <LayoutGrid size={100} className="mb-12 text-[#FF5F1F] group-hover:rotate-12 transition-transform duration-700" />
                        <h3 className="text-4xl font-black uppercase mb-4 leading-none">Kiến trúc Thống nhất</h3>
                        <p className="text-slate-400 group-hover:text-black/60 font-mono text-[11px] uppercase tracking-wider">Lớp phần mềm trung gian tối ưu hóa cho độ chính xác dữ liệu tuyệt đối.</p>
                     </div>
                  </div>
               </div>

               {/* Grid Layout Features */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-4 border-black bg-black">
                  
                  <motion.div 
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    className="p-12 bg-white group hover:bg-[#FF5F1F] transition-colors duration-300 border-r-4 md:border-r-0 lg:border-r-4 border-black"
                  >
                     <div className="flex items-center justify-between mb-8">
                        <Zap size={40} className="text-black" />
                        <span className="font-mono text-[10px] font-bold opacity-30">01_PERFORMANCE</span>
                     </div>
                     <h3 className="text-4xl font-black uppercase mb-6 leading-none">Xử lý Thần tốc</h3>
                     <p className="text-black/60 group-hover:text-black font-medium leading-snug">Công cụ thực thi với độ trễ tiệm cận không, xử lý hàng triệu bản ghi trong tích tắc.</p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="p-12 bg-white group hover:bg-[#FF5F1F] transition-colors duration-300 border-r-4 md:border-r-4 border-black"
                  >
                     <div className="flex items-center justify-between mb-8">
                        <Activity size={40} className="text-black" />
                        <span className="font-mono text-[10px] font-bold opacity-30">02_ANALYTICS</span>
                     </div>
                     <h3 className="text-4xl font-black uppercase mb-6 leading-none">Dữ liệu Chuẩn</h3>
                     <p className="text-black/60 group-hover:text-black font-medium leading-snug">Hệ thống báo cáo được thiết kế theo tiêu chuẩn công nghiệp với độ chi tiết cao.</p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                    className="p-12 bg-black text-white group hover:bg-[#FF5F1F] hover:text-black transition-colors duration-300"
                  >
                     <div className="flex items-center justify-between mb-8">
                        <Lock size={40} className="text-[#FF5F1F] group-hover:text-black" />
                        <span className="font-mono text-[10px] font-bold opacity-50">03_SECURITY</span>
                     </div>
                     <h3 className="text-4xl font-black uppercase mb-6 leading-none">Bảo mật Tháp</h3>
                     <p className="text-slate-400 group-hover:text-black font-medium leading-snug">Giao thức bảo mật được kiểm tra nghiêm ngặt, đảm bảo an toàn cho mọi tài sản kỹ thuật số.</p>
                  </motion.div>
               </div>

            </div>

            {/* Protocol Footer */}
            <footer className="w-full py-20 px-8 md:px-16 border-t-4 border-black bg-white">
               <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                        <Rocket size={20} />
                     </div>
                     <span className="text-sm font-black uppercase tracking-widest">LINEARIS_PROTOCOL // 2026</span>
                  </div>
                  <div className="flex gap-12 text-[11px] font-mono font-bold uppercase tracking-[0.3em]">
                     <a href="#" className="hover:text-[#FF5F1F] transition-colors">Infrastructure</a>
                     <a href="#" className="hover:text-[#FF5F1F] transition-colors">Protocol_Doc</a>
                     <a href="#" className="hover:text-[#FF5F1F] transition-colors">Privacy_Gate</a>
                  </div>
                  <p className="text-[11px] font-mono font-bold italic opacity-30">ENCRYPTED_SIGNATURE_0x4F92</p>
               </div>
            </footer>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
            <header className="h-20 px-8 flex items-center justify-between shrink-0 border-b-4 border-black bg-white z-[100] relative">
              <div className="absolute top-0 left-0 w-full tech-ruler-x opacity-20" />
              <div className="flex items-center gap-8">
                <div className="w-12 h-12 bg-black text-white flex items-center justify-center shadow-[4px_4px_0px_0px_#FF5F1F] mechanical-click">
                  <Bug size={24} />
                </div>
                <span className="text-xl font-black uppercase tracking-tighter">Linearis_Protocol</span>
                <div className="h-10 w-[4px] bg-black mx-2" />
                <button 
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center gap-4 px-6 h-12 border-4 border-black bg-white hover:bg-black hover:text-white transition-all font-mono font-bold text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  {selectedProject?.name || 'ROOT_SELECT'}
                  <ChevronDown size={14} className={cn("transition-transform", showProjectDropdown && "rotate-180")} />
                </button>
              </div>

              <div className="flex items-center gap-8">
                <div className="hidden sm:flex items-center gap-4 px-6 h-12 border-4 border-black bg-white">
                  <div className="w-3 h-3 bg-[#FF5F1F]" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{user.displayName}</span>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="w-12 h-12 border-4 border-black flex items-center justify-center text-black hover:bg-[#FF5F1F] hover:text-white transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
              <div className="absolute left-[70px] lg:left-[280px] top-0 bottom-0 tech-ruler-y pointer-events-none" />
              {/* Sidebar Navigation */}
              <nav className="w-20 lg:w-72 border-r-4 border-black flex flex-col p-6 gap-3 overflow-y-auto bg-white relative">
                <div className="absolute -right-4 top-0 h-full w-4 flex flex-col justify-between py-10 opacity-10 pointer-events-none font-mono text-[8px] font-bold text-black overflow-hidden whitespace-nowrap">
                  {[...Array(20)].map((_, i) => <div key={i} className="rotate-90">REF_NODE_0{i}</div>)}
                </div>
                <NavButton icon={LayoutGrid} label="Nodes_Board" active={activeTab === 'board'} onClick={() => setActiveTab('board')} />
                <NavButton icon={Activity} label="System_Activity" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                <NavButton icon={PieChart} label="Load_Metrics" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
                
                <div className="my-6 border-t-2 border-black" />
                
                <button 
                  onClick={() => setShowProjectModal(true)}
                  className="w-full h-16 bg-black text-white font-mono font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#FF5F1F] transition-all flex flex-col items-center justify-center gap-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mechanical-click"
                >
                  <Plus size={20} /> Deploy_New
                </button>
              </nav>

              <div className="flex-1 flex flex-col min-w-0 bg-white relative tech-grid-bg">
                <AnimatePresence mode="wait">
                  {!selectedProject ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="p-12 border-8 border-black bg-white shadow-[20px_20px_0px_0px_#000] mb-12">
                        <FolderKanban size={100} className="text-[#FF5F1F]" />
                      </div>
                      <h2 className="text-7xl font-black uppercase mb-8 tracking-tighter">NO_ACTIVE_PROJECT</h2>
                      <p className="text-2xl text-black/60 max-w-xl font-medium border-l-8 border-black pl-8 italic mb-12 text-left uppercase leading-none">
                        Vui lòng chọn một node dự án từ danh sách hoặc khởi tạo cấu trúc mới để bắt đầu vận hành hệ thống.
                      </p>
                      <button 
                        onClick={() => setShowProjectModal(true)}
                        className="btn-protocol h-20 px-20 text-xl"
                      >
                         INITIATE_PROJECT_V3
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      {activeTab === 'board' && <KanbanBoard projectId={selectedProject.id} userId={user.uid} userProfiles={userProfiles} />}
                      {activeTab === 'logs' && (
                        <div className="flex-1 p-12 overflow-auto scroll-smooth custom-scrollbar">
                           <div className="flex items-center gap-6 mb-12">
                              <div className="p-4 bg-black text-white shadow-[6px_6px_0px_0px_#FF5F1F]">
                                 <Activity size={32} />
                              </div>
                              <h2 className="text-6xl font-black uppercase tracking-tighter">System_Activity_Log</h2>
                           </div>
                           <div className="border-4 border-black bg-white overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                              <table className="w-full text-left font-mono text-sm">
                                 <thead className="bg-black text-white text-[12px] uppercase tracking-[0.3em]">
                                    <tr>
                                       <th className="px-8 py-6">Timestamp</th>
                                       <th className="px-8 py-6">Action_Protocol</th>
                                       <th className="px-8 py-6">Reference_Data_Payload</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y-4 divide-black">
                                    {projectLogs.map((log) => (
                                       <tr key={log.id} className="hover:bg-[#FF5F1F]/5 transition-colors">
                                          <td className="px-8 py-6 font-bold">
                                             {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : 'WAITING_SYNC...'}
                                          </td>
                                          <td className="px-8 py-6">
                                             <span className="px-4 py-1 bg-black text-white text-[11px] font-bold uppercase tracking-widest">{log.action}</span>
                                          </td>
                                          <td className="px-8 py-6 text-slate-600 font-medium italic border-l-2 border-black/5">{log.details}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                      )}
                      
                      {activeTab === 'metrics' && (
                        <div className="flex-1 p-12 overflow-auto custom-scrollbar">
                           <div className="flex items-center justify-between mb-16">
                              <div className="flex items-center gap-6">
                                 <div className="p-4 bg-black text-white shadow-[6px_6px_0px_0px_#FF5F1F]">
                                    <PieChart size={32} />
                                 </div>
                                 <h2 className="text-6xl font-black uppercase tracking-tighter">Terminal_Performance</h2>
                              </div>
                              <div className="px-8 py-3 border-4 border-black bg-white text-[#FF5F1F] font-mono font-bold text-sm tracking-[0.4em]">STATUS_200: OK</div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                              <div className="protocol-card border-black p-12">
                                 <div className="font-mono text-[11px] font-bold text-black/50 mb-4 uppercase tracking-[0.4em]">Core_Utilization_Rate</div>
                                 <div className="text-8xl font-black mb-8 leading-none tracking-tighter">98.4<span className="text-3xl">%</span></div>
                                 <div className="w-full h-4 bg-slate-100 border-2 border-black overflow-hidden">
                                    <div className="h-full bg-black w-[98.4%]" />
                                 </div>
                              </div>
                              <div className="protocol-card border-[#FF5F1F] bg-[#FF5F1F]/5 p-12">
                                 <div className="font-mono text-[11px] font-bold text-[#FF5F1F] mb-4 uppercase tracking-[0.4em]">Uptime_Sync_Ratio</div>
                                 <div className="text-8xl font-black text-black mb-8 leading-none tracking-tighter">99.9</div>
                                 <div className="text-[12px] font-mono font-bold uppercase tracking-[0.3em] text-[#FF5F1F]">SUB_NODE_REDUNDANCY: ACTIVE</div>
                              </div>
                              <div className="protocol-card border-black p-12">
                                 <div className="font-mono text-[11px] font-bold text-black/50 mb-4 uppercase tracking-[0.4em]">Network_Throughput</div>
                                 <div className="text-8xl font-black mb-8 leading-none tracking-tighter">12<span className="text-3xl text-black/20">GB</span></div>
                                 <div className="flex gap-2 mt-8">
                                    {[1,1,1,1,1,1,0,0,0,0].map((v, i) => (
                                       <div key={i} className={cn("h-8 flex-1 border-2 border-black", v ? "bg-black" : "bg-transparent")} />
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dropdown Backdrop */}
                <AnimatePresence>
                  {showProjectDropdown && (
                    <div className="fixed inset-0 z-50">
                      <div className="absolute inset-0 bg-transparent" onClick={() => setShowProjectDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-24 left-8 w-96 bg-white border-4 border-black p-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-[100] origin-top-left"
                      >
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                           <div className="p-2 mb-4 text-[12px] font-mono font-bold text-black opacity-30 uppercase tracking-[0.4em]">Node_Directory</div>
                           <div className="space-y-2">
                             {projects.map(p => (
                               <button 
                                 key={p.id}
                                 onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }}
                                 className={cn(
                                   "w-full flex items-center justify-between px-4 py-4 border-4 transition-all font-bold text-sm uppercase",
                                   selectedProject?.id === p.id 
                                    ? "bg-black text-white border-black" 
                                    : "bg-white text-black border-transparent hover:border-black"
                                 )}
                               >
                                 <div className="flex items-center gap-4">
                                   <div className={cn("w-3 h-3", selectedProject?.id === p.id ? "bg-[#FF5F1F]" : "bg-black")} />
                                   {p.name}
                                 </div>
                                 {selectedProject?.id === p.id && <CheckCircle2 size={16} className="text-[#FF5F1F]" />}
                                </button>
                             ))}
                           </div>
                        </div>
                        <div className="my-6 border-t-4 border-black" />
                        <button 
                           onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }}
                           className="w-full flex items-center justify-center gap-4 px-6 py-6 border-4 border-black bg-[#FF5F1F] text-white hover:bg-black transition-all font-mono font-bold text-xs uppercase"
                        >
                           <Plus size={20} /> [ Deploy_New_Node ]
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Project Creation Modal */}
      <AnimatePresence>
        {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProjectModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-2xl bg-white border-[12px] border-black p-16 shadow-[30px_30px_0px_0px_#FF5F1F] z-10"
            >
              <div className="flex items-center gap-8 mb-16">
                <div className="w-20 h-20 bg-black text-white flex items-center justify-center rotate-3">
                  <FolderPlus size={40} />
                </div>
                <div>
                  <h3 className="text-5xl font-black uppercase tracking-tighter">INIT_WORKSPACE</h3>
                  <p className="text-lg font-mono font-bold text-[#FF5F1F] mt-2 uppercase tracking-widest">Protocol.V3_Subnode_Generation</p>
                </div>
              </div>
              
              <div className="space-y-12">
                <div>
                  <label className="text-[12px] font-mono font-bold uppercase tracking-[0.5em] text-black/30 mb-6 block">Node_Identity_String</label>
                  <input 
                    autoFocus type="text" value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="ALPHA_CENTAURI_STATION"
                    className="w-full h-24 bg-white border-8 border-black px-10 text-4xl font-black uppercase focus:bg-[#FF5F1F]/5 focus:outline-none transition-all placeholder:text-black/10 tracking-tighter"
                  />
                </div>
                
                <div className="flex gap-8 pt-8">
                  <button onClick={() => setShowProjectModal(false)} className="flex-1 h-20 border-4 border-black text-black text-lg font-black uppercase hover:bg-black hover:text-white transition-all italic">
                    [ ABORT ]
                  </button>
                  <button 
                    onClick={handleCreateProject} disabled={!newProjectName.trim()}
                    className="flex-1 h-20 bg-black text-white text-lg font-black uppercase hover:bg-[#FF5F1F] transition-all disabled:opacity-30 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)]"
                  >
                    EXECUTE_INIT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-6 transition-all border-4 relative overflow-hidden group",
        active ? "bg-black text-white border-black" : "bg-white text-black border-transparent hover:border-black"
      )}
    >
      <Icon size={24} className={cn("transition-transform group-hover:rotate-12", active ? "text-[#FF5F1F]" : "text-black")} />
      <span className="text-[12px] font-mono font-bold uppercase tracking-[0.2em] hidden lg:inline">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeDot" 
          className="absolute right-4 w-2 h-12 bg-[#FF5F1F]" 
        />
      )}
    </button>
  );
}
