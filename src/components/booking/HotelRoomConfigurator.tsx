import { Minus, Plus, Users, Bed, Baby, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

export interface RoomConfig {
  adults: number;          // 12+
  children6to12: number;   // 6-12 (extra bed eligible)
  children2to6: number;    // under 6 (no bed / shares)
  infants: number;         // under 2 (free, any room)
}

// Legacy compat: some callers still use { adults, children }
export interface LegacyRoomConfig {
  adults: number;
  children: number;
}

interface HotelRoomConfiguratorProps {
  rooms: RoomConfig[];
  onRoomsChange: (rooms: RoomConfig[]) => void;
  onApply: () => void;
}

const MAX_TOTAL_NON_INFANT = 9;
const MAX_PER_ROOM_NON_INFANT = 4; // 2 ADT + 1 CHD 6-12 + 1 CHD <6

type RoomType = "single" | "double" | "double_extra_bed" | "triple" | "needs_split";

interface RoomEvaluation {
  type: RoomType;
  label: string;
  note?: string;
  needsSplit?: boolean;
}

export function evaluateRoom(room: RoomConfig): RoomEvaluation {
  const { adults, children6to12, children2to6 } = room;
  const totalNonInfant = adults + children6to12 + children2to6;

  // 4+ adults → must split
  if (adults >= 4) {
    return { type: "needs_split", label: "Needs 2 Rooms", needsSplit: true, note: "4 adults — please split into 2 rooms" };
  }

  // Single
  if (totalNonInfant === 1 && adults === 1) {
    return { type: "single", label: "Single" };
  }

  // 2 ADT
  if (adults === 2 && children6to12 === 0 && children2to6 === 0) {
    return { type: "double", label: "Double" };
  }

  // 1 ADT
  if (adults === 1) {
    if (totalNonInfant === 2) {
      // 1 ADT + 1 CHD (any age) → Double (child priced as adult)
      return { type: "double", label: "Double", note: "Child priced as Adult" };
    }
    if (children6to12 === 1 && children2to6 === 1) {
      return { type: "double", label: "Double", note: "CHD 6-12 priced as Adult" };
    }
    if (children6to12 >= 2) {
      return { type: "double_extra_bed", label: "Double + Extra Bed", note: "1 child priced as Adult" };
    }
  }

  // 2 ADT + children
  if (adults === 2) {
    if (children6to12 === 0 && children2to6 === 1) {
      return { type: "double", label: "Double", note: "Child under 6 shares bed (no charge for bed)" };
    }
    if (children6to12 === 1 && children2to6 === 0) {
      return { type: "double_extra_bed", label: "Double + Extra Bed" };
    }
    if (children6to12 === 1 && children2to6 === 1) {
      return { type: "double_extra_bed", label: "Double + Extra Bed", note: "Under-6 shares bed" };
    }
    if (children6to12 >= 2) {
      return { type: "needs_split", label: "Needs 2 Rooms", needsSplit: true, note: "2 children 6+ — split into 2 rooms" };
    }
  }

  // 3 ADT
  if (adults === 3 && children6to12 === 0 && children2to6 === 0) {
    return { type: "triple", label: "Triple" };
  }
  if (adults === 3) {
    return { type: "needs_split", label: "Needs 2 Rooms", needsSplit: true, note: "3 adults + children — split into 2 rooms" };
  }

  return { type: "double", label: "Double" };
}

export function HotelRoomConfigurator({ rooms, onRoomsChange, onApply }: HotelRoomConfiguratorProps) {
  // Migrate legacy configs (adults + children) on the fly
  const normalized: RoomConfig[] = rooms.map((r: any) => ({
    adults: r.adults ?? 1,
    children6to12: r.children6to12 ?? 0,
    children2to6: r.children2to6 ?? (r.children ?? 0), // legacy "children" treated as under-6
    infants: r.infants ?? 0,
  }));

  const totalNonInfant = normalized.reduce((s, r) => s + r.adults + r.children6to12 + r.children2to6, 0);

  const handleRoomCountChange = (count: string) => {
    const newCount = parseInt(count);
    const current = normalized.length;
    if (newCount > current) {
      onRoomsChange([
        ...normalized,
        ...Array.from({ length: newCount - current }, () => ({
          adults: 2, children6to12: 0, children2to6: 0, infants: 0,
        })),
      ]);
    } else {
      onRoomsChange(normalized.slice(0, newCount));
    }
  };

  const removeRoom = (index: number) => {
    if (normalized.length <= 1) return;
    onRoomsChange(normalized.filter((_, i) => i !== index));
  };

  const canIncrement = (index: number, field: keyof RoomConfig): boolean => {
    const room = normalized[index];
    const nonInfant = room.adults + room.children6to12 + room.children2to6;

    if (field === "infants") return room.infants < 3;
    if (totalNonInfant >= MAX_TOTAL_NON_INFANT) return false;
    if (nonInfant >= MAX_PER_ROOM_NON_INFANT) return false;

    if (field === "adults") return room.adults < 4; // allow 4 to trigger split advice
    if (field === "children6to12") return room.children6to12 < 2;
    if (field === "children2to6") return room.children2to6 < 2;
    return false;
  };

  const updateRoom = (index: number, field: keyof RoomConfig, delta: number) => {
    const updated = [...normalized];
    const room = { ...updated[index] };
    const newVal = room[field] + delta;
    if (field === "adults" && newVal < 1) return;
    if (field !== "adults" && newVal < 0) return;
    if (delta > 0 && !canIncrement(index, field)) return;
    room[field] = newVal;
    updated[index] = room;
    onRoomsChange(updated);
  };

  const addRoom = () => {
    if (totalNonInfant >= MAX_TOTAL_NON_INFANT) return;
    if (normalized.length >= 9) return;
    onRoomsChange([...normalized, { adults: 2, children6to12: 0, children2to6: 0, infants: 0 }]);
  };

  const totalGuests = normalized.reduce(
    (s, r) => s + r.adults + r.children6to12 + r.children2to6 + r.infants, 0
  );

  const ageCategories: { key: keyof RoomConfig; label: string; subtitle: string; icon: typeof Users }[] = [
    { key: "adults", label: "Adults", subtitle: "12+ years", icon: Users },
    { key: "children6to12", label: "Child", subtitle: "6-12 yrs · extra bed", icon: Users },
    { key: "children2to6", label: "Child", subtitle: "Under 6 · shares bed", icon: Baby },
    { key: "infants", label: "Infant", subtitle: "Under 2 · free", icon: Baby },
  ];

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card max-h-[70vh] overflow-y-auto">
      {/* Header */}
      <div className="bg-primary/5 px-4 py-3 border-b border-border sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Guests & Rooms</h4>
          <span className="text-xs text-muted-foreground ml-auto">
            {totalGuests} guest{totalGuests !== 1 ? 's' : ''} · {normalized.length} room{normalized.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Room count selector */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">ROOMS</span>
        </div>
        <Select value={String(normalized.length)} onValueChange={handleRoomCountChange}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 9 }, (_, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Per-room config */}
      <div className="divide-y divide-border">
        {normalized.map((room, index) => {
          const evalResult = evaluateRoom(room);
          const isFull = room.adults + room.children6to12 + room.children2to6 >= MAX_PER_ROOM_NON_INFANT;
          return (
            <div key={index} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Room {index + 1}</span>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={evalResult.needsSplit ? "destructive" : "secondary"}
                    className="text-[11px] px-2 py-0.5 rounded-lg"
                  >
                    {evalResult.label}
                  </Badge>
                  {normalized.length > 1 && (
                    <ConfirmDelete itemName={`Room ${index + 1}`} onConfirm={() => removeRoom(index)}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </ConfirmDelete>
                  )}
                </div>
              </div>

              {evalResult.note && !evalResult.needsSplit && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {evalResult.note}
                </p>
              )}

              {evalResult.needsSplit && (
                <Alert variant="destructive" className="rounded-lg py-2 px-2.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-[11px] ml-1">
                    {evalResult.note}. Click <span className="font-semibold">+ Add Room</span> below to split this group.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {ageCategories.map(({ key, label, subtitle, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-tight truncate">{label}</p>
                        <p className="text-[9px] text-muted-foreground leading-tight">{subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateRoom(index, key, -1)}
                        disabled={room[key] <= (key === "adults" ? 1 : 0)}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <span className="w-4 text-center font-bold text-xs">{room[key]}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateRoom(index, key, 1)}
                        disabled={!canIncrement(index, key)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {isFull && !evalResult.needsSplit && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Room at capacity. Add another room for more guests.
                </p>
              )}
            </div>
          );
        })}

        <div className="px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-lg text-xs gap-1.5"
            onClick={addRoom}
            disabled={totalNonInfant >= MAX_TOTAL_NON_INFANT || normalized.length >= 9}
          >
            <Plus className="h-3 w-3" /> Add Room
          </Button>
        </div>
      </div>

      {/* Apply button */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 sticky bottom-0">
        <Button
          type="button"
          variant="navy"
          className="w-full h-9 text-sm font-semibold rounded-lg"
          onClick={onApply}
          disabled={normalized.some(r => evaluateRoom(r).needsSplit)}
        >
          {normalized.some(r => evaluateRoom(r).needsSplit) ? "Resolve room split first" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
