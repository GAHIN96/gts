import { useState } from "react";
import { 
  Star, 
  Users, 
  Wifi, 
  Waves, 
  Dumbbell, 
  UtensilsCrossed, 
  Coffee,
  Car,
  Wind,
  Check,
  AlertCircle,
  MapPin,
  Bed,
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Tv,
  Bath,
  Mountain,
  Plane,
  Building2,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HotelRoom {
  id: string;
  room_type: string;
  capacity: number;
  price_per_night: number;
  description: string | null;
  amenities: string[] | null;
  is_active: boolean | null;
}

interface Hotel {
  id: string;
  name: string;
  star_rating: number | null;
  address: string | null;
  description: string | null;
  images: string[] | null;
  amenities: string[] | null;
  hotel_rooms: HotelRoom[];
  price_per_night?: number | null;
}

interface EnhancedHotelSelectorProps {
  hotels: Hotel[];
  selectedHotelId: string | null;
  onSelectHotel: (hotelId: string) => void;
  nights: number;
  onContinue?: () => void;
}

const amenityIcons: Record<string, any> = {
  "wifi": Wifi,
  "pool": Waves,
  "gym": Dumbbell,
  "restaurant": UtensilsCrossed,
  "breakfast": Coffee,
  "parking": Car,
  "ac": Wind,
  "spa": Sparkles,
  "tv": Tv,
  "bath": Bath,
  "view": Mountain,
  "beach": Waves,
  "airport": Plane,
  "lounge": Building2,
};

const getAmenityIcon = (amenity: string) => {
  const key = amenity.toLowerCase();
  for (const [keyword, Icon] of Object.entries(amenityIcons)) {
    if (key.includes(keyword)) return Icon;
  }
  return Check;
};

function getLowestPrice(hotel: Hotel): number {
  const activeRooms = hotel.hotel_rooms?.filter(r => r.is_active !== false) || [];
  if (activeRooms.length > 0) return Math.min(...activeRooms.map(r => r.price_per_night));
  return hotel.price_per_night || 0;
}

// Expanded Hotel Detail View
function ExpandedHotelView({
  hotel,
  nights,
  isSelected,
  onSelect,
  onBack,
  onContinue,
}: {
  hotel: Hotel;
  nights: number;
  isSelected: boolean;
  onSelect: () => void;
  onBack: () => void;
  onContinue?: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = hotel.images || [];
  const currentImage = images[imageIndex] || "/placeholder.svg";
  const lowestPrice = getLowestPrice(hotel);

  return (
    <div className="bg-card rounded-2xl shadow-xl border border-border/40 overflow-hidden">
      {/* Back button */}
      <div className="px-5 py-3 border-b border-border/30 bg-muted/20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all hotels
        </button>
      </div>

      {/* Image gallery */}
      <div className="relative aspect-[2/1] bg-muted overflow-hidden">
        <img
          src={currentImage}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

        {/* Stars overlay */}
        {(hotel.star_rating || 0) > 0 && (
          <div className="absolute top-4 left-4 flex items-center gap-0.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10">
            {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 drop-shadow" />
            ))}
          </div>
        )}

        {/* Selected / Included badge */}
        {isSelected && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-emerald-500 text-white border-none shadow-xl text-xs gap-1.5 px-3 py-1.5 font-bold">
              <Check className="h-3.5 w-3.5" />
              Included in package
            </Badge>
          </div>
        )}

        {/* Price badge */}
        {lowestPrice > 0 && (
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-xl border border-border/30">
            <span className="text-xs text-muted-foreground font-medium">from </span>
            <span className="text-2xl font-black text-primary">${lowestPrice}</span>
          </div>
        )}

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-black/50 transition-colors border border-white/10"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-black/50 transition-colors border border-white/10"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === imageIndex ? "bg-white w-6 shadow-lg" : "bg-white/40 w-2 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hotel details */}
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-2xl font-black text-foreground tracking-tight">{hotel.name}</h3>
          {hotel.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5">
              <MapPin className="h-4 w-4 text-primary/60" />
              {hotel.address}
            </div>
          )}
        </div>

        {hotel.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{hotel.description}</p>
        )}

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {hotel.amenities.map((amenity, idx) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <Badge key={idx} variant="outline" className="gap-1.5 py-2 px-3.5 text-xs rounded-lg border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Icon className="h-3.5 w-3.5 text-primary/70" />
                  {amenity}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setImageIndex(i)}
                className={cn(
                  "w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200",
                  i === imageIndex ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-transparent opacity-50 hover:opacity-100"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Continue button */}
        <Button
          onClick={() => {
            if (!isSelected) onSelect();
            setTimeout(() => onContinue?.(), 100);
          }}
          className="w-full bg-primary hover:bg-primary/90 rounded-xl h-13 text-base font-bold shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          Continue
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Grid Hotel Card
function HotelCard({
  hotel,
  isSelected,
  nights,
  onClick,
}: {
  hotel: Hotel;
  isSelected: boolean;
  nights: number;
  onClick: () => void;
}) {
  const lowestPrice = getLowestPrice(hotel);
  const displayImage = hotel.images?.[0] || "/placeholder.svg";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group bg-card rounded-2xl overflow-hidden transition-all duration-300 border h-full flex flex-col cursor-pointer",
        isSelected 
          ? "border-primary ring-2 ring-primary/20 shadow-xl shadow-primary/10" 
          : "border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={displayImage}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Star Rating */}
        {(hotel.star_rating || 0) > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-0.5 px-2.5 py-1 bg-card/90 backdrop-blur-md rounded-full shadow-lg border border-white/10">
            {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 text-yellow-400 fill-yellow-400 drop-shadow" />
            ))}
          </div>
        )}

        {/* Selected Badge */}
        {isSelected && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-primary rounded-full text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <Check className="h-3 w-3" />
            Selected
          </div>
        )}

        {/* Hotel name overlay on image */}
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="font-bold text-white text-base drop-shadow-lg line-clamp-1">{hotel.name}</h4>
          {hotel.address && (
            <div className="flex items-center gap-1.5 text-white/80 text-xs mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="line-clamp-1 drop-shadow">{hotel.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hotel Info */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Amenities Preview */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {hotel.amenities.slice(0, 4).map((amenity, idx) => {
              const Icon = getAmenityIcon(amenity);
              return (
                <Badge key={idx} variant="outline" className="gap-1.5 text-[10px] py-1 px-2.5 rounded-full border-border/60">
                  <Icon className="h-3 w-3 text-primary/70" />
                  {amenity}
                </Badge>
              );
            })}
            {hotel.amenities.length > 4 && (
              <Badge variant="secondary" className="text-[10px] py-1 px-2.5 rounded-full">
                +{hotel.amenities.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Price section */}
        <div className="mt-auto pt-3 border-t border-border/40 flex items-end justify-between">
          {lowestPrice > 0 && (
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">from</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-primary">${lowestPrice}</span>
                <span className="text-xs text-muted-foreground">/night</span>
              </div>
              {nights > 1 && (
                <span className="text-[10px] text-muted-foreground">
                  ${lowestPrice * nights} total · {nights} nights
                </span>
              )}
            </div>
          )}
          <Button size="sm" variant="ghost" className="text-xs font-semibold text-primary hover:bg-primary/10 rounded-full px-3 gap-1 group-hover:bg-primary/10">
            View Details
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
export function EnhancedHotelSelector({
  hotels,
  selectedHotelId,
  onSelectHotel,
  nights,
  onContinue,
}: EnhancedHotelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [starFilter, setStarFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recommended");
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);

  let filteredHotels = hotels.filter(
    (hotel) =>
      hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hotel.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (starFilter !== "all") {
    const stars = parseInt(starFilter);
    filteredHotels = filteredHotels.filter(hotel => hotel.star_rating === stars);
  }

  filteredHotels = [...filteredHotels].sort((a, b) => {
    const aMin = getLowestPrice(a);
    const bMin = getLowestPrice(b);

    switch (sortBy) {
      case "price-low": return aMin - bMin;
      case "price-high": return bMin - aMin;
      case "rating": return (b.star_rating || 0) - (a.star_rating || 0);
      default: return (b.star_rating || 0) - (a.star_rating || 0);
    }
  });

  if (!hotels || hotels.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-12 shadow-lg text-center border border-border">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No Hotels Available</h3>
        <p className="text-muted-foreground">No hotels found for this destination.</p>
      </div>
    );
  }

  // Expanded view - show single hotel detail
  const expandedHotel = expandedHotelId ? hotels.find(h => h.id === expandedHotelId) : null;
  if (expandedHotel) {
    return (
      <ExpandedHotelView
        hotel={expandedHotel}
        nights={nights}
        isSelected={selectedHotelId === expandedHotel.id}
        onSelect={() => onSelectHotel(expandedHotel.id)}
        onBack={() => setExpandedHotelId(null)}
        onContinue={onContinue}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-primary to-primary/80 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Bed className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary-foreground">Select Hotel</h3>
              <p className="text-primary-foreground/70 text-sm">Choose your stay for {nights} nights</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hotels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 rounded-xl border-2"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <Select value={starFilter} onValueChange={setStarFilter}>
                <SelectTrigger className="w-[130px] h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-9 rounded-lg text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="price-low">Price: Low</SelectItem>
                  <SelectItem value="price-high">Price: High</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="secondary" className="h-9 px-3 rounded-lg">
              {filteredHotels.length} hotels
            </Badge>
          </div>
        </div>
      </div>

      {/* Hotel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHotels.map((hotel) => (
          <HotelCard
            key={hotel.id}
            hotel={hotel}
            isSelected={selectedHotelId === hotel.id}
            nights={nights}
            onClick={() => setExpandedHotelId(hotel.id)}
          />
        ))}
      </div>

      {filteredHotels.length === 0 && (
        <div className="bg-card rounded-2xl p-8 shadow-lg text-center border border-border">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-2">No Hotels Found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters.</p>
          <Button 
            variant="outline" 
            className="mt-3"
            onClick={() => {
              setSearchQuery("");
              setStarFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}