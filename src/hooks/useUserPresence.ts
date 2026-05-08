import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (!user) return;
    
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: serverTimestamp()
        });
      } catch (e) {
        console.error("Presence sync failed:", e);
      }
    };

    // Update on mount
    updatePresence();

    // Update every 2 minutes if the page is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [user]);
};
