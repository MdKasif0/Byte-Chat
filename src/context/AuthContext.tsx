"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(profileData as Profile | null);

          // Set user online
          await supabase.from('profiles').update({ 
              is_online: true,
              last_seen: new Date().toISOString() 
          }).eq('id', currentUser.id);

        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    const handleBeforeUnload = async () => {
        if (user) {
            await supabase.from('profiles').update({ 
                is_online: false,
                last_seen: new Date().toISOString()
            }).eq('id', user.id);
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        subscription.unsubscribe();
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (user) {
             supabase.from('profiles').update({ 
                is_online: false,
                last_seen: new Date().toISOString()
            }).eq('id', user.id);
        }
    };
  }, [supabase, user]);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
