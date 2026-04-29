import { useState } from "react";
import { Star, Check, Building2, Crown, Sparkles, Hotel, ArrowRight, ArrowLeft, MapPin, ChevronLeft, ChevronRight, Wifi, Waves, Droplets, UtensilsCrossed, DoorOpen } from "lucide-react";
import type { PackageHotelAvailabilityRow } from "@/hooks/usePackageHotelAvailability";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PackageHotel } from "@/hooks/usePackageHotels";

interface HotelTier {
  id: string;
  name: string;
  tier: "standard" | "deluxe" | "luxury" | "3-star" | "4-star" | "5-star";
  priceModifier: number;
  description: string;
  amenities: string[];
  image?: string;
}

interface HotelTierSelectorProps {
  tiers?: HotelTier[];
  packageHotels?: PackageHotel[];
  selectedTierId?: string | null;
  selectedHotelId?: string | null;
  onSelect?: (tierId: string) => void;
  onSelectHotel?: (hotelId: string, priceAdjustment: number) => void;
  basePrice: number;
  packageStartingPrice?: number;
  onContinue?: () => void;
  showContinueButton?: boolean;
  availability?: PackageHotelAvailabilityRow[];
  selectedDepartureId?: string | null;
  hotelAdultPrices?: Record<string, number>;
}

