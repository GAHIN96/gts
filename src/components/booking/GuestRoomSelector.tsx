import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { flushSync } from "react-dom";
import { Users, Minus, Plus, Bed, Baby, AlertCircle, Trash2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GuestBreakdown {
  adults: number;
  children6to12: number;
  children2to6: number;
  infants: number;
}

export interface RoomSuggestion {
  type: string;
  count: number;
  capacity?: number;
}

export interface RoomAssignment {
  roomNumber: number;
  roomType: string;
  bedType: string;
  guestCount: number;
  adults: number;
  children6to12: number;
  children2to6: number;
  infants: number;
}

export interface RoomConfig {
  adults: number;
  children6to12: number;
  children2to6: number;
  infants: number;
}

const getRoomType = (room: RoomConfig): string => {
  const { adults, children6to12, children2to6 } = room;
  const totalNonInfant = adults + children6to12 + children2to6;

  if (totalNonInfant === 1) return "single";
  if (adults === 3 && children6to12 === 0 && children2to6 === 0) return "triple";
  
  // 1 ADT + 1 CHD (any age) = Double (child priced as adult, CHD 2-6 without bed)
  if (adults === 1 && totalNonInfant === 2) return "double";
  
  // 1 ADT + 1 CHD 2-12 + 1 CHD 2-6 = Double (CHD 2-12 as ADT, CHD 2-6 without bed)
  if (adults === 1 && children6to12 === 1 && children2to6 === 1) return "double";
  
  // 1 ADT + 2 CHD 2-12 = Double + Extra Bed (one CHD as ADT, one on extra bed)
  if (adults === 1 && children6to12 >= 2) return "double_extra_bed";
  
  // 2+ ADT + CHD 2-12 = Double + Extra Bed (extra bed for the child)
  if (adults >= 2 && children6to12 >= 1) return "double_extra_bed";
  
  // 3 non-infants with no CHD 2-12 (e.g. 2 ADT + 1 CHD 2-6) = triple
  if (totalNonInfant >= 3 && children6to12 === 0) return "triple";
  
  // 2 ADT or 2 ADT + CHD 2-6 only = Double
  if (adults === 2 && children6to12 === 0) return "double";
  
  return "double";
};

const getRoomTypeLabel = (type: string): string => {
  switch (type) {
    case "single": return "Single";
    case "double": return "Double";
    case "triple": return "Triple";
    case "double_extra_bed": return "Double + Extra Bed";
    default: return "Double";
  }
};

interface GuestRoomSelectorProps {
  departureDate: Date | null;
  returnDate: Date | null;
  availableSeats: number;
  availableLabel?: string;
  maxRooms?: number;
  guests: GuestBreakdown;
  onGuestsChange: (guests: GuestBreakdown) => void;
  nights: number;
  onRoomAssignmentsChange?: (assignments: RoomAssignment[]) => void;
  selectedHotelId?: string | null;
  initialRooms?: RoomConfig[];
  onRoomConfigsChange?: (rooms: RoomConfig[]) => void;
}

const MAX_GUESTS = 9;
const MAX_ROOM_OCCUPANCY = 4; // max non-infant guests per room (2 ADT + 1 CHD 2-6 + 1 CHD 2-12)

export function GuestRoomSelector({
  availableSeats,
  availableLabel,
  maxRooms,
  onGuestsChange,
  onRoomAssignmentsChange,
  initialRooms,
  onRoomConfigsChange,
}: GuestRoomSelectorProps) {
  const [rooms, setRooms] = useState<RoomConfig[]>(
    initialRooms && initialRooms.length > 0
      ? initialRooms
      : [{ adults: 1, children6to12: 0, children2to6: 0, infants: 0 }]
  );

  const scrollLockRef = useRef<number | null>(null);

  // Lock scroll before DOM updates
  const updateRooms = useCallback((updater: (prev: RoomConfig[]) => RoomConfig[]) => {
    scrollLockRef.current = window.scrollY;
    setRooms(updater);
  }, []);

  // Restore scroll after React paints - aggressively across multiple frames
  useLayoutEffect(() => {
    if (scrollLockRef.current !== null) {
      const y = scrollLockRef.current;
      scrollLockRef.current = null;
      window.scrollTo(0, y);
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        requestAnimationFrame(() => window.scrollTo(0, y));
      });
    }
  });

  useEffect(() => {
    const totalAdults = rooms.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren6to12 = rooms.reduce((sum, r) => sum + r.children6to12, 0);
    const totalChildren2to6 = rooms.reduce((sum, r) => sum + r.children2to6, 0);
    const totalInfants = rooms.reduce((sum, r) => sum + r.infants, 0);
    onGuestsChange({
      adults: totalAdults,
      children6to12: totalChildren6to12,
      children2to6: totalChildren2to6,
      infants: totalInfants,
    });

    const assignments: RoomAssignment[] = rooms.map((room, idx) => ({
      roomNumber: idx + 1,
      roomType: `Room ${idx + 1}`,
      bedType: getRoomType(room),
      guestCount: room.adults + room.children6to12 + room.children2to6 + room.infants,
      adults: room.adults,
      children6to12: room.children6to12,
      children2to6: room.children2to6,
      infants: room.infants,
    }));
    onRoomAssignmentsChange?.(assignments);
    onRoomConfigsChange?.(rooms);
  }, [rooms]);

  // Infants excluded from total guest cap
  const totalGuests = rooms.reduce((sum, r) => sum + r.adults + r.children6to12 + r.children2to6, 0);
  const totalWithInfants = rooms.reduce((sum, r) => sum + r.adults + r.children6to12 + r.children2to6 + r.infants, 0);

  const effectiveMaxRooms = maxRooms !== undefined ? maxRooms : 9;
  const isSoldOut = maxRooms !== undefined && maxRooms <= 0;
  const isAtRoomLimit = maxRooms !== undefined && rooms.length >= maxRooms;

  const handleRoomCountChange = (count: string) => {
    let newCount = parseInt(count);
    if (maxRooms !== undefined && newCount > maxRooms) newCount = maxRooms;
    if (newCount < 1) newCount = 1;
    updateRooms(prev => {
      if (newCount > prev.length) {
        return [...prev, ...Array.from({ length: newCount - prev.length }, () => ({ adults: 1, children6to12: 0, children2to6: 0, infants: 0 }))];
      }
      return prev.slice(0, newCount);
    });
  };

  const removeRoom = (index: number) => {
    if (rooms.length <= 1) return;
    updateRooms(prev => prev.filter((_, i) => i !== index));
  };

  const addRoom = () => {
    if (totalGuests >= Math.min(MAX_GUESTS, availableSeats)) return;
    if (maxRooms !== undefined && rooms.length >= maxRooms) return;
    updateRooms(prev => [...prev, { adults: 1, children6to12: 0, children2to6: 0, infants: 0 }]);
  };

  const getNonInfantCount = (room: RoomConfig) => room.adults + room.children6to12 + room.children2to6;

  const canIncrement = (index: number, field: keyof RoomConfig): boolean => {
    const room = rooms[index];
    const nonInfant = getNonInfantCount(room);

    if (field === "infants") {
      return room.infants < 2;
    }

    // Non-infant fields: check room capacity (max 3) and global cap (max 9 excluding infants)
    if (nonInfant >= MAX_ROOM_OCCUPANCY) return false;
    if (totalGuests >= Math.min(MAX_GUESTS, availableSeats)) return false;

    if (field === "adults") {
      return room.adults < 3;
    }

    // Children: max 1 each, and require at least 2 adults OR room has space
    if (field === "children6to12") {
      if (room.children6to12 >= 2) return false;
      return true;
    }

    if (field === "children2to6") {
      if (room.children2to6 >= 1) return false;
      return true;
    }

    return false;
  };

  const updateRoom = (index: number, field: keyof RoomConfig, delta: number) => {
    const updated = [...rooms];
    const room = { ...updated[index] };

    const newVal = room[field] + delta;

    // Min checks
    if (field === "adults" && newVal < 1) return;
    if (field !== "adults" && newVal < 0) return;

    if (delta > 0 && !canIncrement(index, field)) return;

    room[field] = newVal;
    updated[index] = room;
    updateRooms(() => updated);
  };

  const ageCategories: { key: keyof RoomConfig; label: string; subtitle: string; icon: typeof Users }[] = [
    { key: "adults", label: "Adults", subtitle: "12+ years", icon: Users },
    { key: "children6to12", label: "Child", subtitle: "2-12 years / extra bed", icon: Users },
    { key: "children2to6", label: "Child", subtitle: "2-6 years", icon: Baby },
    { key: "infants", label: "Infant", subtitle: "Under 2 years", icon: Baby },
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Guests & Rooms</span>
        </div>
        <div className="flex items-center gap-1.5">
          {maxRooms !== undefined && (
            <Badge variant={isSoldOut ? "destructive" : (maxRooms > 0 && maxRooms < 5 ? "destructive" : "secondary")} className="text-xs rounded-lg">
              {isSoldOut ? "Sold Out" : (maxRooms > 0 && maxRooms < 5 ? "Limited Availability" : `${maxRooms} rooms left`)}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs rounded-lg">
            {availableSeats} seats left
          </Badge>
        </div>
      </div>

      {/* Sold out alert */}
      {isSoldOut && (
        <Alert variant="destructive" className="rounded-xl">
          <Ban className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This hotel is fully booked for the selected departure. Please choose a different hotel or departure date.
          </AlertDescription>
        </Alert>
      )}

      {/* Room limit warning */}
      {!isSoldOut && isAtRoomLimit && (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
            Maximum of {maxRooms} room{maxRooms !== 1 ? 's' : ''} available for this hotel. Contact us for larger groups.
          </AlertDescription>
        </Alert>
      )}

      {/* Room Count */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <Bed className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Rooms</span>
        </div>
        <Select value={String(rooms.length)} onValueChange={handleRoomCountChange} disabled={isSoldOut}>
          <SelectTrigger className="w-16 h-8 rounded-lg border-border text-sm font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: Math.max(1, effectiveMaxRooms) }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Per-Room Config */}
      <div className="space-y-3">
        {rooms.map((room, index) => {
          const nonInfant = getNonInfantCount(room);
          const isRoomFull = nonInfant >= MAX_ROOM_OCCUPANCY;

          return (
            <div key={index} className="rounded-xl border border-border/60 bg-background overflow-hidden">
              <div className="px-3 py-2 bg-primary/5 border-b border-border/40 flex items-center justify-between">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Room {index + 1}</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge variant="secondary" className="text-[11px] px-2 py-0.5 rounded-lg">
                      {getRoomTypeLabel(getRoomType(room))}
                    </Badge>
                    {/* 1 ADT + 1 CHD = Double → child as adult */}
                    {getRoomType(room) === "double" && room.adults === 1 && (room.children6to12 + room.children2to6) === 1 && (
                      <span className="text-[9px] text-amber-600 font-medium">Child priced as Adult</span>
                    )}
                    {/* 2 children (CHD 2-6 + CHD 2-12) → CHD 2-12 as adult */}
                    {room.children6to12 >= 1 && room.children2to6 >= 1 && (room.children6to12 + room.children2to6) === 2 && (
                      <span className="text-[9px] text-amber-600 font-medium">CHD 2-12 priced as Adult</span>
                    )}
                  </div>
                  {rooms.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => removeRoom(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-border/40">
                {ageCategories.map(({ key, label, subtitle, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-border hover:bg-muted"
                        onClick={() => updateRoom(index, key, -1)}
                        disabled={room[key] <= (key === "adults" ? 1 : 0)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-bold text-sm text-primary">{room[key]}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-border hover:bg-muted"
                        onClick={() => updateRoom(index, key, 1)}
                        disabled={!canIncrement(index, key)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {isRoomFull && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800/50">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Room at capacity. Add another room for more guests.
                  </p>
                </div>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full rounded-xl text-xs gap-1.5"
          onClick={addRoom}
          disabled={isSoldOut || (maxRooms !== undefined && rooms.length >= maxRooms) || totalGuests >= Math.min(MAX_GUESTS, availableSeats)}
        >
          <Plus className="h-3 w-3" /> Add Room
        </Button>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">Total guests</span>
        <span className="text-lg font-bold text-primary">{totalWithInfants}</span>
      </div>
    </div>
  );
}
