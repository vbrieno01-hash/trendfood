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
  pix_key?: string | null;
  paused?: boolean;
  business_hours?: any;
  store_address?: string | null;
  delivery_config?: any;
  pix_confirmation_mode?: "direct" | "manual" | "automatic";
  banner_url?: string | null;
  printer_width?: '58mm' | '80mm';
  print_mode?: 'browser' | 'desktop' | 'bluetooth';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  organizations: Organization[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshOrganizationForUser: (userId: string) => Promise<void>;
  switchOrganization: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  organizations: [],
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshOrganization: async () => {},
  refreshOrganizationForUser: async () => {},
  switchOrganization: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const orgsRef = useRef<Organization[]>([]);

  const PLAN_LABELS: Record<string, string> = {
    free: "Gratuito",
    pro: "Pro",
    enterprise: "Enterprise",
    lifetime: "Vitalício",
  };

  const fetchOrganization = async (userId: string) => {
    try {
      const [{ data: orgData }, { data: roleData }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, description, emoji, primary_color, logo_url, user_id, created_at, whatsapp, subscription_status, subscription_plan, onboarding_done, trial_ends_at, pix_key, paused, business_hours, store_address, delivery_config, pix_confirmation_mode, banner_url, printer_width, courier_config, print_mode")
          .eq("user_id", userId),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
      ]);
      if (isMounted.current) {
        const orgs = (orgData ?? []) as Organization[];
        setOrganizations(orgs);
        orgsRef.current = orgs;
        // Keep current selection if still valid, otherwise pick first
        setActiveOrgId((prev) => {
          if (prev && orgs.some((o) => o.id === prev)) return prev;
          return orgs[0]?.id ?? null;
        });
        setIsAdmin(!!roleData);
      }
    } catch {
      if (isMounted.current) {
        setOrganizations([]);
        orgsRef.current = [];
        setActiveOrgId(null);
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

  const switchOrganization = (orgId: string) => {
    const found = orgsRef.current.find((o) => o.id === orgId);
    if (found) setActiveOrgId(orgId);
  };

  // Derive active organization
  const organization = organizations.find((o) => o.id === activeOrgId) ?? organizations[0] ?? null;

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
          setOrganizations([]);
          setActiveOrgId(null);
          setIsAdmin(false);
          setLoading(false);
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

    const safetyTimeout = setTimeout(() => {
      if (isMounted.current) setLoading(false);
    }, 5000);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Realtime: listen for plan updates on the user's active organization
  useEffect(() => {
    const orgId = organization?.id;
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
          const prev = orgsRef.current.find((o) => o.id === orgId);
          if (prev && newData.subscription_plan !== prev.subscription_plan) {
            const label = PLAN_LABELS[newData.subscription_plan] || newData.subscription_plan;
            toast.success(`Seu plano foi atualizado para ${label}! As novas funcionalidades já estão disponíveis.`);
          }
          // Update the org in the array
          setOrganizations((prev) =>
            prev.map((o) => (o.id === orgId ? newData : o))
          );
          orgsRef.current = orgsRef.current.map((o) => (o.id === orgId ? newData : o));
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
    setOrganizations([]);
    setActiveOrgId(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, organization, organizations, isAdmin, loading, signOut, refreshOrganization, refreshOrganizationForUser, switchOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
