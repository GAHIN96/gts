import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RolePermission {
  id: string;
  role: string;
  module: string;
  permission: string;
  enabled: boolean;
}

// All modules and their available permissions
export const PERMISSION_MODULES = {
  packages: { label: "Group Packages", permissions: ["view", "create", "edit", "delete"] },
  flights: { label: "Flights", permissions: ["view", "create", "edit", "delete"] },
  hotels: { label: "Hotels", permissions: ["view", "create", "edit", "delete"] },
  tours: { label: "Tours", permissions: ["view", "create", "edit", "delete"] },
  visas: { label: "Visas", permissions: ["view", "create", "edit", "delete"] },
  transfers: { label: "Transfers", permissions: ["view", "create", "edit", "delete"] },
  special_requests: { label: "Special Requests", permissions: ["view", "create", "edit", "delete"] },
  additional_services: { label: "Additional Services", permissions: ["view", "create", "edit", "delete"] },
  bookings: { label: "Bookings", permissions: ["view", "create", "edit", "delete", "approve"] },
  payments: { label: "Payments", permissions: ["view", "create", "approve", "reject"] },
  agencies: { label: "Agencies", permissions: ["view", "create", "edit", "delete"] },
  users: { label: "Users & Roles", permissions: ["view", "create", "edit", "delete"] },
  reports: { label: "Reports", permissions: ["view", "export"] },
  settings: { label: "Settings", permissions: ["view", "edit"] },
  audit_logs: { label: "Audit Logs", permissions: ["view"] },
  commission: { label: "Commission", permissions: ["view", "edit"] },
  administration: { label: "Administration", permissions: ["view", "edit"] },
} as const;

export type ModuleKey = keyof typeof PERMISSION_MODULES;
export type PermissionAction = string;

export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("module")
        .order("permission");
      if (error) throw error;
      return (data || []) as unknown as RolePermission[];
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("role_permissions")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
}

export function useMyPermissions() {
  const { role } = useAuth();
  return useQuery({
    queryKey: ["my-permissions", role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("module, permission, enabled")
        .eq("role", role);
      if (error) throw error;
      return (data || []) as unknown as { module: string; permission: string; enabled: boolean }[];
    },
    enabled: !!role,
  });
}

export function useHasPermission() {
  const { data: permissions, isLoading } = useMyPermissions();
  const { role } = useAuth();

  const hasPermission = (module: ModuleKey, action: PermissionAction): boolean => {
    // Admin always has access as a fallback if no permissions loaded yet
    if (isLoading && role === "admin") return true;
    if (!permissions) return role === "admin";

    const perm = permissions.find(
      (p) => p.module === module && p.permission === action
    );
    // If no permission record exists, fall back to role-based defaults
    if (!perm) return role === "admin";
    return perm.enabled;
  };

  const canView = (module: ModuleKey) => hasPermission(module, "view");
  const canCreate = (module: ModuleKey) => hasPermission(module, "create");
  const canEdit = (module: ModuleKey) => hasPermission(module, "edit");
  const canDelete = (module: ModuleKey) => hasPermission(module, "delete");

  return { hasPermission, canView, canCreate, canEdit, canDelete, isLoading };
}
