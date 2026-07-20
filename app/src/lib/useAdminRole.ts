import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface AdminRole {
  isSuperAdmin: boolean;
  /** null = Super Admin (accès à tous les événements) ; string[] = IDs accessibles */
  accessibleEventIds: string[] | null;
  loading: boolean;
}

export function useAdminRole(): AdminRole {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [accessibleEventIds, setAccessibleEventIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: role } = await supabase
        .from('admin_roles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (role?.is_super_admin) {
        setIsSuperAdmin(true);
        setAccessibleEventIds(null);
      } else {
        const { data: accesses } = await supabase
          .from('evenement_admins')
          .select('evenement_id')
          .eq('user_id', user.id);
        if (!cancelled) {
          setAccessibleEventIds(accesses?.map((a: any) => a.evenement_id) ?? []);
        }
      }

      if (!cancelled) setLoading(false);
    }

    fetchRole();
    return () => { cancelled = true; };
  }, []);

  return { isSuperAdmin, accessibleEventIds, loading };
}
