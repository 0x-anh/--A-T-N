import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          
          // 1. Get existing doc to check roles
          import('firebase/firestore').then(async ({ getDoc }) => {
            const userSnap = await getDoc(userRef);
            const userData = userSnap.exists() ? userSnap.data() : null;

            // 2. Update basic info
            const profileData: any = {
              userId: u.uid,
              displayName: u.displayName || 'Anonymous User',
              email: u.email,
              photoURL: u.photoURL || '',
            };

            // 3. ONLY set default role if it doesn't exist yet
            if (!userData || !userData.roles || userData.roles.length === 0) {
              profileData.roles = ['viewer'];
            }

            await setDoc(userRef, profileData, { merge: true });
          });
        } catch (e) {
          console.error("Profile sync failed:", e);
        }
      } else {
        setLoading(false); // Only stop loading here if no user
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfiles([]);
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => ({ 
        userId: doc.id, 
        ...doc.data() 
      } as UserProfile)));
      setLoading(false); // Stop loading once profiles are in
    }, (error) => {
      console.warn("User profile sync limited");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      toast.success("Chào mừng trở lại");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error("Xác thực thất bại");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return userProfiles.find(u => u.userId === user.uid) || null;
  }, [user, userProfiles]);

  const isAdmin = useMemo(() => {
    if (!user || !currentUserProfile) return false;
    // Đã gỡ bỏ quyền Admin thông thường. Chỉ giữ lại email chủ hệ thống để bảo trì.
    return currentUserProfile.email === 'jokerducanh@gmail.com';
  }, [user, currentUserProfile]);

  return {
    user,
    loading,
    userProfiles,
    currentUserProfile,
    isAdmin,
    handleLogin,
    handleLogout
  };
};
