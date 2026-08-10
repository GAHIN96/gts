import { useState, useMemo, useCallback, useRef } from "react";
import customGroupHeroImg from "@/assets/custom-group-hero.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, parseISO, isSameDay, getDay, startOfDay } from "date-fns";
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useCities } from "@/hooks/useCities";
import { useFlights, type Flight } from "@/hooks/useFlights";
import { useHotels, type Hotel } from "@/hooks/useHotels";
import { useTransfers, type Transfer } from "@/hooks/useTransfers";
import { useCustomGroupSettings } from "@/hooks/useCustomGroupSettings";
import { useHotelAvailableDates } from "@/hooks/useHotelAvailableDates";
import { useHotelBookings } from "@/hooks/useHotelBookings";
import { getStayWindowRemaining } from "@/lib/hotelAvailability";
import { pickRoomBand } from "@/lib/roomPricingTier";
import { addDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

import promoFlights1 from "@/assets/promo-flights-1.jpg";
import promoFlights2 from "@/assets/promo-flights-2.jpg";
import promoFlights3 from "@/assets/promo-flights-3.jpg";
import promoHotels1 from "@/assets/promo-hotels-1.jpg";
import promoHotels2 from "@/assets/promo-hotels-2.jpg";
import promoHotels3 from "@/assets/promo-hotels-3.jpg";
import { ImageCarousel } from "@/components/ui/image-carousel";

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
  return "Double";
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

const ROOM_TYPES = ["Single", "Double", "Double + Extra Bed", "Triple"];

const GUEST_TYPES = ["Adult", "Child (2-12)", "Child (2-6)", "Infant"];
const DEFAULT_ROOM_FOR_GUEST: Record<string, string> = {
  "Adult": "Single",
  "Child (2-12)": "Double + Extra Bed",
  "Child (2-6)": "Double",
  "Infant": "Single",
};
const ROOM_OPTIONS_FOR_GUEST: Record<string, string[]> = {
  "Adult": ["Single", "Double", "Triple"],
  "Child (2-12)": ["Double + Extra Bed", "Double"],
  "Child (2-6)": ["Double", "Double + Extra Bed"],
  "Infant": ["Single"],
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
  const [originOpen, setOriginOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
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
  const { data: hotelAvailableDates = [] } = useHotelAvailableDates();
  const { data: hotelBookings = [] } = useHotelBookings();

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
  const previewCity = destinationCity || (availableCities && availableCities.length > 0 ? availableCities[0] : null);
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

  const allOutboundFlights = useMemo(() => {
    if (!allFlights || !departureDate || !originCity || !destinationCity) return [];
    const depStr = format(departureDate, "yyyy-MM-dd");
    return allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === originCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === destinationCity.name.toLowerCase() &&
      f.departure_date === depStr
    );
  }, [allFlights, departureDate, originCity, destinationCity]);

  const allReturnFlights = useMemo(() => {
    if (!allFlights || !returnDate || !originCity || !destinationCity) return [];
    const retStr = format(returnDate, "yyyy-MM-dd");
    return allFlights.filter(f =>
      f.is_active &&
      f.departure_city?.toLowerCase() === destinationCity.name.toLowerCase() &&
      f.arrival_city?.toLowerCase() === originCity.name.toLowerCase() &&
      f.departure_date === retStr
    );
  }, [allFlights, returnDate, originCity, destinationCity]);

  const outboundFlights = useMemo(() => {
    // 1. If we have a selected return package flight, show only its linked outbound flight!
    if (selectedReturnFlight && (selectedReturnFlight.trip_type === "round_trip" || selectedReturnFlight.linked_flight_id)) {
      let linkedOutbound = allOutboundFlights.find(f => f.id === selectedReturnFlight.linked_flight_id);
      if (!linkedOutbound) linkedOutbound = allOutboundFlights.find(f => f.linked_flight_id === selectedReturnFlight.id);
      if (!linkedOutbound && selectedReturnFlight.trip_type === "round_trip") {
        linkedOutbound = allOutboundFlights.find(f => (f.trip_type === "round_trip" || f.linked_flight_id) && f.airline === selectedReturnFlight.airline);
      }
      return linkedOutbound ? [linkedOutbound] : [];
    }

    // 2. If we have a selected return flight but it is NOT a package flight:
    // The outbound flight cannot be a package flight.
    if (selectedReturnFlight) {
      const filtered = allOutboundFlights.filter(f => f.trip_type !== "round_trip" && !f.linked_flight_id);
      if (selectedOutboundFlight) {
        return filtered.filter(f => f.id === selectedOutboundFlight.id);
      }
      return filtered;
    }

    // 3. If no return flight is selected yet:
    if (selectedOutboundFlight) {
      return allOutboundFlights.filter(f => f.id === selectedOutboundFlight.id);
    }

    return allOutboundFlights;
  }, [allOutboundFlights, selectedOutboundFlight, selectedReturnFlight]);

  const returnFlights = useMemo(() => {
    // 1. If we have a selected outbound package flight, show only its linked return flight!
    if (selectedOutboundFlight && (selectedOutboundFlight.trip_type === "round_trip" || selectedOutboundFlight.linked_flight_id)) {
      let linkedReturn = allReturnFlights.find(f => f.id === selectedOutboundFlight.linked_flight_id);
      if (!linkedReturn) linkedReturn = allReturnFlights.find(f => f.linked_flight_id === selectedOutboundFlight.id);
      if (!linkedReturn && selectedOutboundFlight.trip_type === "round_trip") {
        linkedReturn = allReturnFlights.find(f => (f.trip_type === "round_trip" || f.linked_flight_id) && f.airline === selectedOutboundFlight.airline);
      }
      return linkedReturn ? [linkedReturn] : [];
    }

    // 2. If we have a selected outbound flight but it is NOT a package flight:
    // The return flight cannot be a package flight.
    if (selectedOutboundFlight) {
      const filtered = allReturnFlights.filter(f => f.trip_type !== "round_trip" && !f.linked_flight_id);
      if (selectedReturnFlight) {
        return filtered.filter(f => f.id === selectedReturnFlight.id);
      }
      return filtered;
    }

    // 3. If no outbound flight is selected yet:
    if (selectedReturnFlight) {
      return allReturnFlights.filter(f => f.id === selectedReturnFlight.id);
    }

    // Since it's round-trip building, by default, hide return package flights to ensure they select from outbound or select outbound first.
    return allReturnFlights.filter(f => f.trip_type !== "round_trip" && !f.linked_flight_id);
  }, [allReturnFlights, selectedReturnFlight, selectedOutboundFlight]);

  const handleSelectOutbound = useCallback((flight: Flight) => {
    if (selectedOutboundFlight?.id === flight.id) {
      setSelectedOutboundFlight(null);
      if (flight.trip_type === "round_trip" || flight.linked_flight_id) {
        setSelectedReturnFlight(null);
      }
      return;
    }

    setSelectedOutboundFlight(flight);

    const isExplicitOutbound = flight.trip_type === "round_trip" || flight.linked_flight_id;
    if (isExplicitOutbound) {
      let linkedReturn = allReturnFlights.find(f => f.id === flight.linked_flight_id);
      if (!linkedReturn) linkedReturn = allReturnFlights.find(f => f.linked_flight_id === flight.id);
      if (!linkedReturn && flight.trip_type === "round_trip") {
        linkedReturn = allReturnFlights.find(f => (f.trip_type === "round_trip" || f.linked_flight_id) && f.airline === flight.airline);
      }
      if (linkedReturn) {
        setSelectedReturnFlight(linkedReturn);
      }
    }
  }, [allReturnFlights, selectedOutboundFlight]);

  const handleSelectReturn = useCallback((flight: Flight) => {
    if (selectedReturnFlight?.id === flight.id) {
      setSelectedReturnFlight(null);
      if (flight.trip_type === "round_trip" || flight.linked_flight_id) {
        setSelectedOutboundFlight(null);
      }
      return;
    }

    setSelectedReturnFlight(flight);

    const isExplicitReturn = flight.trip_type === "round_trip" || flight.linked_flight_id;
    if (isExplicitReturn) {
      let linkedOutbound = allOutboundFlights.find(f => f.id === flight.linked_flight_id);
      if (!linkedOutbound) linkedOutbound = allOutboundFlights.find(f => f.linked_flight_id === flight.id);
      if (!linkedOutbound && flight.trip_type === "round_trip") {
        linkedOutbound = allOutboundFlights.find(f => (f.trip_type === "round_trip" || f.linked_flight_id) && f.airline === flight.airline);
      }
      if (linkedOutbound) {
        setSelectedOutboundFlight(linkedOutbound);
      }
    }
  }, [allOutboundFlights, selectedReturnFlight]);

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
      // Child 6-12 → Double + Extra Bed or part of Double
      if (room.children > 0) {
        const childRoomType = room.adults === 1 ? roomType : "Double + Extra Bed";
        rows.push({ guestType: "Child (2-12)", roomType: childRoomType, count: room.children, roomIndex: idx });
      }
      // Child 2-6 → Double or part of Double
      if (room.children6 > 0) {
        const child6RoomType = room.adults === 1 ? roomType : "Double";
        rows.push({ guestType: "Child (2-6)", roomType: child6RoomType, count: room.children6, roomIndex: idx });
      }
      // Infants
      if (room.infants > 0) {
        rows.push({ guestType: "Infant", roomType: "Single", count: room.infants, roomIndex: idx });
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
  const resolvedStayPricing = useMemo(() => {
    if (nights <= 0 || !departureDate) return [];

    const totalByType: Record<string, number> = {};
    guestRooms.forEach((r) => {
      const t = getRoomTypeLabel(r);
      totalByType[t] = (totalByType[t] || 0) + 1;
    });

    const seenByType: Record<string, number> = {};
    return guestRooms.map((room, idx) => {
      const hotel = roomHotelMap[idx];
      const typeName = roomTypeMap[idx];
      if (!hotel || !typeName) return { nights: [] };

      const selector = totalByType[typeName] || 1;
      const activeRooms = (hotel.hotel_rooms || []).filter((r: any) => r.is_active !== false);

      const currentSeen = seenByType[typeName] || 0;
      seenByType[typeName] = currentSeen + 1;

      const nightPricing = [];
      for (let i = 0; i < nights; i++) {
        const nightDate = addDays(departureDate, i);
        const nextDay = addDays(nightDate, 1);
        const dayToEvaluate = nextDay;

        const availForNight = getStayWindowRemaining(
          hotel.id,
          dayToEvaluate,
          addDays(dayToEvaluate, 1),
          hotelAvailableDates as any,
          hotelBookings as any,
        );

        // Track virtual availability for this specific room in the sequence
        const virtualAvail = availForNight !== null ? Math.max(0, availForNight - currentSeen) : null;
        const band = pickRoomBand(activeRooms as any, typeName, selector, virtualAvail);
        const hotelRoom = band || activeRooms.find((r: any) => r.room_type === typeName);

        if (hotelRoom) {
          nightPricing.push({
            price_adult: hotelRoom.price_adult ?? 0,
            price_child: hotelRoom.price_child ?? 0,
            price_child_6: (hotelRoom as any).price_child_6 ?? (hotelRoom.price_child ?? 0) * 0.7,
            price_infant: hotelRoom.price_infant ?? 0,
          });
        } else {
          nightPricing.push({ price_adult: 0, price_child: 0, price_child_6: 0, price_infant: 0 });
        }
      }

      return {
        nights: nightPricing,
      };
    });
  }, [guestRooms, roomHotelMap, roomTypeMap, nights, departureDate, hotelAvailableDates, hotelBookings]);
  const flightTotal = ((selectedOutboundFlight?.price || 0) + (selectedReturnFlight?.price || 0)) * passengerCount;

  // Auto-calculate hotel total from assigned rooms & hotel_rooms pricing
  const calculatedHotelTotal = useMemo(() => {
    if (nights <= 0) return 0;
    let total = 0;
    guestRooms.forEach((room, idx) => {
      const stayPricing = resolvedStayPricing[idx];
      if (!stayPricing || !stayPricing.nights) return;

      stayPricing.nights.forEach((prices) => {
        const nightCost =
          prices.price_adult * room.adults +
          prices.price_child * room.children +
          prices.price_child_6 * room.children6 +
          prices.price_infant * room.infants;
        total += nightCost;
      });
    });
    return Math.round(total * 100) / 100;
  }, [guestRooms, resolvedStayPricing, nights]);

  // Per-room price breakdown for display
  const perRoomPrices = useMemo(() => {
    const prices: Record<number, number> = {};
    guestRooms.forEach((room, idx) => {
      const stayPricing = resolvedStayPricing[idx];
      if (!stayPricing || !stayPricing.nights || stayPricing.nights.length === 0) return;

      let totalRoomPrice = 0;
      stayPricing.nights.forEach((prices) => {
        totalRoomPrice +=
          prices.price_adult * room.adults +
          prices.price_child * room.children +
          prices.price_child_6 * room.children6 +
          prices.price_infant * room.infants;
      });
      prices[idx] = totalRoomPrice / stayPricing.nights.length;
    });
    return prices;
  }, [guestRooms, resolvedStayPricing]);

  // Detailed per-person breakdown per room for Grand Total display
  const perPersonBreakdown = useMemo(() => {
    const breakdown: { roomIdx: number; roomType: string; hotelName: string; guests: { label: string; price: number; count: number }[] }[] = [];
    guestRooms.forEach((room, idx) => {
      const hotel = roomHotelMap[idx];
      const typeName = roomTypeMap[idx];
      const stayPricing = resolvedStayPricing[idx];
      if (!hotel || !typeName || !stayPricing || !stayPricing.nights) return;

      let totalAdult = 0, totalChild = 0, totalChild6 = 0, totalInfant = 0;
      stayPricing.nights.forEach((prices) => {
        totalAdult += prices.price_adult;
        totalChild += prices.price_child;
        totalChild6 += prices.price_child_6;
        totalInfant += prices.price_infant;
      });

      const guests: { label: string; price: number; count: number }[] = [];
      if (room.adults > 0) {
        for (let i = 0; i < room.adults; i++) {
          guests.push({ label: `Adult ${room.adults > 1 ? i + 1 : ''}`.trim(), price: totalAdult, count: 1 });
        }
      }
      if (room.children > 0) {
        for (let i = 0; i < room.children; i++) {
          guests.push({ label: `Child ${room.children > 1 ? i + 1 : ''} (2-12)`.trim(), price: totalChild, count: 1 });
        }
      }
      if (room.children6 > 0) {
        for (let i = 0; i < room.children6; i++) {
          guests.push({ label: `Child ${room.children6 > 1 ? i + 1 : ''} (2-6)`.trim(), price: totalChild6, count: 1 });
        }
      }
      if (room.infants > 0) {
        for (let i = 0; i < room.infants; i++) {
          guests.push({ label: `Infant ${room.infants > 1 ? i + 1 : ''}`.trim(), price: totalInfant, count: 1 });
        }
      }
      breakdown.push({ roomIdx: idx, roomType: typeName, hotelName: hotel.name, guests });
    });
    return breakdown;
  }, [guestRooms, roomHotelMap, roomTypeMap, resolvedStayPricing]);

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

    return (
      <motion.button
        key={f.id}
        onClick={onSelect}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={cn(
          "w-full rounded-2xl text-left transition-all duration-300 group overflow-hidden relative",
          isSelected
            ? "border-[1.5px] border-[#2A3F8B] shadow-md bg-white"
            : "border-border/60 hover:border-[#2A3F8B]/40 shadow-sm bg-white hover:shadow-xl"
        )}
      >
        <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#2A3F8B] border-l-transparent z-10 pointer-events-none" />

        <div className="pt-5 px-6 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-none">
              {isReturn ? "Return" : "Outbound"} Flight • {f.departure_date ? format(new Date(f.departure_date), "EEE, d MMM yyyy") : "Date TBD"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch">
          <div className="flex-1 p-6">
            <div className="flex items-center gap-5">
              <div className="shrink-0 w-20 h-20 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-2">
                {f.airline_logo ? (
                  <img src={f.airline_logo} alt={f.airline} className="max-h-full max-w-full object-contain" />
                ) : (
                  isReturn ? <PlaneLandingIcon className="h-10 w-10 text-[#2A3F8B]" /> : <PlaneTakeoffIcon className="h-10 w-10 text-[#2A3F8B]" />
                )}
              </div>

              <div className="flex items-center justify-between gap-6 flex-1">
                <div className="text-left min-w-[70px]">
                  <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{f.departure_time?.slice(0, 5) || "—"}</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1 tracking-wide">
                    {depCode}
                  </p>
                </div>

                <div className="flex-1 max-w-xs flex items-center mt-2">
                  <div className="h-[1.5px] flex-1 bg-border/60" />
                  <div className="bg-white px-3 py-1 text-[10px] font-bold tracking-wider text-[#2A3F8B] border border-border/60 rounded-full flex items-center gap-1 whitespace-nowrap shadow-sm mx-2">
                    <span className="text-muted-foreground">{duration || "1h 30m"}</span>
                    <span className="text-[#2A3F8B]">DIRECT</span>
                  </div>
                  <div className="h-[1.5px] flex-1 bg-border/60" />
                </div>

                <div className="text-right min-w-[70px]">
                  <div className="flex items-baseline justify-end gap-0.5">
                    <p className="text-2xl font-bold tracking-tight text-foreground leading-none">{f.arrival_time?.slice(0, 5) || "—"}</p>
                    {isNextDay && <span className="text-[10px] font-extrabold text-[#2A3F8B]">+1</span>}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-end gap-1 tracking-wide">
                    {arrCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 ml-[100px]">
              <span className="font-semibold text-foreground/80">{f.airline}</span>
              {f.flight_number && (
                <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground/70">{f.flight_number}</span>
              )}
              {f.class && <span>• {f.class}</span>}
              <span>• 23kg</span>
              {seatsLow && (
                <Badge className="bg-destructive/10 text-destructive border-0 font-semibold px-2 py-0.5 rounded-full text-[10px] animate-pulse shadow-none">
                  Only {f.available_seats} seats left
                </Badge>
              )}
              {insufficientSeats && (
                <Badge variant="destructive" className="text-[9px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                  ⚠ Need {passengerCount}
                </Badge>
              )}
            </div>
          </div>

          <div className="sm:border-l border-t sm:border-t-0 border-border/40 bg-white p-6 flex flex-col justify-center items-end sm:w-[180px] shrink-0">
            <div className="text-right">
              <p className="text-3xl font-black text-[#2A3F8B] leading-none tabular-nums">${f.price}</p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">per person</p>
            </div>
            {isSelected && (
              <Badge className="bg-[#2A3F8B] text-white border-0 font-bold px-4 py-1.5 rounded-full text-xs mt-4 shadow-sm">
                <Check className="h-3.5 w-3.5 mr-1" /> Selected
              </Badge>
            )}
          </div>
        </div>
      </motion.button>
    );
  };

  // Get destination city image for hero background
  const destCityImage = destinationCity?.image_url;

  return (
    <div className="relative max-w-[1400px] mx-auto px-4 md:px-6 pt-4 pb-8">


      {/* ═══ Premium Timeline Stepper ═══ */}
      <div className="relative pb-10 mt-6">
        <div className="relative max-w-4xl mx-auto px-4 md:px-0">
          {/* Progress rail background */}
          <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 pointer-events-none" />
          
          {/* Progress rail active */}
          <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-primary to-indigo-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              initial={false}
              animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="relative flex items-center justify-between">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={i}
                  onClick={() => i < step && goToStep(i)}
                  disabled={i > step}
                  className="group relative flex flex-col items-center gap-2 disabled:cursor-not-allowed outline-none"
                >
                  <div 
                    className={cn(
                      "relative flex items-center justify-center h-12 w-12 rounded-full transition-all duration-500 z-10 border-4 border-white dark:border-card",
                      isActive && "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)] scale-110",
                      isDone && "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:scale-105 cursor-pointer shadow-md",
                      !isActive && !isDone && "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        className="absolute inset-0 rounded-full border border-blue-400/50"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    {isDone ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="text-sm font-bold">{i + 1}</span>}
                  </div>
                  <div className="absolute top-14 flex flex-col items-center min-w-[120px]">
                    <span
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300",
                        isActive ? "text-indigo-700 dark:text-indigo-400" : isDone ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                </button>
              );
            })}
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
                  <div className="flex flex-col gap-6">
                    {/* Premium Search Card Redesign */}
                    <div className="relative rounded-3xl bg-white dark:bg-card shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-border/50 border border-border/50 overflow-hidden mt-2">
                      <div className="flex flex-col md:flex-row items-stretch md:divide-x divide-y md:divide-y-0 divide-border/50">
                        
                        {/* From City */}
                        <Popover open={originOpen} onOpenChange={setOriginOpen}>
                          <PopoverTrigger asChild>
                            <button className="flex-1 flex flex-col justify-center px-6 py-4 hover:bg-muted/30 transition-colors text-left focus:outline-none min-h-[80px]">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-primary" /> From
                              </span>
                              <span className="font-bold text-lg text-foreground truncate">
                                {originCityId ? availableCities?.find(c => c.id === originCityId)?.name : <span className="text-muted-foreground/60 font-medium text-base">Where from?</span>}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 border-border/60 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl z-[100] w-[300px]" align="start">
                            <Command className="rounded-2xl">
                              <CommandInput placeholder="Search origin city..." className="h-12 border-none ring-0 focus-visible:ring-0 text-base px-4" />
                              <CommandList className="max-h-[250px] p-2">
                                <CommandEmpty>No cities found.</CommandEmpty>
                                <CommandGroup>
                                  {availableCities?.map((c) => (
                                    <CommandItem key={c.id} value={`${c.name} ${c.country}`} onSelect={() => { setOriginCityId(c.id); setOriginOpen(false); }} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-muted transition-colors my-1">
                                      <span className="flex items-center gap-3 font-semibold text-sm">
                                        {c.country && getCountryFlagUrl(c.country) ? <img src={getCountryFlagUrl(c.country)!} alt="" className="h-4 w-6 object-cover rounded shadow-sm" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                                        {c.name}, <span className="text-muted-foreground font-normal">{c.country}</span>
                                      </span>
                                      {originCityId === c.id && <Check className="h-4 w-4 text-primary" />}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* Swap Button container for mobile (absolute center for desktop) */}
                        <div className="md:hidden flex justify-center -my-4 relative z-10">
                          <button type="button" onClick={() => { const tmp = originCityId; setOriginCityId(destinationCityId); setDestinationCityId(tmp); }} className="h-8 w-8 rounded-full bg-white dark:bg-card border border-border/50 shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors">
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* To City */}
                        <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
                          <PopoverTrigger asChild>
                            <button className="flex-1 flex flex-col justify-center px-6 py-4 hover:bg-muted/30 transition-colors text-left focus:outline-none min-h-[80px]">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-primary" /> To
                              </span>
                              <span className="font-bold text-lg text-foreground truncate">
                                {destinationCityId ? availableCities?.find(c => c.id === destinationCityId)?.name : <span className="text-muted-foreground/60 font-medium text-base">Where to?</span>}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 border-border/60 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl z-[100] w-[300px]" align="start">
                            <Command className="rounded-2xl">
                              <CommandInput placeholder="Search destination city..." className="h-12 border-none ring-0 focus-visible:ring-0 text-base px-4" />
                              <CommandList className="max-h-[250px] p-2">
                                <CommandEmpty>No cities found.</CommandEmpty>
                                <CommandGroup>
                                  {availableCities?.filter(c => c.id !== originCityId).map((c) => (
                                    <CommandItem key={c.id} value={`${c.name} ${c.country}`} onSelect={() => { setDestinationCityId(c.id); setDestinationOpen(false); }} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-muted transition-colors my-1">
                                      <span className="flex items-center gap-3 font-semibold text-sm">
                                        {c.country && getCountryFlagUrl(c.country) ? <img src={getCountryFlagUrl(c.country)!} alt="" className="h-4 w-6 object-cover rounded shadow-sm" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
                                        {c.name}, <span className="text-muted-foreground font-normal">{c.country}</span>
                                      </span>
                                      {destinationCityId === c.id && <Check className="h-4 w-4 text-primary" />}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* Dates Group */}
                        <div className="flex-[1.5] flex flex-row divide-x divide-border/50 relative">
                          
                          {/* Departure */}
                          <Popover open={departureDateOpen} onOpenChange={setDepartureDateOpen}>
                            <PopoverTrigger asChild>
                              <button className="flex-1 flex flex-col justify-center px-4 py-4 hover:bg-muted/30 transition-colors text-left focus:outline-none min-h-[80px]">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Departure
                                </span>
                                {departureDate ? 
                                  <span className="font-bold text-base text-foreground flex flex-col leading-tight truncate">
                                    {format(departureDate, "MMM dd")} <span className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">{format(departureDate, "EEEE")}</span>
                                  </span> 
                                  : 
                                  <span className="text-muted-foreground/60 font-medium text-base">Add date</span>
                                }
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border/60" align="end">
                              <Calendar mode="single" selected={departureDate} onSelect={(d) => { setDepartureDate(d); setDepartureDateOpen(false); if (d && (!returnDate || returnDate <= d)) { setTimeout(() => setReturnDateOpen(true), 120); } }} disabled={(date) => startOfDay(date) < startOfDay(new Date())} initialFocus className="p-4" components={{ DayContent: ({ date: dayDate }) => { const key = format(dayDate, "yyyy-MM-dd"); const info = departureDateAvailability.get(key); const hasRoute = originCityId && destinationCityId; return (<div className="flex flex-col items-center gap-0"><span>{dayDate.getDate()}</span>{hasRoute && info && <span className={cn("text-[9px] font-bold leading-none mt-1", info.seats < 5 ? "text-amber-500" : "text-emerald-500")}>${info.price}</span>}{hasRoute && !info && startOfDay(dayDate) >= startOfDay(new Date()) && <span className="text-[9px] text-muted-foreground/30 leading-none mt-1">—</span>}</div>); } }} />
                            </PopoverContent>
                          </Popover>

                          {/* Return */}
                          <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                            <PopoverTrigger asChild>
                              <button className="flex-1 flex flex-col justify-center px-4 py-4 hover:bg-muted/30 transition-colors text-left focus:outline-none min-h-[80px]">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Return
                                </span>
                                {returnDate ? 
                                  <span className="font-bold text-base text-foreground flex flex-col leading-tight truncate">
                                    {format(returnDate, "MMM dd")} <span className="text-[10px] font-medium text-muted-foreground uppercase mt-0.5">{format(returnDate, "EEEE")}</span>
                                  </span> 
                                  : 
                                  <span className="text-muted-foreground/60 font-medium text-base">Add date</span>
                                }
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border/60" align="end">
                              <Calendar mode="single" selected={returnDate} onSelect={(d) => { setReturnDate(d); if (d) setReturnDateOpen(false); }} disabled={(date) => startOfDay(date) < (departureDate ? startOfDay(departureDate) : startOfDay(new Date()))} initialFocus className="p-4" components={{ DayContent: ({ date: dayDate }) => { const key = format(dayDate, "yyyy-MM-dd"); const info = returnDateAvailability.get(key); const hasRoute = originCityId && destinationCityId; return (<div className="flex flex-col items-center gap-0"><span>{dayDate.getDate()}</span>{hasRoute && info && <span className={cn("text-[9px] font-bold leading-none mt-1", info.seats < 5 ? "text-amber-500" : "text-emerald-500")}>${info.price}</span>}{hasRoute && !info && startOfDay(dayDate) >= startOfDay(new Date()) && <span className="text-[9px] text-muted-foreground/30 leading-none mt-1">—</span>}</div>); } }} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      {/* Desktop floating swap icon */}
                      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10" style={{ left: '28.57%' }}>
                        <button type="button" onClick={() => { const tmp = originCityId; setOriginCityId(destinationCityId); setDestinationCityId(tmp); }} className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-900 shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white hover:scale-110 active:scale-95 transition-all">
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                        {nights > 0 && (
                          <div className="mt-4 flex items-center gap-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Duration</p><p className="text-sm font-bold text-foreground">{nights} night{nights > 1 ? "s" : ""}</p></div>
                            <div className="h-8 w-px bg-border" />
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Travelers</p><p className="text-sm font-bold text-foreground">{passengerCount} guest{passengerCount > 1 ? "s" : ""}</p></div>
                            <div className="h-8 w-px bg-border" />
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Dates</p><p className="text-xs font-semibold text-foreground">{departureDate && format(departureDate, "dd MMM")} → {returnDate && format(returnDate, "dd MMM yyyy")}</p></div>
                          </div>
                        )}
                        {originCityId && destinationCityId && departureDateAvailability.size === 0 && (
                          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                            <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-light">No flights found for this route — availability will be checked at the next step.</p>
                          </div>
                        )}
                        {/* Next Button */}
                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={() => goToStep(1)}
                            disabled={!canProceedStep0}
                            size="lg"
                            className="gap-2.5 rounded-xl h-12 px-8 shadow-lg shadow-primary/20 text-sm font-bold tracking-tight transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-primary-foreground"
                          >
                            Next: Select Flights <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>

                    {/* Advertisement Banner Slider */}
                    <div className="relative rounded-2xl overflow-hidden h-[130px] border border-border/40 shadow-xl mt-2">
                      <ImageCarousel
                        images={[promoFlights1, promoFlights2, promoFlights3, promoHotels1, promoHotels2, promoHotels3]}
                        autoPlay
                        interval={4000}
                        aspectRatio="hero"
                        className="h-full"
                        showDots={true}
                        showArrows={true}
                      />
                      <div className="absolute top-3 right-4 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center pointer-events-none z-10">
                        <Tag className="h-4 w-4 text-white/90" />
                      </div>
                      <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-8 z-10 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] font-bold mb-1.5 rounded-md px-2.5 py-0.5 shadow-md w-fit">
                          SPECIAL OFFERS
                        </Badge>
                        <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                          Exclusive Group Discounts Available
                        </h3>
                        <p className="text-white/80 text-[11px] mt-1 font-medium max-w-[80%]">
                          Save up to 35% on early bookings and combined group packages.
                        </p>
                      </div>
                    </div>
                  </div>
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
                          <h2 className="text-xl font-bold text-foreground tracking-tight font-heading leading-tight">Choose Your Flights</h2>
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
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F0F4F8] border border-border/40 shadow-sm mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#2A3F8B] flex items-center justify-center shadow-sm">
                          <PlaneTakeoffIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#2A3F8B] tracking-tight flex items-center gap-2">
                            Outbound Flights
                            {departureDate && <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 text-[10px] h-5 px-2 font-bold shadow-none">{format(departureDate, "EEE, d MMM yyyy")}</Badge>}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-medium">{originCity?.name} → {destinationCity?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border border-border/40 text-[10px] font-bold tracking-wide hover:bg-[#D1D5DB]">
                          {outboundFlights.length} flight{outboundFlights.length !== 1 ? "s" : ""}
                        </Badge>
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
                        {outboundFlights.map(f => renderFlightCard(f, selectedOutboundFlight?.id === f.id, () => handleSelectOutbound(f)))}
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
                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F0F4F8] border border-border/40 shadow-sm mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#2A3F8B] flex items-center justify-center shadow-sm">
                          <PlaneLandingIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#2A3F8B] tracking-tight flex items-center gap-1.5">
                            Return Flights
                            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 text-[8px] h-4 px-1.5 font-bold tracking-wider">↩ RETURN</Badge>
                            {returnDate && <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 text-[10px] h-5 px-2 font-bold shadow-none">{format(returnDate, "EEE, d MMM yyyy")}</Badge>}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-medium">{destinationCity?.name} → {originCity?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border border-border/40 text-[10px] font-bold tracking-wide hover:bg-[#D1D5DB]">
                          {returnFlights.length} flight{returnFlights.length !== 1 ? "s" : ""}
                        </Badge>
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
                        {returnFlights.map(f => renderFlightCard(f, selectedReturnFlight?.id === f.id, () => handleSelectReturn(f), true))}
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
                                          {Array.from(new Set(hotelActiveRooms.map(r => r.room_type).filter(Boolean))).map(typeStr => (
                                            <SelectItem key={typeStr} value={typeStr}>
                                              {typeStr}
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
                                          <p className="font-bold text-primary text-2xl tracking-tight font-heading">${lowestRoomPrice}</p>
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
              <div className="rounded-3xl border border-border/40 bg-white dark:bg-card overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="px-6 py-5 border-b border-border/40 bg-card">
                  <h3 className="text-lg font-bold text-foreground tracking-tight">Guests & Rooms</h3>
                </div>
                <div className="p-6 space-y-5">
                  {/* Room count */}
                  <div className="flex items-center justify-between pb-4 border-b border-border/40">
                    <div className="flex items-center gap-3 text-sm text-foreground font-semibold">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <BedDouble className="h-4 w-4 text-primary" />
                      </div>
                      Number of Rooms
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
                      <SelectTrigger className="w-16 h-10 rounded-xl text-base font-bold border-border/40 bg-background hover:bg-muted/50 transition-colors focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40 shadow-xl">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <SelectItem key={n} value={String(n)} className="rounded-lg">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Each room */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {guestRooms.map((room, idx) => {
                      const roomType = getRoomTypeLabel(room);
                      const canAddChild = room.adults >= 2 && room.children === 0 && room.adults < 3;
                      const canAddChild6 = room.adults >= 1 && room.children6 === 0 && (room.adults >= 2 || (room.adults === 1 && room.children === 0));
                      const canAddAdult = room.adults < MAX_ADULTS && (room.adults < 2 || (room.adults === 2 && room.children === 0 && room.children6 === 0));

                      return (
                        <div key={room.id} className="rounded-2xl border border-border/40 bg-background/50 overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/40">
                            <span className="text-xs font-bold text-foreground uppercase tracking-widest text-muted-foreground">Room {idx + 1}</span>
                            <Badge variant="secondary" className="text-[10px] font-bold rounded-full px-3 py-0.5 bg-primary/10 text-primary border border-primary/20">
                              {roomType}
                            </Badge>
                          </div>
                          <div className="p-4 space-y-4">
                            {([
                              { key: "adults" as const, label: "Adults", sub: "12+ years", icon: UserRound, min: 1, canIncrease: canAddAdult },
                              { key: "children" as const, label: "Child", sub: "2-12 years", icon: Users, min: 0, canIncrease: canAddChild },
                              { key: "children6" as const, label: "Child", sub: "2-6 years", icon: Baby, min: 0, canIncrease: canAddChild6 },
                              { key: "infants" as const, label: "Infant", sub: "Under 2", icon: Baby, min: 0, canIncrease: room.infants < MAX_INFANTS },
                            ]).map(cat => {
                              const Icon = cat.icon;
                              const val = room[cat.key];
                              return (
                                <div key={cat.key} className="flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-foreground leading-none">{cat.label}</p>
                                      <p className="text-[11px] text-muted-foreground font-medium mt-1">{cat.sub}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => updateGuestRoom(room.id, cat.key, Math.max(cat.min, val - 1))}
                                      disabled={val <= cat.min}
                                      className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:hover:border-border/60 disabled:hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-sm"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-4 text-center text-sm font-bold text-foreground">
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
                                      className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:hover:border-border/60 disabled:hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background shadow-sm"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
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
                    className="w-full py-3 text-sm font-bold text-primary hover:bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    + Add Another Room
                  </button>

                  {/* Total guests */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-2">
                    <span className="text-sm text-muted-foreground font-medium">Total guests</span>
                    <span className="text-xl font-extrabold text-foreground">{passengerCount}</span>
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
                      "font-bold transition-all duration-500 font-heading leading-none",
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

      {/* ═══ Bounded Cinematic Hero Band ═══ */}
      <motion.div
        className="relative h-[180px] md:h-[220px] rounded-3xl overflow-hidden mt-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src={destCityImage || customGroupHeroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Lighter, richer overlay for better contrast and luxury feel */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,11%)]/80 via-[hsl(222,47%,11%)]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222,47%,11%)]/60 via-transparent to-[hsl(222,47%,11%)]/20" />
        
        <div className="relative h-full flex flex-col justify-center p-6 md:p-10">
          {/* Eyebrow chip */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 w-fit shadow-sm"
          >
            <Compass className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Tailored Experience
            </span>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight font-heading leading-tight drop-shadow-md text-white">
            Build Your Own <span className="text-[hsl(var(--gold))] font-light italic">Journey</span>
          </h2>

          {/* Floating live stat pills (desktop) */}
          <div className="hidden lg:flex items-center gap-3 absolute right-10 top-1/2 -translate-y-1/2">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-white/20 transition-colors"
                >
                  <span className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 shadow-inner">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                      {pill.label}
                    </span>
                    <span className="text-sm font-bold text-white truncate max-w-[140px]">
                      {pill.value}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
