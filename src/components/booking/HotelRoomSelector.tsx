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
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
}

interface HotelRoomSelectorProps {
  hotels: Hotel[];
  selectedHotelId: string | null;
  selectedRoomId: string | null;
  onSelectHotel: (hotelId: string) => void;
  onSelectRoom: (hotelId: string, roomId: string) => void;
  nights: number;
}

const amenityIcons: Record<string, any> = {
  "wifi": Wifi,
  "pool": Waves,
  "gym": Dumbbell,
  "restaurant": UtensilsCrossed,
  "breakfast": Coffee,
  "parking": Car,
  "ac": Wind,
};

const getAmenityIcon = (amenity: string) => {
  const key = amenity.toLowerCase();
  for (const [keyword, Icon] of Object.entries(amenityIcons)) {
    if (key.includes(keyword)) return Icon;
  }
  return Check;
};

function HotelImageCarousel({ images, hotelName }: { images: string[]; hotelName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayImages = images.length > 0 ? images : ["/placeholder.svg"];

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden group">
      <img
        src={displayImages[currentIndex]}
        alt={`${hotelName} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      
      {displayImages.length > 1 && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((i) => (i === 0 ? displayImages.length - 1 : i - 1));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-white/80 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((i) => (i === displayImages.length - 1 ? 0 : i + 1));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {displayImages.map((_, idx) => (
              <button
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex ? "bg-white w-4" : "bg-white/60"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function HotelRoomSelector({
  hotels,
  selectedHotelId,
  selectedRoomId,
  onSelectHotel,
  onSelectRoom,
  nights,
}: HotelRoomSelectorProps) {
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  if (!hotels || hotels.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Hotels Available</h3>
        <p className="text-muted-foreground">No hotels are currently available for this destination.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-[hsl(231,70%,15%)] mb-2">Select Your Hotel & Room</h3>
        <p className="text-[hsl(231,15%,46%)] text-sm mb-6">
          Choose your preferred accommodation for {nights} nights
        </p>

        <div className="space-y-4">
          {hotels.map((hotel) => {
            const isSelected = selectedHotelId === hotel.id;
            const isExpanded = expandedHotel === hotel.id;
            const activeRooms = hotel.hotel_rooms?.filter(r => r.is_active !== false) || [];

            return (
              <div
                key={hotel.id}
                className={cn(
                  "border-2 rounded-2xl overflow-hidden transition-all duration-300",
                  isSelected
                    ? "border-[hsl(231,70%,30%)] shadow-lg"
                    : "border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)]/50"
                )}
              >
                {/* Hotel Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => {
                    onSelectHotel(hotel.id);
                    setExpandedHotel(hotel.id);
                  }}
                >
                  <div className="flex gap-4">
                    {/* Image Carousel */}
                    <div className="w-64 flex-shrink-0">
                      <HotelImageCarousel
                        images={hotel.images || []}
                        hotelName={hotel.name}
                      />
                    </div>

                    {/* Hotel Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg text-[hsl(231,70%,15%)]">{hotel.name}</h4>
                            {isSelected && (
                              <Badge className="bg-[hsl(231,70%,30%)] text-white">Selected</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 text-[hsl(45,100%,51%)] fill-[hsl(45,100%,51%)]" />
                            ))}
                          </div>
                        </div>
                      </div>

                      {hotel.address && (
                        <p className="text-sm text-[hsl(231,15%,46%)] mb-3">{hotel.address}</p>
                      )}

                      {hotel.description && (
                        <p className="text-sm text-[hsl(231,70%,15%)] mb-3 line-clamp-2">{hotel.description}</p>
                      )}

                      {/* Amenities */}
                      {hotel.amenities && hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {hotel.amenities.slice(0, 6).map((amenity, idx) => {
                            const Icon = getAmenityIcon(amenity);
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-[hsl(240,5%,96%)] rounded-lg text-xs text-[hsl(231,70%,15%)]"
                              >
                                <Icon className="h-3 w-3" />
                                {amenity}
                              </span>
                            );
                          })}
                          {hotel.amenities.length > 6 && (
                            <span className="px-2 py-1 text-xs text-[hsl(231,50%,45%)]">
                              +{hotel.amenities.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room Selection - Expanded */}
                {(isSelected || isExpanded) && activeRooms.length > 0 && (
                  <div className="border-t border-[hsl(240,6%,90%)] bg-[hsl(240,5%,96%)] p-4">
                    <p className="text-sm font-semibold text-[hsl(231,70%,15%)] mb-3">
                      Select Room Type:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeRooms.map((room) => {
                        const isRoomSelected = selectedRoomId === room.id && selectedHotelId === hotel.id;
                        const totalPrice = room.price_per_night * nights;

                        return (
                          <div
                            key={room.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRoom(hotel.id, room.id);
                            }}
                            className={cn(
                              "p-4 rounded-xl cursor-pointer transition-all border-2",
                              isRoomSelected
                                ? "bg-[hsl(231,70%,30%)] text-white border-[hsl(231,70%,30%)]"
                                : "bg-white border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)]/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                "font-semibold",
                                isRoomSelected ? "text-white" : "text-[hsl(231,70%,15%)]"
                              )}>
                                {room.room_type}
                              </span>
                              {isRoomSelected && <Check className="h-5 w-5" />}
                            </div>

                            <div className="flex items-center gap-1 mb-2">
                              <Users className={cn(
                                "h-4 w-4",
                                isRoomSelected ? "text-white/80" : "text-[hsl(231,15%,46%)]"
                              )} />
                              <span className={cn(
                                "text-sm",
                                isRoomSelected ? "text-white/80" : "text-[hsl(231,15%,46%)]"
                              )}>
                                Up to {room.capacity} guests
                              </span>
                            </div>

                            {/* Room amenities */}
                            {room.amenities && room.amenities.length > 0 && (
                              <div className={cn(
                                "text-xs mb-3",
                                isRoomSelected ? "text-white/70" : "text-[hsl(231,15%,46%)]"
                              )}>
                                {room.amenities.slice(0, 3).join(" • ")}
                              </div>
                            )}

                            <div className="pt-2 border-t border-current/10">
                              <div className={cn(
                                "text-xs",
                                isRoomSelected ? "text-white/70" : "text-[hsl(231,15%,46%)]"
                              )}>
                                ${room.price_per_night}/night × {nights} nights
                              </div>
                              <div className={cn(
                                "text-lg font-bold",
                                isRoomSelected ? "text-white" : "text-[hsl(231,70%,30%)]"
                              )}>
                                ${totalPrice}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
