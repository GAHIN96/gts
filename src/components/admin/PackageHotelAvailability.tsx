import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { usePackageDepartures } from "@/hooks/usePackageDepartures";
import { usePackageHotelsByPackage } from "@/hooks/usePackageHotels";
import {
  usePackageHotelAvailability,
  useUpsertHotelAvailability,
} from "@/hooks/usePackageHotelAvailability";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PackageHotelAvailabilityProps {
  packageId: string;
}

export function PackageHotelAvailability({ packageId }: PackageHotelAvailabilityProps) {
  const { data: departures, isLoading: loadingDeps } = usePackageDepartures(packageId);
  const { data: packageHotels, isLoading: loadingHotels } = usePackageHotelsByPackage(packageId);
  const { data: availability, isLoading: loadingAvail } = usePackageHotelAvailability(packageId);
  const upsert = useUpsertHotelAvailability();

  const [activeHotel, setActiveHotel] = useState("");
  const [localEdits, setLocalEdits] = useState<Record<string, number>>({});
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Auto-select first hotel
  useEffect(() => {
    if (packageHotels && packageHotels.length > 0) {
      setActiveHotel((prev) => {
        if (prev && packageHotels.some((ph) => ph.hotel_id === prev)) return prev;
        return packageHotels[0]?.hotel_id || "";
      });
    }
  }, [packageHotels]);

  const getKey = (depId: string, hotelId: string) => `${depId}-${hotelId}`;

  const getValue = (depId: string, hotelId: string): number => {
    const key = getKey(depId, hotelId);
    if (key in localEdits) return localEdits[key];
    const row = availability?.find(
      (a) => a.departure_id === depId && a.hotel_id === hotelId
    );
    return row?.available_rooms ?? 0;
  };

  const getBooked = (depId: string, hotelId: string): number => {
    const row = availability?.find(
      (a) => a.departure_id === depId && a.hotel_id === hotelId
    );
    return row?.booked_rooms ?? 0;
  };

  const handleChange = (depId: string, hotelId: string, value: number) => {
    const key = getKey(depId, hotelId);
    setLocalEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleBlur = useCallback(
    (depId: string, hotelId: string) => {
      const key = getKey(depId, hotelId);
      const val = localEdits[key];
      if (val === undefined) return;

      if (timerRef.current[key]) clearTimeout(timerRef.current[key]);
      timerRef.current[key] = setTimeout(async () => {
        try {
          await upsert.mutateAsync({
            packageId,
            departureId: depId,
            hotelId,
            availableRooms: val,
          });
        } catch {
          toast.error("Failed to save availability");
        }
      }, 500);
    },
    [localEdits, packageId, upsert]
  );

  const isLoading = loadingDeps || loadingHotels || loadingAvail;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>;
  }

  if (!packageHotels || packageHotels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        No hotels linked to this package. Add hotels in the General tab first.
      </p>
    );
  }

  if (!departures || departures.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        No departures yet. Add departures in the Departures tab first.
      </p>
    );
  }

  const activeHotelData = packageHotels.find((ph) => ph.hotel_id === activeHotel);

  const hotelHasAvailability = (hotelId: string) =>
    availability?.some((a) => a.hotel_id === hotelId && a.available_rooms > 0);

  return (
    <div className="space-y-4">
      {/* Hotel selector pills */}
      <div className="flex flex-wrap gap-2">
        {packageHotels.map((ph) => {
          const isActive = ph.hotel_id === activeHotel;
          const hasData = hotelHasAvailability(ph.hotel_id);
          return (
            <button
              key={ph.hotel_id}
              type="button"
              onClick={() => setActiveHotel(ph.hotel_id)}
              className={cn(
                "px-4 py-3 rounded-lg text-xs font-semibold uppercase text-center min-w-[140px] max-w-[180px] transition-all border-2",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : hasData
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
        {activeHotelData?.hotels?.name || activeHotelData?.tier || ""} — Availability
      </h3>

      {/* Departures table for active hotel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-bold uppercase text-muted-foreground text-xs">
                Departure Date
              </th>
              <th className="text-left py-2 px-3 font-bold uppercase text-muted-foreground text-xs">
                Return Date
              </th>
              <th className="text-center py-2 px-3 font-bold uppercase text-muted-foreground text-xs">
                Available Rooms
              </th>
              <th className="text-center py-2 px-3 font-bold uppercase text-muted-foreground text-xs">
                Booked
              </th>
            </tr>
          </thead>
          <tbody>
            {departures.map((dep) => (
              <tr key={dep.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">
                  {format(new Date(dep.departure_date), "dd/MM/yyyy")}
                </td>
                <td className="py-2 px-3 font-medium">
                  {format(new Date(dep.return_date), "dd/MM/yyyy")}
                </td>
                <td className="py-2 px-3 text-center">
                  <Input
                    type="number"
                    min="0"
                    value={getValue(dep.id, activeHotel)}
                    onChange={(e) =>
                      handleChange(dep.id, activeHotel, parseInt(e.target.value) || 0)
                    }
                    onBlur={() => handleBlur(dep.id, activeHotel)}
                    className="h-8 text-sm px-2 text-center w-20 mx-auto"
                  />
                </td>
                <td className="py-2 px-3 text-center text-muted-foreground">
                  {getBooked(dep.id, activeHotel)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
