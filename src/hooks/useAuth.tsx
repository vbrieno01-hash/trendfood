import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  trial_ends_at?: string | null;
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
  const orgRef = useRef<Organization | null>(null);

  const PLAN_LABELS: Record<string, string> = {
    free: "Gratuito",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const fetchOrganization = async (userId: string) => {
    try {
      const [{ data: orgData }, { data: roleData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, description, emoji, primary_color, logo_url, user_id, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at")
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
        const org = orgData as Organization | null;
        setOrganization(org);
        orgRef.current = org;
        setIsAdmin(!!roleData);
      }
    } catch {
      if (isMounted.current) {
        setOrganization(null);
        orgRef.current = null;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const userId = newSession.user.id;
          if (_event === "SIGNED_IN") {
            setLoading(true);
          }
          setTimeout(async () => {
            if (isMounted.current) {
              await fetchOrganization(userId);
              if (isMounted.current) setLoading(false);
            }
          }, 0);
        } else {
          setOrganization(null);
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted.current) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchOrganization(initialSession.user.id).then(() => {
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

  // Realtime: listen for plan updates on the user's organization
  useEffect(() => {
    const orgId = orgRef.current?.id;
    if (!orgId) return;

    const channel = supabase
      .channel('org-plan-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${orgId}`,
        },
        (payload) => {
          const newData = payload.new as Organization;
          const prev = orgRef.current;
          if (prev && newData.subscription_plan !== prev.subscription_plan) {
            const label = PLAN_LABELS[newData.subscription_plan] || newData.subscription_plan;
            toast.success(`Seu plano foi atualizado para ${label}! As novas funcionalidades já estão disponíveis.`);
          }
          setOrganization(newData);
          orgRef.current = newData;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

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

