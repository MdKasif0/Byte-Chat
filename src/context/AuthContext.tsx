"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        const userStatusRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userStatusRef, { 
                isOnline: true,
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            // User document might not exist yet during profile setup
            // It will be created in ProfileSetupDialog
        }
      }
    });

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
        if (auth.currentUser) {
            const userStatusRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userStatusRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            });
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        unsubscribe();
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (auth.currentUser) {
            const userStatusRef = doc(db, 'users', auth.currentUser.uid);
            updateDoc(userStatusRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            });
        }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
