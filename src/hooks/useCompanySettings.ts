import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import default logo
import companyLogo from "@/assets/company-logo.png";

export interface CompanySettings {
  companyName: string;
  logo: string | null;
  primaryColor: string;
  accentColor: string;
  contactEmail: string;
  phone: string;
  address: string;
  departmentEmails: {
    ops: string;
    visa: string;
    finance: string;
    technical: string;
  };
}

const defaultCompanySettings: CompanySettings = {
  companyName: "GTS Booking",
  logo: companyLogo,
  primaryColor: "#1A237E",
  accentColor: "#8B4F47",
  contactEmail: "info@gtsbooking.com",
  phone: "+964 770 123 4567",
  address: "Baghdad, Al-Mansour District",
  departmentEmails: {
    ops: "ops@gtsbooking.com",
    visa: "visa@gtsbooking.com",
    finance: "finance@gtsbooking.com",
    technical: "tech@gtsbooking.com",
  },
};

const SETTING_KEY = "company_settings";

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
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
          companyName: (parsed.companyName as string) || defaultCompanySettings.companyName,
          logo: (parsed.logo as string) || defaultCompanySettings.logo,
          primaryColor: (parsed.primaryColor as string) || defaultCompanySettings.primaryColor,
          accentColor: (parsed.accentColor as string) || defaultCompanySettings.accentColor,
          contactEmail: (parsed.contactEmail as string) || defaultCompanySettings.contactEmail,
          phone: (parsed.phone as string) || defaultCompanySettings.phone,
          address: (parsed.address as string) || defaultCompanySettings.address,
          departmentEmails: (parsed.departmentEmails as any) || defaultCompanySettings.departmentEmails,
        });
      }
    } catch (error) {
      console.error("Error fetching company settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("settings-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("settings-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
      return null;
    }
  };

  const updateSettings = async (updates: Partial<CompanySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("app_settings")
          .update({ setting_value: newSettings })
          .eq("setting_key", SETTING_KEY);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("app_settings").insert({
          setting_key: SETTING_KEY,
          setting_value: newSettings,
        });

        if (error) throw error;
      }

      // Dispatch event for other components
      window.dispatchEvent(new Event("company-settings-updated"));
    } catch (error) {
      console.error("Error saving company settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const updateLogoFromFile = async (file: File) => {
    const logoUrl = await uploadLogo(file);
    if (logoUrl) {
      await updateSettings({ logo: logoUrl });
      toast.success("Logo updated successfully");
    }
  };

  const removeLogo = async () => {
    await updateSettings({ logo: null });
    toast.success("Logo removed");
  };

  const resetSettings = async () => {
    setSettings(defaultCompanySettings);

    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("setting_key", SETTING_KEY);

      if (error) throw error;
      toast.success("Company settings reset to defaults");
      window.dispatchEvent(new Event("company-settings-updated"));
    } catch (error) {
      console.error("Error resetting company settings:", error);
      toast.error("Failed to reset settings");
    }
  };

  const saveSettings = async () => {
    await updateSettings(settings);
    toast.success("Settings saved successfully");
  };

  return {
    settings,
    isLoading,
    updateSettings,
    updateLogoFromFile,
    removeLogo,
    resetSettings,
    saveSettings,
    defaultSettings: defaultCompanySettings,
    refetch: fetchSettings,
  };
}
