import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'sonner';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useProjectData } from './hooks/useProjectData';
import { useQuickAdd } from './hooks/useQuickAdd';
import { useUserPresence } from './hooks/useUserPresence';

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
import ModalsContainer from './components/layout/ModalsContainer';

import { db, handleFirestoreError } from './lib/firebase';
import { 
  addDoc, collection, serverTimestamp, doc, setDoc, deleteDoc, 
  getDocs, writeBatch, query, where, updateDoc 
} from 'firebase/firestore';
import type { BugPriority, UserRole } from './types';

export default function App() {
  const { t } = useTranslation();
  const { user, loading, userProfiles, currentUserProfile, isAdmin, handleLogin, handleLogout } = useAuth();
  const { 
    projects, selectedProject, setSelectedProject, 
    pendingInvitations, sentInvitations,
    handleInviteMember: inviteMemberLogic, 
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRemoveMember,
    handleUpdateUserRoles,
    handleCreateProject: createProjectLogic,
    handleUpdateProject: updateProjectLogic,
    handleDeleteProject: deleteProjectLogic
  } = useProjects(user?.uid, userProfiles);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  const {
    showQuickAdd, setShowQuickAdd,
    quickAddTitle, setQuickAddTitle,
    quickAddPriority, setQuickAddPriority,
    quickAddDueDate, setQuickAddDueDate,
    handleQuickAdd
  } = useQuickAdd(user, selectedProject);

  const { bugs, events, overdueTasks, urgentTasks, appStats } = useProjectData(user, selectedProject, userProfiles, currentTime, projects);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Watch for role changes to notify the current user (ADD only)
  const prevRolesRef = useRef<UserRole[] | null>(null);
  useEffect(() => {
    if (currentUserProfile?.roles) {
      const currentRoles = [...currentUserProfile.roles].sort();
      
      if (prevRolesRef.current === null) {
        console.log("[ZENITH_WATCHER] First load roles:", currentRoles);
        prevRolesRef.current = currentRoles;
        return;
      }

      const prevRoles = [...prevRolesRef.current].sort();
      const currentStr = JSON.stringify(currentRoles);
      const prevStr = JSON.stringify(prevRoles);
      const hasChanged = currentStr !== prevStr;
      
      console.log("[ZENITH_WATCHER] Data Sync:", { 
        current: currentRoles, 
        prev: prevRoles,
        hasChanged 
      });

      if (hasChanged) {
        const addedRole = currentRoles.find(r => !prevRoles.includes(r));
        
        if (addedRole) {
          console.log("[ZENITH_WATCHER] !!! TRIGGERING TOAST !!! Role:", addedRole);
          toast.info(`HỆ THỐNG: Cấp quyền ${t(`members.${addedRole}`).toUpperCase()}`, {
            description: "Vai trò của bạn đã được quản trị viên cập nhật thành công.",
            duration: 5000,
            position: 'top-right'
          });
        }
        prevRolesRef.current = currentRoles;
      }
    }
  }, [currentUserProfile, t]); // Watch entire profile for better reactivity

  useUserPresence(user);

  const handleCreateProject = async () => {
    const success = await createProjectLogic(newProjectName);
    if (success) {
      setNewProjectName('');
      setShowProjectModal(false);
    }
  };

  const handleInviteMember = async () => {
    const success = await inviteMemberLogic(inviteUserEmail);
    if (success) {
      setInviteUserEmail('');
      setShowInviteModal(false);
    }
  };

  const handleUpdateProject = async () => {
    if (selectedProject) {
      await updateProjectLogic(selectedProject);
    }
  };

  const handleDeleteProject = async (project: any) => {
    if (project) {
      await deleteProjectLogic(project.id, project.name);
    }
  };



  // Expose modal trigger for sub-components


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
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">{t('app.initializing')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 relative">
      <MatrixBackground />
      
      {!user ? (
        <LoginPage handleLogin={handleLogin} onShowDocs={() => setShowDocsModal(true)} />
      ) : (
        <MainLayout
          key={user.uid}
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
          isAdmin={isAdmin}
        >
          {activeTab === 'dashboard' && (
            <DashboardPage 
              appStats={appStats}
              currentTime={currentTime}
              bugs={bugs}
              events={events}
              overdueTasks={overdueTasks}
              userProfiles={userProfiles}
              currentUserProfile={currentUserProfile || undefined}
              isAdmin={isAdmin}
              projects={projects}
              pendingInvitations={pendingInvitations}
              handleAcceptInvitation={handleAcceptInvitation}
              handleDeclineInvitation={handleDeclineInvitation}
              setActiveTab={setActiveTab}
              setShowProjectModal={setShowProjectModal}
              setShowInviteModal={setShowInviteModal}
              setShowQuickAdd={setShowQuickAdd}
            />
          )}

          {activeTab === 'board' && (
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
              isOwner={selectedProject?.ownerId === user?.uid}
              userId={user?.uid || ''}
              setShowInviteModal={setShowInviteModal}
              handleRemoveMember={handleRemoveMember}
              handleUpdateUserRoles={handleUpdateUserRoles}
              sentInvitations={sentInvitations}
            />
          )}
        </MainLayout>
      )}

      <ModalsContainer 
        user={user}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        showProjectModal={showProjectModal}
        setShowProjectModal={setShowProjectModal}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        handleCreateProject={handleCreateProject}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        inviteUserEmail={inviteUserEmail}
        setInviteUserEmail={setInviteUserEmail}
        handleInviteMember={handleInviteMember}
        showSettingsModal={showSettingsModal}
        setShowSettingsModal={setShowSettingsModal}
        handleUpdateProject={handleUpdateProject}
        handleDeleteProject={handleDeleteProject}
        showDocsModal={showDocsModal}
        setShowDocsModal={setShowDocsModal}
        showQuickAdd={showQuickAdd}
        setShowQuickAdd={setShowQuickAdd}
        quickAddTitle={quickAddTitle}
        setQuickAddTitle={setQuickAddTitle}
        quickAddPriority={quickAddPriority}
        setQuickAddPriority={setQuickAddPriority}
        quickAddDueDate={quickAddDueDate}
        setQuickAddDueDate={setQuickAddDueDate}
        handleQuickAdd={handleQuickAdd}
      />
    </div>
  );
}
