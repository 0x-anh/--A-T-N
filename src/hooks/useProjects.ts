import { useState, useEffect } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { Project, UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

export const useProjects = (userId: string | undefined, userProfiles: UserProfile[]) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Get current user profile
  const currentUserProfile = userProfiles.find(u => u.userId === userId);
  const isSystemAdmin = currentUserProfile?.roles?.includes('admin') || currentUserProfile?.email === 'jokerducanh@gmail.com';

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setSelectedProject(null);
      setPendingInvitations([]);
      return;
    }

    // Fetch projects
    const qProjects = query(
      collection(db, 'projects'), 
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const projList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
      setProjects(projList);
      if (projList.length > 0 && !selectedProject) {
        const lastId = localStorage.getItem('lastProjectId');
        const found = projList.find(p => p.id === lastId);
        setSelectedProject(found || projList[0]);
      }
    });

    // Fetch pending invitations for this user
    const qInvites = query(
      collection(db, 'invitations'),
      where('targetUserId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubInvites = onSnapshot(qInvites, (snapshot) => {
      setPendingInvitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProjects();
      unsubInvites();
    };
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
        toast.error("Nhân sự này đã là thành viên dự án.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);

      // EVERYONE (including Owners) now sends a formal invitation for a professional flow
      await addDoc(collection(db, 'invitations'), {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        inviterId: userId,
        inviterName: currentUserProfile?.displayName || 'Admin',
        targetUserId: targetUser.userId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      toast.success(`Đã gửi lời mời hệ thống tới ${targetUser.displayName}.`);
      return true;
    } catch (e: any) {
      console.error("Invite error:", e);
      toast.error(`Yêu cầu thất bại: Lỗi hệ thống (${e.code || e.message})`);
      return false;
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    let invite: any = null;
    try {
      invite = pendingInvitations.find(i => i.id === invitationId);
      if (!invite) return;

      const inviteRef = doc(db, 'invitations', invitationId);
      const projectRef = doc(db, 'projects', invite.projectId);

      // 1. Update invitation status
      await updateDoc(inviteRef, {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });

      // 2. Add user to project members
      await updateDoc(projectRef, {
        members: arrayUnion(userId)
      });

      // 3. Log the activity for the Owner to see
      await addDoc(collection(db, 'activity_logs'), {
        projectId: invite.projectId,
        projectName: invite.projectName,
        userId: userId,
        userName: currentUserProfile?.displayName || 'Thành viên mới',
        action: 'INVITATION_ACCEPTED',
        details: `${currentUserProfile?.displayName} đã chấp nhận lời mời tham gia dự án.`,
        createdAt: serverTimestamp()
      });

      toast.success(`Đã gia nhập dự án: ${invite.projectName}`);
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', invite ? `projects/${invite.projectId}` : 'projects');
      toast.error("Lỗi xác nhận lời mời.");
      return false;
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    let invite: any = null;
    try {
      invite = pendingInvitations.find(i => i.id === invitationId);
      if (!invite) return;

      const inviteRef = doc(db, 'invitations', invitationId);

      // 1. Update invitation status
      await updateDoc(inviteRef, {
        status: 'declined',
        respondedAt: serverTimestamp()
      });

      // 2. Log the activity
      await addDoc(collection(db, 'activity_logs'), {
        projectId: invite.projectId,
        projectName: invite.projectName,
        userId: userId,
        userName: currentUserProfile?.displayName || 'Nhân sự',
        action: 'INVITATION_DECLINED',
        details: `${currentUserProfile?.displayName} đã từ chối lời mời tham gia dự án.`,
        createdAt: serverTimestamp()
      });

      toast.info("Đã từ chối lời mời gia nhập.");
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', 'invitations');
      toast.error("Lỗi thực thi lệnh từ chối.");
      return false;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!userId || !selectedProject || memberId === selectedProject.ownerId) return;
    const isOwner = userId === selectedProject.ownerId;
    if (!isOwner && !isSystemAdmin) {
      toast.error("Yêu cầu quyền quản trị viên dự án.");
      return;
    }

    const memberProfile = userProfiles.find(u => u.userId === memberId);
    const displayName = memberProfile?.displayName || "Nhân sự";

    // CLEANER UNDO LOGIC: Use explicit setTimeout
    const deleteTimeout = setTimeout(async () => {
      try {
        const projectRef = doc(db, 'projects', selectedProject.id);
        await updateDoc(projectRef, { 
          members: arrayRemove(memberId) 
        });

        // LOG THE REMOVAL
        await addDoc(collection(db, 'activity_logs'), {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          userId: userId,
          userName: currentUserProfile?.displayName || 'Admin',
          action: 'MEMBER_REMOVED',
          details: `Hệ thống đã giải phóng nhân sự ${displayName} khỏi dự án.`,
          createdAt: serverTimestamp()
        });

        toast.success(`Đã chính thức giải phóng ${displayName} khỏi hệ thống.`);
      } catch (e) {
        handleFirestoreError(e, 'update', `projects/${selectedProject.id}`);
        toast.error("Lỗi vận hành hệ thống: Không thể xóa.");
      }
      delete (window as any)[`timeout_${memberId}`];
    }, 5000);

    // Store timeout ID to allow cancellation
    (window as any)[`timeout_${memberId}`] = deleteTimeout;

    toast(`Đang giải phóng Node ${displayName}...`, {
      duration: 5000,
      action: {
        label: "HOÀN TÁC",
        onClick: () => {
          const tId = (window as any)[`timeout_${memberId}`];
          if (tId) {
            clearTimeout(tId);
            delete (window as any)[`timeout_${memberId}`];
            toast.info(`Đã hủy lệnh giải phóng ${displayName}.`);
          }
        }
      }
    });

    return true;
  };

  const handleUpdateUserRoles = async (targetUserId: string, newRoles: UserRole[]) => {
    if (!userId || !isSystemAdmin) {
      toast.error("Yêu cầu quyền quản trị viên hệ thống.");
      return;
    }
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { roles: newRoles });
      toast.success("Vai trò nhân sự đã được cập nhật.");
      return true;
    } catch (e) {
      toast.error("Cập nhật vai trò thất bại.");
      return false;
    }
  };

  return {
    projects,
    selectedProject,
    setSelectedProject,
    pendingInvitations,
    handleInviteMember,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRemoveMember,
    handleUpdateUserRoles
  };
};
