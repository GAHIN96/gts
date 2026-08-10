import { Tag, ChevronLeft, ChevronRight, Plane, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Offer {
  id: string;
  title: string;
  description: string;
  originalPrice?: number;
  discountedPrice?: number;
  discountPercent?: number;
  image: string;
  expiresIn?: string;
  featured?: boolean;
  isLogo?: boolean;
  onClick?: () => void;

  // Flight-specific metadata (optional now that we use banner style)
  flightNumber?: string;
  airline?: string;
  airlineLogo?: string;
  departureCity?: string;
  arrivalCity?: string;
  departureAirportCode?: string;
  arrivalAirportCode?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightClass?: string;
  availableSeats?: number;
}

interface SpecialOffersSectionProps {
  title: string;
  offers: Offer[];
  onViewOffer?: (offer: Offer) => void;
}

export function SpecialOffersSection({ title, offers, onViewOffer }: SpecialOffersSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % offers.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [offers.length]);

  const handlePrevious = () => {
    setActiveIndex((current) => (current - 1 + offers.length) % offers.length);
  };

  const handleNext = () => {
    setActiveIndex((current) => (current + 1) % offers.length);
  };

  if (offers.length === 0) return null;

  const currentOffer = offers[activeIndex];

  return (
    <div className="relative w-full h-[220px] md:h-[280px] rounded-2xl overflow-hidden group cursor-pointer shadow-lg" onClick={() => onViewOffer?.(currentOffer)}>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full bg-slate-900">
            <img
              src={currentOffer.isLogo ? "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&h=400&fit=crop" : currentOffer.image}
              alt={currentOffer.title}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          </div>
          {/* Gradient Overlay (darker on left for text readability) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/10" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-16 text-white max-w-4xl">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col gap-1.5 md:gap-2"
            >
              {/* Top row: Badge */}
              <div className="flex items-center gap-3 mb-1">
                {currentOffer.discountPercent ? (
                  <Badge className="bg-[#f28627] hover:bg-[#d9751e] text-white uppercase font-black tracking-wider text-[10px] md:text-xs py-1 px-3 border-none rounded-md shadow-sm">
                    {currentOffer.discountPercent}% OFF
                  </Badge>
                ) : (
                  <Badge className="bg-[#f28627] hover:bg-[#d9751e] text-white uppercase font-black tracking-wider text-[10px] md:text-xs py-1 px-3 border-none rounded-md shadow-sm">
                    Special Offers
                  </Badge>
                )}
              </div>
              
              {/* Title & Route */}
              <h2 className="text-2xl md:text-4xl font-extrabold leading-tight drop-shadow-md text-white">
                {currentOffer.title}
              </h2>
              
              {currentOffer.departureCity && currentOffer.arrivalCity ? (
                <div className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-200">
                   <span>{currentOffer.departureCity}</span>
                   <Plane className="h-4 w-4 md:h-5 md:w-5 rotate-45 text-white/60" />
                   <span>{currentOffer.arrivalCity}</span>
                </div>
              ) : (
                <p className="text-sm md:text-base text-gray-300 line-clamp-2 font-medium drop-shadow-sm max-w-xl">
                  {currentOffer.description}
                </p>
              )}

              {/* Date */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 text-xs md:text-sm text-gray-200 font-medium">
                {currentOffer.departureDate && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-inner">
                    <Calendar className="h-4 w-4 text-[#f28627]" />
                    <span className="font-bold tracking-wide">{currentOffer.departureDate}</span>
                  </div>
                )}
              </div>

              {/* Price & Action */}
              <div className="mt-3 md:mt-4 flex items-end gap-5">
                 <div className="flex flex-col">
                   <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mb-0.5">Starting From</span>
                   <div className="flex items-baseline gap-2.5">
                     <span className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-none">
                       ${currentOffer.discountedPrice || currentOffer.originalPrice || 0}
                     </span>
                     {currentOffer.originalPrice && currentOffer.discountedPrice && (
                       <span className="text-lg md:text-xl text-gray-400 line-through font-bold decoration-red-500/50">
                         ${currentOffer.originalPrice}
                       </span>
                     )}
                   </div>
                 </div>
                 
                 <Button
                    size="sm"
                    className="ml-2 h-10 md:h-12 px-6 md:px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      currentOffer.onClick?.() || onViewOffer?.(currentOffer);
                    }}
                 >
                    Book Now
                 </Button>
              </div>

            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Top Right Airline Logo (or Tag Icon fallback) */}
      <div className="absolute top-4 right-4 md:top-6 md:right-8 z-10">
        {(currentOffer.isLogo || currentOffer.airlineLogo) ? (
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/20 flex items-center justify-center">
            <img 
              src={currentOffer.isLogo ? currentOffer.image : currentOffer.airlineLogo} 
              alt={currentOffer.airline || "Airline"} 
              className="h-12 md:h-16 lg:h-20 w-auto object-contain max-w-[160px] md:max-w-[220px]"
            />
          </div>
        ) : (
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-sm hover:bg-black/60 transition-colors">
            <Tag className="h-5 w-5 text-white transform -rotate-90" />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {offers.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 md:h-10 md:w-10 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {offers.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 z-10">
          {offers.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setActiveIndex(index); }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeIndex === index
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/80"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
