import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BedDouble, Users, Hash, Loader2, CalendarOff, TrendingUp } from "lucide-react";

interface AvailableDateRow {
  from_date: string;
  to_date: string;
  available_rooms: number;
}

interface HotelRoomLite {
  id: string;
  room_type: string;
}

interface BookingRow {
  id: string;
  booking_number: string;
  status: string | null;
  passengers: number | null;
  passenger_details: any;
  notes: string | null;
}

interface DaySaleEntry {
  bookingId: string;
  bookingNumber: string;
  status: string | null;
  rooms: number;
  guests: number;
  leadName: string;
  roomBreakdown: { type: string; count: number }[];
}

interface Props {
  hotelId: string;
  availableDates: AvailableDateRow[];
  rooms: HotelRoomLite[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending_payment: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

function parseBookingNotes(notes: string | null): { check_in?: string; check_out?: string; rooms?: number; roomConfig?: any[] } {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

export function HotelAvailabilityInsightsCalendar({ hotelId, availableDates, rooms }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["hotel-bookings-insights", hotelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_number, status, passengers, passenger_details, notes")
        .eq("hotel_id", hotelId)
        .neq("status", "canceled");
      if (error) throw error;
      return (data as BookingRow[]) || [];
    },
    enabled: !!hotelId,
  });

  // Build day -> entries map
  const dayMap = useMemo(() => {
    const map = new Map<string, DaySaleEntry[]>();
    bookings.forEach((b) => {
      const meta = parseBookingNotes(b.notes);
      if (!meta.check_in || !meta.check_out) return;
      let start: Date, end: Date;
      try {
        start = parseISO(meta.check_in);
        end = parseISO(meta.check_out);
      } catch {
        return;
      }
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      // Build room breakdown from roomConfig (array of room objects)
      const roomConfig = Array.isArray(meta.roomConfig) ? meta.roomConfig : [];
      const roomCount = meta.rooms ?? roomConfig.length ?? 1;

      const breakdownMap = new Map<string, number>();
      roomConfig.forEach((rc: any) => {
        // Room type name resolution priority:
        const typeName =
          rc?.roomTypeName ||
          rc?.roomType ||
          rooms.find((r) => r.id === rc?.roomId)?.room_type ||
          "Standard";
        breakdownMap.set(typeName, (breakdownMap.get(typeName) || 0) + 1);
      });
      if (breakdownMap.size === 0) {
        breakdownMap.set("Room", roomCount);
      }
      const roomBreakdown = Array.from(breakdownMap.entries()).map(([type, count]) => ({ type, count }));

      const passengers = Array.isArray(b.passenger_details) ? b.passenger_details : [];
      const lead = passengers.find((p: any) => p?.isLead) || passengers[0];
      const leadName = lead ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Guest" : "Guest";

      // Hotel stays: nights from check_in (inclusive) to check_out (exclusive)
      const stayEnd = new Date(end);
      stayEnd.setDate(stayEnd.getDate() - 1);
      if (stayEnd < start) return;

      const days = eachDayOfInterval({ start, end: stayEnd });
      days.forEach((d) => {
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({
          bookingId: b.id,
          bookingNumber: b.booking_number,
          status: b.status,
          rooms: roomCount,
          guests: b.passengers || passengers.length || 0,
          leadName,
          roomBreakdown,
        });
      });
    });
    return map;
  }, [bookings, rooms]);

  // SHARED POOL MODEL: each inventory window has a fixed pool of rooms shared
  // across the whole window. A booking is counted ONCE per overlapping window
  // (not per night), so every day inside the same window shows the same
  // remaining count.
  const { dayDetails, greenDates, yellowDates, redDates } = useMemo(() => {
    const details: Record<string, { remaining: number; sold: number; capacity: number }> = {};

    // Step 1: walk inventory windows and compute shared-pool remaining per window
    availableDates.forEach((d) => {
      if (!d.from_date || !d.to_date) return;
      const start = new Date(d.from_date);
      const end = new Date(d.to_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return;

      // Sum bookings that overlap this window (each counted once)
      const wf = startOfDay(start).getTime();
      const wt = startOfDay(end).getTime();
      let windowSold = 0;
      bookings.forEach((b) => {
        const meta = parseBookingNotes(b.notes);
        if (!meta.check_in || !meta.check_out) return;
        const ci = startOfDay(parseISO(meta.check_in)).getTime();
        const co = startOfDay(parseISO(meta.check_out)).getTime() - 86400000; // last night
        if (isNaN(ci) || isNaN(co)) return;
        if (co >= wf && ci <= wt) {
          const roomConfig = Array.isArray(meta.roomConfig) ? meta.roomConfig : [];
          windowSold += meta.rooms ?? roomConfig.length ?? 1;
        }
      });

      const windowRemaining = Math.max(0, d.available_rooms - windowSold);

      eachDayOfInterval({ start, end }).forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        // If multiple windows overlap, keep the one with largest capacity
        const prev = details[key];
        if (!prev || d.available_rooms > prev.capacity) {
          details[key] = {
            remaining: windowRemaining,
            sold: windowSold,
            capacity: d.available_rooms,
          };
        }
      });
    });

    // Step 2: include sold-only days outside any window
    dayMap.forEach((entries, key) => {
      if (!details[key]) {
        const sold = entries.reduce((s, e) => s + e.rooms, 0);
        details[key] = { remaining: 0, sold, capacity: 0 };
      }
    });

    // Step 3: derive tier date arrays from the consolidated details
    const green: Date[] = [];
    const yellow: Date[] = [];
    const red: Date[] = [];
    Object.entries(details).forEach(([key, d]) => {
      const day = parseISO(key);
      if (d.remaining === 0) red.push(day);
      else if (d.remaining <= 3) yellow.push(day);
      else green.push(day);
    });

    return { dayDetails: details, greenDates: green, yellowDates: yellow, redDates: red };
  }, [availableDates, dayMap, bookings]);

