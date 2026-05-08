import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Project, BugPriority } from '../types';
import { toast } from 'sonner';
import { User } from 'firebase/auth';

export const useQuickAdd = (user: User | null, selectedProject: Project | null) => {
  const { t } = useTranslation();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<BugPriority>('medium');
  const [quickAddDueDate, setQuickAddDueDate] = useState('');

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim() || !user) return;
    if (!selectedProject) {
      toast.error(t('toasts.quick_add_no_project'));
      return;
    }
    
    let docId = '';
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId: selectedProject.id,
        title: quickAddTitle.trim(),
        description: t('kanban.quick_add_description'),
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
      setQuickAddPriority('medium');
      setShowQuickAdd(false);
      toast.success(t('toasts.task_deployed'));
    } catch (e: any) { 
      handleFirestoreError(e, 'create', 'bugs');
      toast.error(t('toasts.task_failed', { code: e.code }));
      return;
    }

    try {
      const logMessage = t('logs.task_deployed_log', { title: quickAddTitle.trim() });
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        bugId: docId,
        action: 'BUG_CREATED',
        details: logMessage,
        userId: user.uid,
        userName: user.displayName || t('logs.system_user'),
        userPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });
    } catch (e: any) { 
      console.warn("Log error:", e.message);
    }
  };

  return {
    showQuickAdd,
    setShowQuickAdd,
    quickAddTitle,
    setQuickAddTitle,
    quickAddPriority,
    setQuickAddPriority,
    quickAddDueDate,
    setQuickAddDueDate,
    handleQuickAdd
  };
};
