import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Default hero images from assets
import heroFlightsImg from "@/assets/hero-flights.jpg";
import heroHotelsImg from "@/assets/hero-hotels.jpg";
import heroToursImg from "@/assets/hero-tours.jpg";
import heroVisaImg from "@/assets/hero-visa.jpg";
import heroSpecialRequestsImg from "@/assets/hero-special-requests.jpg";
import heroTransfersImg from "@/assets/hero-transfers.jpg";

export type ModuleKey = 
  | "flights" 
  | "hotels" 
  | "tours" 
  | "visas" 
  | "specialRequests" 
  | "transfers" 
  | "additionalServices"
  | "flightsPromo"
  | "hotelsPromo";

export interface BannerImages {
  flights: string[];
  hotels: string[];
  tours: string[];
  visas: string[];
  specialRequests: string[];
  transfers: string[];
  additionalServices: string[];
  flightsPromo: string[];
  hotelsPromo: string[];
}

export interface BannerSettings {
  flights: string;
  hotels: string;
  tours: string;
  visas: string;
  specialRequests: string;
  transfers: string;
  additionalServices: string;
  flightsPromo: string;
  hotelsPromo: string;
}

export interface BannerImage {
  id: string;
  module: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export const defaultBanners: BannerSettings = {
  flights: heroFlightsImg,
  hotels: heroHotelsImg,
  tours: heroToursImg,
  visas: heroVisaImg,
  specialRequests: heroSpecialRequestsImg,
  transfers: heroTransfersImg,
  additionalServices: heroSpecialRequestsImg,
  flightsPromo: "",
  hotelsPromo: "",
};

export const defaultBannerImages: BannerImages = {
  flights: [heroFlightsImg],
  hotels: [heroHotelsImg],
  tours: [heroToursImg],
  visas: [heroVisaImg],
  specialRequests: [heroSpecialRequestsImg],
  transfers: [heroTransfersImg],
  additionalServices: [heroSpecialRequestsImg],
  flightsPromo: [],
  hotelsPromo: [],
};

// Convert module key to database format
const toDbModule = (key: ModuleKey): string => {
  const mapping: Record<ModuleKey, string> = {
    flights: "flights",
    hotels: "hotels",
    tours: "tours",
    visas: "visas",
    specialRequests: "special_requests",
    transfers: "transfers",
    additionalServices: "additional_services",
    flightsPromo: "flights_promo",
    hotelsPromo: "hotels_promo",
  };
  return mapping[key];
};

// Convert database format to module key
const fromDbModule = (dbModule: string): ModuleKey => {
  const mapping: Record<string, ModuleKey> = {
    flights: "flights",
    hotels: "hotels",
    tours: "tours",
    visas: "visas",
    special_requests: "specialRequests",
    transfers: "transfers",
    additional_services: "additionalServices",
    flights_promo: "flightsPromo",
    hotels_promo: "hotelsPromo",
  };
  return mapping[dbModule] || "flights";
};

export const useBannerSettings = () => {
  const [banners, setBanners] = useState<BannerSettings>(defaultBanners);
  const [bannerImages, setBannerImages] = useState<BannerImages>(defaultBannerImages);
  const [bannerRecords, setBannerRecords] = useState<BannerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("banner_images")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBannerRecords(data);
        
        // Group by module
        const grouped: BannerImages = { ...defaultBannerImages };
        const firstBanners: BannerSettings = { ...defaultBanners };
        
        const moduleGroups: Record<string, string[]> = {};
        
        data.forEach((record) => {
          const moduleKey = fromDbModule(record.module);
          if (!moduleGroups[moduleKey]) {
            moduleGroups[moduleKey] = [];
          }
          moduleGroups[moduleKey].push(record.image_url);
        });

        // Update state with fetched data
        Object.keys(moduleGroups).forEach((key) => {
          const moduleKey = key as ModuleKey;
          if (moduleGroups[moduleKey].length > 0) {
            grouped[moduleKey] = moduleGroups[moduleKey];
            firstBanners[moduleKey] = moduleGroups[moduleKey][0];
          }
        });

        setBannerImages(grouped);
        setBanners(firstBanners);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      // Fall back to defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("settings-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("settings-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    }
  };

