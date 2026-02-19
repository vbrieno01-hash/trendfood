import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
  whatsapp?: string | null;
  subscription_status: string;
  subscription_plan: string;
  onboarding_done: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshOrganizationForUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshOrganization: async () => {},
  refreshOrganizationForUser: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchOrganization = async (userId: string) => {
    try {
      const [{ data: orgData }, { data: roleData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
      ]);
      if (isMounted.current) {
        setOrganization(orgData as Organization | null);
        setIsAdmin(!!roleData);
      }
    } catch {
      if (isMounted.current) {
        setOrganization(null);
        setIsAdmin(false);
      }
    }
  };

  const refreshOrganization = async () => {
    if (user) await fetchOrganization(user.id);
  };

  const refreshOrganizationForUser = async (userId: string) => {
    await fetchOrganization(userId);
  };

  useEffect(() => {
    isMounted.current = true;

    // 1. Set up listener FIRST — no awaits inside the callback (prevents Supabase auth lock deadlock)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const userId = newSession.user.id;
          setTimeout(() => {
            if (isMounted.current) {
              fetchOrganization(userId).finally(() => {
                if (isMounted.current) setLoading(false);
              });
            }
          }, 0);
        } else {
          setOrganization(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // 2. Get initial session — responsible for setting loading = false
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted.current) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchOrganization(initialSession.user.id).finally(() => {
          if (isMounted.current) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOrganization(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, organization, isAdmin, loading, signOut, refreshOrganization, refreshOrganizationForUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

