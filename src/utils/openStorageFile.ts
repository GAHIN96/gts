import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Downloads a file from Supabase storage and opens it in a new tab as a blob URL.
 * This avoids ad-blocker issues that block direct supabase.co URLs.
 */
export async function openStorageFile(publicUrl: string) {
  // Open the tab synchronously (in the click handler's call stack) to avoid popup blockers
  const newTab = window.open('about:blank', '_blank');

  try {
    // Extract bucket and path from the public URL
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) {
      if (newTab) newTab.location.href = publicUrl;
      else window.open(publicUrl, '_blank');
      return;
    }

    const [, bucket, path] = match;

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      if (newTab) newTab.close();
      toast.error("Failed to load file");
      console.error("Storage download error:", error);
      return;
    }

    const blobUrl = URL.createObjectURL(data);
    if (newTab) {
      newTab.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank');
    }
  } catch (err) {
    if (newTab) newTab.close();
    console.error("Error opening file:", err);
    toast.error("Failed to open file");
  }
}
