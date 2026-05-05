import { useState, useEffect } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Project, UserProfile } from '../types';
import { toast } from 'sonner';

export const useProjects = (userId: string | undefined, userProfiles: UserProfile[]) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }
    const q = query(
      collection(db, 'projects'), 
      where('members', 'array-contains', userId),
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
  }, [userId]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('lastProjectId', selectedProject.id);
    }
  }, [selectedProject]);

  const handleInviteMember = async (inviteUserEmail: string) => {
    if (!inviteUserEmail.trim() || !userId || !selectedProject) return;
    try {
      const targetUser = userProfiles.find(u => u.email === inviteUserEmail.trim());
      if (!targetUser) {
        toast.error("Không tìm thấy nhân sự trong hệ thống.");
        return;
      }
      if (selectedProject.members.includes(targetUser.userId)) {
        toast.error("Nhân sự này đã được gán vào dự án này.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = [...selectedProject.members, targetUser.userId];
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      
      toast.success(`Nhân sự ${targetUser.displayName} đã được thêm vào.`);
      return true;
    } catch (e) {
      toast.error("Mời thành viên thất bại.");
      return false;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!userId || !selectedProject || memberId === selectedProject.ownerId) return;
    if (userId !== selectedProject.ownerId) {
      toast.error("Yêu cầu quyền quản trị viên dự án.");
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = selectedProject.members.filter(id => id !== memberId);
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      toast.success("Quyền truy cập đã bị thu hồi.");
      return true;
    } catch (e) {
      toast.error("Xóa thành viên thất bại.");
      return false;
    }
  };

  return {
    projects,
    selectedProject,
    setSelectedProject,
    handleInviteMember,
    handleRemoveMember
  };
};
