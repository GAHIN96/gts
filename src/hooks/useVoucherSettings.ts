import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import default assets
import companyLogo from "@/assets/company-logo.png";

export interface VoucherSettings {
  logo: string;
  companyName: string;
  tagline: string;
  primaryColor: string;
  showQRCode: boolean;
  footerText: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  barcodeImage: string;
  useBarcodeInsteadOfQR: boolean;
}

const defaultVoucherSettings: VoucherSettings = {
  logo: companyLogo,
  companyName: "GTS Travel",
  tagline: "Your Gateway to Amazing Adventures",
  primaryColor: "#1A237E",
  showQRCode: true,
  footerText: "Thank you for choosing GTS Travel. Have a safe journey!",
  contactPhone: "+964 770 123 4567",
  contactEmail: "info@gtstravel.com",
  website: "www.gtstravel.com",
  barcodeImage: "",
  useBarcodeInsteadOfQR: false,
};

const SETTING_KEY = "voucher_settings";

export function useVoucherSettings() {
  const [settings, setSettings] = useState<VoucherSettings>(defaultVoucherSettings);
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
          ...defaultVoucherSettings,
          logo: (parsed.logo as string) || defaultVoucherSettings.logo,
          companyName: (parsed.companyName as string) || defaultVoucherSettings.companyName,
          tagline: (parsed.tagline as string) || defaultVoucherSettings.tagline,
          primaryColor: (parsed.primaryColor as string) || defaultVoucherSettings.primaryColor,
          showQRCode: parsed.showQRCode !== undefined ? (parsed.showQRCode as boolean) : defaultVoucherSettings.showQRCode,
          footerText: (parsed.footerText as string) || defaultVoucherSettings.footerText,
          contactPhone: (parsed.contactPhone as string) || defaultVoucherSettings.contactPhone,
          contactEmail: (parsed.contactEmail as string) || defaultVoucherSettings.contactEmail,
          website: (parsed.website as string) || defaultVoucherSettings.website,
          barcodeImage: (parsed.barcodeImage as string) || defaultVoucherSettings.barcodeImage,
          useBarcodeInsteadOfQR: parsed.useBarcodeInsteadOfQR !== undefined ? (parsed.useBarcodeInsteadOfQR as boolean) : defaultVoucherSettings.useBarcodeInsteadOfQR,
        });
      }
    } catch (error) {
      console.error("Error fetching voucher settings:", error);
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
      const fileName = `voucher-logo-${Date.now()}.${fileExt}`;
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

  const uploadBarcodeImage = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `voucher-barcode-${Date.now()}.${fileExt}`;
      const filePath = `barcodes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("settings-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("settings-images")
        .getPublicUrl(filePath);

      await updateSettings({ barcodeImage: urlData.publicUrl, useBarcodeInsteadOfQR: true });
      toast.success("Barcode image uploaded successfully");
    } catch (error) {
      console.error("Error uploading barcode:", error);
      toast.error("Failed to upload barcode image");
    }
  };

  const updateSettings = async (updates: Partial<VoucherSettings>) => {
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
    } catch (error) {
      console.error("Error saving voucher settings:", error);
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

  const resetSettings = async () => {
    setSettings(defaultVoucherSettings);

    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("setting_key", SETTING_KEY);

      if (error) throw error;
      toast.success("Voucher settings reset to defaults");
    } catch (error) {
      console.error("Error resetting voucher settings:", error);
      toast.error("Failed to reset settings");
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    updateLogoFromFile,
    uploadBarcodeImage,
    resetSettings,
    defaultSettings: defaultVoucherSettings,
    refetch: fetchSettings,
  };
}