const tierConfig: Record<string, {
  icon: typeof Building2;
  label: string;
  gradient: string;
  border: string;
  badge: string;
  stars: number;
}> = {
  standard: { icon: Building2, label: "Standard", gradient: "from-[hsl(240,5%,96%)] to-white", border: "border-[hsl(240,6%,90%)]", badge: "bg-[hsl(231,70%,30%)]/10 text-[hsl(231,70%,30%)]", stars: 3 },
  deluxe: { icon: Star, label: "Deluxe", gradient: "from-[hsl(45,100%,96%)] to-white", border: "border-[hsl(45,100%,51%)]/30", badge: "bg-[hsl(45,100%,51%)]/10 text-[hsl(45,80%,40%)]", stars: 4 },
  luxury: { icon: Crown, label: "Luxury", gradient: "from-[hsl(280,70%,96%)] to-white", border: "border-[hsl(280,50%,50%)]/30", badge: "bg-gradient-to-r from-[hsl(280,50%,50%)] to-[hsl(320,50%,50%)] text-white", stars: 5 },
  "3-star": { icon: Building2, label: "3 Star", gradient: "from-amber-50 to-white", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", stars: 3 },
  "4-star": { icon: Star, label: "4 Star", gradient: "from-blue-50 to-white", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", stars: 4 },
  "5-star": { icon: Crown, label: "5 Star", gradient: "from-gold/10 to-white", border: "border-gold/30", badge: "bg-gold/20 text-gold", stars: 5 },
};

const amenityIcons: Record<string, typeof Wifi> = {
  wifi: Wifi, pool: Waves, spa: Droplets, "fine dining": UtensilsCrossed, restaurant: UtensilsCrossed, gym: Building2, "sky bar": Sparkles,
};

function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase();
  for (const [key, Icon] of Object.entries(amenityIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return Sparkles;
}

export function HotelTierSelector({ 
  tiers, packageHotels, selectedTierId, selectedHotelId, onSelect, onSelectHotel,
  basePrice, packageStartingPrice, onContinue, showContinueButton = true,
  availability, selectedDepartureId, hotelAdultPrices,
}: HotelTierSelectorProps) {
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  if (packageHotels && packageHotels.length > 0) {
    const allHotels = packageHotels.map((ph) => {
      const config = tierConfig[ph.tier || "3-star"] || tierConfig["3-star"];
      const hotel = ph.hotels;
      const isDefault = ph.is_default;
      const priceAdjustment = ph.price_adjustment || 0;
      const displayPrice = isDefault
        ? (packageStartingPrice ?? basePrice)
        : (hotelAdultPrices?.[ph.hotel_id] ?? (basePrice + priceAdjustment));
      return { ph, config, hotel, isDefault, priceAdjustment, displayPrice };
    }).sort((a, b) => a.displayPrice - b.displayPrice);

    const getAvailableRooms = (hotelId: string): number | null => {
      if (!availability || !selectedDepartureId) return null;
      const row = availability.find(a => a.hotel_id === hotelId && a.departure_id === selectedDepartureId);
      if (!row) return null;
      return row.available_rooms - row.booked_rooms;
    };

    const expandedData = expandedHotelId
      ? allHotels.find((h) => h.ph.hotel_id === expandedHotelId)
      : null;

    // Expanded single-hotel view
    if (expandedData && expandedData.hotel) {
      const { ph, config, hotel, isDefault, priceAdjustment } = expandedData;
      const images = (hotel.images as string[]) || [];
      const currentImage = images[imageIndex] || null;

      return (
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <button
              onClick={() => { setExpandedHotelId(null); setImageIndex(0); }}
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to all hotels
            </button>
          </div>

          {images.length > 0 && (
            <div className="relative w-full bg-muted" style={{ height: '250px' }}>
              <img src={currentImage!} alt={hotel.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex items-center gap-0.5">
                {Array.from({ length: hotel.star_rating || 3 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow" />
                ))}
              </div>
              {isDefault && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-emerald-500 text-white border-none shadow-lg text-xs">Included in package</Badge>
                </div>
              )}
              {!isDefault && priceAdjustment > 0 && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground border-none shadow-lg text-sm font-bold px-3">+${priceAdjustment}/person</Badge>
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-border">
                <span className="text-xs text-muted-foreground">from </span>
                <span className="text-lg font-bold text-primary">${hotelAdultPrices?.[ph.hotel_id] ?? packageStartingPrice ?? basePrice}</span>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-card transition-colors">
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </button>
                  <button onClick={() => setImageIndex((prev) => (prev + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-card transition-colors">
                    <ChevronRight className="h-5 w-5 text-foreground" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImageIndex(i)} className={cn("w-2 h-2 rounded-full transition-all", i === imageIndex ? "bg-white w-5" : "bg-white/50")} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-3 space-y-2">
            <div>
              <h3 className="text-lg font-bold text-foreground">{hotel.name}</h3>
              {hotel.address && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-4 w-4" /> {hotel.address}
                </div>
              )}
            </div>
            {hotel.description && <p className="text-xs text-muted-foreground leading-relaxed">{hotel.description}</p>}
            {hotel.amenities && (hotel.amenities as string[]).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(hotel.amenities as string[]).map((amenity, idx) => {
                  const AmenityIcon = getAmenityIcon(amenity);
                  return <Badge key={idx} variant="outline" className="gap-1.5 py-1.5 px-3 text-xs"><AmenityIcon className="h-3 w-3" />{amenity}</Badge>;
                })}
              </div>
            )}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImageIndex(i)} className={cn("w-12 h-9 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all", i === imageIndex ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100")}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <Button onClick={() => { onSelectHotel?.(ph.hotel_id, priceAdjustment); setTimeout(() => onContinue?.(), 150); }} className="flex-1 bg-primary hover:bg-primary/90 rounded-xl h-10 text-sm font-bold">
                Continue <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Grid view — 3-column cards matching reference
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-bold font-heading text-foreground">Choose Your Hotel</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allHotels.map(({ ph, config, hotel, isDefault, priceAdjustment }) => {
            const isSelected = ph.hotel_id === selectedHotelId;
            const firstImage = hotel?.images ? (hotel.images as string[])[0] : null;
            const rooms = getAvailableRooms(ph.hotel_id);
            const price = hotelAdultPrices?.[ph.hotel_id] ?? (isDefault ? (packageStartingPrice ?? basePrice) : (basePrice + priceAdjustment));

            return (
              <div
                key={ph.id}
                className={cn(
                  "relative rounded-2xl overflow-hidden bg-card transition-all duration-300 cursor-pointer group",
                  "border-2",
                  isSelected 
                    ? "border-primary shadow-xl" 
                    : "border-border/40 hover:border-primary/30 hover:shadow-lg"
                )}
                onClick={() => { setExpandedHotelId(ph.hotel_id); setImageIndex(0); }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {firstImage ? (
                    <img src={firstImage} alt={hotel?.name || "Hotel"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                      <Building2 className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Star badge */}
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-primary text-primary-foreground border-none text-[10px] font-bold px-2 py-0.5 gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {hotel?.star_rating || 3} STARS
                    </Badge>
                  </div>

                  {/* Included badge */}
                  {isDefault && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500 text-white border-none text-[10px] font-bold px-2 py-0.5 gap-1">
                        <Check className="h-2.5 w-2.5" /> INCLUDED
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <h4 className="font-bold text-foreground text-sm leading-tight">{hotel?.name || "Hotel"}</h4>

                  {/* Amenities */}
                  {hotel?.amenities && (hotel.amenities as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(hotel.amenities as string[]).slice(0, 3).map((amenity, idx) => {
                        const AmenityIcon = getAmenityIcon(amenity);
                        return (
                          <span key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <AmenityIcon className="h-3 w-3" />
                            {amenity}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Price section */}
                  <div className="pt-2 border-t border-border/50 flex items-end justify-between">
                    <div>
                      {isDefault ? (
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Included</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">From</p>
                      )}
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-black text-foreground">${price}</span>
                        <span className="text-xs text-muted-foreground">/pp</span>
                      </div>
                    </div>

                    {/* Select circle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHotel?.(ph.hotel_id, priceAdjustment);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "border-2 border-border text-muted-foreground hover:border-primary hover:text-primary"
                      )}
                    >
                      {isSelected ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Room availability */}
                  {rooms !== null && (
                    <div className="flex items-center gap-1.5">
                      <DoorOpen className="h-3 w-3 text-muted-foreground" />
                      <span className={cn("text-[10px] font-medium", rooms <= 3 ? "text-amber-600" : "text-muted-foreground")}>
                        {rooms > 0 ? `${rooms} rooms available` : "Sold out"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Legacy tiers support
  const defaultTiers: HotelTier[] = [
    { id: "standard", name: "Standard Hotel", tier: "standard", priceModifier: 0, description: "Comfortable 3-star accommodation", amenities: ["Free WiFi", "Air Conditioning", "Daily Breakfast", "City View"] },
    { id: "deluxe", name: "Deluxe Hotel", tier: "deluxe", priceModifier: 200, description: "Premium 4-star hotel", amenities: ["Free WiFi", "Pool Access", "Spa", "Restaurant", "Gym", "Room Service"] },
    { id: "luxury", name: "Luxury Resort", tier: "luxury", priceModifier: 500, description: "5-star luxury resort", amenities: ["All Deluxe Amenities", "Private Beach", "Butler Service", "Michelin Dining", "Private Pool", "Concierge"] },
  ];

  const displayTiers = tiers && tiers.length > 0 ? tiers : defaultTiers;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
      <h3 className="text-xl font-bold text-foreground mb-2">Select Your Accommodation</h3>
      <p className="text-muted-foreground text-sm mb-6">Choose the hotel tier that fits your style</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayTiers.map((tier) => {
          const config = tierConfig[tier.tier] || tierConfig.standard;
          const Icon = config.icon;
          const isSelected = selectedTierId === tier.id;
          const price = basePrice + tier.priceModifier;
          return (
            <div key={tier.id} onClick={() => onSelect?.(tier.id)} className={cn("relative p-5 rounded-2xl cursor-pointer transition-all duration-300 bg-gradient-to-br border-2", config.gradient, isSelected ? "border-primary shadow-xl scale-[1.02]" : `${config.border} hover:shadow-lg hover:scale-[1.01]`)}>
              {isSelected && <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg"><Check className="h-3.5 w-3.5 text-primary-foreground" /></div>}
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4", config.badge)}><Icon className="h-3.5 w-3.5" />{config.label}</div>
              <h4 className="font-bold text-foreground mb-2">{tier.name}</h4>
              <p className="text-xs text-muted-foreground mb-4">{tier.description}</p>
              <div className="space-y-1.5 mb-4">
                {tier.amenities.slice(0, 4).map((amenity, idx) => (<div key={idx} className="flex items-center gap-2 text-xs text-foreground"><Sparkles className="h-3 w-3 text-primary/60" />{amenity}</div>))}
                {tier.amenities.length > 4 && <p className="text-xs text-muted-foreground pl-5">+{tier.amenities.length - 4} more</p>}
              </div>
              <div className="pt-4 border-t border-border">
                {tier.priceModifier > 0 ? (<><p className="text-xs text-muted-foreground">Base price +</p><p className="text-xl font-bold text-primary">+${tier.priceModifier}</p></>) : (<><p className="text-xs text-muted-foreground">Included in</p><p className="text-xl font-bold text-primary">Base Price</p></>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
