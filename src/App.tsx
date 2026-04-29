/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Radio, Rocket, ArrowRight, Layout, LayoutGrid, FolderKanban, PieChart, 
  Zap, LogIn, LogOut, ShieldAlert, Bug as BugIcon, Activity, Cpu, Globe, Database, 
  Terminal, FolderPlus, ChevronDown, ChevronRight, Users, Bell, Search, Plus, 
  Filter, MessageSquare, History, Settings, Lock, CheckCircle2, Check, Shield, ShieldCheck, X,
  UserPlus, Clock, ArrowUpRight, Share2, MoreHorizontal, Orbit, Code2, Mail, Trash2, AlertTriangle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { auth, db, handleFirestoreError, testConnection } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp, where, orderBy, getDocFromServer, limit } from 'firebase/firestore';
import KanbanBoard from './components/KanbanBoard';
import { cn } from './lib/utils';
import { Project, UserProfile, Bug, UserRole, ROLE_CONFIG } from './types';

import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [inviteUserEmail, setInviteUserEmail] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
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

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }
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

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.warn("User profile sync limited");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedProject) {
      setBugs([]);
      return;
    }
    const qBugs = query(
      collection(db, 'bugs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeBugs = onSnapshot(qBugs, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bug[]);
    }, (error) => {
      handleFirestoreError(error, 'list', 'bugs');
    });

    const qEvents = query(
      collection(db, 'events'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'events');
    });

    return () => {
      unsubscribeBugs();
      unsubscribeEvents();
    };
  }, [user, selectedProject]);

  const handleInviteMember = async () => {
    if (!inviteUserEmail.trim() || !user || !selectedProject) return;
    try {
      // Logic: Find user by email (in a real app you'd do a query, here we search in our synced profiles)
      const targetUser = userProfiles.find(u => u.email === inviteUserEmail.trim());
      if (!targetUser) {
        toast.error("Không tìm thấy nhân sự trong hệ thống.");
        return;
      }
      if (selectedProject.members.includes(targetUser.userId)) {
        toast.error("Nhân sự này đã được gán vào nút này.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = [...selectedProject.members, targetUser.userId];
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      
      toast.success(`Nhân sự ${targetUser.displayName} đã được triển khai vào nút.`);
      setInviteUserEmail('');
      setShowInviteModal(false);
    } catch (e) {
      toast.error("Kiểm tra xác thực thất bại.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !selectedProject || memberId === selectedProject.ownerId) return;
    if (user.uid !== selectedProject.ownerId) {
      toast.error("Yêu cầu quyền quản trị viên.");
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = selectedProject.members.filter(id => id !== memberId);
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      toast.success("Quyền truy cập của nhân sự đã bị thu hồi.");
    } catch (e) {
      toast.error("Thao tác thất bại.");
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (startTab?: typeof activeTab) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      if (startTab) setActiveTab(startTab);
      toast.success("Chào mừng trở lại");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error("Xác thực thất bại");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => auth.signOut();

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  const overdueTasks = useMemo(() => {
    return bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date());
  }, [bugs]);

  const urgentTasks = useMemo(() => {
    if (!user) return [];
    const profile = userProfiles.find(u => u.userId === user.uid);
    const isAdminUser = profile?.roles?.includes('admin') || profile?.email === 'jokerducanh@gmail.com' || selectedProject?.ownerId === user.uid;
    
    if (isAdminUser) return overdueTasks;
    return overdueTasks.filter(b => b.assigneeId === user.uid);
  }, [overdueTasks, user, userProfiles, selectedProject]);

  const appStats = useMemo(() => {
    const total = bugs.length;
    const resolved = bugs.filter(b => b.status === 'done').length;
    const open = total - resolved;
    const critical = bugs.filter(b => b.priority === 'critical').length;
    
    return {
      total,
      resolved,
      open,
      critical,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
      activeEvents: events.filter(e => e.status === 'in-progress').length
    };
  }, [bugs, events]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const profile = userProfiles.find(u => u.userId === user.uid);
    return profile?.roles?.includes('admin') || 
           profile?.email === 'jokerducanh@gmail.com' ||
           selectedProject?.ownerId === user.uid;
  }, [user, userProfiles, selectedProject]);

  const handleUpdateUserRoles = async (targetUserId: string, currentRoles: UserRole[], role: UserRole) => {
    if (!isAdmin) return;
    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    if (targetUserId === user?.uid && role === 'admin' && currentRoles.includes('admin') && newRoles.length === 0) {
      toast.error("Không thể gỡ bỏ vai trò quản trị cuối cùng của chính bạn");
      return;
    }

    try {
      await setDoc(doc(db, 'users', targetUserId), {
        roles: newRoles
      }, { merge: true });
      toast.success("Cập nhật phân quyền thành công");
    } catch (e) {
      toast.error("Lỗi cập nhật quyền");
    }
  };

  const resolutionChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString([], { weekday: 'short' });
    }).reverse();

    const stats = last7Days.map(day => {
      const count = bugs.filter(b => {
        if (!b.createdAt?.toDate) return false;
        const bugDay = new Date(b.createdAt.toDate()).toLocaleDateString([], { weekday: 'short' });
        return bugDay === day;
      }).length;
      return { name: day, value: count };
    });

    return stats;
  }, [bugs]);

  useEffect(() => {
    if (!user || !selectedProject) return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'activity_logs');
    });
    return () => unsubscribe();
  }, [user, selectedProject]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'New Project',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      setNewProjectName('');
      setShowProjectModal(false);
      toast.success("Không gian làm việc đã được tạo");
    } catch (error) { toast.error("Không thể tạo không gian làm việc."); }
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !user || !selectedProject) return;
    try {
      await addDoc(collection(db, 'events'), {
        title: newEventTitle,
        projectId: selectedProject.id,
        status: 'in-progress',
        time: new Date().toLocaleTimeString(),
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      setNewEventTitle('');
      setShowEventModal(false);
      toast.success("Sự kiện vận hành đã được truyền tin");
    } catch (e) { toast.error("Triển khai thất bại"); }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    setIsUpdatingProject(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { name: selectedProject.name, description: selectedProject.description || '' }, { merge: true });
      toast.success("Cập nhật dự án thành công.");
    } catch (error) { handleFirestoreError(error, 'update', 'projects'); } finally { setIsUpdatingProject(false); }
  };

  const handleDeleteProject = async () => {
    if (!user || !selectedProject) return;
    try {
      const projectId = selectedProject.id;
      await deleteDoc(doc(db, 'projects', projectId)); 
      toast.success("Lưu trữ dự án đã hoàn tất.");
      setShowSettingsModal(false);
      setSelectedProject(null);
      setActiveTab('dashboard');
    } catch (error) { handleFirestoreError(error, 'delete', 'projects'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full shadow-2xl shadow-brand-500/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Toaster position="top-right" richColors />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen bg-[#FBFBFE]">
            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-10 lg:px-20 z-[100] bg-white/80 backdrop-blur-3xl border-b border-slate-200/60">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-brand-500/20">
                     <Orbit size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-900 tracking-widest uppercase font-mono">Linebase</span>
                     <span className="text-[9px] font-bold text-brand-500/50 uppercase tracking-[0.2em] font-mono">V2.0.4</span>
                  </div>
               </div>
               <div className="flex items-center gap-8">
                 <button onClick={() => handleLogin()} className="text-[11px] font-bold text-slate-500 hover:text-brand-600 transition-colors uppercase tracking-widest">Đăng nhập</button>
               </div>
            </nav>

            <main className="pt-40 lg:pt-52 px-10 lg:px-20 max-w-7xl mx-auto flex flex-col technical-grid min-h-screen">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
                 <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="lg:col-span-7 space-y-12 text-left">
                    <div className="inline-flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                      <span className="text-[11px] font-bold text-brand-400 uppercase tracking-[0.3em] font-mono">Công_cụ_không_gian_tự_trị</span>
                    </div>
                    
                    <h1 className="text-7xl lg:text-[7.5rem] font-bold tracking-tighter text-slate-900 leading-[0.9] font-sans">
                      Điều hành <br />
                      <span className="text-brand-500 italic">Ma trận.</span>
                    </h1>
                    
                    <p className="text-xl lg:text-2xl text-slate-500 max-w-xl font-medium leading-relaxed tracking-tight border-l-2 border-brand-500/20 pl-8">
                      Đồng bộ hóa nguồn, nhiệm vụ và telemetry của bạn trong một trung tâm điều khiển độ trung thực cao duy nhất, được thiết kế cho các nhóm tốc độ cao.
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-6">
                       <button onClick={() => handleLogin()} className="btn-precision h-16 px-12 text-base rounded-full hover:scale-105 active:scale-95 transition-all">
                          Khởi tạo không gian
                       </button>
                       <button onClick={() => setShowDocsModal(true)} className="h-16 px-10 border border-slate-200 bg-white text-slate-900 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all rounded-full flex items-center gap-3">
                          <Terminal size={16} /> Tài liệu
                       </button>
                    </div>
                 </motion.div>

                  <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} className="lg:col-span-5 relative">
                    <div className="surface-precision p-1 bg-white/40 backdrop-blur-3xl border-slate-200">
                       <div className="bg-white rounded-[1.2rem] overflow-hidden aspect-[4/5] p-12 flex flex-col justify-between border border-slate-100">
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-500/20">
                                <Activity size={24} />
                             </div>
                             <h3 className="text-4xl font-bold text-slate-900 leading-tight tracking-tighter">Số liệu hệ thống trực tiếp</h3>
                          </div>
                          <div className="space-y-8">
                             <div className="h-[4px] w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div animate={{ width: ["10%", "80%", "40%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="h-full bg-brand-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                             </div>
                             <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                   <div className="micro-label opacity-40">Trạng thái: Hoạt động</div>
                                   <div className="text-slate-500 text-[10px] font-mono tracking-widest">GIAO_THỨC_TRUYỀN_TIN_OK</div>
                                </div>
                                <div className="text-slate-900 text-7xl font-sans font-bold tracking-tighter italic">100<span className="text-2xl text-brand-500">%</span></div>
                             </div>
                          </div>
                       </div>
                    </div>

                 </motion.div>
               </div>



                <footer className="mt-60 pt-32 pb-20 border-t border-slate-200/60 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
                    <div className="lg:col-span-1 space-y-10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-brand-500 text-white flex items-center justify-center rounded-xl shadow-2xl shadow-brand-500/20">
                          <Orbit size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 tracking-widest uppercase font-mono">Linebase</span>
                          <span className="text-[10px] font-bold text-brand-500/40 uppercase tracking-[0.2em] font-mono leading-none">Nút_Toàn_Cầu</span>
                        </div>
                      </div>
                      <p className="text-[15px] text-slate-500 leading-relaxed font-medium tracking-tight pr-10">
                        Công cụ không gian làm việc tự động cho các nhóm tốc độ cao. Điều phối sự đồng nhất trên toàn ma trận với độ trễ bằng không.
                      </p>
                      <div className="flex items-center gap-5 text-slate-400">
                        <button onClick={() => toast.info("Relay source active")} className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:text-brand-500 hover:bg-slate-50 hover:border-brand-500/20 transition-all"><Code2 size={18} /></button>
                        <button onClick={() => toast.info("Comms channel established")} className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:text-brand-500 hover:bg-slate-50 hover:border-brand-500/20 transition-all"><Mail size={18} /></button>
                        <button onClick={() => toast.info("Telemetry frequency locked")} className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center hover:text-brand-500 hover:bg-slate-50 hover:border-brand-500/20 transition-all"><Activity size={18} /></button>
                      </div>
                    </div>

                    {[
                      { title: "Nền tảng", links: ["Ma trận nhiệm vụ", "Telemetry", "Nhật ký kiểm tra", "Nhân sự"] },
                      { title: "Mạng lưới", links: ["Trạng thái hệ thống", "Tài liệu hướng dẫn", "Tham chiếu API", "Giao thức bảo mật"] },
                      { title: "Tài nguyên", links: ["Cộng đồng", "Lịch sử thay đổi", "Hỗ trợ", "Trạng thái"] }
                    ].map((col, i) => (
                      <div key={i} className="space-y-8">
                        <h4 className="micro-label text-slate-900 font-bold tracking-[0.3em] font-mono">{col.title}</h4>
                        <ul className="space-y-5">
                          {col.links.map(link => (
                            <li key={link}>
                              <button 
                                onClick={() => {
                                  if (link === "Tài liệu hướng dẫn") setShowDocsModal(true);
                                  else if (link === "Ma trận nhiệm vụ") handleLogin('board');
                                  else if (link === "Telemetry") handleLogin('metrics');
                                  else if (link === "Nhân sự") handleLogin('members');
                                  else toast.info(`Đang khởi tạo truyền tin ${link}.`);
                                }}
                                className="text-[13px] font-semibold text-slate-500 hover:text-brand-600 transition-all tracking-tight flex items-center gap-3 group"
                              >
                                <div className="w-1.5 h-1.5 bg-slate-200 group-hover:bg-brand-500 group-hover:scale-125 transition-all rounded-full" />
                                {link}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-slate-100 gap-8">
                    <div className="flex items-center gap-8">
                      <span className="text-[11px] font-bold text-slate-300 font-mono tracking-[0.2em] uppercase">© 2026 LINEBASE_SYS</span>
                      <div className="h-4 w-px bg-slate-100 hidden sm:block" />
                      <span className="text-[11px] font-bold text-slate-300 font-mono tracking-[0.2em] uppercase hidden sm:block">BUILD_HASH: 0x8F2E7DC2</span>
                    </div>
                    <div className="flex items-center gap-10">
                      <button onClick={() => toast.info("Giao thức riêng tư đang hoạt động")} className="text-[11px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors font-mono">Quyền riêng tư</button>
                      <button onClick={() => toast.info("Điều khoản tham gia đã được chấp nhận")} className="text-[11px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors font-mono">Điều khoản</button>
                      <button onClick={() => toast.info("Đồng bộ hóa toàn cầu đang hoạt động")} className="flex items-center gap-3 px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-500/10">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Hệ_Thống_Vận_Hành
                      </button>
                    </div>
                  </div>
                </footer>
             </main>
          </motion.div>
        ) : (
          <div className="flex-1 flex h-screen overflow-hidden bg-slate-50">
            {/* PRECISION SIDEBAR */}
            <aside className="w-64 h-full flex flex-col bg-white border-r border-slate-100 relative z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
               <div className="p-8 pb-12 flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 rounded-[1.25rem]">
                     <Code2 size={20} strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xl font-black text-slate-900 tracking-tight leading-none italic uppercase">Zenith</span>
                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.4em] font-mono mt-1 opacity-70">Control_OS</span>
                  </div>
               </div>

               <div className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                  <div className="px-6 mb-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Protocol Root</div>
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Bảng điều hành' },
                    { id: 'board', icon: FolderKanban, label: 'Ma trận nhiệm vụ' },
                    { id: 'metrics', icon: PieChart, label: 'Trung tâm chỉ số' },
                    { id: 'logs', icon: Activity, label: 'Lịch sử hệ thống' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "flex items-center gap-4 w-full px-6 py-4 rounded-[1.5rem] transition-all duration-300 group outline-none",
                        activeTab === item.id 
                          ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" 
                          : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <item.icon 
                        size={16} 
                        strokeWidth={activeTab === item.id ? 3 : 2} 
                        className={cn(
                          "transition-transform duration-500",
                          activeTab === item.id ? "scale-110" : "group-hover:scale-110"
                        )}
                      />
                      <span className="tracking-[0.15em] uppercase text-[10px] font-black font-mono">{item.label}</span>
                    </button>
                  ))}
               </div>

               <div className="p-8 border-t border-slate-50">
                  <div className="flex items-center gap-4 p-3 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 border border-transparent hover:border-slate-100 rounded-[2rem] group cursor-pointer transition-all duration-500">
                    <div className="relative">
                      <img className="w-10 h-10 rounded-2xl grayscale group-hover:grayscale-0 transition-all border-2 border-white shadow-md" src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <div className="text-[10px] font-black text-slate-800 group-hover:text-indigo-600 truncate font-mono uppercase tracking-tighter transition-colors">{user.displayName}</div>
                       <button onClick={handleLogout} className="text-[8px] font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest mt-0.5">Thoát protocol</button>
                    </div>
                  </div>
               </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col bg-[#FDFDFF]">
               {/* PRECISION HEADER */}
               <header className="h-16 px-10 flex items-center justify-between bg-white/40 backdrop-blur-xl relative z-40 border-b border-slate-100">
                  <div className="flex items-center gap-10">
                    <div className="relative">
                      <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-4 text-[10px] font-black text-slate-400 hover:text-slate-900 transition-all group tracking-[0.2em] uppercase font-mono"
                      >
                         <span className="text-indigo-600 opacity-40">Frequency:</span>
                         <span className="text-slate-900 py-1.5 border-b-2 border-indigo-500/0 hover:border-indigo-500/100 transition-all">{selectedProject?.name || 'SYNCING...'}</span>
                         <ChevronDown size={14} className={cn("text-slate-300 transition-transform duration-500", showProjectDropdown && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                         {showProjectDropdown && (
                           <motion.div 
                             initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                             animate={{ opacity: 1, y: 0, scale: 1 }} 
                             exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                             className="absolute top-12 left-0 w-80 z-[110] bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden p-3"
                           >
                             <div className="px-5 py-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Authorized Channels</div>
                             <div className="space-y-1">
                               {projects.map(p => (
                                 <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} className={cn("w-full flex items-center justify-between px-6 py-4 text-[10px] font-mono font-black tracking-[0.1em] uppercase transition-all rounded-[1.5rem]", selectedProject?.id === p.id ? "bg-slate-900 text-white shadow-xl" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>
                                   {p.name}
                                   {selectedProject?.id === p.id && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                 </button>
                               ))}
                               <div className="h-px bg-slate-50 my-3 mx-4" />
                               <button 
                                 onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} 
                                 className="w-full flex items-center gap-4 px-6 py-4 text-[10px] text-indigo-600 font-black tracking-[0.2em] uppercase hover:bg-indigo-50 rounded-[1.5rem] transition-colors"
                               >
                                 <Plus size={14} strokeWidth={3} /> New Channel
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>

                    <div className="h-6 w-px bg-slate-100" />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Uptime 99.9%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button onClick={() => toast.info("Mã hóa truyền tải đang hoạt động. Không có cảnh báo.")} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                       <Bell size={14} />
                    </button>
                    <button 
                      onClick={() => setShowSettingsModal(true)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-white transition-all"
                    >
                       <Settings size={14} />
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => setShowInviteModal(true)} className="btn-precision h-8 px-4 text-[9px]">
                       <UserPlus size={12} /> Thêm nhân sự
                    </button>
                  </div>
               </header>

               <div className="flex-1 overflow-auto custom-scrollbar p-6 lg:p-8">
                 <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12 w-full">
                        <div className="flex items-end justify-between gap-8">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-[1px] w-8 bg-brand-500/40" />
                                <span className="text-[9px] font-bold text-brand-500 uppercase tracking-[0.5em] font-mono">Chỉ_thị_điều_hành_hệ_thống</span>
                              </div>
                              <h2 className="text-8xl font-sans font-bold tracking-tighter italic leading-none text-slate-900">
                                Tổng quan hệ thống
                              </h2>
                              <div className="flex items-center gap-6">
                                <div className="text-slate-500 font-mono text-[10px] tracking-wider uppercase flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Đồng bộ giao thức: hoàn tất
                                </div>
                                <div className="h-4 w-[1px] bg-slate-200" />
                                <div className="flex items-center gap-3 font-mono">
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-900 leading-none">
                                         {currentTime.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                      <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase">Thời_gian_thực</span>
                                   </div>
                                   <div className="h-6 w-[1px] bg-slate-100" />
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-black text-slate-900 leading-none">
                                         {currentTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      </span>
                                      <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase">Lịch_nhật_ấn</span>
                                   </div>
                                </div>
                              </div>
                           </div>
                              <div className="flex items-center gap-3">
                                 <button onClick={() => setShowProjectModal(true)} className="btn-precision h-12 px-8">
                                    <Plus size={14} /> Khởi tạo nút
                                 </button>
                                 <button onClick={() => setShowSettingsModal(true)} className="h-12 px-8 border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                                    Tham số
                                 </button>
                              </div>
                        </div>

                         {urgentTasks.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-10 rounded-[3rem] bg-rose-50 border border-rose-100 relative overflow-hidden mb-12"
                            >
                              <div className="absolute top-0 right-0 p-16 opacity-[0.03] text-rose-500 transform translate-x-12 -translate-y-12">
                                 <AlertTriangle size={280} />
                              </div>
                              
                              <div className="relative space-y-10">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-rose-600 text-white rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-rose-600/30">
                                      <Clock size={32} className="animate-pulse" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-[0.15em]">Giao thức khẩn cấp: {urgentTasks.length}</h2>
                                      <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mt-1 opacity-80">Hệ thống phát hiện các nút xử lý đã quá thời hạn quy định_</p>
                                    </div>
                                  </div>
                                  <div className="bg-white/50 backdrop-blur-sm border border-rose-100 rounded-2xl px-5 py-3 flex items-center gap-4">
                                     <div className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                                     <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest font-mono">Status: Priority_Conflict</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                  {urgentTasks.slice(0, 3).map(task => (
                                    <div key={task.id} className="p-8 bg-white rounded-[2.5rem] border border-rose-100 shadow-2xl shadow-rose-600/5 group hover:border-rose-400 transition-all duration-500 transform hover:-translate-y-1">
                                      <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                           <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                              <Activity size={16} />
                                           </div>
                                           <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest">#{task.id.slice(-4).toUpperCase()}</span>
                                        </div>
                                        <span className="text-[8px] font-black text-white bg-rose-600 px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-rose-600/20">Quá hạn</span>
                                      </div>
                                      <h3 className="text-[15px] font-black text-slate-900 mb-8 line-clamp-2 leading-tight group-hover:text-rose-600 transition-colors">{task.title}</h3>
                                      <div className="flex items-center justify-between pt-6 border-t border-rose-50">
                                        <div className="flex items-center gap-3">
                                           <img src={userProfiles.find(u => u.userId === task.assigneeId)?.photoURL} className="w-8 h-8 rounded-xl ring-4 ring-white shadow-md grayscale group-hover:grayscale-0 transition-all" alt="" />
                                           <div className="flex flex-col">
                                              <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{userProfiles.find(u => u.userId === task.assigneeId)?.displayName.split(' ')[0]}</span>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Assignee</span>
                                           </div>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            setSelectedProject(projects.find(p => p.id === task.projectId) || null);
                                            setActiveTab('board');
                                          }}
                                          className="h-10 px-6 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                        >
                                           Xử lý ngay
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {urgentTasks.length > 3 && (
                                    <div 
                                      onClick={() => setActiveTab('board')}
                                      className="p-8 bg-rose-100/30 border border-dashed border-rose-300/50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-rose-100/50 transition-all group overflow-hidden relative"
                                    >
                                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                       <span className="text-2xl font-black text-rose-600 mb-2">+{urgentTasks.length - 3}</span>
                                       <span className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Danh bạ nhiệm vụ quá hạn</span>
                                       <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-rose-400 group-hover:text-rose-700 transition-colors">
                                          Xem tất cả <ArrowRight size={12} />
                                       </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                         )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           <StatsCard label="Chất lượng hệ thống" value={`${appStats.resolutionRate}%`} icon={<Cpu size={14} />} trend="ĐỒNG BỘ" />
                           <StatsCard label="Nút đang xử lý" value={appStats.open} icon={<Activity size={14} />} trend="ĐANG XỬ LÝ" />
                           <StatsCard label="Chỉ số quan trọng" value={appStats.critical} icon={<Zap size={14} />} trend={appStats.critical > 3 ? "CẢNH BÁO" : "ỔN ĐỊNH"} />
                           <StatsCard label="Sự kiện hoạt động" value={appStats.activeEvents} icon={<Orbit size={14} />} trend="ĐANG HOẠT ĐỘNG" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                           <div className="lg:col-span-2 surface-precision p-5">
                              <div className="flex items-center justify-between mb-4">
                                 <div className="space-y-0.5">
                                    <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Lịch trình</h3>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Đồng bộ Ma trận</p>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    {bugs.filter(b => b.dueDate && b.status !== 'done' && new Date(b.dueDate) < new Date()).length > 0 && (
                                      <div className="px-2 py-0.5 bg-rose-500 text-white rounded-[2px] text-[8px] font-black uppercase tracking-widest animate-pulse">
                                        TRỄ ({bugs.filter(b => b.dueDate && b.status !== 'done' && new Date(b.dueDate) < new Date()).length})
                                      </div>
                                    )}
                                    <div className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-[2px] text-[8px] font-bold text-slate-400 font-mono italic">SYNC: OK</div>
                                 </div>
                              </div>

                              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                 <div className="grid grid-cols-7 border-b border-slate-100">
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                                       <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">{day}</div>
                                    ))}
                                 </div>
                                 <div className="grid grid-cols-7 bg-slate-50/30">
                                    {Array.from({ length: 35 }).map((_, i) => {
                                       const dayNum = i - 2; 
                                       const isToday = dayNum === 28; 
                                       const isCurrentMonth = dayNum > 0 && dayNum <= 30;
                                       const dateString = `2026-04-${String(dayNum).padStart(2, '0')}`;
                                       const dayBugs = bugs.filter(b => b.dueDate?.startsWith(dateString));
                                       const hasOverdue = dayBugs.some(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date());
                                       
                                       return (
                                          <div key={i} className={cn(
                                             "h-20 p-2 border-r border-b border-slate-100 transition-all hover:bg-white group relative overflow-y-auto custom-scrollbar flex flex-col",
                                             !isCurrentMonth && "opacity-20 bg-slate-50/50",
                                             hasOverdue && isCurrentMonth && "bg-rose-50/20 transition-colors"
                                          )}>
                                             <span className={cn(
                                                "text-[10px] font-bold font-mono shrink-0",
                                                isToday ? "w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center -ml-1 -mt-1 shadow-lg shadow-brand-500/30" : "text-slate-400"
                                             )}>
                                                {dayNum > 0 && dayNum <= 30 ? dayNum : (dayNum <= 0 ? 31 + dayNum : dayNum - 30)}
                                             </span>
                                             
                                             <div className="mt-2 space-y-1.5 flex-1">
                                               {dayBugs.map(bug => {
                                                  const isOverdue = bug.status !== 'done' && bug.dueDate && new Date(bug.dueDate) < new Date();
                                                  const bugTime = bug.dueDate?.includes('T') ? new Date(bug.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                                  return (
                                                   <div 
                                                     key={bug.id} 
                                                     onClick={() => setActiveTab('board')}
                                                     className={cn(
                                                       "p-2 rounded-lg text-[9px] font-bold uppercase tracking-tighter truncate border cursor-pointer hover:scale-[1.02] transition-transform shadow-sm",
                                                       isOverdue ? "bg-rose-500 border-rose-600 text-white shadow-rose-200" : (
                                                         bug.priority === 'critical' ? "bg-red-50 border-red-100 text-red-600" :
                                                         bug.priority === 'high' ? "bg-orange-50 border-orange-100 text-orange-600" :
                                                         bug.priority === 'medium' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                                         "bg-emerald-50 border-emerald-100 text-emerald-600"
                                                       )
                                                     )}
                                                   >
                                                     {isOverdue && <span className="mr-1">⚠️</span>}
                                                     {bugTime && <span className="mr-1 opacity-50">[{bugTime}]</span>}
                                                     {bug.title}
                                                   </div>
                                                  );
                                                })}
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>

                           <div className="surface-precision p-5 flex flex-col">
                              <div className="mb-4">
                                 <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase">Dòng tin</h3>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Giám sát luồng</p>
                              </div>
                              <div className="flex-1 space-y-2">
                                 {projectLogs.slice(0, 5).map((log, i) => (
                                    <div key={log.id} className="flex gap-2 group">
                                       <div className="flex flex-col items-center">
                                          <div className="w-1 h-1 rounded-none bg-slate-200 group-hover:bg-brand-500 transition-colors" />
                                          {i !== projectLogs.slice(0, 5).length - 1 && <div className="w-[1px] flex-1 bg-slate-100 my-0.5" />}
                                       </div>
                                       <div className="space-y-0 pb-1">
                                          <div className="text-[7px] font-bold text-slate-400 tracking-widest font-mono uppercase group-hover:text-slate-900 leading-none">Op_{log.action}</div>
                                          <p className="text-[10px] text-slate-600 font-medium leading-tight group-hover:text-slate-900 transition-colors line-clamp-1">{log.details}</p>
                                          <div className="text-[6px] font-bold text-slate-300 font-mono uppercase leading-none">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              <button onClick={() => setActiveTab('logs')} className="w-full h-7 border border-slate-100 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all mt-4">
                                 Mở rộng
                              </button>
                           </div>
                        </div>
                     </motion.div>
                  )}

                    {activeTab === 'metrics' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-20 w-full">
                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono">Phân tích Telemetry</span>
                           </div>
                           <h2 className="text-6xl font-bold tracking-tighter text-slate-900">Hiệu suất hệ thống</h2>
                           <p className="text-lg text-slate-500 font-medium tracking-tight max-w-2xl">Trực quan hóa độ trung thực cao của lưu lượng hệ thống và phân phối giao thức đa kênh.</p>
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
                           <StatsCard label="Hiệu suất chính xác" value={`${appStats.resolutionRate}%`} icon={<CheckCircle2 size={16} />} trend="ĐỒNG BỘ" />
                           <StatsCard label="Khối lượng nút" value={appStats.total} icon={<Rocket size={16} />} trend="TUYẾN TÍNH" />
                           <StatsCard label="Sự kiện vận hành" value={events.length} icon={<Globe size={16} />} trend="ĐÃ GHI LẠI" />
                        </div>
 
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                           <div className="card-smart h-[520px] flex flex-col bg-white border border-slate-200 p-12 rounded-3xl overflow-hidden shadow-sm">
                             <div className="flex items-center justify-between mb-12">
                                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono">Tốc độ giải quyết</h3>
                                <div className="px-4 py-1.5 bg-slate-50 rounded-xl text-[9px] font-black text-brand-600 tracking-widest border border-slate-100">ALPHA-CHART</div>
                             </div>
                             <div className="flex-1 w-full translate-x-[-15px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={resolutionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'JetBrains Mono' }} dy={10} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '24px' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={44} />
                                  </BarChart>
                                </ResponsiveContainer>
                             </div>
                           </div>
 
                           <div className="card-smart h-[520px] flex flex-col items-center p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
                             <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono mb-10 self-start">Phân bổ ưu tiên</h3>
                             <div className="flex-1 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RePieChart>
                                    <Pie 
                                      data={[
                                        { name: 'Critical', value: bugs.filter(b => b.priority === 'critical').length },
                                        { name: 'High', value: bugs.filter(b => b.priority === 'high').length },
                                        { name: 'Medium', value: bugs.filter(b => b.priority === 'medium').length },
                                      ]} 
                                      innerRadius={110} outerRadius={150} paddingAngle={15} dataKey="value"
                                      stroke="none"
                                    >
                                      <Cell fill="#f43f5e" />
                                      <Cell fill="#f59e0b" />
                                      <Cell fill="#8b5cf6" />
                                    </Pie>
                                    <Tooltip />
                                  </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center justify-center gap-1">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes</span>
                                   <span className="text-5xl font-black text-slate-950 font-display italic leading-none">{bugs.length}</span>
                                </div>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'members' && (
                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-16 w-full">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div className="space-y-4">
                               <div className="flex items-center gap-4">
                                  <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">Operator Deployment Registry</span>
                               </div>
                               <h2 className="text-6xl font-bold tracking-tighter text-slate-900">System Operators</h2>
                               <p className="text-lg text-slate-500 font-medium tracking-tight max-w-xl">Comprehensive directory of authorized engine operators assigned to this matrix node.</p>
                            </div>
                            <button onClick={() => setShowInviteModal(true)} className="btn-precision h-12 px-8">
                               <UserPlus size={16} /> Add Member
                            </button>
                        </div>
  
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {userProfiles.map((profile) => (
                              <div key={profile.userId} className="surface-precision flex items-center justify-between group bg-white hover:bg-slate-50 p-8 transition-all duration-500 border-slate-200 hover:border-brand-500/20 relative overflow-hidden shadow-sm">
                                  <div className="flex items-center gap-8">
                                    <div className="relative">
                                      <img src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} alt="" className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-all duration-500 group-hover:scale-105" />
                                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                       <div className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-3 group-hover:text-brand-600 transition-colors">{profile.displayName}</div>
                                       <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 rounded-xl w-fit border border-slate-100">
                                          <Mail size={14} className="text-slate-400" />
                                          <div className="text-[11px] font-black text-slate-400 truncate uppercase tracking-widest font-mono">{profile.email}</div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-4">
                                    <div className="flex flex-wrap gap-2 justify-end">
                                      {isAdmin ? (
                                        (Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                          const isAssigned = profile.roles?.includes(role);
                                          return (
                                            <button
                                              key={role}
                                              onClick={() => handleUpdateUserRoles(profile.userId, profile.roles || [], role)}
                                              className={cn(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all border",
                                                isAssigned 
                                                  ? cn(ROLE_CONFIG[role].color, "text-white border-transparent shadow-md shadow-current/10")
                                                  : "bg-white text-slate-300 border-slate-100 hover:border-indigo-300 hover:text-indigo-600"
                                              )}
                                            >
                                              {isAssigned && <Check size={10} />}
                                              {ROLE_CONFIG[role].label.split(' / ')[0]}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        profile.roles?.map(role => (
                                          <div key={role} className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white", ROLE_CONFIG[role].color)}>
                                            {ROLE_CONFIG[role].label}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                                        <button onClick={() => toast.info(`Sharing node access for ${profile.displayName}...`)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all"><Share2 size={16} /></button>
                                        {selectedProject?.ownerId !== profile.userId && user?.uid === selectedProject?.ownerId && (
                                          <button onClick={() => handleRemoveMember(profile.userId)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                 </div>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'board' && selectedProject && (
                      <KanbanBoard 
                        key={selectedProject.id} 
                        projectId={selectedProject.id} 
                        userId={user.uid} 
                        userProfiles={userProfiles} 
                        bugs={bugs} 
                        isProjectOwner={selectedProject.ownerId === user.uid}
                      />
                    )}

                     {activeTab === 'logs' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 w-full">
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">System Ledger Index</span>
                           </div>
                           <h2 className="text-6xl font-bold tracking-tighter text-slate-900">System Logs</h2>
                           <p className="text-lg text-slate-500 font-medium tracking-tight max-w-xl">Comprehensive history of system changes and network state transitions.</p>
                         </div>

                         <div className="surface-precision overflow-hidden bg-white border border-slate-200 shadow-sm">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="bg-slate-50 border-b border-slate-100">
                                 <th className="px-8 py-6 micro-label text-slate-400">TIMESTAMP</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">PROTOCOL</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">OPERATOR</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">AUDIT_DETAILS</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {projectLogs.length === 0 ? (
                                 <tr>
                                   <td colSpan={4} className="px-8 py-20 text-center micro-label text-slate-300">Không có hoạt động nào được ghi lại trong chu kỳ hiện tại</td>
                                 </tr>
                               ) : projectLogs.map((log) => (
                                 <tr key={log.id} className="hover:bg-slate-50 transition-colors group/row">
                                   <td className="px-8 py-6 font-mono text-[11px] text-slate-400">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'PENDING...'}</td>
                                   <td className="px-8 py-6">
                                     <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-500 group-hover/row:bg-brand-500 group-hover/row:text-white transition-all">{log.action?.toUpperCase() || 'MOD'}</span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-3">
                                         <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-[10px] font-mono border border-slate-200 italic text-slate-400">
                                            {userProfiles.find(u => u.userId === log.userId)?.displayName?.slice(0, 2).toUpperCase() || 'SY'}
                                         </div>
                                         <span className="font-bold text-slate-900 text-[13px] italic font-serif ">{userProfiles.find(u => u.userId === log.userId)?.displayName || 'SYSTEM_DAEMON'}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-slate-500 font-medium text-[13px] max-w-md italic">{log.details}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showSettingsModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
             <div className="surface-precision w-full max-w-2xl relative z-[510] overflow-hidden bg-white border-slate-200">
                <div className="px-12 py-10 flex items-center justify-between border-b border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-500 text-white flex items-center justify-center rounded shadow-xl">
                         <Settings size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cài đặt dự án</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấu hình không gian làm việc</p>
                      </div>
                   </div>
                   <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 rounded hover:bg-slate-100 transition-all flex items-center justify-center text-slate-500 hover:text-slate-900">
                      <X size={20} />
                   </button>
                </div>
                <div className="p-12 space-y-12">
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên không gian làm việc</label>
                      <input 
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-300 font-mono"
                        value={selectedProject?.name} 
                        onChange={(e) => setSelectedProject(selectedProject ? {...selectedProject, name: e.target.value} : null)} 
                        disabled={user.uid !== selectedProject?.ownerId}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 space-y-2 bg-slate-50 border border-slate-100 rounded">
                         <span className="micro-label opacity-40 text-[9px]">GIAO_THỨC_MÃ_HÓA</span>
                         <div className="text-sm font-bold text-slate-700 italic font-mono uppercase">AES-256-GCM</div>
                      </div>
                      <div className="p-6 space-y-2 bg-slate-50 border border-slate-100 rounded">
                         <span className="micro-label opacity-40 text-[9px]">VÉC-TƠ_BẢO_MẬT</span>
                         <div className="text-sm font-bold text-emerald-600 italic font-mono flex items-center gap-2">
                            <Lock size={14} /> XÁC_THỰC_CẤP_4
                         </div>
                      </div>
                   </div>

                   <div className="pt-10 flex items-center justify-between gap-6">
                      {user.uid === selectedProject?.ownerId && (
                        <button 
                          onClick={() => handleDeleteProject()}
                          className="micro-label text-rose-500 hover:text-rose-400 transition-colors"
                        >
                          Xóa không gian làm việc
                        </button>
                      )}
                      <div className="flex-1" />
                      <button 
                        onClick={() => { handleUpdateProject(); setShowSettingsModal(false); }}
                        className="btn-precision h-12 px-12"
                      >
                         Lưu thay đổi
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

         {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[210] bg-white border-slate-200">
              <div className="flex flex-col text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-brand-500 text-white flex items-center justify-center rounded mx-auto shadow-2xl mb-4">
                   <FolderPlus size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Tạo không gian làm việc</h3>
                <p className="text-slate-500 font-medium text-sm">Đặt tên cho nút ma trận cộng tác mới của bạn.</p>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên không gian làm việc</label>
                   <input autoFocus placeholder="VD: DỰ_ÁN_TỐI_ƯU" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Tạo không gian</button>
                  <button onClick={() => setShowProjectModal(false)} className="px-6 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Hủy bỏ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEventModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEventModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[610] bg-white border-slate-200">
              <div className="space-y-4 mb-10 text-center">
                 <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-none mx-auto mb-6">
                    <Activity size={20} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Thêm sự kiện mới</h3>
                 <p className="micro-label opacity-40">Yêu cầu xác thực cấp Matrix để ghi đè thủ công.</p>
              </div>
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="micro-label ml-2">Định_danh_sự_kiện</label>
                    <input autoFocus placeholder="TÊN_SỰ_KIỆN_..." className="w-full h-14 bg-slate-50 border border-slate-200 rounded-none px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()} />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleCreateEvent} disabled={!newEventTitle.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Thực thi truyền tin</button>
                    <button onClick={() => setShowEventModal(false)} className="micro-label px-6 text-slate-500 hover:text-slate-900 transition-colors">Hủy bỏ</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[610] bg-white border-slate-200">
              <div className="space-y-4 mb-10 text-center">
                 <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-2xl mx-auto mb-6">
                    <UserPlus size={20} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Thêm nhân sự</h3>
                 <p className="micro-label opacity-40">Mở rộng danh sách thành viên của nút ma trận.</p>
              </div>
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="micro-label ml-2">Email đăng ký</label>
                    <input autoFocus placeholder="nhansu@linebase.sys" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={inviteUserEmail} onChange={(e) => setInviteUserEmail(e.target.value)} />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleInviteMember} disabled={!inviteUserEmail.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Gán nhân sự</button>
                    <button onClick={() => setShowInviteModal(false)} className="micro-label px-6 text-slate-500 hover:text-slate-900 transition-colors">Kết thúc</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {showDocsModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDocsModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-3xl max-h-[80vh] overflow-y-auto p-12 relative z-[710] bg-white border-slate-200 custom-scrollbar">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-500 text-white flex items-center justify-center rounded-xl">
                    <Terminal size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tighter italic">Lõi_Hệ_Thống v2</h3>
                </div>
                <button onClick={() => setShowDocsModal(false)} className="w-10 h-10 rounded hover:bg-slate-100 transition-all flex items-center justify-center text-slate-400">
                  <X size={24} />
                </button>
              </div>
              
              <div className="prose prose-slate max-w-none space-y-10">
                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x01_Tổng_Quan
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">Linebase là một công cụ không gian làm việc tự động. Mọi tương tác được đồng bộ hóa thông qua các rơ-le telemetry tới Firestore để có sự đồng nhất trong thời gian thực giữa tất cả các nhân sự được kết nối.</p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x02_Ma_Trận_Nhiệm_Vụ
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">Sử dụng Ma trận nhiệm vụ để quản lý các nút (vấn đề). Kéo và thả giữa các cột để cập nhật trạng thái giao thức. Nhấp vào một mục cho phép thao tác sâu vào trạng thái bao gồm thay đổi độ ưu tiên và phân bổ nhân sự.</p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x03_Bảo_Mật
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">Tất cả dữ liệu được bảo vệ bằng các quy tắc bảo mật tương đương AES-256. Thành viên phải được chỉ định rõ ràng vào các nút dự án để có quyền đọc/ghi.</p>
                </section>

                <div className="pt-10 flex justify-center">
                  <button onClick={() => setShowDocsModal(false)} className="btn-precision h-12 px-12">Chấp_Nhận_Chỉ_Thị</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

 function StatsCard({ label, value, icon, trend }: { label: string, value: any, icon: any, trend?: string }) {
  return (
    <div className="surface-precision p-8 h-48 flex flex-col justify-between group relative overflow-hidden bg-white transition-all hover:bg-slate-50">
      <div className="flex items-center justify-between relative z-10">
        <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 group-hover:text-brand-600 transition-all border border-slate-100 shadow-inner">
          {icon}
        </div>
        {trend && (
          <div className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-full tracking-wider uppercase border border-brand-100">
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1 relative z-10 mt-auto">
        <div className="micro-label opacity-40 text-[10px] mb-2">{label}</div>
        <div className="text-4xl font-bold tracking-tighter leading-none text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, desc, icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="surface-precision p-10 flex flex-col text-left group bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500"
    >
      <div className="w-14 h-14 bg-brand-500/10 text-brand-500 flex items-center justify-center rounded-2xl mb-8 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500">
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 })}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight text-slate-900 group-hover:text-brand-600 transition-all">{title}</h3>
      <p className="text-sm font-medium text-slate-500 leading-relaxed">{desc}</p>
    </button>
  );
}
