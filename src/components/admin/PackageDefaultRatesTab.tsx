import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PackageHotel } from "@/hooks/usePackageHotels";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

const GUEST_TYPES = ["Adult", "Child", "Infant"];
const ROOM_TYPES = ["Single", "Double", "Triple", "Extra Bed", "Without-Bed", "Infant"];

export interface RateRow {
  hotel_id: string;
  guest_type: string;
  room_type: string;
  capacity: number;
  count: number;
  price: number;
  commission: number;
}

interface PackageDefaultRatesTabProps {
  packageHotels: PackageHotel[];
  rates: RateRow[];
  onRatesChange: (rates: RateRow[]) => void;
}

export function PackageDefaultRatesTab({ packageHotels, rates, onRatesChange }: PackageDefaultRatesTabProps) {
  const [activeHotel, setActiveHotel] = useState("");

  // Update activeHotel when packageHotels load or change
  useEffect(() => {
    if (packageHotels && packageHotels.length > 0) {
      const firstId = packageHotels[0]?.hotel_id || "";
      setActiveHotel((prev) => {
        // Keep current selection if it's still valid
        if (prev && packageHotels.some((ph) => ph.hotel_id === prev)) return prev;
        return firstId;
      });
    }
  }, [packageHotels]);

  if (!packageHotels || packageHotels.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No hotels linked to this package. Add hotels in the General tab first.
      </div>
    );
  }

  const activeHotelData = packageHotels.find((ph) => ph.hotel_id === activeHotel);

  const addRow = (hotelId: string) => {
    const existingForHotel = rates.filter(r => r.hotel_id === hotelId);
    if (existingForHotel.length === 0) {
      // First time: auto-generate Adult, Child, Infant rows
      const autoRows: RateRow[] = [
        { hotel_id: hotelId, guest_type: "Adult", room_type: "Double", capacity: 10, count: 1, price: 0, commission: 0 },
        { hotel_id: hotelId, guest_type: "Child", room_type: "Extra Bed", capacity: 10, count: 1, price: 0, commission: 0 },
        { hotel_id: hotelId, guest_type: "Infant", room_type: "Infant", capacity: 10, count: 1, price: 0, commission: 0 },
      ];
      onRatesChange([...rates, ...autoRows]);
    } else {
      onRatesChange([
        ...rates,
        { hotel_id: hotelId, guest_type: "Adult", room_type: "Double", capacity: 10, count: 1, price: 0, commission: 0 },
      ]);
    }
  };

  const addAllTypes = (hotelId: string) => {
    const templates: Omit<RateRow, 'hotel_id'>[] = [
      { guest_type: "Adult", room_type: "Single", capacity: 10, count: 1, price: 0, commission: 0 },
      { guest_type: "Adult", room_type: "Double", capacity: 10, count: 1, price: 0, commission: 0 },
      { guest_type: "Adult", room_type: "Triple", capacity: 10, count: 1, price: 0, commission: 0 },
      { guest_type: "Child", room_type: "Extra Bed", capacity: 10, count: 1, price: 0, commission: 0 },
      { guest_type: "Child", room_type: "Without-Bed", capacity: 10, count: 1, price: 0, commission: 0 },
      { guest_type: "Infant", room_type: "Infant", capacity: 10, count: 1, price: 0, commission: 0 },
    ];
    const newRows = templates.map(t => ({ ...t, hotel_id: hotelId }));
    onRatesChange([...rates, ...newRows]);
  };

  const removeRow = (index: number) => {
    onRatesChange(rates.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof RateRow, value: string | number) => {
    const updated = [...rates];
    updated[index] = { ...updated[index], [field]: value };
    onRatesChange(updated);
  };

  const getHotelRates = (hotelId: string) => {
    return rates
      .map((r, originalIndex) => ({ ...r, originalIndex }))
      .filter((r) => r.hotel_id === hotelId);
  };

  const copyRatesFromHotel = (sourceHotelId: string, targetHotelId: string) => {
    const sourceRates = rates.filter((r) => r.hotel_id === sourceHotelId);
    if (sourceRates.length === 0) return;
    const copiedRates = sourceRates.map((r) => ({ ...r, hotel_id: targetHotelId }));
    onRatesChange([...rates, ...copiedRates]);
  };

  const hotelRates = getHotelRates(activeHotel);

  return (
    <div className="space-y-4">
      {/* Hotel selector tabs */}
      <div className="flex flex-wrap gap-2">
        {packageHotels.map((ph) => {
          const isActive = ph.hotel_id === activeHotel;
          const hotelHasRates = rates.some((r) => r.hotel_id === ph.hotel_id);
          return (
            <button
              key={ph.hotel_id}
              type="button"
              onClick={() => setActiveHotel(ph.hotel_id)}
              className={cn(
                "px-4 py-3 rounded-lg text-xs font-semibold uppercase text-center min-w-[140px] max-w-[180px] transition-all border-2",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : hotelHasRates
                    ? "bg-primary/90 text-primary-foreground border-emerald-500/70"
                    : "bg-primary/80 text-primary-foreground border-transparent hover:border-primary/50"
              )}
            >
              {ph.hotels?.name || ph.tier}
            </button>
          );
        })}
      </div>

      {/* Active hotel name */}
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
        {activeHotelData?.hotels?.name || activeHotelData?.tier || ""}
      </h3>

      {/* Rate rows */}
      <div className="space-y-3">
        {hotelRates.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
            No rates configured. Click "+ Add" to start.
          </div>
        ) : (
          hotelRates.map((row) => (
            <div key={row.originalIndex} className="flex items-center gap-2 flex-wrap">
              <Select
                value={row.guest_type}
                onValueChange={(v) => updateRow(row.originalIndex, "guest_type", v)}
              >
                <SelectTrigger className="h-10 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={row.room_type}
                onValueChange={(v) => updateRow(row.originalIndex, "room_type", v)}
              >
                <SelectTrigger className="h-10 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                placeholder="Capacity"
                className="h-10 w-[100px] text-sm"
                value={row.capacity}
                onChange={(e) => updateRow(row.originalIndex, "capacity", Number(e.target.value))}
              />

              <Input
                type="number"
                min={1}
                placeholder="Count"
                className="h-10 w-[80px] text-sm"
                value={row.count}
                onChange={(e) => updateRow(row.originalIndex, "count", Number(e.target.value))}
              />

              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                className="h-10 w-[120px] text-sm"
                value={row.price}
                onChange={(e) => updateRow(row.originalIndex, "price", Number(e.target.value))}
              />

              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Commission"
                className="h-10 w-[120px] text-sm"
                value={row.commission}
                onChange={(e) => updateRow(row.originalIndex, "commission", Number(e.target.value))}
              />

              <ConfirmDelete itemName="this rate row" onConfirm={() => removeRow(row.originalIndex)}>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmDelete>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRow(activeHotel)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addAllTypes(activeHotel)}
        >
          <ListPlus className="h-4 w-4 mr-1" />
          Add All Types
        </Button>
        {packageHotels.length > 1 && (
          <Select onValueChange={(sourceId) => copyRatesFromHotel(sourceId, activeHotel)}>
            <SelectTrigger className="h-8 w-auto text-xs gap-1">
              <Copy className="h-3.5 w-3.5" />
              <SelectValue placeholder="Copy from..." />
            </SelectTrigger>
            <SelectContent>
              {packageHotels
                .filter((other) => other.hotel_id !== activeHotel)
                .map((other) => (
                  <SelectItem key={other.hotel_id} value={other.hotel_id} className="text-xs">
                    {other.hotels?.name || other.tier}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
