import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
  event_type: string;
  entity_name: string | null;
  description: string | null;
  user_email: string | null;
}

export interface AuditLogFilters {
  eventType?: string;
  tableName?: string;
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ["audit-logs", filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.eventType && filters.eventType !== "all") {
        query = query.eq("event_type", filters.eventType);
      }
      if (filters.tableName && filters.tableName !== "all") {
        query = query.eq("table_name", filters.tableName);
      }
      if (filters.action && filters.action !== "all") {
        query = query.eq("action", filters.action);
      }
      if (filters.search) {
        query = query.or(
          `entity_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        logs: (data || []) as unknown as AuditLog[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}
