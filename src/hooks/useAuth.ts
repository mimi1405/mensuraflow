import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Authentication Hook
 *
 * Manages user authentication state and session management.
 * Handles initial session loading and auth state change subscriptions.
 */
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        setHasProjects((projects?.length ?? 0) > 0);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    loading,
    hasProjects,
    setHasProjects,
    handleLogout
  };
}
