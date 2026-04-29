import { useState, useMemo, useCallback, useRef } from "react";
import customGroupHeroImg from "@/assets/custom-group-hero.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, parseISO, isSameDay, getDay } from "date-fns";
import {
  Calendar as CalendarIcon, Plane, Building, ArrowLeftRight, Check, ArrowRight, ArrowLeft,
  Star, Clock, Package2, Sparkles, MapPin, Shield, Car, Receipt, CircleDot, Tag,
  Users, Minus, Plus, BedDouble, BedSingle, Compass, Globe, CreditCard, Luggage, Baby, UserRound,
  Timer, Wifi, Waves, Dumbbell, UtensilsCrossed, ParkingCircle, Wind, DollarSign, ArrowDownAZ,
  CheckCircle2, Moon
} from "lucide-react";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { PlaneTakeoffIcon } from "@/components/icons/PlaneTakeoffIcon";
import { PlaneLandingIcon } from "@/components/icons/PlaneLandingIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCities } from "@/hooks/useCities";
import { useFlights, type Flight } from "@/hooks/useFlights";
import { useHotels, type Hotel } from "@/hooks/useHotels";
import { useTransfers, type Transfer } from "@/hooks/useTransfers";
import { useCustomGroupSettings } from "@/hooks/useCustomGroupSettings";
import type { Tables } from "@/integrations/supabase/types";

type HotelRoom = Tables<"hotel_rooms">;

interface RateRow {
  id: string;
  guestType: string;
  roomType: string;
  price: number;
  commission: number;
  count: number;
}

interface GuestRoom {
  id: number;
  adults: number;
  children: number;   // Child 6-12
  children6: number;  // Child 2-6
  infants: number;
}

/** Auto-determine room type(s) from occupancy */
function getRoomTypeLabel(room: GuestRoom): string {
  const { adults, children, children6 } = room;
  const totalAdults = adults; // CHD alone with 1 ADT counts as ADT price
  // 1 ADT only (may have child 2-6 or child 6-12 acting as 2nd adult)
  if (totalAdults === 1 && children === 0 && children6 === 0) return "Single";
  if (totalAdults === 1 && children === 0 && children6 === 1) return "Double"; // 1 ADT + 1 CHD 2-6 = Double (CHD pays ADT)
  if (totalAdults === 1 && children === 1 && children6 === 0) return "Double"; // 1 ADT + 1 CHD 6-12 = Double (CHD pays ADT)
  if (totalAdults === 2 && children === 0 && children6 === 0) return "Double";
  if (totalAdults === 2 && children === 0 && children6 === 1) return "Double"; // 2 ADT + 1 CHD 2-6 = Double (child shares bed)
  if (totalAdults === 2 && children === 1 && children6 === 0) return "Double + Extra Bed";
  if (totalAdults === 2 && children === 1 && children6 === 1) return "Double + Extra Bed";
  if (totalAdults === 3 && children === 0 && children6 === 0) return "Triple";
  return "Custom";
}

/** Max limits per room */
const MAX_ADULTS = 3;
const MAX_CHILDREN = 1;   // Child 6-12
const MAX_CHILDREN6 = 1;  // Child 2-6
const MAX_INFANTS = 2;

/** Validate room config is allowed */
function isValidRoomConfig(room: GuestRoom): boolean {
  const { adults, children, children6, infants } = room;
  if (adults < 1 || adults > MAX_ADULTS) return false;
  if (children < 0 || children > MAX_CHILDREN) return false;
  if (children6 < 0 || children6 > MAX_CHILDREN6) return false;
  if (infants < 0 || infants > MAX_INFANTS) return false;
  // 3 adults can't have children
  if (adults === 3 && (children > 0 || children6 > 0)) return false;
  // 1 adult can have max 1 child total
  if (adults === 1 && (children + children6) > 1) return false;
  return true;
}

const ROOM_TYPES = ["Single", "Double", "Triple"];

const GUEST_TYPES = ["Adult", "Child (2-12)", "Child (2-6)", "Infant"];
const DEFAULT_ROOM_FOR_GUEST: Record<string, string> = {
  "Adult": "Single",
  "Child (2-12)": "Extra Bed",
  "Child (2-6)": "Without-Bed",
  "Infant": "Infant",
};
const ROOM_OPTIONS_FOR_GUEST: Record<string, string[]> = {
  "Adult": ["Single", "Double", "Triple"],
  "Child (2-12)": ["Extra Bed", "Without-Bed"],
  "Child (2-6)": ["Without-Bed", "Extra Bed"],
  "Infant": ["Infant"],
};

const STEPS = [
  { label: "Dates & Destination", desc: "When & where", icon: Compass },
  { label: "Flights", desc: "Choose route", icon: Plane },
  { label: "Hotel", desc: "Pick stays", icon: Building },
  { label: "Transfers & Summary", desc: "Confirm trip", icon: ArrowLeftRight },
];

/* ── Premium Counter ── */
function Counter({ value, onChange, min = 1, max = 50 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-0 rounded-2xl overflow-hidden border border-border/60 bg-muted/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="h-11 w-11 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 transition-all duration-200 active:scale-90"
      >
        <Minus className="h-3.5 w-3.5 text-foreground/80" />
      </button>
      <div className="h-11 w-14 flex items-center justify-center border-x border-border/60 text-sm font-bold text-foreground bg-background/70">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="h-11 w-11 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 transition-all duration-200 active:scale-90"
      >
        <Plus className="h-3.5 w-3.5 text-foreground/80" />
      </button>
    </div>
  );
}

