import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TermsConditionsSettings {
  content: string;
  isEnabled: boolean;
}

const defaultSettings: TermsConditionsSettings = {
  content: "",
  isEnabled: false,
};

const SETTING_KEY = "terms_conditions";

export function useTermsConditions() {
  const [settings, setSettings] = useState<TermsConditionsSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        const parsed = data.setting_value as Record<string, unknown>;
        setSettings({
          content: (parsed.content as string) || "",
          isEnabled: (parsed.isEnabled as boolean) ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updates: Partial<TermsConditionsSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ setting_value: newSettings })
          .eq("setting_key", SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({
          setting_key: SETTING_KEY,
          setting_value: newSettings,
        });
        if (error) throw error;
      }

      toast.success("Terms & Conditions saved");
    } catch (error) {
      console.error("Error saving terms:", error);
      toast.error("Failed to save Terms & Conditions");
    }
  };

  return { settings, isLoading, saveSettings, refetch: fetchSettings };
}