  const addBannerImage = async (key: ModuleKey, file: File) => {
    const imageUrl = await uploadImage(file);
    if (!imageUrl) return;

    const dbModule = toDbModule(key);
    const currentImages = bannerImages[key] || [];
    const newOrder = currentImages.length;

    const { error } = await supabase.from("banner_images").insert({
      module: dbModule,
      image_url: imageUrl,
      display_order: newOrder,
      is_active: true,
    });

    if (error) {
      console.error("Error adding banner:", error);
      toast.error("Failed to add banner image");
      return;
    }

    toast.success("Banner image added");
    fetchBanners();
  };

  const removeBannerImage = async (key: ModuleKey, imageUrl: string) => {
    const dbModule = toDbModule(key);

    // Find the record to delete
    const record = bannerRecords.find(
      (r) => r.module === dbModule && r.image_url === imageUrl
    );

    if (record) {
      const { error } = await supabase
        .from("banner_images")
        .delete()
        .eq("id", record.id);

      if (error) {
        console.error("Error removing banner:", error);
        toast.error("Failed to remove banner image");
        return;
      }

      // Also try to delete from storage if it's a uploaded file
      if (imageUrl.includes("settings-images")) {
        const path = imageUrl.split("/settings-images/")[1];
        if (path) {
          await supabase.storage.from("settings-images").remove([path]);
        }
      }

      toast.success("Banner image removed");
      fetchBanners();
    }
  };

  const updateBannerOrder = async (key: ModuleKey, images: string[]) => {
    const dbModule = toDbModule(key);

    // Update order for each image
    const updates = images.map((imageUrl, index) => {
      const record = bannerRecords.find(
        (r) => r.module === dbModule && r.image_url === imageUrl
      );
      if (record) {
        return supabase
          .from("banner_images")
          .update({ display_order: index })
          .eq("id", record.id);
      }
      return Promise.resolve();
    });

    await Promise.all(updates);
    fetchBanners();
  };

  const resetModuleBanners = async (key: ModuleKey) => {
    const dbModule = toDbModule(key);

    // Delete all banners for this module
    const { error } = await supabase
      .from("banner_images")
      .delete()
      .eq("module", dbModule);

    if (error) {
      console.error("Error resetting banners:", error);
      toast.error("Failed to reset banners");
      return;
    }

    // Update local state to defaults
    setBannerImages((prev) => ({
      ...prev,
      [key]: defaultBannerImages[key],
    }));
    setBanners((prev) => ({
      ...prev,
      [key]: defaultBanners[key],
    }));

    toast.success("Banners reset to default");
  };

  const resetAllBanners = async () => {
    const { error } = await supabase.from("banner_images").delete().neq("id", "");

    if (error) {
      console.error("Error resetting all banners:", error);
      toast.error("Failed to reset all banners");
      return;
    }

    setBanners(defaultBanners);
    setBannerImages(defaultBannerImages);
    setBannerRecords([]);

    toast.success("All banners reset to defaults");
  };

  // Legacy methods for backward compatibility
  const updateBanner = (key: keyof BannerSettings, value: string) => {
    setBanners((prev) => ({ ...prev, [key]: value }));
  };

  const updateBannerImages = (key: keyof BannerImages, images: string[]) => {
    setBannerImages((prev) => ({ ...prev, [key]: images }));
  };

  const resetBanner = (key: keyof BannerSettings) => {
    resetModuleBanners(key as ModuleKey);
  };

  const resetBannerImages = (key: keyof BannerImages) => {
    resetModuleBanners(key as ModuleKey);
  };

  return {
    banners,
    bannerImages,
    bannerRecords,
    isLoading,
    updateBanner,
    updateBannerImages,
    addBannerImage,
    removeBannerImage,
    updateBannerOrder,
    resetBanner,
    resetBannerImages,
    resetModuleBanners,
    resetAllBanners,
    defaultBanners,
    defaultBannerImages,
    refetch: fetchBanners,
  };
};
