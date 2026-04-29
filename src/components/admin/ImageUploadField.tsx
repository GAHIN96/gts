import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
}

export function ImageUploadField({ 
  images, 
  onImagesChange, 
  maxImages = 5,
  label = "Images" 
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        // Convert to base64 for preview (in production, would upload to storage)
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(imageUrl);
      }
      
      const updatedImages = [...images, ...newImages].slice(0, maxImages);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error("Failed to upload images:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div 
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden bg-muted group"
          >
            <img 
              src={img} 
              alt={`Upload ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeImage(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30",
              "flex flex-col items-center justify-center cursor-pointer",
              "hover:border-primary/50 transition-colors",
              isUploading && "opacity-50 pointer-events-none"
            )}
          >
            {isUploading ? (
              <div className="animate-pulse">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </>
            )}
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {images.length}/{maxImages} images uploaded
      </p>
    </div>
  );
}
