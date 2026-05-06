import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "motion/react";
import { Toaster, toast } from 'sonner';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useProjectData } from './hooks/useProjectData';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import MatrixBackground from './components/layout/MatrixBackground';

// Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';
import MetricsPage from './pages/MetricsPage';
import MembersPage from './pages/MembersPage';
import KanbanBoard from './components/KanbanBoard';

// Modals
import ProjectModal from './components/modals/ProjectModal';
import InviteModal from './components/modals/InviteModal';
import SettingsModal from './components/modals/SettingsModal';
import DocsModal from './components/modals/DocsModal';
import QuickAddModal from './components/kanban/QuickAddModal';

import { db } from './lib/firebase';
import { addDoc, collection, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError } from './lib/firebase';

export default function App() {
  const { user, loading, userProfiles, isAdmin, handleLogin, handleLogout } = useAuth();
  const { 
    projects, selectedProject, setSelectedProject, 
    pendingInvitations,
    handleInviteMember: inviteMemberLogic, 
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRemoveMember,
    handleUpdateUserRoles
  } = useProjects(user?.uid, userProfiles);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<'low' | 'high' | 'critical'>('low');
  const [quickAddDueDate, setQuickAddDueDate] = useState('');

  const { bugs, events, overdueTasks, urgentTasks, appStats } = useProjectData(user, selectedProject, userProfiles, currentTime);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'Dự án mới',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      setNewProjectName('');
      setShowProjectModal(false);
      toast.success("Không gian làm việc đã được tạo");
    } catch (error) { toast.error("Không thể tạo không gian làm việc."); }
  };

  const handleInviteMember = async () => {
    const success = await inviteMemberLogic(inviteUserEmail);
    if (success) {
      setInviteUserEmail('');
      setShowInviteModal(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { name: selectedProject.name }, { merge: true });
      toast.success("Cập nhật dự án thành công.");
    } catch (error) { handleFirestoreError(error, 'update', 'projects'); }
  };

  const handleDeleteProject = async (projectToDelete: any) => {
    if (!user || !projectToDelete) return;
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;

    const deleteTimeout = setTimeout(async () => {
      try {
        await deleteDoc(doc(db, 'projects', projectId)); 
        
        await addDoc(collection(db, 'activity_logs'), {
          action: 'PROJECT_DELETED',
          details: `Dự án ${projectName} đã bị giải phóng vĩnh viễn khỏi hệ thống.`,
          createdAt: serverTimestamp(),
          userId: user.uid,
          userName: user.displayName || 'Admin'
        });

        toast.success(`Dự án ${projectName} đã được giải phóng.`);
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
          setActiveTab('dashboard');
        }
      } catch (error) { 
        handleFirestoreError(error, 'delete', 'projects'); 
        toast.error("Lỗi giải phóng dự án.");
      }
      delete (window as any)[`timeout_project_${projectId}`];
    }, 5000);

    (window as any)[`timeout_project_${projectId}`] = deleteTimeout;

    toast(`Đang giải phóng Dự án: ${projectName}...`, {
      duration: 5000,
      action: {
        label: "HOÀN TÁC",
        onClick: () => {
          const tId = (window as any)[`timeout_project_${projectId}`];
          if (tId) {
            clearTimeout(tId);
            delete (window as any)[`timeout_project_${projectId}`];
            toast.info(`Đã khôi phục Dự án: ${projectName}.`);
          }
        }
      }
    });
  };

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim() || !user) return;
    if (!selectedProject) {
      toast.error("Vui lòng chọn không gian làm việc để triển khai.");
      return;
    }
    
    let docId = '';
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId: selectedProject.id,
        title: quickAddTitle.trim(),
        description: 'Khởi tạo nhiệm vụ chiến lược qua giao thức nhanh.',
        status: 'backlog',
        priority: quickAddPriority,
        creatorId: user.uid,
        ownerId: user.uid,
        members: [user.uid],
        dueDate: quickAddDueDate || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      docId = docRef.id;
      
      setQuickAddTitle('');
      setQuickAddDueDate('');
      setShowQuickAdd(false);
      toast.success("Nhiệm vụ chiến lược đã được triển khai");
    } catch (e: any) { 
      handleFirestoreError(e, 'create', 'bugs');
      toast.error(`Lỗi nhiệm vụ: ${e.code}`);
      return;
    }

    try {
      const logMessage = `Triển khai nhiệm vụ chiến lược: ${quickAddTitle.trim()}`;
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        bugId: docId,
        action: 'BUG_CREATED',
        details: logMessage,
        userId: user.uid,
        userName: user.displayName || 'Hệ thống',
        userPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });
    } catch (e: any) { 
      console.warn("Lỗi nhật ký:", e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 relative">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
            className="w-full h-full border border-slate-200 border-t-slate-900 rounded-full" 
          />
        </div>
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">Khởi tạo hệ thống Zenith</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30">
      <MatrixBackground />
      
      {!user ? (
        <LoginPage handleLogin={handleLogin} onShowDocs={() => setShowDocsModal(true)} />
      ) : (
        <MainLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          handleLogout={handleLogout}
          selectedProject={selectedProject}
          projects={projects}
          setSelectedProject={setSelectedProject}
          setShowProjectModal={setShowProjectModal}
          setShowInviteModal={setShowInviteModal}
          setShowSettingsModal={setShowSettingsModal}
          handleDeleteProject={handleDeleteProject}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <div key="dashboard" className="w-full">
                <DashboardPage 
                  appStats={appStats}
                  currentTime={currentTime}
                  bugs={bugs}
                  events={events}
                  overdueTasks={overdueTasks}
                  userProfiles={userProfiles}
                  pendingInvitations={pendingInvitations}
                  handleAcceptInvitation={handleAcceptInvitation}
                  handleDeclineInvitation={handleDeclineInvitation}
                  setActiveTab={setActiveTab}
                  setShowProjectModal={setShowProjectModal}
                  setShowInviteModal={setShowInviteModal}
                  setShowQuickAdd={setShowQuickAdd}
                />
              </div>
            )}

            {activeTab === 'board' && (
              <div key="board" className="h-full">
                 <KanbanBoard 
                    selectedProject={selectedProject}
                    userId={user.uid}
                    userProfiles={userProfiles}
                    bugs={bugs}
                    isAdmin={isAdmin}
                    setShowQuickAdd={setShowQuickAdd}
                    currentTime={currentTime}
                    handleUpdateUserRoles={handleUpdateUserRoles}
                    handleRemoveMember={handleRemoveMember}
                 />
              </div>
            )}

            {activeTab === 'metrics' && (
              <MetricsPage 
                bugs={bugs} 
                projects={projects}
                selectedProject={selectedProject}
                appStats={appStats} 
                setActiveTab={setActiveTab} 
              />
            )}

            {activeTab === 'logs' && (
              <LogsPage 
                selectedProject={selectedProject}
                projects={projects}
                userId={user?.uid || ''}
                userProfiles={userProfiles}
              />
            )}

            {activeTab === 'members' && (
              <MembersPage 
                userProfiles={userProfiles}
                selectedProject={selectedProject}
                isAdmin={isAdmin}
                userId={user.uid}
                setShowInviteModal={setShowInviteModal}
                handleRemoveMember={handleRemoveMember}
                handleUpdateUserRoles={handleUpdateUserRoles}
              />
            )}
          </AnimatePresence>
        </MainLayout>
      )}

      {/* Global Modals */}
      <ProjectModal 
        show={showProjectModal} 
        onClose={() => setShowProjectModal(false)}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        handleCreateProject={handleCreateProject}
      />

      <InviteModal 
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteUserEmail={inviteUserEmail}
        setInviteUserEmail={setInviteUserEmail}
        handleInviteMember={handleInviteMember}
      />

      {user && (
        <SettingsModal 
          show={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          user={user}
          handleUpdateProject={handleUpdateProject}
          handleDeleteProject={() => handleDeleteProject(selectedProject)}
        />
      )}

      <DocsModal 
        show={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      <QuickAddModal 
        show={showQuickAdd} 
        onClose={() => setShowQuickAdd(false)}
        title={quickAddTitle}
        setTitle={setQuickAddTitle}
        priority={quickAddPriority}
        setPriority={setQuickAddPriority}
        dueDate={quickAddDueDate}
        setDueDate={setQuickAddDueDate}
        onSubmit={handleQuickAdd}
      />

      <Toaster position="top-right" />
    </div>
  );
}
