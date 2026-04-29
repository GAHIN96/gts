import { useState, useEffect, useCallback, useRef } from "react";
import { useActiveFlightDeals, type FlightDeal } from "@/hooks/useFlightDeals";
import { useAirlines } from "@/hooks/useAirlines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plane, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Percent,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightDealsCarouselProps {
  onDealClick?: (deal: FlightDeal) => void;
}

export function FlightDealsCarousel({ onDealClick }: FlightDealsCarouselProps) {
  const { data: deals } = useActiveFlightDeals();
  const { airlines } = useAirlines();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const activeDeals = deals?.filter(d => d.is_active) || [];

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [activeDeals.length]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  const getAirlineLogo = (name: string) => {
    const match = airlines.find(a => a.is_active && a.name.toLowerCase() === name.toLowerCase());
    return match?.logo_url || null;
  };

  if (activeDeals.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Special Flight Deals</h3>
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                {activeDeals.length} Deal{activeDeals.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Click any deal to search for available flights</p>
          </div>
        </div>
        {activeDeals.length > 3 && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border/50" onClick={() => scroll("left")} disabled={!canScrollLeft}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border/50" onClick={() => scroll("right")} disabled={!canScrollRight}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1 snap-x snap-mandatory"
      >
        {activeDeals.map((deal) => {
          const flight = deal.flight;
          const logo = flight ? getAirlineLogo(flight.airline) : null;

          return (
            <div
              key={deal.id}
              onClick={() => onDealClick?.(deal)}
              className={cn(
                "group relative flex-shrink-0 w-[300px] snap-start rounded-2xl overflow-hidden cursor-pointer",
                "border border-border/40 hover:border-primary/40 transition-all duration-300",
                "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1",
                "bg-card"
              )}
            >
              {/* Header with airline logo */}
              <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/5 overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-accent/10" />
                
                <div className="relative z-10 flex items-center justify-center h-full">
                  {logo ? (
                    <img src={logo} alt={flight?.airline || ""} className="h-16 w-auto max-w-[180px] object-contain bg-white/90 rounded-xl p-3 shadow-md backdrop-blur-sm" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-white/80 flex items-center justify-center shadow-md">
                      <Plane className="h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>

                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge className="bg-destructive text-destructive-foreground border-0 shadow-lg text-[10px] font-bold px-2 py-0.5 gap-1">
                    <Percent className="h-3 w-3" />
                    {deal.discount_percent}% OFF
                  </Badge>
                </div>
                {deal.is_featured && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-amber-500 text-white border-0 shadow-lg text-[10px] font-bold px-2 py-0.5 gap-1">
                      <Sparkles className="h-3 w-3" />
                      Featured
                    </Badge>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {deal.title}
                  </h4>
                  {deal.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{deal.description}</p>
                  )}
                </div>

                <div className="flex items-end justify-between pt-1">
                  <div>
                    <span className="text-xs text-muted-foreground line-through">${deal.original_price}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-primary">${deal.discounted_price}</span>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-xl text-xs font-bold gap-1 group-hover:shadow-md transition-shadow">
                    View <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
