import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomGroupConfig {
  allowed_city_ids: string[];
  allowed_flight_ids: string[];
  allowed_hotel_ids: string[];
  discount_percent: number;
  discount_fixed: number;
  is_enabled: boolean;
}

const DEFAULT_CONFIG: CustomGroupConfig = {
  allowed_city_ids: [],
  allowed_flight_ids: [],
  allowed_hotel_ids: [],
  discount_percent: 0,
  discount_fixed: 0,
  is_enabled: true,
};

const SETTING_KEY = "custom_group_config";

export function useCustomGroupSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["custom-group-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;
      return { ...DEFAULT_CONFIG, ...(data.setting_value as any) } as CustomGroupConfig;
    },
  });

  const mutation = useMutation({
    mutationFn: async (config: CustomGroupConfig) => {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ setting_value: config as any })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({ setting_key: SETTING_KEY, setting_value: config as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-group-settings"] });
      toast.success("Custom group settings saved");
    },
    onError: (err: any) => {
      toast.error("Failed to save settings: " + err.message);
    },
  });

  return {
    config: query.data || DEFAULT_CONFIG,
    isLoading: query.isLoading,
    saveConfig: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
