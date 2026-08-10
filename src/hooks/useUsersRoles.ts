import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string | null;
  role: AppRole | null;
}

export const useUsersRoles = () => {
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (currentUserRole !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company_name: profile.company_name,
        phone: profile.phone,
        created_at: profile.created_at,
        role: roles?.find(r => r.user_id === profile.id)?.role || null,
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only admins can update roles');
      return false;
    }

    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast.success('Role updated successfully');
      return true;
    } catch (err: any) {
      toast.error('Failed to update role: ' + err.message);
      return false;
    }
  };

  const getRoleStats = () => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const finance = users.filter(u => u.role === 'finance').length;
    const agencies = users.filter(u => u.role === 'agency').length;

    return { total, admins, finance, agencies };
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUserRole]);

  return {
    users,
    loading,
    error,
    updateUserRole,
    getRoleStats,
    refetch: fetchUsers,
    isAdmin: currentUserRole === 'admin',
  };
};
