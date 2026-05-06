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

import { db } from './lib/firebase';
import { addDoc, collection, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError } from './lib/firebase';

export default function App() {
  const { user, loading, userProfiles, isAdmin, handleLogin, handleLogout } = useAuth();
  const { 
    projects, selectedProject, setSelectedProject, 
    handleInviteMember: inviteMemberLogic, 
    handleRemoveMember 
  } = useProjects(user?.uid, userProfiles);
  
  const { bugs, events, overdueTasks, urgentTasks, appStats } = useProjectData(user, selectedProject, userProfiles);

  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

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

  const handleDeleteProject = async () => {
    if (!user || !selectedProject) return;
    if (confirm('Xác nhận xóa dự án? Hành động này không thể hoàn tác.')) {
      try {
        await deleteDoc(doc(db, 'projects', selectedProject.id)); 
        toast.success("Dự án đã được giải phóng.");
        setShowSettingsModal(false);
        setSelectedProject(null);
        setActiveTab('dashboard');
      } catch (error) { handleFirestoreError(error, 'delete', 'projects'); }
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

  if (!user) {
    return (
      <div className="min-h-screen font-sans selection:bg-indigo-500/30">
        <MatrixBackground />
        <LoginPage handleLogin={handleLogin} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30">
      <MatrixBackground />
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
                setActiveTab={setActiveTab}
                setShowProjectModal={setShowProjectModal}
                setShowInviteModal={setShowInviteModal}
              />
            </div>
          )}

          {activeTab === 'board' && (
            <div key="board" className="h-full">
               <KanbanBoard 
                  projectId={selectedProject?.id || ''}
                  userId={user.uid}
                  userProfiles={userProfiles}
                  bugs={bugs}
                  isProjectOwner={user.uid === selectedProject?.ownerId}
               />
            </div>
          )}

          {activeTab === 'metrics' && (
            <MetricsPage bugs={bugs} appStats={appStats} />
          )}

          {activeTab === 'logs' && (
            <LogsPage 
              projectId={selectedProject?.id || ''} 
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
            />
          )}
        </AnimatePresence>
      </MainLayout>

      {/* Modals */}
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

      <SettingsModal 
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        user={user}
        handleUpdateProject={handleUpdateProject}
        handleDeleteProject={handleDeleteProject}
      />

      <DocsModal 
        show={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
