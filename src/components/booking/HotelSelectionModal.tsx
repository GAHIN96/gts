import { useState } from "react";
import { Star, MapPin, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Hotel = Tables<"hotels"> & {
  hotel_rooms?: Tables<"hotel_rooms">[];
};

interface HotelSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotels: Hotel[];
  selectedHotelId: string | null;
  selectedRoomId: string | null;
  onSelect: (hotelId: string, roomId: string) => void;
  nights: number;
}

export function HotelSelectionModal({
  open,
  onOpenChange,
  hotels,
  selectedHotelId,
  selectedRoomId,
  onSelect,
  nights,
}: HotelSelectionModalProps) {
  const [tempHotelId, setTempHotelId] = useState<string | null>(selectedHotelId);
  const [tempRoomId, setTempRoomId] = useState<string | null>(selectedRoomId);
  const [imageIndex, setImageIndex] = useState<Record<string, number>>({});

  const selectedHotel = hotels.find((h) => h.id === tempHotelId);
  const selectedRoom = selectedHotel?.hotel_rooms?.find((r) => r.id === tempRoomId);

  const handleConfirm = () => {
    if (tempHotelId && tempRoomId) {
      onSelect(tempHotelId, tempRoomId);
      onOpenChange(false);
    }
  };

  const nextImage = (hotelId: string, max: number) => {
    setImageIndex((prev) => ({
      ...prev,
      [hotelId]: ((prev[hotelId] || 0) + 1) % max,
    }));
  };

  const prevImage = (hotelId: string, max: number) => {
    setImageIndex((prev) => ({
      ...prev,
      [hotelId]: ((prev[hotelId] || 0) - 1 + max) % max,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Hotel & Room</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {hotels.map((hotel) => {
              const currentImageIdx = imageIndex[hotel.id] || 0;
              const images = hotel.images && hotel.images.length > 0 ? hotel.images : [];
              const hasImages = images.length > 0;

              return (
                <div
                  key={hotel.id}
                  className={`border rounded-xl overflow-hidden transition-all ${
                    tempHotelId === hotel.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image Gallery */}
                    <div className="relative w-full md:w-72 h-48 md:h-auto bg-muted flex-shrink-0">
                      {hasImages ? (
                        <>
                          <img
                            src={images[currentImageIdx]}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                          />
                          {images.length > 1 && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 h-8 w-8"
                                onClick={() => prevImage(hotel.id, images.length)}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 h-8 w-8"
                                onClick={() => nextImage(hotel.id, images.length)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {images.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${
                                      idx === currentImageIdx ? "bg-primary" : "bg-background/60"
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No photos
                        </div>
                      )}
                    </div>

                    {/* Hotel Details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{hotel.name}</h3>
                            <div className="flex">
                              {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 text-gold fill-gold" />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {hotel.address}
                          </div>
                        </div>
                        <RadioGroup value={tempHotelId || ""}>
                          <RadioGroupItem
                            value={hotel.id}
                            onClick={() => {
                              setTempHotelId(hotel.id);
                              setTempRoomId(null);
                            }}
                          />
                        </RadioGroup>
                      </div>

                      {hotel.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {hotel.description}
                        </p>
                      )}

                      {/* Room Selection */}
                      {tempHotelId === hotel.id && hotel.hotel_rooms && (
                        <div className="space-y-2 mt-4 pt-4 border-t">
                          <p className="text-sm font-medium">Select Room Type:</p>
                          <div className="grid gap-2">
                            {hotel.hotel_rooms
                              .filter((r) => r.is_active)
                              .map((room) => (
                                <div
                                  key={room.id}
                                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                    tempRoomId === room.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setTempRoomId(room.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{room.room_type}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {room.capacity} guests
                                        </Badge>
                                      </div>
                                      {room.amenities && room.amenities.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {room.amenities.join(" • ")}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-primary">
                                        ${room.price_per_night}
                                        <span className="text-xs font-normal text-muted-foreground">
                                          /night
                                        </span>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        ${room.price_per_night * nights} total
                                      </p>
                                    </div>
                                    {tempRoomId === room.id && (
                                      <Check className="h-5 w-5 text-primary ml-3" />
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {selectedRoom && (
              <p className="text-sm">
                Selected:{" "}
                <span className="font-medium">
                  {selectedHotel?.name} - {selectedRoom.room_type}
                </span>
                <span className="text-muted-foreground ml-2">
                  (${selectedRoom.price_per_night * nights} for {nights} nights)
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="navy"
              disabled={!tempHotelId || !tempRoomId}
              onClick={handleConfirm}
            >
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