export function CustomGroupBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0); // -1 = back, 1 = forward
  const [hotelSort, setHotelSort] = useState<"cheapest" | "rating" | "name">("cheapest");
  const [showAllHotels, setShowAllHotels] = useState(true);

  const goToStep = useCallback((newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  }, [step]);
  const [guestRooms, setGuestRooms] = useState<GuestRoom[]>([
    { id: 1, adults: 1, children: 0, children6: 0, infants: 0 },
  ]);

  const passengerCount = useMemo(() => guestRooms.reduce((sum, r) => sum + r.adults + r.children + r.children6 + r.infants, 0), [guestRooms]);

  const addGuestRoom = useCallback(() => {
    setGuestRooms(prev => [...prev, { id: prev.length + 1, adults: 1, children: 0, children6: 0, infants: 0 }]);
  }, []);

  const removeGuestRoom = useCallback((id: number) => {
    setGuestRooms(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  }, []);

  const updateGuestRoom = useCallback((id: number, field: keyof GuestRoom, value: any) => {
    setGuestRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Enforce constraints: if 3 adults, reset children
      if (updated.adults === 3) {
        updated.children = 0;
        updated.children6 = 0;
      }
      // If 1 adult, max 1 child total
      if (updated.adults === 1 && (updated.children + updated.children6) > 1) {
        if (field === 'children') updated.children6 = 0;
        if (field === 'children6') updated.children = 0;
      }
      return updated;
    }));
  }, []);
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [departureDateOpen, setDepartureDateOpen] = useState(false);
  const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [roomHotelMap, setRoomHotelMap] = useState<Record<number, Hotel>>({});
  const [roomTypeMap, setRoomTypeMap] = useState<Record<number, string>>({});
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [rateRows, setRateRows] = useState<RateRow[]>([]);

  // Derive a "primary" hotel for backward compat (first assigned hotel)
  const selectedHotel = useMemo(() => {
    const vals = Object.values(roomHotelMap);
    return vals.length > 0 ? vals[0] : null;
  }, [roomHotelMap]);

  const allRoomsAssigned = useMemo(() => {
    return guestRooms.every((_, idx) => roomHotelMap[idx] && roomTypeMap[idx]);
  }, [guestRooms, roomHotelMap, roomTypeMap]);

  const { data: cities } = useCities();
  const { data: allFlightsRaw } = useFlights();
  const { data: allHotelsRaw } = useHotels();
  const { data: allTransfers } = useTransfers();
  const { config: groupConfig } = useCustomGroupSettings();

  // Filter by admin settings
  const availableCities = useMemo(() => {
    if (!cities) return [];
    if (groupConfig.allowed_city_ids.length === 0) return cities.filter(c => c.is_active);
    return cities.filter(c => c.is_active && groupConfig.allowed_city_ids.includes(c.id));
  }, [cities, groupConfig.allowed_city_ids]);

  const allFlights = useMemo(() => {
    if (!allFlightsRaw) return [];
    if (groupConfig.allowed_flight_ids.length === 0) return allFlightsRaw.filter(f => f.is_active);
    return allFlightsRaw.filter(f => f.is_active && groupConfig.allowed_flight_ids.includes(f.id));
  }, [allFlightsRaw, groupConfig.allowed_flight_ids]);

  const allHotels = useMemo(() => {
    if (!allHotelsRaw) return [];
    if (groupConfig.allowed_hotel_ids.length === 0) return allHotelsRaw.filter(h => h.is_active);
    return allHotelsRaw.filter(h => h.is_active && groupConfig.allowed_hotel_ids.includes(h.id));
  }, [allHotelsRaw, groupConfig.allowed_hotel_ids]);

  const originCity = availableCities?.find(c => c.id === originCityId);
  const destinationCity = availableCities?.find(c => c.id === destinationCityId);
  const nights = departureDate && returnDate ? differenceInDays(returnDate, departureDate) : 0;

  // Build availability maps for calendars based on flights
  const departureDateAvailability = useMemo(() => {
    if (!allFlights || !originCity || !destinationCity) return new Map<string, { available: boolean; price: number; seats: number }>();
    const map = new Map<string, { available: boolean; price: number; seats: number }>();
    allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === originCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === destinationCity.name.toLowerCase()
    ).forEach(f => {
      if (f.schedule_type === 'recurring' && f.recurring_days && f.valid_from && f.valid_until) {
        const start = parseISO(f.valid_from);
        const end = parseISO(f.valid_until);
        const today = new Date();
        const current = new Date(Math.max(start.getTime(), today.getTime()));
        for (let d = new Date(current); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = getDay(d);
          if (f.recurring_days.includes(dayOfWeek)) {
            const key = format(d, "yyyy-MM-dd");
            const existing = map.get(key);
            if (!existing || f.price < existing.price) {
              map.set(key, { available: true, price: f.price, seats: f.available_seats || 0 });
            }
          }
        }
      } else {
        const key = f.departure_date;
        const existing = map.get(key);
        if (!existing || f.price < existing.price) {
          map.set(key, { available: true, price: f.price, seats: f.available_seats || 0 });
        }
      }
    });
    return map;
  }, [allFlights, originCity, destinationCity]);

  const returnDateAvailability = useMemo(() => {
    if (!allFlights || !originCity || !destinationCity) return new Map<string, { available: boolean; price: number; seats: number }>();
    const map = new Map<string, { available: boolean; price: number; seats: number }>();
    allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === destinationCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === originCity.name.toLowerCase()
    ).forEach(f => {
      if (f.schedule_type === 'recurring' && f.recurring_days && f.valid_from && f.valid_until) {
        const start = parseISO(f.valid_from);
        const end = parseISO(f.valid_until);
        const today = new Date();
        const current = new Date(Math.max(start.getTime(), today.getTime()));
        for (let d = new Date(current); d <= end; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = getDay(d);
          if (f.recurring_days.includes(dayOfWeek)) {
            const key = format(d, "yyyy-MM-dd");
            const existing = map.get(key);
            if (!existing || f.price < existing.price) {
              map.set(key, { available: true, price: f.price, seats: f.available_seats || 0 });
            }
          }
        }
      } else {
        const key = f.departure_date;
        const existing = map.get(key);
        if (!existing || f.price < existing.price) {
          map.set(key, { available: true, price: f.price, seats: f.available_seats || 0 });
        }
      }
    });
    return map;
  }, [allFlights, originCity, destinationCity]);

  const outboundFlights = useMemo(() => {
    if (!allFlights || !departureDate || !originCity || !destinationCity) return [];
    const depStr = format(departureDate, "yyyy-MM-dd");
    return allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === originCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === destinationCity.name.toLowerCase() &&
      f.departure_date === depStr
    );
  }, [allFlights, departureDate, originCity, destinationCity]);

  const returnFlights = useMemo(() => {
    if (!allFlights || !returnDate || !originCity || !destinationCity) return [];
    const retStr = format(returnDate, "yyyy-MM-dd");
    return allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === destinationCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === originCity.name.toLowerCase() &&
      f.departure_date === retStr
    );
  }, [allFlights, returnDate, originCity, destinationCity]);

  // Determine required room types from guest configuration
  const requiredRoomTypes = useMemo(() => {
    const types = new Set<string>();
    guestRooms.forEach(room => {
      const label = getRoomTypeLabel(room);
      if (label === "Single") types.add("Single");
      if (label === "Double") types.add("Double");
      if (label === "Triple") types.add("Triple");
      if (label === "Double + Extra Bed") types.add("Double + Extra Bed");
    });
    return types;
  }, [guestRooms]);

  const availableHotels = useMemo(() => {
    if (!allHotels || !destinationCityId) return [];
    return allHotels.filter(h => {
      if (!h.is_active || h.city_id !== destinationCityId) return false;
      // Filter: hotel must have room types matching all required types with available rooms
      const activeRooms = (h.hotel_rooms || []).filter(r => r.is_active !== false);
      for (const required of requiredRoomTypes) {
        const match = activeRooms.find(r => r.room_type?.toLowerCase() === required.toLowerCase() && (r.available_rooms ?? 1) > 0);
        if (!match) return false;
      }
      return true;
    });
  }, [allHotels, destinationCityId, requiredRoomTypes]);

  const availableTransfers = useMemo(() => {
    if (!allTransfers || !destinationCityId) return [];
    return allTransfers.filter(t => t.is_active && t.city_id === destinationCityId);
  }, [allTransfers, destinationCityId]);

  const handleSelectHotel = useCallback((hotel: Hotel, roomIndex?: number) => {
    if (roomIndex !== undefined) {
      setRoomHotelMap(prev => ({ ...prev, [roomIndex]: hotel }));
      // Auto-set room type to first matching type
      const roomLabel = getRoomTypeLabel(guestRooms[roomIndex]);
      const activeRooms = (hotel.hotel_rooms || []).filter(r => r.is_active !== false);
      const neededType = roomLabel;
      const match = activeRooms.find(r => r.room_type === neededType);
      if (match) {
        setRoomTypeMap(prev => ({ ...prev, [roomIndex]: match.room_type }));
      } else {
        setRoomTypeMap(prev => { const n = { ...prev }; delete n[roomIndex]; return n; });
      }
    } else {
      // Assign to all unassigned rooms
      setRoomHotelMap(prev => {
        const updated = { ...prev };
        guestRooms.forEach((_, idx) => {
          if (!updated[idx]) updated[idx] = hotel;
        });
        return updated;
      });
      // Auto-set room types for newly assigned
      setRoomTypeMap(prev => {
        const updated = { ...prev };
        guestRooms.forEach((room, idx) => {
          if (!updated[idx]) {
            const roomLabel = getRoomTypeLabel(room);
            const activeRooms = (hotel.hotel_rooms || []).filter(r => r.is_active !== false);
            const neededType = roomLabel;
            const match = activeRooms.find(r => r.room_type === neededType);
            if (match) updated[idx] = match.room_type;
          }
        });
        return updated;
      });
    }
    setRateRows([]);
    // Auto-hide hotel list after a short delay to let state settle
    setTimeout(() => setShowAllHotels(false), 500);
  }, [guestRooms]);

  const updateRateRow = useCallback((id: string, field: keyof RateRow, value: any) => {
    setRateRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const addRateRow = useCallback(() => {
    setRateRows(prev => [...prev, {
      id: `rate-${Date.now()}`,
      guestType: "Adult",
      roomType: "Single",
      price: 0,
      commission: 0,
      count: 0,
    }]);
  }, []);

  const removeRateRow = useCallback((id: string) => {
    setRateRows(prev => prev.filter(r => r.id !== id));
  }, []);

  // Auto-derive rate rows from guestRooms configuration
  const derivedRateRows = useMemo(() => {
    const rows: { guestType: string; roomType: string; count: number; roomIndex: number }[] = [];
    guestRooms.forEach((room, idx) => {
      const roomType = getRoomTypeLabel(room);
      // Adults
      if (room.adults > 0) {
        rows.push({ guestType: "Adult", roomType, count: room.adults, roomIndex: idx });
      }
      // Child 6-12 → Extra Bed or part of Double
      if (room.children > 0) {
        const childRoomType = room.adults === 1 ? roomType : "Extra Bed";
        rows.push({ guestType: "Child (2-12)", roomType: childRoomType, count: room.children, roomIndex: idx });
      }
      // Child 2-6 → Without-Bed or part of Double
      if (room.children6 > 0) {
        const child6RoomType = room.adults === 1 ? roomType : "Without-Bed";
        rows.push({ guestType: "Child (2-6)", roomType: child6RoomType, count: room.children6, roomIndex: idx });
      }
      // Infants
      if (room.infants > 0) {
        rows.push({ guestType: "Infant", roomType: "Infant", count: room.infants, roomIndex: idx });
      }
    });
    return rows;
  }, [guestRooms]);

  // Aggregate derived rows by guestType + roomType for pricing
  const aggregatedRateRows = useMemo(() => {
    const map = new Map<string, { guestType: string; roomType: string; count: number }>();
    derivedRateRows.forEach(r => {
      const key = `${r.guestType}|${r.roomType}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += r.count;
      } else {
        map.set(key, { ...r });
      }
    });
    return Array.from(map.values());
  }, [derivedRateRows]);

  // Sync rateRow counts with aggregatedRateRows whenever guestRooms change
  const syncedRateRows = useMemo(() => {
    return rateRows.map(r => {
      const key = `${r.guestType}|${r.roomType}`;
      const agg = aggregatedRateRows.find(a => `${a.guestType}|${a.roomType}` === key);
      return { ...r, count: agg?.count || 0 };
    }).filter(r => r.count > 0);
  }, [rateRows, aggregatedRateRows]);

  // Calculate totals
  const flightTotal = ((selectedOutboundFlight?.price || 0) + (selectedReturnFlight?.price || 0)) * passengerCount;

  // Auto-calculate hotel total from assigned rooms & hotel_rooms pricing
  const calculatedHotelTotal = useMemo(() => {
    if (nights <= 0) return 0;
    let total = 0;
    guestRooms.forEach((room, idx) => {
      const hotel = roomHotelMap[idx];
      const typeName = roomTypeMap[idx];
      if (!hotel || !typeName) return;
      const hotelRoom = (hotel.hotel_rooms || []).find(r => r.room_type === typeName && r.is_active !== false);
      if (!hotelRoom) return;
      // Per-room cost: price_adult × adults + price_child × children(6-12) + price_child_6 × children(2-6) + price_infant × infants
      const roomCost = (
        (hotelRoom.price_adult ?? 0) * room.adults +
        (hotelRoom.price_child ?? 0) * room.children +
        ((hotelRoom as any).price_child_6 ?? (hotelRoom.price_child ?? 0) * 0.7) * room.children6 +
        (hotelRoom.price_infant ?? 0) * room.infants
      ) * nights;
      total += roomCost;
    });
    return Math.round(total * 100) / 100;
  }, [guestRooms, roomHotelMap, roomTypeMap, nights]);

  // Per-room price breakdown for display
  const perRoomPrices = useMemo(() => {
    const prices: Record<number, number> = {};
    guestRooms.forEach((room, idx) => {
      const hotel = roomHotelMap[idx];
      const typeName = roomTypeMap[idx];
      if (!hotel || !typeName) return;
      const hotelRoom = (hotel.hotel_rooms || []).find(r => r.room_type === typeName && r.is_active !== false);
      if (!hotelRoom) return;
      prices[idx] = (
        (hotelRoom.price_adult ?? 0) * room.adults +
        (hotelRoom.price_child ?? 0) * room.children +
        ((hotelRoom as any).price_child_6 ?? (hotelRoom.price_child ?? 0) * 0.7) * room.children6 +
        (hotelRoom.price_infant ?? 0) * room.infants
      );
    });
    return prices;
  }, [guestRooms, roomHotelMap, roomTypeMap]);

  // Detailed per-person breakdown per room for Grand Total display
  const perPersonBreakdown = useMemo(() => {
    const breakdown: { roomIdx: number; roomType: string; hotelName: string; guests: { label: string; price: number; count: number }[] }[] = [];
    guestRooms.forEach((room, idx) => {
      const hotel = roomHotelMap[idx];
      const typeName = roomTypeMap[idx];
      if (!hotel || !typeName) return;
      const hotelRoom = (hotel.hotel_rooms || []).find(r => r.room_type === typeName && r.is_active !== false);
      if (!hotelRoom) return;
      const guests: { label: string; price: number; count: number }[] = [];
      if (room.adults > 0) {
        for (let i = 0; i < room.adults; i++) {
          guests.push({ label: `Adult ${room.adults > 1 ? i + 1 : ''}`.trim(), price: (hotelRoom.price_adult ?? 0) * nights, count: 1 });
        }
      }
      if (room.children > 0) {
        for (let i = 0; i < room.children; i++) {
          guests.push({ label: `Child ${room.children > 1 ? i + 1 : ''} (2-12)`.trim(), price: (hotelRoom.price_child ?? 0) * nights, count: 1 });
        }
      }
      if (room.children6 > 0) {
        for (let i = 0; i < room.children6; i++) {
          guests.push({ label: `Child ${room.children6 > 1 ? i + 1 : ''} (2-6)`.trim(), price: ((hotelRoom as any).price_child_6 ?? (hotelRoom.price_child ?? 0) * 0.7) * nights, count: 1 });
        }
      }
      if (room.infants > 0) {
        for (let i = 0; i < room.infants; i++) {
          guests.push({ label: `Infant ${room.infants > 1 ? i + 1 : ''}`.trim(), price: (hotelRoom.price_infant ?? 0) * nights, count: 1 });
        }
      }
      breakdown.push({ roomIdx: idx, roomType: typeName, hotelName: hotel.name, guests });
    });
    return breakdown;
  }, [guestRooms, roomHotelMap, roomTypeMap, nights]);

  const hotelTotal = calculatedHotelTotal;
  const transferTotal = (selectedTransfer?.price || 0) * passengerCount;
  const subtotal = flightTotal + hotelTotal + transferTotal;

  const discountPct = groupConfig.discount_percent || 0;
  const discountFixed = groupConfig.discount_fixed || 0;
  const discountAmount = Math.round((subtotal * discountPct) / 100) + discountFixed;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const totalRoomsSelected = guestRooms.length;

  const canProceedStep0 = departureDate && returnDate && originCityId && destinationCityId && nights > 0 && originCityId !== destinationCityId && passengerCount > 0;
  const canProceedStep1 = selectedOutboundFlight && selectedReturnFlight;
  const canProceedStep2 = allRoomsAssigned;

  const handleProceedToBooking = () => {
    if (!selectedOutboundFlight || !selectedReturnFlight || !allRoomsAssigned || !departureDate || !returnDate) return;
    const primaryHotel = selectedHotel!;
    const params = new URLSearchParams({
      outboundFlightId: selectedOutboundFlight.id,
      returnFlightId: selectedReturnFlight.id,
      hotelId: primaryHotel.id,
      ...(selectedTransfer ? { transferId: selectedTransfer.id } : {}),
      departureDate: format(departureDate, "yyyy-MM-dd"),
      returnDate: format(returnDate, "yyyy-MM-dd"),
      nights: String(nights),
      passengers: String(passengerCount),
      total: String(grandTotal),
      guestRooms: JSON.stringify(guestRooms.map((r, idx) => ({
        roomType: roomTypeMap[idx] || getRoomTypeLabel(r),
        adults: r.adults,
        children: r.children,
        children6: r.children6,
        infants: r.infants,
        hotelId: roomHotelMap[idx]?.id || primaryHotel.id,
        hotelName: roomHotelMap[idx]?.name || primaryHotel.name,
        pricePerNight: perRoomPrices[idx] ?? 0,
      }))),
      hotelTotal: String(calculatedHotelTotal),
    });
    navigate(`/packages/custom-group/book?${params.toString()}`);
  };

  // Unique hotels selected
  const uniqueSelectedHotels = useMemo(() => {
    const seen = new Set<string>();
    const result: Hotel[] = [];
    Object.values(roomHotelMap).forEach(h => {
      if (!seen.has(h.id)) {
        seen.add(h.id);
        result.push(h);
      }
    });
    return result;
  }, [roomHotelMap]);

  const sidebarItems = [
    {
      icon: Plane,
      label: "Outbound Flight",
      value: selectedOutboundFlight?.price || 0,
      detail: selectedOutboundFlight ? `${selectedOutboundFlight.airline} ${selectedOutboundFlight.flight_number || ''} • $${selectedOutboundFlight.price}/person` : null,
      active: !!selectedOutboundFlight,
      step: 1,
    },
    {
      icon: Plane,
      label: "Return Flight",
      value: selectedReturnFlight?.price || 0,
      detail: selectedReturnFlight ? `${selectedReturnFlight.airline} ${selectedReturnFlight.flight_number || ''} • $${selectedReturnFlight.price}/person` : null,
      active: !!selectedReturnFlight,
      step: 1,
      rotate: true,
    },
    {
      icon: Building,
      label: "Hotel",
      value: hotelTotal,
      detail: uniqueSelectedHotels.length > 0
        ? uniqueSelectedHotels.length === 1
          ? `${uniqueSelectedHotels[0].name} (${totalRoomsSelected} room${totalRoomsSelected > 1 ? "s" : ""} × ${nights}N)`
          : `${uniqueSelectedHotels.length} hotels (${totalRoomsSelected} rooms × ${nights}N)`
        : null,
      active: allRoomsAssigned,
      step: 2,
    },
    {
      icon: ArrowLeftRight,
      label: "Transfer",
      value: transferTotal,
      detail: selectedTransfer ? `${selectedTransfer.name} × ${passengerCount} pax` : "Optional",
      active: !!selectedTransfer,
      step: 3,
      optional: true,
    },
  ];

  /* ── Reusable Flight Card ── */
  const renderFlightCard = (f: Flight, isSelected: boolean, onSelect: () => void, isReturn = false) => {
    const seatsLow = (f.available_seats || 0) < 10;
    const insufficientSeats = (f.available_seats || 0) < passengerCount;
    const depCode = isReturn
      ? (f.departure_airport_code || destinationCity?.name?.slice(0, 3).toUpperCase())
      : (f.departure_airport_code || originCity?.name?.slice(0, 3).toUpperCase());
    const arrCode = isReturn
      ? (f.arrival_airport_code || originCity?.name?.slice(0, 3).toUpperCase())
      : (f.arrival_airport_code || destinationCity?.name?.slice(0, 3).toUpperCase());

    // Calculate flight duration
    const calcDuration = () => {
      if (!f.departure_time || !f.arrival_time) return null;
      const [dh, dm] = f.departure_time.split(":").map(Number);
      const [ah, am] = f.arrival_time.split(":").map(Number);
      let diff = (ah * 60 + am) - (dh * 60 + dm);
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
    };
    const duration = calcDuration();
    const isNextDay = (() => {
      if (!f.departure_time || !f.arrival_time) return false;
      const [dh] = f.departure_time.split(":").map(Number);
      const [ah] = f.arrival_time.split(":").map(Number);
      return ah < dh;
    })();

    const accentText = isReturn ? "text-emerald-600 dark:text-emerald-400" : "text-primary";
    const accentBg = isReturn ? "bg-emerald-500" : "bg-primary";
    const accentSoft = isReturn ? "bg-emerald-500/10" : "bg-primary/10";
    const accentBorder = isReturn ? "border-emerald-500/25" : "border-primary/25";

    return (
      <motion.button
        key={f.id}
        onClick={onSelect}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "w-full rounded-2xl text-left transition-all duration-300 group overflow-hidden relative",
          isSelected
            ? isReturn
              ? "border-2 border-emerald-500 bg-card shadow-2xl shadow-emerald-500/15 ring-1 ring-emerald-500/20"
              : "border-2 border-primary bg-card shadow-2xl shadow-primary/15 ring-1 ring-primary/20"
            : "border border-border/60 hover:border-primary/40 hover:shadow-xl bg-card"
        )}
      >
        {/* Selected shimmer */}
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className={cn(
              "absolute -inset-x-1/2 top-0 h-px opacity-60",
              isReturn ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent" : "bg-gradient-to-r from-transparent via-primary to-transparent"
            )} />
          </div>
        )}

        {/* Top accent bar */}
        <div className={cn(
          "h-1 w-full",
          isReturn
            ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"
            : "bg-gradient-to-r from-primary/70 via-primary to-primary/70"
        )} />

        {/* Selected pill */}
        {isSelected && (
          <div className="absolute top-3 right-3 z-10">
            <div className={cn(
              "px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md",
              isReturn ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
            )}>
              <Check className="h-3 w-3" strokeWidth={3} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.12em]">Selected</span>
            </div>
          </div>
        )}

        <div className="p-5 relative">
          {/* Row 1: Airline info + badges */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3.5">
              {f.airline_logo ? (
                <div className={cn(
                  "h-14 w-14 rounded-2xl p-2 flex items-center justify-center border shadow-sm bg-white dark:bg-card",
                  isReturn ? "border-emerald-500/25" : "border-primary/20"
                )}>
                  <img src={f.airline_logo} alt={f.airline} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm",
                  accentSoft, accentBorder
                )}>
                  {isReturn
                    ? <PlaneLandingIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" size={24} />
                    : <PlaneTakeoffIcon className="h-6 w-6 text-primary" size={24} />
                  }
                </div>
              )}
              <div>
                <p className="font-bold text-foreground text-[15px] tracking-tight font-heading leading-tight">{f.airline}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md border",
                    isReturn
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      : "bg-primary/5 text-primary border-primary/15"
                  )}>
                    {f.flight_number || "TBD"}
                  </span>
                  <Badge variant="secondary" className="text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground/80">
                    {f.class || "Economy"}
                  </Badge>
                  {insufficientSeats && (
                    <Badge variant="destructive" className="text-[9px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                      ⚠ Need {passengerCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Premium route timeline */}
          <div className={cn(
            "rounded-2xl px-5 py-4 border bg-gradient-to-br from-muted/40 via-muted/20 to-transparent",
            isReturn ? "border-emerald-500/20" : "border-primary/15"
          )}>
            <div className="flex items-center gap-4">
              {/* Departure */}
              <div className="text-left min-w-[70px]">
                <p className="text-[26px] font-black text-foreground tracking-tight font-heading leading-none tabular-nums">
                  {f.departure_time?.slice(0, 5) || "—"}
                </p>
                <p className={cn(
                  "text-[11px] font-extrabold uppercase tracking-[0.18em] mt-1.5",
                  accentText
                )}>{depCode}</p>
              </div>

              {/* Timeline */}
              <div className="flex-1 flex flex-col items-center px-2 gap-1.5">
                {duration && (
                  <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-[0.15em] flex items-center gap-1">
                    <Timer className="h-2.5 w-2.5" />
                    {duration}
                  </span>
                )}
                <div className="w-full relative flex items-center">
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-card shadow-sm", accentBg)} />
                  <div className={cn("flex-1 h-[2px]", isReturn ? "bg-emerald-500/25" : "bg-primary/25")} />
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md border-2 bg-card",
                    isReturn ? "border-emerald-500/40" : "border-primary/40"
                  )}>
                    {isReturn
                      ? <PlaneLandingIcon className="text-emerald-600 dark:text-emerald-400" size={16} />
                      : <PlaneTakeoffIcon className="text-primary" size={16} />
                    }
                  </div>
                  <div className={cn("flex-1 h-[2px]", isReturn ? "bg-emerald-500/25" : "bg-primary/25")} />
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-card shadow-sm", accentBg)} />
                </div>
                <span className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-[0.18em]">Direct</span>
              </div>

              {/* Arrival */}
              <div className="text-right min-w-[70px]">
                <div className="flex items-baseline justify-end gap-0.5">
                  <p className="text-[26px] font-black text-foreground tracking-tight font-heading leading-none tabular-nums">
                    {f.arrival_time?.slice(0, 5) || "—"}
                  </p>
                  {isNextDay && (
                    <span className={cn("text-[10px] font-extrabold", accentText)}>+1</span>
                  )}
                </div>
                <p className={cn(
                  "text-[11px] font-extrabold uppercase tracking-[0.18em] mt-1.5",
                  accentText
                )}>{arrCode}</p>
              </div>
            </div>
          </div>

          {/* Row 3: Footer — seats, amenities, price */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={seatsLow ? "destructive" : "outline"} className={cn(
                "text-[10px] font-bold rounded-lg px-2.5 py-1",
                seatsLow && "animate-pulse",
                !seatsLow && "border-border/60 text-foreground/80 bg-muted/40"
              )}>
                <Users className="h-3 w-3 mr-1.5" />
                {seatsLow ? `Only ${f.available_seats} left` : `${f.available_seats} seats`}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40 border border-border/40">
                <Luggage className="h-3 w-3" /> 20kg
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/40 border border-border/40">
                🍽 Meal
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.15em] leading-none">From</p>
              <p className={cn(
                "text-xl font-black leading-tight tracking-tight",
                accentText
              )}>${f.price}<span className="text-[10px] text-muted-foreground font-semibold ml-1">/pax</span></p>
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  // Get destination city image for hero background
  const destCityImage = destinationCity?.image_url;

  return (
    <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 pt-4 pb-8">
      {/* ═══ Bounded Cinematic Hero Band ═══ */}
      <motion.div
        className="relative h-[160px] md:h-[200px] rounded-3xl overflow-hidden mb-5 shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.45)] ring-1 ring-white/10"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src={destCityImage || customGroupHeroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Layered gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/30" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 18% 35%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(circle at 85% 70%, hsl(210 80% 55% / 0.28), transparent 55%)",
          }}
        />
        {/* Faint grain */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "3px 3px",
          }}
        />
        {/* Inner vignette ring */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none ring-1 ring-inset ring-white/10" />
        {/* Bottom fade into stepper */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-background/40 pointer-events-none" />

        <div className="relative h-full flex flex-col justify-center p-5 md:p-7">
          {/* Eyebrow chip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 w-fit"
          >
            <Compass className="h-3 w-3" style={{ color: "hsl(42 95% 65%)" }} />
            <span
              className="text-[9px] font-black uppercase tracking-[0.25em] bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(42 95% 70%), hsl(42 95% 90%), hsl(42 95% 70%))",
              }}
            >
              Tailored Experience
            </span>
          </motion.div>

          <h2 className="text-2xl md:text-4xl font-black tracking-tight font-heading leading-[1.05] drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
            <span className="bg-gradient-to-r from-white via-white to-sky-100/90 bg-clip-text text-transparent">
              Build Your Own{" "}
            </span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(var(--primary)) 0%, #fff 45%, hsl(210 80% 65%) 100%)",
                WebkitBackgroundClip: "text",
              }}
            >
              Journey
            </span>
          </h2>
          {/* Gold hairline */}
          <div
            className="mt-2 h-[2px] w-20 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(42 95% 60%) 35%, hsl(42 95% 78%) 50%, hsl(42 95% 60%) 65%, transparent 100%)",
              boxShadow: "0 0 14px hsl(42 95% 60% / 0.55)",
            }}
          />

          {/* Floating live stat pills (desktop) — compact horizontal */}
          <div className="hidden lg:flex items-center gap-2 absolute right-6 top-1/2 -translate-y-1/2">
            {[
              {
                label: "Destination",
                value: destinationCity?.name || "Not set",
                icon: MapPin,
              },
              {
                label: "Dates",
                value:
                  departureDate && returnDate
                    ? `${format(departureDate, "dd/MM")} → ${format(returnDate, "dd/MM")}`
                    : "Pick dates",
                icon: CalendarIcon,
              },
              {
                label: "Travelers",
                value: `${passengerCount} ${passengerCount === 1 ? "guest" : "guests"}`,
                icon: Users,
              },
            ].map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <motion.div
                  key={pill.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]"
                >
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/15 ring-1 ring-white/20">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/60">
                      {pill.label}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[120px]">
                      {pill.value}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ═══ Premium Pill Stepper ═══ */}
      <div className="relative pb-6">
        <div className="rounded-2xl bg-white dark:bg-card border border-border/60 ring-1 ring-primary/10 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.22)] p-4 md:p-5 bg-gradient-to-r from-primary/[0.06] via-transparent to-accent/[0.06]">
          {/* Progress rail behind pills */}
          <div className="relative">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-muted/70 overflow-hidden pointer-events-none">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(280 45%, 50%) 50%, hsl(210 75% 50%) 100%)",
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.5)",
                }}
                initial={false}
                animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="relative flex items-center">
              {STEPS.map((s, i) => {
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <button
                      onClick={() => i < step && goToStep(i)}
                      disabled={i > step}
                      className={cn(
                        "group relative flex items-center gap-2.5 px-3 md:px-4 py-2.5 rounded-xl transition-all duration-300 disabled:cursor-not-allowed overflow-hidden",
                        isActive && "bg-gradient-to-r from-[hsl(5,55%,48%)] via-[hsl(280,40%,45%)] to-[hsl(210,75%,50%)] shadow-[0_10px_28px_-6px_hsl(var(--primary)/0.6)]",
                        isDone && "bg-emerald-500/15 hover:bg-emerald-500/25 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.4)] cursor-pointer ring-1 ring-emerald-400/40",
                        !isActive && !isDone && "bg-muted/60 hover:bg-muted"
                      )}
                    >
                      {/* Active shimmer sweep */}
                      {isActive && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-y-0 w-1/3 pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                          }}
                          animate={{ x: ["-120%", "320%"] }}
                          transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 1.2 }}
                        />
                      )}
                      {/* Number / Check badge */}
                      <span className="relative flex items-center justify-center h-7 w-7 shrink-0">
                        {isActive && (
                          <motion.span
                            aria-hidden
                            className="absolute inset-[-3px] rounded-full pointer-events-none"
                            style={{
                              background:
                                "conic-gradient(from 0deg, hsl(var(--primary)) 0%, hsl(210 80% 60%) 35%, transparent 60%, hsl(var(--primary)) 100%)",
                              mask: "radial-gradient(circle, transparent 56%, #000 58%)",
                              WebkitMask: "radial-gradient(circle, transparent 56%, #000 58%)",
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                        <span
                          className={cn(
                            "relative z-10 flex items-center justify-center h-7 w-7 rounded-full text-xs font-black transition-all",
                            isActive && "bg-white text-primary shadow-md ring-2 ring-white/50",
                            isDone && "bg-emerald-400 text-emerald-950 shadow-[0_0_12px_rgba(52,211,153,0.5)]",
                            !isActive && !isDone && "bg-muted text-muted-foreground ring-1 ring-border/60"
                          )}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                      </span>
                      <div className="hidden sm:flex flex-col items-start leading-tight">
                        <span
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                            isActive && "text-white",
                            isDone && "text-emerald-700 dark:text-emerald-200",
                            !isActive && !isDone && "text-muted-foreground"
                          )}
                        >
                          {s.label}
                        </span>
                        <span
                          className={cn(
                            "hidden md:inline text-[9px] font-semibold tracking-wide whitespace-nowrap transition-colors mt-0.5",
                            isActive && "text-white/70",
                            isDone && "text-emerald-700/70 dark:text-emerald-200/70",
                            !isActive && !isDone && "text-muted-foreground/60"
                          )}
                        >
                          {s.desc}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="step-active-glow"
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{ boxShadow: "0 0 0 1px hsl(var(--primary) / 0.4) inset" }}
                          transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        />
                      )}
                    </button>
                    {i < STEPS.length - 1 && <div className="flex-1 mx-2" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>


      {/* ═══ Content Area — on page surface ═══ */}
      <div className="relative pb-8">
        <div className="flex gap-8">
            {/* Main Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
              {/* ── Step 0: Dates & Destination ── */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 40 : -40, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -40 : 40, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                  className="space-y-6"
                >
                  {/* ── Premium Search Card ── */}
                  <div className="relative rounded-3xl border border-border/50 bg-card/80 dark:bg-card/70 backdrop-blur-xl ring-1 ring-border/50 shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.45)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.05] via-transparent to-[hsl(210,70%,45%)]/[0.05] pointer-events-none" />
                    <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[hsl(210,70%,45%)]/10 blur-3xl pointer-events-none" />

                    {/* Route Selection */}
                    <div className="relative p-6 pb-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(210,70%,45%)] flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/20">
                          <MapPin className="h-4.5 w-4.5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight leading-tight">Select Route</h3>
                          <p className="text-[11px] text-muted-foreground font-medium">Choose your origin and destination</p>
                        </div>
                      </div>

                      <div className="relative">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 md:gap-4 items-end">
                          {/* Origin */}
                          <div className="space-y-2 min-w-0">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From City</label>
                            <div className="relative group">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center pointer-events-none z-10">
                                <PlaneTakeoffIcon className="h-3.5 w-3.5 text-blue-500" size={14} />
                              </div>
                              <Select value={originCityId} onValueChange={setOriginCityId}>
                                <SelectTrigger className="rounded-xl h-12 pl-12 text-sm border-border/60 shadow-sm hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-secondary/40 backdrop-blur-sm text-foreground focus:ring-2 focus:ring-primary/30 font-medium">
                                  <SelectValue placeholder="Origin city" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCities?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="flex items-center gap-2">
                                        {c.country && getCountryFlagUrl(c.country) && <img src={getCountryFlagUrl(c.country)!} alt="" className="h-4 w-6 object-cover rounded-sm" />}
                                        {c.name}, {c.country}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Swap Button - centered between fields (desktop) */}
                          <div className="hidden md:flex items-end pb-1">
                            <motion.button
                              type="button"
                              onClick={() => {
                                const tmp = originCityId;
                                setOriginCityId(destinationCityId);
                                setDestinationCityId(tmp);
                              }}
                              whileHover={{ rotate: 180, scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              transition={{ type: "spring", stiffness: 260, damping: 18 }}
                              className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-[hsl(210,70%,45%)] flex items-center justify-center shadow-lg shadow-primary/40 ring-2 ring-card hover:shadow-xl hover:shadow-primary/50 transition-shadow"
                              aria-label="Swap origin and destination"
                            >
                              <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
                            </motion.button>
                          </div>

                          {/* Destination */}
                          <div className="space-y-2 min-w-0">
                            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To City</label>
                            <div className="relative group">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center pointer-events-none z-10">
                                <PlaneLandingIcon className="h-3.5 w-3.5 text-emerald-500" size={14} />
                              </div>
                              <Select value={destinationCityId} onValueChange={setDestinationCityId}>
                                <SelectTrigger className="rounded-xl h-12 pl-12 text-sm border-border/60 shadow-sm hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-secondary/40 backdrop-blur-sm text-foreground focus:ring-2 focus:ring-primary/30 font-medium">
                                  <SelectValue placeholder="Destination city" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCities?.filter(c => c.id !== originCityId).map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                      <span className="flex items-center gap-2">
                                        {c.country && getCountryFlagUrl(c.country) && <img src={getCountryFlagUrl(c.country)!} alt="" className="h-4 w-6 object-cover rounded-sm" />}
                                        {c.name}, {c.country}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Inline swap (mobile only) */}
                        <div className="md:hidden flex justify-center mt-2">
                          <motion.button
                            type="button"
                            onClick={() => {
                              const tmp = originCityId;
                              setOriginCityId(destinationCityId);
                              setDestinationCityId(tmp);
                            }}
                            whileTap={{ scale: 0.92, rotate: 180 }}
                            className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-[hsl(210,70%,45%)] flex items-center justify-center shadow-lg shadow-primary/35"
                            aria-label="Swap origin and destination"
                          >
                            <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Hairline Divider with arrow */}
                    <div className="relative px-6">
                      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-card text-muted-foreground/60">
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>

                    {originCityId && destinationCityId && departureDateAvailability.size === 0 && (
                      <div className="mx-6 mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                        <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-light">No flights found for this route. Calendar shows all dates — availability will be checked at the next step.</p>
                      </div>
                    )}

                    {/* Date Selection */}
                    <div className="relative p-6 pt-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(210,70%,45%)] flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/20">
                          <CalendarIcon className="h-4.5 w-4.5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-base md:text-lg font-bold text-foreground tracking-tight leading-tight">Travel Dates</h3>
                          <p className="text-[11px] text-muted-foreground font-medium">When do you want to travel?</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 md:gap-4 items-end">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Departure</label>
                          <Popover open={departureDateOpen} onOpenChange={setDepartureDateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn(
                                "w-full justify-start text-left font-medium rounded-xl h-14 border-border/60 shadow-sm hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md bg-secondary/40 backdrop-blur-sm text-foreground",
                                !departureDate && "text-muted-foreground"
                              )}>
                                <div className="flex items-center gap-3 w-full">
                                  <div className="h-9 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="text-left">
                                    {departureDate ? (
                                      <>
                                        <p className="text-sm font-bold text-foreground leading-tight">{format(departureDate, "dd MMM yyyy")}</p>
                                        <p className="text-[10px] text-muted-foreground">{format(departureDate, "EEEE")}</p>
                                      </>
                                    ) : (
                                      <div>
                                        <p className="text-sm font-semibold">Pick date</p>
                                        <p className="text-[10px] text-muted-foreground/70">Select departure</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={departureDate}
                                onSelect={(d) => {
                                  setDepartureDate(d);
                                  setDepartureDateOpen(false);
                                  // Auto-advance: open return picker after departure is chosen
                                  if (d && (!returnDate || returnDate <= d)) {
                                    setTimeout(() => setReturnDateOpen(true), 120);
                                  }
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                                className="p-3 pointer-events-auto"
                                components={{
                                  DayContent: ({ date: dayDate }) => {
                                    const key = format(dayDate, "yyyy-MM-dd");
                                    const info = departureDateAvailability.get(key);
                                    const hasRoute = originCityId && destinationCityId;
                                    return (
                                      <div className="flex flex-col items-center gap-0">
                                        <span>{dayDate.getDate()}</span>
                                        {hasRoute && info && (
                                          <span className={cn(
                                            "text-[8px] font-bold leading-none -mt-0.5",
                                            info.seats < 5 ? "text-amber-500" : "text-emerald-500"
                                          )}>
                                            ${info.price}
                                          </span>
                                        )}
                                        {hasRoute && !info && dayDate >= new Date() && (
                                          <span className="text-[8px] text-muted-foreground/40 leading-none -mt-0.5">—</span>
                                        )}
                                      </div>
                                    );
                                  }
                                }}
                              />
                              {originCityId && destinationCityId && (
                                <div className="px-3 pb-2 flex items-center gap-3 text-[9px] text-muted-foreground border-t border-border/30 pt-2">
                                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available</span>
                                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Limited</span>
                                  <span className="flex items-center gap-1"><span className="text-muted-foreground/40">—</span> No flights</span>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Nights chip */}
                        <div className="hidden md:flex flex-col items-center justify-end pb-2">
                          {nights > 0 ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center gap-1 px-3 py-2 rounded-full bg-gradient-to-br from-primary/10 to-[hsl(210,70%,45%)]/10 ring-1 ring-primary/20 shadow-sm"
                            >
                              <Moon className="h-3 w-3 text-primary" />
                              <span className="text-[10px] font-bold text-foreground leading-none whitespace-nowrap">{nights}n</span>
                            </motion.div>
                          ) : (
                            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted/40 ring-1 ring-border/50">
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Return</label>
                          <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn(
                                "w-full justify-start text-left font-medium rounded-xl h-14 border-border/60 shadow-sm hover:border-[hsl(210,70%,45%)]/50 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-md bg-secondary/40 backdrop-blur-sm text-foreground",
                                !returnDate && "text-muted-foreground"
                              )}>
                                <div className="flex items-center gap-3 w-full">
                                  <div className="h-9 w-9 rounded-lg bg-[hsl(210,70%,45%)]/15 ring-1 ring-[hsl(210,70%,45%)]/25 flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="h-4 w-4 text-[hsl(210,70%,45%)]" />
                                  </div>
                                  <div className="text-left">
                                    {returnDate ? (
                                      <>
                                        <p className="text-sm font-bold text-foreground leading-tight">{format(returnDate, "dd MMM yyyy")}</p>
                                        <p className="text-[10px] text-muted-foreground">{format(returnDate, "EEEE")}</p>
                                      </>
                                    ) : (
                                      <div>
                                        <p className="text-sm font-semibold">Pick date</p>
                                        <p className="text-[10px] text-muted-foreground/70">Select return</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={returnDate}
                                onSelect={(d) => { setReturnDate(d); if (d) setReturnDateOpen(false); }}
                                disabled={(date) => date < (departureDate || new Date())}
                                initialFocus
                                className="p-3 pointer-events-auto"
                                components={{
                                  DayContent: ({ date: dayDate }) => {
                                    const key = format(dayDate, "yyyy-MM-dd");
                                    const info = returnDateAvailability.get(key);
                                    const hasRoute = originCityId && destinationCityId;
                                    return (
                                      <div className="flex flex-col items-center gap-0">
                                        <span>{dayDate.getDate()}</span>
                                        {hasRoute && info && (
                                          <span className={cn(
                                            "text-[8px] font-bold leading-none -mt-0.5",
                                            info.seats < 5 ? "text-amber-500" : "text-emerald-500"
                                          )}>
                                            ${info.price}
                                          </span>
                                        )}
                                        {hasRoute && !info && dayDate >= new Date() && (
                                          <span className="text-[8px] text-muted-foreground/40 leading-none -mt-0.5">—</span>
                                        )}
                                      </div>
                                    );
                                  }
                                }}
                              />
                              {originCityId && destinationCityId && (
                                <div className="px-3 pb-2 flex items-center gap-3 text-[9px] text-muted-foreground border-t border-border/30 pt-2">
                                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available</span>
                                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Limited</span>
                                  <span className="flex items-center gap-1"><span className="text-muted-foreground/40">—</span> No flights</span>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Mobile nights badge */}
                      {nights > 0 && (
                        <div className="md:hidden mt-3 flex justify-center">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-primary/10 to-[hsl(210,70%,45%)]/10 ring-1 ring-primary/20">
                            <Moon className="h-3 w-3 text-primary" />
                            <span className="text-[11px] font-bold text-foreground">{nights} night{nights > 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trip Summary Bar */}
                    {nights > 0 && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                        <div className="relative px-6 py-4 bg-muted/40 backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Duration</p>
                                  <p className="text-sm font-bold text-foreground">{nights} night{nights > 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="h-8 w-px bg-border" />
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-accent/15 ring-1 ring-accent/25 flex items-center justify-center">
                                  <Users className="h-4 w-4 text-accent" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Travelers</p>
                                  <p className="text-sm font-bold text-foreground">{passengerCount} guest{passengerCount > 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="h-8 w-px bg-border" />
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Dates</p>
                                <p className="text-xs font-semibold text-foreground">
                                  {departureDate && format(departureDate, "dd MMM")} → {returnDate && format(returnDate, "dd MMM yyyy")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Destination Preview Card */}
                  {destinationCity && (
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr,1fr] gap-5">
                      <div className="relative rounded-2xl overflow-hidden h-56 group bg-gradient-to-br from-primary/20 to-primary/5">
                        <img
                          src={destinationCity.image_url || `https://source.unsplash.com/800x600/?${encodeURIComponent(destinationCity.name + ',' + (destinationCity.country || 'travel'))}`}
                          alt={destinationCity.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80`;
                          }}
                        />
                        <div className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center pointer-events-none">
                          <Globe className="h-5 w-5 text-white/90" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-5">
                          <Badge className="bg-primary text-primary-foreground text-[10px] font-bold mb-2 rounded-lg">
                            Trending Destination
                          </Badge>
                          <h3 className="text-xl font-black text-white tracking-tight">
                            The {destinationCity.name} Collective
                          </h3>
                          <p className="text-white/60 text-xs mt-1 font-light">
                            {nights > 0 ? `A ${nights}-night immersive experience for groups of ${passengerCount}.` : `Discover ${destinationCity.name}, ${destinationCity.country}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end">
                        <Button
                          onClick={() => goToStep(1)}
                          disabled={!canProceedStep0}
                          size="lg"
                          className="gap-2.5 rounded-2xl h-14 px-8 shadow-lg shadow-primary/20 text-sm font-bold tracking-tight transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 w-full"
                        >
                          Next: Select Flights <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {!destinationCity && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => goToStep(1)}
                        disabled={!canProceedStep0}
                        size="lg"
                        className="gap-2.5 rounded-2xl h-14 px-10 shadow-lg shadow-primary/20 text-sm font-bold tracking-tight transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
                      >
                        Next: Select Flights <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 1: Flights ── */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 40 : -40, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -40 : 40, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                  className="space-y-8"
                >
                  {/* Step Hero Header */}
                  <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/5 via-card to-emerald-500/5 shadow-card">
                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
                      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
                    </div>
                    <div className="relative px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-[hsl(210,70%,45%)] flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/20">
                          <Plane className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 mb-1">
                            <Sparkles className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[9px] tracking-[0.18em] font-extrabold text-primary uppercase">Step 2 of 4</span>
                          </div>
                          <h2 className="text-xl font-black text-foreground tracking-tight font-heading leading-tight">Choose Your Flights</h2>
                          <p className="text-xs text-muted-foreground font-medium">Select outbound and return — round-trip pairing for {passengerCount} passenger{passengerCount > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-3 py-2 rounded-xl flex items-center gap-2 border transition-all",
                          selectedOutboundFlight ? "bg-primary/10 border-primary/30" : "bg-muted/40 border-border/50"
                        )}>
                          {selectedOutboundFlight ? <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-border" />}
                          <span className="text-[11px] font-bold text-foreground">Outbound</span>
                        </div>
                        <div className={cn(
                          "px-3 py-2 rounded-xl flex items-center gap-2 border transition-all",
                          selectedReturnFlight ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/40 border-border/50"
                        )}>
                          {selectedReturnFlight ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={3} /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-border" />}
                          <span className="text-[11px] font-bold text-foreground">Return</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outbound Section */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/20 shadow-sm">
                        <PlaneTakeoffIcon className="h-5 w-5 text-primary" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-foreground tracking-tight font-heading">Outbound Flight</h3>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-[0.12em] rounded-md border-primary/30 bg-primary/5 text-primary px-1.5 py-0">Departure</Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground/80">{originCity?.name}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-semibold text-foreground/80">{destinationCity?.name}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{departureDate && format(departureDate, "EEE, dd MMM yyyy")}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{passengerCount} pax</span>
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Options</p>
                        <p className="text-sm font-black text-foreground tabular-nums">{outboundFlights.length}</p>
                      </div>
                    </div>
                    {outboundFlights.length === 0 ? (
                      <div className="text-center py-14 bg-muted/40 rounded-2xl border border-dashed border-border/70">
                        <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
                          <PlaneTakeoffIcon className="h-7 w-7 text-foreground/30" />
                        </div>
                        <p className="text-foreground font-semibold">No flights available for this route and date</p>
                        <p className="text-xs text-muted-foreground mt-1.5 font-light">Try selecting different dates</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {outboundFlights.map(f => renderFlightCard(f, selectedOutboundFlight?.id === f.id, () => setSelectedOutboundFlight(f)))}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-border/40" />
                    </div>
                    <div className="relative flex justify-center">
                      <div className="bg-card px-5 py-2 flex items-center gap-2.5 rounded-full border border-border/50 shadow-sm">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center border border-border/60">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-foreground/70" />
                        </div>
                        <span className="text-[10px] text-foreground/80 uppercase tracking-[0.18em] font-extrabold">Return Journey</span>
                      </div>
                    </div>
                  </div>

                  {/* Return Section */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <PlaneLandingIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-foreground tracking-tight font-heading">Return Flight</h3>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-[0.12em] rounded-md border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 px-1.5 py-0">Inbound</Badge>
                        </div>
                        <p className="text-[12px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground/80">{destinationCity?.name}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-semibold text-foreground/80">{originCity?.name}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{returnDate && format(returnDate, "EEE, dd MMM yyyy")}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{passengerCount} pax</span>
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] uppercase tracking-[0.15em] font-bold text-muted-foreground">Options</p>
                        <p className="text-sm font-black text-foreground tabular-nums">{returnFlights.length}</p>
                      </div>
                    </div>
                    {returnFlights.length === 0 ? (
                      <div className="text-center py-14 bg-muted/40 rounded-2xl border border-dashed border-border/70">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                          <PlaneLandingIcon className="h-7 w-7 text-emerald-500/40" />
                        </div>
                        <p className="text-foreground font-semibold">No return flights available for this route and date</p>
                        <p className="text-xs text-muted-foreground mt-1.5 font-light">Try selecting different dates</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {returnFlights.map(f => renderFlightCard(f, selectedReturnFlight?.id === f.id, () => setSelectedReturnFlight(f), true))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => goToStep(0)} className="gap-2 rounded-2xl h-12 px-6 border-border/60 bg-muted/40 text-foreground hover:bg-muted/60">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => goToStep(2)} disabled={!canProceedStep1} className="gap-2.5 rounded-2xl h-12 px-8 shadow-lg shadow-primary/20 font-bold tracking-tight hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                      Next: Select Hotel <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Hotel ── */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 40 : -40, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -40 : 40, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                  className="space-y-8"
                >
                  <div>
                    {/* ── Premium Section Header ── */}
                    <div className="flex items-center gap-5 mb-5">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/15 shadow-lg shadow-primary/10">
                        <Building className="h-7 w-7 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-extrabold text-foreground tracking-tight font-heading">Select Hotel</h3>
                        <p className="text-sm text-muted-foreground font-light mt-0.5">
                          Choose accommodation for your group
                        </p>
                      </div>
                    </div>
                    {/* Context pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {destinationCity && (
                        <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md border border-border/60 rounded-xl px-3.5 py-2 shadow-sm">
                          {destinationCity.country && (
                            <img src={getCountryFlagUrl(destinationCity.country)} alt="" className="h-4 w-5 rounded-sm object-cover" />
                          )}
                          <span className="text-xs font-semibold text-foreground">{destinationCity.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md border border-border/60 rounded-xl px-3.5 py-2 shadow-sm">
                        <Moon className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs font-semibold text-foreground">{nights} Night{nights > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md border border-border/60 rounded-xl px-3.5 py-2 shadow-sm">
                        <BedDouble className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs font-semibold text-foreground">{guestRooms.length} Room{guestRooms.length > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-md border border-border/60 rounded-xl px-3.5 py-2 shadow-sm">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs font-semibold text-foreground">{passengerCount} Guest{passengerCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* ── Room Assignments Panel ── */}
                    {guestRooms.length > 0 && (
                      <div className="rounded-2xl border border-border/60 bg-white dark:bg-card ring-1 ring-primary/10 p-6 mb-7 space-y-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] bg-gradient-to-br from-white via-primary/[0.03] to-accent/[0.04]">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                            <BedDouble className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold text-foreground tracking-tight">Room Assignments</h4>
                            <p className="text-[10px] text-muted-foreground">{Object.keys(roomHotelMap).length} of {guestRooms.length} rooms assigned</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
                            style={{ width: `${(Object.keys(roomHotelMap).length / guestRooms.length) * 100}%` }}
                          />
                        </div>

                        {/* Room cards */}
                        <div className="space-y-2.5">
                          {guestRooms.map((room, idx) => {
                            const roomType = getRoomTypeLabel(room);
                            const assignedHotel = roomHotelMap[idx];
                            const selectedRoomType = roomTypeMap[idx];
                            const guestIcons = [];
                            for (let i = 0; i < room.adults; i++) guestIcons.push({ icon: UserRound, label: "ADT", key: `a${i}` });
                            for (let i = 0; i < room.children; i++) guestIcons.push({ icon: UserRound, label: "CHD", key: `c${i}` });
                            for (let i = 0; i < room.children6; i++) guestIcons.push({ icon: Baby, label: "2-6", key: `c6${i}` });
                            for (let i = 0; i < room.infants; i++) guestIcons.push({ icon: Baby, label: "INF", key: `inf${i}` });

                            const thisRoomNeededType = roomType;
                            const hotelActiveRooms = assignedHotel
                              ? (assignedHotel.hotel_rooms || []).filter(r => r.is_active !== false && r.room_type === thisRoomNeededType)
                              : [];

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "rounded-xl border overflow-hidden transition-all duration-300",
                                  assignedHotel
                                    ? "border-primary/25 bg-primary/[0.03] border-l-4 border-l-primary"
                                    : "border-border/30 bg-muted/10 border-l-4 border-l-muted-foreground/20"
                                )}
                              >
                                <div className="flex items-center gap-4 px-4 py-3">
                                  {/* Room number badge */}
                                  <div className={cn(
                                    "h-9 w-9 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 border-2",
                                    assignedHotel
                                      ? "bg-blue-500/20 text-primary border-primary/20"
                                      : "bg-muted/40 text-muted-foreground border-border/30"
                                  )}>
                                    {idx + 1}
                                  </div>

                                  {/* Guest icons */}
                                  <div className="flex items-center gap-1.5 min-w-[100px]">
                                    {guestIcons.map(g => (
                                      <div key={g.key} className="flex flex-col items-center gap-0.5">
                                        <g.icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase">{g.label}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Room type pill */}
                                  <Badge variant="outline" className="text-[10px] font-bold rounded-lg px-2.5 border-primary/20 text-primary bg-primary/5 shrink-0">
                                    {roomType}
                                  </Badge>

                                  {/* Hotel selector */}
                                  <div className="flex-1">
                                    <Select
                                      value={assignedHotel?.id || ""}
                                      onValueChange={(hotelId) => {
                                        const hotel = availableHotels.find(h => h.id === hotelId);
                                        if (hotel) handleSelectHotel(hotel, idx);
                                      }}
                                    >
                                      <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 bg-muted/40 text-foreground">
                                        <SelectValue placeholder="Select hotel..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableHotels.map(h => (
                                          <SelectItem key={h.id} value={h.id}>
                                            <span className="flex items-center gap-1.5">
                                              {h.name}
                                              {h.star_rating && (
                                                <span className="text-[10px] text-muted-foreground">({h.star_rating}★)</span>
                                              )}
                                            </span>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Room type selector or status */}
                                  {assignedHotel ? (
                                    <div className="flex items-center gap-1.5">
                                      <Select
                                        value={selectedRoomType || ""}
                                        onValueChange={(val) => setRoomTypeMap(prev => ({ ...prev, [idx]: val }))}
                                      >
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/60 bg-muted/40 text-foreground w-[130px]">
                                          <SelectValue placeholder="Room type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {hotelActiveRooms.map(r => (
                                            <SelectItem key={r.id} value={r.room_type}>
                                              {r.room_type}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <button
                                        onClick={() => {
                                          setRoomHotelMap(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                          setRoomTypeMap(prev => { const n = { ...prev }; delete n[idx]; return n; });
                                        }}
                                        className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors border border-border/30"
                                        title="Remove assignment"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic shrink-0">Select hotel first</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Quick assign all to same hotel */}
                        {guestRooms.length > 1 && !allRoomsAssigned && (
                          <div className="flex items-center gap-3 pt-3 border-t border-border/20">
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Quick assign:</span>
                            <div className="flex flex-wrap gap-2">
                              {availableHotels.slice(0, 5).map(h => (
                                <button
                                  key={h.id}
                                  onClick={() => {
                                    const hotelMap: Record<number, Hotel> = {};
                                    const typeMap: Record<number, string> = {};
                                    guestRooms.forEach((room, idx) => {
                                      hotelMap[idx] = h;
                                      const roomLabel = getRoomTypeLabel(room);
                                      const activeRooms = (h.hotel_rooms || []).filter(r => r.is_active !== false);
                                      const neededType = roomLabel;
                                      const match = activeRooms.find(r => r.room_type === neededType);
                                      if (match) typeMap[idx] = match.room_type;
                                    });
                                    setRoomHotelMap(hotelMap);
                                    setRoomTypeMap(typeMap);
                                  }}
                                  className="text-[10px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-bold hover:from-primary/20 hover:to-primary/10 transition-all border border-primary/15 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 duration-300"
                                >
                                  {h.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Continue button when all assigned */}
                        {allRoomsAssigned && (
                          <div className="pt-4 border-t border-border/20">
                            <Button
                              onClick={() => goToStep(3)}
                              className="w-full gap-2.5 rounded-2xl h-12 shadow-lg shadow-primary/20 font-bold tracking-tight hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-sm"
                            >
                              <CheckCircle2 className="h-4.5 w-4.5" />
                              Continue to Transfers & Summary <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Sort Controls & Hotel Cards ── */}
                    {availableHotels.length > 0 && allRoomsAssigned && !showAllHotels && (
                      <div className="mb-5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAllHotels(true)}
                          className="gap-2.5 rounded-xl text-xs font-bold border-primary/30 text-primary hover:bg-primary/5 h-10 px-5"
                        >
                          <Building className="h-4 w-4" />
                          Change Hotel ({availableHotels.length} available)
                        </Button>
                      </div>
                    )}
                    {availableHotels.length > 0 && (showAllHotels || !allRoomsAssigned) && (
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm text-muted-foreground font-medium">{availableHotels.length} hotel{availableHotels.length > 1 ? "s" : ""} found</p>
                        <div className="flex items-center gap-1.5">
                          {allRoomsAssigned && (
                            <button
                              onClick={() => setShowAllHotels(false)}
                              className="text-xs px-4 py-2 rounded-xl font-semibold transition-all border bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted/60 mr-3"
                            >
                              Hide
                            </button>
                          )}
                          {/* Pill-shaped sort controls with icons */}
                          <div className="flex items-center bg-muted/40 rounded-xl border border-border/60 p-1">
                            {([
                              { key: "cheapest" as const, icon: DollarSign, label: "Cheapest" },
                              { key: "rating" as const, icon: Star, label: "Top Rated" },
                              { key: "name" as const, icon: ArrowDownAZ, label: "A-Z" },
                            ]).map(s => (
                              <button
                                key={s.key}
                                onClick={() => setHotelSort(s.key)}
                                className={cn(
                                  "flex items-center gap-1.5 text-[11px] px-3.5 py-2 rounded-lg font-bold transition-all duration-200",
                                  hotelSort === s.key
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                              >
                                <s.icon className="h-3 w-3" />
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hotel cards */}
                    {availableHotels.length === 0 ? (
                      <div className="text-center py-16 bg-muted/40 rounded-2xl border border-dashed border-border/70">
                        <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                          <Building className="h-8 w-8 text-foreground/20" />
                        </div>
                        <p className="text-muted-foreground font-semibold">No hotels available in this city</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-5">
                        {[...availableHotels].filter(h => {
                          if (!showAllHotels && allRoomsAssigned) {
                            return Object.values(roomHotelMap).some(hotel => hotel.id === h.id);
                          }
                          return true;
                        }).sort((a, b) => {
                          const getMinRoomPrice = (hotel: Hotel) => {
                            const activeRooms = (hotel.hotel_rooms || []).filter(r => r.is_active !== false && requiredRoomTypes.has(r.room_type));
                            if (activeRooms.length === 0) return Infinity;
                            return Math.min(...activeRooms.map(r => r.price_adult ?? r.price_per_night ?? Infinity));
                          };
                          if (hotelSort === "cheapest") return getMinRoomPrice(a) - getMinRoomPrice(b);
                          if (hotelSort === "rating") return (b.star_rating ?? 0) - (a.star_rating ?? 0);
                          return a.name.localeCompare(b.name);
                        }).map(h => {
                          const roomsAssignedHere = Object.values(roomHotelMap).filter(hotel => hotel.id === h.id).length;
                          const isUsed = roomsAssignedHere > 0;
                          const activeRoomsForPrice = (h.hotel_rooms || []).filter(r => r.is_active !== false && requiredRoomTypes.has(r.room_type));
                          const lowestRoomPrice = activeRoomsForPrice.length > 0 
                            ? Math.min(...activeRoomsForPrice.map(r => r.price_adult ?? r.price_per_night ?? 0))
                            : (h.price_per_night ?? 0);
                          const activeRooms = (h.hotel_rooms || []).filter(r => r.is_active !== false);
                          const matchingRoomTypes = activeRooms.filter(r => requiredRoomTypes.has(r.room_type));

                          // Amenity icon mapping
                          const amenityIconMap: Record<string, typeof Wifi> = {
                            wifi: Wifi, "wi-fi": Wifi, internet: Wifi,
                            pool: Waves, swimming: Waves,
                            gym: Dumbbell, fitness: Dumbbell,
                            restaurant: UtensilsCrossed, dining: UtensilsCrossed, breakfast: UtensilsCrossed,
                            parking: ParkingCircle,
                            ac: Wind, "air conditioning": Wind, "air-conditioning": Wind,
                            spa: Sparkles,
                          };
                          const getAmenityIcon = (amenity: string) => {
                            const lower = amenity.toLowerCase();
                            for (const [key, Icon] of Object.entries(amenityIconMap)) {
                              if (lower.includes(key)) return Icon;
                            }
                            return null;
                          };

                          return (
                            <div key={h.id} className="space-y-0">
                              <button
                                onClick={() => {
                                  const hotelActiveRooms = (h.hotel_rooms || []).filter(r => r.is_active !== false);
                                  const hotelRoomTypeSet = new Set(hotelActiveRooms.map(r => r.room_type));
                                  if (guestRooms.length === 1) {
                                    handleSelectHotel(h, 0);
                                  } else {
                                    let firstUnassigned = guestRooms.findIndex((room, idx) => {
                                      if (roomHotelMap[idx]) return false;
                                      const neededLabel = getRoomTypeLabel(room);
                                      return hotelRoomTypeSet.has(neededLabel);
                                    });
                                    if (firstUnassigned < 0) {
                                      firstUnassigned = guestRooms.findIndex((room) => {
                                        const neededLabel = getRoomTypeLabel(room);
                                        return hotelRoomTypeSet.has(neededLabel);
                                      });
                                    }
                                    if (firstUnassigned >= 0) {
                                      handleSelectHotel(h, firstUnassigned);
                                    }
                                  }
                                }}
                                className={cn(
                                  "w-full text-left transition-all duration-500 overflow-hidden group relative",
                                  isUsed
                                    ? "rounded-t-2xl border-2 border-b-0 border-primary bg-white dark:bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15"
                                    : "rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 bg-white dark:bg-card bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04]"
                                )}
                              >
                                <div className="flex">
                                  {/* Image area — magazine style */}
                                  <div className="relative w-72 flex-shrink-0 overflow-hidden">
                                    {h.images && h.images[0] ? (
                                      <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                      <div className="w-full h-full min-h-[200px] bg-white/[0.05] flex items-center justify-center">
                                        <Building className="h-14 w-14 text-muted-foreground/10" />
                                      </div>
                                    )}
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/5" />
                                    
                                    {/* Selected badge */}
                                    {isUsed && (
                                      <div className="absolute top-3 left-3 h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 animate-pulse">
                                        <Check className="h-5 w-5 text-primary-foreground" />
                                      </div>
                                    )}
                                    
                                    {/* Star rating on image */}
                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-xl px-3 py-1.5 border border-border/20 shadow-sm">
                                      {Array.from({ length: h.star_rating || 3 }).map((_, i) => (
                                        <Star key={i} className="h-3.5 w-3.5 text-gold fill-gold" />
                                      ))}
                                    </div>

                                    {/* Rooms assigned count on image */}
                                    {roomsAssignedHere > 0 && (
                                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow-lg shadow-primary/30">
                                        {roomsAssignedHere} Room{roomsAssignedHere > 1 ? "s" : ""}
                                      </div>
                                    )}
                                  </div>

                                  {/* Hotel details */}
                                  <div className="p-6 flex-1 flex flex-col justify-between min-h-[200px]">
                                    <div>
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <h4 className="font-extrabold text-foreground text-lg tracking-tight">{h.name}</h4>
                                          {h.address && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5 font-light">
                                              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />{h.address}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {/* Amenity icons */}
                                      {h.amenities && h.amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3.5">
                                          {h.amenities.slice(0, 6).map((a, i) => {
                                            const AmenityIcon = getAmenityIcon(a);
                                            return (
                                              <div
                                                key={i}
                                                className="flex items-center gap-1.5 text-[10px] bg-muted/40 text-muted-foreground rounded-lg px-2.5 py-1.5 font-medium border border-border/60"
                                              >
                                                {AmenityIcon && <AmenityIcon className="h-3 w-3 text-blue-400" />}
                                                {a}
                                              </div>
                                            );
                                          })}
                                          {h.amenities.length > 6 && (
                                            <span className="text-[10px] text-muted-foreground/70 font-medium px-1 self-center">
                                              +{h.amenities.length - 6} more
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Price section */}
                                     <div className="flex items-end justify-between pt-4 border-t border-border/60 mt-4">
                                       <div>
                                         <p className="text-[9px] text-muted-foreground/80 uppercase tracking-[0.12em] font-bold mb-1">From / Person / Night</p>
                                        <div className="flex items-baseline gap-2.5">
                                          <p className="font-black text-primary text-2xl tracking-tight font-heading">${lowestRoomPrice}</p>
                                          {nights > 0 && (
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs text-muted-foreground/80">×</span>
                                              <span className="text-xs text-muted-foreground font-medium">{nights}N</span>
                                              <span className="text-xs text-muted-foreground/80">=</span>
                                              <span className="text-sm font-extrabold text-foreground bg-muted/40 border border-border/60 rounded-lg px-2.5 py-0.5">
                                                ${lowestRoomPrice * nights}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {/* ── Expanded Room Types Panel ── */}
                              {isUsed && matchingRoomTypes.length > 0 && (
                                <div className="border-2 border-t-0 border-primary rounded-b-2xl bg-white dark:bg-card bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04] p-5 animate-fade-in ring-1 ring-primary/15">
                                  <div className="flex items-center gap-2.5 mb-4">
                                    <div className="h-7 w-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                      <BedDouble className="h-3.5 w-3.5 text-blue-400" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">Available Room Types</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {matchingRoomTypes.map(room => {
                                      const assignableRoomIndices = guestRooms
                                        .map((_, idx) => idx)
                                        .filter(idx => roomHotelMap[idx]?.id === h.id && requiredRoomTypes.has(room.room_type));
                                      const isSelected = assignableRoomIndices.some(idx => roomTypeMap[idx] === room.room_type);
                                      const RoomIcon = room.capacity >= 2 ? BedDouble : BedSingle;
                                      return (
                                        <div key={room.id} className={cn(
                                          "rounded-xl border transition-all duration-300 overflow-hidden",
                                          isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                            : "bg-muted/40 border-border/60 hover:border-primary/30 hover:shadow-md"
                                        )}>
                                          <div className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <div className={cn(
                                                  "h-10 w-10 rounded-xl flex items-center justify-center",
                                                  isSelected ? "bg-primary-foreground/20" : "bg-blue-500/20"
                                                )}>
                                                  <RoomIcon className={cn("h-5 w-5", isSelected ? "text-primary-foreground" : "text-primary")} />
                                                </div>
                                                <div>
                                                  <p className={cn("font-bold text-sm", isSelected ? "text-primary-foreground" : "text-foreground")}>{room.room_type}</p>
                                                  <div className="flex items-center gap-1 mt-0.5">
                                                    {Array.from({ length: room.capacity }).map((_, i) => (
                                                      <UserRound key={i} className={cn("h-3 w-3", isSelected ? "text-primary-foreground/70" : "text-muted-foreground/70")} />
                                                    ))}
                                                    <span className={cn("text-[10px] ml-1", isSelected ? "text-primary-foreground/70" : "text-muted-foreground/80")}>
                                                      {room.capacity} guest{room.capacity > 1 ? "s" : ""}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const targetIdx = assignableRoomIndices.find(idx => !roomTypeMap[idx]) ?? assignableRoomIndices[0];
                                                  if (targetIdx !== undefined) {
                                                    setRoomTypeMap(prev => {
                                                      const updated = { ...prev, [targetIdx]: room.room_type };
                                                      const allAssigned = guestRooms.every((_, idx) => roomHotelMap[idx] && updated[idx]);
                                                      if (allAssigned) setTimeout(() => setShowAllHotels(false), 400);
                                                      return updated;
                                                    });
                                                  }
                                                }}
                                                className={cn(
                                                  "text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 border",
                                                  isSelected
                                                    ? "bg-primary-foreground text-primary border-primary-foreground/80 shadow-sm"
                                                    : "bg-blue-500/20 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
                                                )}
                                              >
                                                {isSelected ? "✓ Selected" : "Select"}
                                              </button>
                                            </div>
                                            {/* Per-guest pricing table */}
                                            <div className={cn(
                                              "grid grid-cols-2 gap-x-4 gap-y-1.5 pt-3 border-t",
                                              isSelected ? "border-primary-foreground/15" : "border-border/20"
                                            )}>
                                              {(room.price_adult ?? 0) > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                   <span className={isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}>Adult</span>
                                                   <span className={cn("font-bold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                                    ${room.price_adult}/n {nights > 0 && <span className={isSelected ? "text-primary-foreground/60" : "text-muted-foreground"}>= ${(room.price_adult ?? 0) * nights}</span>}
                                                  </span>
                                                </div>
                                              )}
                                              {(room.price_child ?? 0) > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                   <span className={isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}>Child</span>
                                                   <span className={cn("font-bold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                                    ${room.price_child}/n {nights > 0 && <span className={isSelected ? "text-primary-foreground/60" : "text-muted-foreground"}>= ${(room.price_child ?? 0) * nights}</span>}
                                                  </span>
                                                </div>
                                              )}
                                              {((room as any).price_child_6 ?? 0) > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                   <span className={isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}>Child(2-6)</span>
                                                   <span className={cn("font-bold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                                    ${(room as any).price_child_6}/n {nights > 0 && <span className={isSelected ? "text-primary-foreground/60" : "text-muted-foreground"}>= ${((room as any).price_child_6 ?? 0) * nights}</span>}
                                                  </span>
                                                </div>
                                              )}
                                              {(room.price_infant ?? 0) > 0 && (
                                                <div className="flex justify-between text-[11px]">
                                                  <span className={isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}>Infant</span>
                                                  <span className={cn("font-bold", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                                    ${room.price_infant}/n {nights > 0 && <span className={isSelected ? "text-primary-foreground/60" : "text-muted-foreground"}>= ${(room.price_infant ?? 0) * nights}</span>}
                                                  </span>
                                                </div>
                                              )}
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
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => goToStep(1)} className="gap-2 rounded-2xl h-12 px-6 border-border/60 bg-muted/40 text-foreground hover:bg-muted/60">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => goToStep(3)} disabled={!canProceedStep2} className="gap-2.5 rounded-2xl h-12 px-8 shadow-lg shadow-primary/20 font-bold tracking-tight hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                      Next: Transfers & Summary <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Transfers & Summary ── */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  initial={{ opacity: 0, x: direction >= 0 ? 40 : -40, scale: 0.985 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction >= 0 ? -40 : 40, scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                  className="space-y-8"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-11 w-11 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-primary/10">
                        <ArrowLeftRight className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight font-heading">
                          Transfers <span className="text-muted-foreground/80 font-light text-sm">(Optional)</span>
                        </h3>
                        <p className="text-sm text-muted-foreground font-light">Select an airport transfer in {destinationCity?.name} • {passengerCount} pax</p>
                      </div>
                    </div>
                    {availableTransfers.length === 0 ? (
                      <div className="text-center py-14 bg-muted/40 rounded-2xl border border-dashed border-border/70">
                        <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                          <ArrowLeftRight className="h-7 w-7 text-foreground/30" />
                        </div>
                        <p className="text-sm text-muted-foreground font-semibold">No transfers available for this city</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <button
                          onClick={() => setSelectedTransfer(null)}
                          className={cn(
                            "w-full p-5 rounded-2xl text-left transition-all duration-300",
                            !selectedTransfer
                              ? "border-2 border-primary bg-white dark:bg-card ring-1 ring-primary/15 shadow-sm"
                              : "border border-border/60 hover:border-primary/20 hover:shadow-md bg-white dark:bg-card bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04]"
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center border transition-all",
                              !selectedTransfer ? "bg-blue-500/20 border-primary/15" : "bg-muted/40 border-border/60"
                            )}>
                              <Shield className="h-4.5 w-4.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">No transfer needed</span>
                            {!selectedTransfer && (
                              <div className="ml-auto h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                                <Check className="h-3.5 w-3.5 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </button>
                        {availableTransfers.map(t => {
                          const isSelected = selectedTransfer?.id === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTransfer(t)}
                              className={cn(
                                "w-full p-6 rounded-2xl text-left transition-all duration-500 group relative overflow-hidden",
                                isSelected
                                  ? "border-2 border-primary bg-white dark:bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15"
                                  : "border border-border/60 hover:border-primary/30 hover:shadow-xl hover:-translate-y-0.5 bg-white dark:bg-card bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04]"
                              )}
                            >
                              <div className="flex items-center justify-between relative">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all border",
                                    isSelected ? "bg-blue-500/20 border-primary/15" : "bg-muted/40 border-border/60 group-hover:bg-muted/60"
                                  )}>
                                    <ArrowLeftRight className="h-5 w-5 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground tracking-tight">{t.name}</p>
                                    <p className="text-sm text-white/60 mt-1 font-light">
                                      {t.route_from} → {t.route_to} • {t.vehicle_type} • {t.capacity} pax
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-extrabold text-primary text-xl tracking-tight font-heading">${t.price}</p>
                                    <p className="text-[10px] text-white/60 font-medium">× {passengerCount} = <span className="font-bold text-white">${t.price * passengerCount}</span></p>
                                  </div>
                                  <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300",
                                    isSelected
                                      ? "bg-primary shadow-lg shadow-primary/30"
                                      : "bg-black/30 border border-white/20 group-hover:scale-110"
                                  )}>
                                    {isSelected ? (
                                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                                    ) : (
                                      <div className="h-2 w-2 rounded-full bg-border" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => goToStep(2)} className="gap-2 rounded-2xl h-12 px-6 border-white/20 bg-black/35 text-white hover:bg-black/35">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={handleProceedToBooking}
                      className="gap-2.5 rounded-2xl h-13 px-10 shadow-xl shadow-primary/30 text-base font-bold tracking-tight hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <CreditCard className="h-4.5 w-4.5" />
                      Proceed to Booking <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* ═══ Sticky Price Sidebar ═══ */}
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-6 space-y-4">
                {/* ── Guests & Rooms Panel ── */}
                <div className="rounded-2xl border border-border/60 bg-white dark:bg-card ring-1 ring-primary/10 overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)]">
                  <div className="px-5 py-4 border-b border-border/60 bg-gradient-to-r from-primary/[0.05] to-accent/[0.05]">
                    <h3 className="text-base font-bold text-foreground tracking-tight">Guests & Rooms</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Room count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
                        <BedDouble className="h-4 w-4 text-primary" />
                        Rooms
                      </div>
                      <Select value={String(guestRooms.length)} onValueChange={(v) => {
                        const count = parseInt(v);
                        setGuestRooms(prev => {
                          if (count > prev.length) {
                            const newRooms = [...prev];
                            for (let i = prev.length; i < count; i++) {
                              newRooms.push({ id: Date.now() + i, adults: 1, children: 0, children6: 0, infants: 0 });
                            }
                            return newRooms;
                          }
                          // Clean up stale hotel/room type assignments for removed rooms
                          const sliced = prev.slice(0, count);
                          setRoomHotelMap(m => {
                            const cleaned: Record<number, Hotel> = {};
                            Object.entries(m).forEach(([k, v]) => { if (Number(k) < count) cleaned[Number(k)] = v; });
                            return cleaned;
                          });
                          setRoomTypeMap(m => {
                            const cleaned: Record<number, string> = {};
                            Object.entries(m).forEach(([k, v]) => { if (Number(k) < count) cleaned[Number(k)] = v; });
                            return cleaned;
                          });
                          return sliced;
                        });
                      }}>
                        <SelectTrigger className="w-16 h-9 rounded-xl text-sm font-bold border-border/60 bg-background/70 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Each room */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {guestRooms.map((room, idx) => {
                        const roomType = getRoomTypeLabel(room);
                        const canAddChild = room.adults >= 2 && room.children === 0 && room.adults < 3;
                        const canAddChild6 = room.adults >= 1 && room.children6 === 0 && (room.adults >= 2 || (room.adults === 1 && room.children === 0));
                        const canAddAdult = room.adults < MAX_ADULTS && (room.adults < 2 || (room.adults === 2 && room.children === 0 && room.children6 === 0));
                        
                        return (
                        <div key={room.id} className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/60">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Room {idx + 1}</span>
                            <Badge variant="secondary" className="text-[10px] font-bold rounded-lg px-2 bg-primary/10 text-primary border-primary/20">
                              {roomType}
                            </Badge>
                          </div>
                          <div className="p-3 space-y-2.5">
                            {([
                              { key: "adults" as const, label: "Adults", sub: "12+ years", icon: UserRound, min: 1, canIncrease: canAddAdult },
                              { key: "children" as const, label: "Child", sub: "6-12 years", icon: Users, min: 0, canIncrease: canAddChild },
                              { key: "children6" as const, label: "Child", sub: "2-6 years", icon: Baby, min: 0, canIncrease: canAddChild6 },
                              { key: "infants" as const, label: "Infant", sub: "Under 2", icon: Baby, min: 0, canIncrease: room.infants < MAX_INFANTS },
                            ]).map(cat => {
                              const Icon = cat.icon;
                              const val = room[cat.key];
                              return (
                                <div key={cat.key} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <Icon className="h-4 w-4 text-primary" />
                                    <div>
                                      <p className="text-xs font-semibold text-foreground">{cat.label}</p>
                                      <p className="text-[10px] text-muted-foreground font-light">{cat.sub}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-border/60 bg-muted/40">
                                    <button
                                      type="button"
                                      onClick={() => updateGuestRoom(room.id, cat.key, Math.max(cat.min, val - 1))}
                                      disabled={val <= cat.min}
                                      className="h-7 w-7 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 transition-all"
                                    >
                                      <Minus className="h-3 w-3 text-foreground/80" />
                                    </button>
                                    <span className="h-7 w-7 flex items-center justify-center text-xs font-bold text-foreground border-x border-border/60 bg-background/70">
                                      {val}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newRoom = { ...room, [cat.key]: val + 1 };
                                        if (isValidRoomConfig(newRoom)) {
                                          updateGuestRoom(room.id, cat.key, val + 1);
                                        }
                                      }}
                                      disabled={!cat.canIncrease}
                                      className="h-7 w-7 flex items-center justify-center hover:bg-primary/10 disabled:opacity-30 transition-all"
                                    >
                                      <Plus className="h-3 w-3 text-foreground/80" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Add Room button */}
                    <button
                      onClick={addGuestRoom}
                      className="w-full py-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl border border-dashed border-primary/30 transition-all"
                    >
                      + Add Room
                    </button>

                    {/* Total guests */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <span className="text-xs text-muted-foreground font-light">Total guests</span>
                      <span className="text-sm font-extrabold text-primary font-heading">{passengerCount}</span>
                    </div>
                  </div>
                </div>

                {/* Trip Info Card */}
                {(originCity || destinationCity) && (
                  <div className="rounded-2xl border border-border/60 bg-white dark:bg-card ring-1 ring-primary/10 overflow-hidden shadow-[0_8px_28px_-12px_rgba(0,0,0,0.15)]">
                    <div className="px-5 py-4 border-b border-border/60">
                      <h3 className="text-base font-bold text-foreground tracking-tight">Trip Details</h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {originCity && destinationCity && (
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="text-foreground font-semibold">{originCity.name}</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <div className="h-[2px] w-4 bg-primary/30 rounded-full" />
                            <Plane className="h-3 w-3 text-blue-400" />
                            <div className="h-[2px] w-4 bg-primary/30 rounded-full" />
                          </div>
                          <span className="text-foreground font-semibold">{destinationCity.name}</span>
                        </div>
                      )}
                      {departureDate && returnDate && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          <span className="font-light">{format(departureDate, "dd/MM")} – {format(returnDate, "dd/MM/yyyy")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {nights > 0 && (
                          <Badge variant="secondary" className="text-[10px] font-bold rounded-lg px-2.5 bg-muted/40 text-foreground border-border/60">{nights} night{nights > 1 ? "s" : ""}</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-bold rounded-lg px-2.5 bg-muted/40 text-foreground border-border/60">
                          <Users className="h-3 w-3 mr-1" />
                          {passengerCount} pax
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Price Card */}
                <div className="rounded-2xl border border-border/60 bg-white dark:bg-card ring-1 ring-primary/10 overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]">
                  <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-foreground tracking-tight">Live Estimate</h3>
                      <p className="text-[11px] text-muted-foreground font-light">Includes all travelers</p>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-blue-400" />
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Route Cost</span>
                        <span className="text-sm font-semibold text-foreground">${flightTotal > 0 ? flightTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hotel & Accommodation</span>
                        <span className="text-sm font-semibold text-foreground">${hotelTotal > 0 ? hotelTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Transfers</span>
                        <span className="text-sm font-semibold text-foreground">${transferTotal > 0 ? transferTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Group Service Fee</span>
                        <span className="text-sm font-semibold text-foreground">$0.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Taxes & Surcharges</span>
                        <span className="text-sm font-semibold text-foreground">$0.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Discount */}
                  {discountAmount > 0 && subtotal > 0 && (
                    <div className="border-t border-border/60 px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-400">
                            Discount {discountPct > 0 ? `(${discountPct}%)` : ""} {discountFixed > 0 ? `($${discountFixed})` : ""}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">-${discountAmount}</span>
                      </div>
                    </div>
                  )}

                  {/* Per-Person Hotel Breakdown */}
                  {perPersonBreakdown.length > 0 && (
                    <div className="border-t border-border/60 px-5 py-3 space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hotel Price Breakdown ({nights} night{nights !== 1 ? 's' : ''})</p>
                      {perPersonBreakdown.map((room, ri) => (
                        <div key={ri} className="space-y-1">
                          <p className="text-[10px] font-semibold text-foreground">
                            Room {room.roomIdx + 1} — {room.roomType} <span className="text-muted-foreground font-normal">({room.hotelName})</span>
                          </p>
                          {room.guests.map((g, gi) => (
                            <div key={gi} className="flex items-center justify-between pl-3">
                              <span className="text-[10px] text-muted-foreground">{g.label}</span>
                              <span className="text-[10px] font-bold text-foreground">${Math.round(g.price)}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="border-t border-border/60 px-5 py-5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-2">Total Cost</p>
                    <div className="flex items-end gap-3">
                      <span className={cn(
                        "font-black transition-all duration-500 font-heading leading-none",
                        grandTotal > 0 ? "text-4xl text-foreground" : "text-2xl text-muted-foreground/70"
                      )}>
                        ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {discountAmount > 0 && subtotal > 0 && (
                        <span className="text-xs line-through text-muted-foreground/60 mb-1">${subtotal}</span>
                      )}
                      <button className="text-[10px] font-bold text-primary underline underline-offset-2 mb-1 hover:text-primary/80 transition-colors">
                        View Breakdown
                      </button>
                    </div>
                  </div>

                  {/* CTA Button - always visible */}
                  <div className="px-5 pb-5">
                    <Button
                      onClick={step === 3 ? handleProceedToBooking : () => goToStep(step + 1)}
                      className="w-full gap-2.5 rounded-2xl h-16 shadow-lg shadow-primary/25 font-bold tracking-wide uppercase text-base hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary via-primary to-[hsl(231,50%,45%)]"
                      disabled={
                        (step === 0 && !canProceedStep0) ||
                        (step === 1 && !canProceedStep1) ||
                        (step === 2 && !canProceedStep2) ||
                        (step === 3 && !canProceedStep2)
                      }
                    >
                      {step === 0 && <>Next: Select Flights <ArrowRight className="h-4 w-4" /></>}
                      {step === 1 && <>Next: Select Hotel <ArrowRight className="h-4 w-4" /></>}
                      {step === 2 && <>Next: Summary <ArrowRight className="h-4 w-4" /></>}
                      {step === 3 && <><CreditCard className="h-4 w-4" /> Proceed to Booking <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60 mt-3 text-center font-light">
                      Price is an estimate and may change during flight and hotel selection steps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