  // Aggregate totals (future-only, so historic clutter doesn't skew occupancy)
  const totals = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    let capacity = 0, sold = 0, remaining = 0;
    Object.entries(dayDetails).forEach(([key, d]) => {
      if (parseISO(key).getTime() < today) return;
      capacity += d.capacity;
      sold += d.sold;
      remaining += d.remaining;
    });
    const occupancy = capacity > 0 ? Math.round((sold / capacity) * 100) : 0;
    return { capacity, sold, remaining, occupancy };
  }, [dayDetails]);

  // Responsive month count: 1 month under lg, 2 above
  const [monthCount, setMonthCount] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setMonthCount(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedEntries = selectedKey ? dayMap.get(selectedKey) || [] : [];
  const totalRoomsSold = selectedEntries.reduce((s, e) => s + e.rooms, 0);
  const totalGuests = selectedEntries.reduce((s, e) => s + e.guests, 0);

  const aggregatedRoomBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    selectedEntries.forEach((e) => {
      e.roomBreakdown.forEach((rb) => {
        m.set(rb.type, (m.get(rb.type) || 0) + rb.count);
      });
    });
    return Array.from(m.entries()).map(([type, count]) => ({ type, count }));
  }, [selectedEntries]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-primary font-semibold text-base">Availability Calendar</h3>
        {isLoading && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading sales…
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Click any day to see how many rooms were sold and which room types.
      </p>

      {availableDates.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center">
          <CalendarOff className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No availability windows yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add available date ranges in the Inventory tab to start tracking sales here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-card shadow-sm p-2 overflow-x-auto">
          <AvailabilityCalendar
            mode="single"
            availableDates={greenDates}
            limitedDates={yellowDates}
            soldOutDates={redDates}
            showLegend={true}
            numberOfMonths={monthCount}
            cellSize="lg"
            dayDetails={dayDetails}
            disabled={{ before: startOfDay(new Date()) }}
            onDayClick={(day: Date) => setSelectedDay(day)}
          />
        </div>
      )}

      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-primary" />
              {selectedDay ? format(selectedDay, "EEEE, dd MMM yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              Sales breakdown for this day at the hotel.
            </DialogDescription>
          </DialogHeader>

          {selectedEntries.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No rooms sold on this day.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{totalRoomsSold}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    Rooms Sold
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{totalGuests}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    Guests
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{selectedEntries.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    Bookings
                  </div>
                </div>
              </div>

              {/* Room type breakdown */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 inline-flex items-center gap-1.5">
                  <BedDouble className="h-3.5 w-3.5" /> Rooms by Type
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aggregatedRoomBreakdown.map((rb) => (
                    <Badge key={rb.type} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {rb.type} × {rb.count}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Per-booking list */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 inline-flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Bookings ({selectedEntries.length})
                </div>
                <ScrollArea className="max-h-64 pr-2">
                  <div className="space-y-2">
                    {selectedEntries.map((e, i) => (
                      <div
                        key={`${e.bookingId}-${i}`}
                        className="rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-sans font-medium text-xs font-semibold text-primary">
                            {e.bookingNumber}
                          </span>
                          {e.status && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${STATUS_COLORS[e.status] || "bg-muted text-foreground"} border-0`}
                            >
                              {e.status.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-foreground font-medium mb-1">{e.leadName}</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="h-3 w-3" /> {e.rooms} room{e.rooms > 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {e.guests} guest{e.guests !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {e.roomBreakdown.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {e.roomBreakdown.map((rb, ri) => (
                              <span
                                key={ri}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                              >
                                {rb.type} × {rb.count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
