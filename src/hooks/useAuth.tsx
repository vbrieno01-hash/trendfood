import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  user_id: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshOrganizationForUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  loading: true,
  signOut: async () => {},
  refreshOrganization: async () => {},
  refreshOrganizationForUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async (userId: string) => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setOrganization(data as Organization | null);
  };

  const refreshOrganization = async () => {
    if (user) await fetchOrganization(user.id);
  };

  const refreshOrganizationForUser = async (userId: string) => {
    await fetchOrganization(userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchOrganization(session.user.id);
        } else {
          setOrganization(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrganization(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, organization, loading, signOut, refreshOrganization, refreshOrganizationForUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
