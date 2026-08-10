import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActiveSections {
  transfers: boolean;
  tours: boolean;
  requests: boolean;
  visas: boolean;
  flights: boolean;
  hotels: boolean;
  packages: boolean;
  build_custom: boolean;
}

export const defaultActiveSections: ActiveSections = {
  transfers: true,
  tours: true,
  requests: true,
  visas: true,
  flights: true,
  hotels: true,
  packages: true,
  build_custom: true,
};

const SETTING_KEY = "active_sections";
const STORAGE_KEY = "gts_active_sections";

export function getStoredActiveSections(): ActiveSections {
  if (typeof window === "undefined") return defaultActiveSections;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultActiveSections, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Error reading stored active sections", e);
  }
  return defaultActiveSections;
}

export function useActiveSections() {
  const [sections, setSections] = useState<ActiveSections>(getStoredActiveSections);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        ;

      if (error) throw error;

      if (data?.setting_value) {
        const parsed = data.setting_value as Partial<ActiveSections>;
        const updated = { ...defaultActiveSections, ...parsed };
        setSections(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Error fetching active sections settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync across tabs & components
  useEffect(() => {
    const handleUpdate = () => {
      setSections(getStoredActiveSections());
    };
    window.addEventListener("active-sections-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("active-sections-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const saveSections = async (newSections: ActiveSections) => {
    setSections(newSections);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSections));
    window.dispatchEvent(new Event("active-sections-updated"));

    try {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", SETTING_KEY)
        ;

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ setting_value: newSections })
          .eq("setting_key", SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("app_settings").insert({
          setting_key: SETTING_KEY,
          setting_value: newSections,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving active sections:", error);
      toast.error("Saved locally, but failed to sync to database");
    }
  };

  const toggleSection = async (key: keyof ActiveSections) => {
    const nextValue = !sections[key];
    const updated = { ...sections, [key]: nextValue };
    await saveSections(updated);
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} section is now ${nextValue ? "Active" : "Deactivated"}`);
  };

  const setSectionState = async (key: keyof ActiveSections, active: boolean) => {
    const updated = { ...sections, [key]: active };
    await saveSections(updated);
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} section is now ${active ? "Active" : "Deactivated"}`);
  };

  const isSectionActive = (key: keyof ActiveSections): boolean => {
    return sections[key] ?? true;
  };

  return {
    sections,
    isLoading,
    toggleSection,
    setSectionState,
    saveSections,
    isSectionActive,
    refetch: fetchSettings,
  };
}
