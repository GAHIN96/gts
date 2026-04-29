import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ImageItem = string | { src: string; alt?: string; title?: string; subtitle?: string };

interface ImageCarouselProps {
  images: ImageItem[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
  aspectRatio?: "video" | "square" | "wide" | "hero";
  showDots?: boolean;
  showArrows?: boolean;
  overlay?: boolean;
}

function normalizeImage(image: ImageItem): { src: string; alt: string; title?: string; subtitle?: string } {
  if (typeof image === "string") {
    return { src: image, alt: "Image" };
  }
  return { ...image, alt: image.alt || "Image" };
}

export function ImageCarousel({
  images,
  autoPlay = true,
  interval = 5000,
  className,
  aspectRatio = "video",
  showDots = true,
  showArrows = true,
  overlay = true,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);

  const normalizedImages = images.map(normalizeImage);

  // Hero aspect ratio is responsive and fills full width
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    wide: "aspect-[21/9]",
    hero: "", // No aspect ratio - uses height instead
  };

  React.useEffect(() => {
    if (!autoPlay || isHovered || normalizedImages.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, interval, isHovered, normalizedImages.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + normalizedImages.length) % normalizedImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % normalizedImages.length);
  };

  if (normalizedImages.length === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl group w-full",
        aspectRatio !== "hero" && aspectClasses[aspectRatio],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Images */}
      <div className="absolute inset-0 w-full h-full">
        {normalizedImages.map((image, index) => (
          <div
            key={index}
            className={cn(
              "absolute inset-0 w-full h-full transition-all duration-700 ease-in-out",
              index === currentIndex
                ? "opacity-100 scale-100"
                : "opacity-0 scale-105"
            )}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover object-center"
            />
            {overlay && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            )}
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      {(normalizedImages[currentIndex]?.title || normalizedImages[currentIndex]?.subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
          {normalizedImages[currentIndex]?.title && (
            <h3 className="text-xl md:text-2xl font-bold mb-1 animate-fade-in">
              {normalizedImages[currentIndex].title}
            </h3>
          )}
          {normalizedImages[currentIndex]?.subtitle && (
            <p className="text-white/80 text-sm md:text-base animate-fade-in">
              {normalizedImages[currentIndex].subtitle}
            </p>
          )}
        </div>
      )}

      {/* Navigation Arrows */}
      {showArrows && normalizedImages.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && normalizedImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {normalizedImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/50 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
