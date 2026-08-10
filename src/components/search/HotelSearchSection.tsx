import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import hotelHeroImg from "@/assets/hotel-hero.jpg";
import gtsLogo from "@/assets/gts-logo-official.png";
import { pickRoomBand, resolveRoomPrice } from "@/lib/roomPricingTier";
import { getStayWindowRemaining, buildDayDetails } from "@/lib/hotelAvailability";
import {
  Calendar,
  Users,
  Search,
  MapPin,
  Building,
  Hotel,
  Loader2,
  Star,
  Home,
  Baby,
  Wifi,
  Car,
  UtensilsCrossed,
  Dumbbell,
  Waves,
  Wind,
  Coffee,
  Tv,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Eye,
  BedDouble,
  KeyRound,
  Crown,
  ArrowRight,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Clock,
  GitCompareArrows,
  Check,
  CheckCircle,
  Minus,
  Trash2,
  Moon,
  Heart,
  Flame,
  LayoutGrid,
  List,
  ChevronDown,
  UserRound,
  Share2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { HotelRoomConfigurator, RoomConfig } from "@/components/booking/HotelRoomConfigurator";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { format, addDays, parseISO, differenceInDays, startOfDay } from "date-fns";
import { useHotels, Hotel as HotelType } from "@/hooks/useHotels";
import { useHotelAvailableDates } from "@/hooks/useHotelAvailableDates";
import { useHotelBookings } from "@/hooks/useHotelBookings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedHotels, useToggleSavedHotel } from "@/hooks/useSavedHotels";
import { HotelMapView } from "@/components/search/HotelMapView";
import { getCountryFlagUrl } from "@/utils/countryFlags";

// Map amenity names to Lucide icons
const amenityIconMap: Record<string, React.ElementType> = {
  wifi: Wifi,
  "free wifi": Wifi,
  "wi-fi": Wifi,
  parking: Car,
  "free parking": Car,
  restaurant: UtensilsCrossed,
  dining: UtensilsCrossed,
  gym: Dumbbell,
  fitness: Dumbbell,
  pool: Waves,
  "swimming pool": Waves,
  spa: Wind,
  "air conditioning": Wind,
  "room service": Coffee,
  breakfast: Coffee,
  tv: Tv,
  television: Tv,
  security: ShieldCheck,
  "24/7 security": ShieldCheck,
};

function getAmenityIcon(amenity: string): React.ElementType {
  if (!amenity) return Sparkles;
  const key = String(amenity).toLowerCase().trim();
  for (const [match, icon] of Object.entries(amenityIconMap)) {
    if (key && match && key.includes(match)) return icon;
  }
  return Sparkles;
}

// Common filter amenities
const FILTER_AMENITIES = ["Wifi", "Pool", "Gym", "Parking", "Restaurant", "Spa"];

// Sort options
type SortOption = "price-asc" | "price-desc" | "rating" | "name";

// Recent search type
interface RecentSearch {
  destination: string;
  checkIn: string | null;
  checkOut: string | null;
  rooms: number;
  adults: number;
  children: number;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = "recent-hotel-searches";
const MAX_RECENT = 5;

function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentSearch(search: RecentSearch) {
  const list = loadRecentSearches().filter(
    s => s.destination !== search.destination || s.checkIn !== search.checkIn || s.checkOut !== search.checkOut
  );
  list.unshift(search);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

/** Derive room type from guest config */
function getRoomTypeFromConfig(adults: number, children: number): string {
  if (adults === 1 && children === 0) return "Single";
  if (adults === 1 && children === 1) return "Double";
  if (adults === 2 && children === 0) return "Double";
  if (adults === 2 && children === 1) return "Double + Extra Bed";
  if (adults === 3 && children === 0) return "Triple";
  return "Double";
}

/**
 * Get the best matching room price based on type AND the AVAILABLE rooms in
 * the searched date window (falls back to requested count when no dates).
 *
 * Why availability-driven: the admin "default rates" model keys the price
 * tier to inventory remaining in the inventory window — e.g. a Single row
 * with band 1–10 priced $100 means "while up to 10 rooms remain, charge
 * $100/night". As inventory drops, the tier the booking falls into drops
 * with it. This matches the screenshots: 15 rooms available 01/06–30/06 →
 * resolve the band that contains 15.
 */
function getHotelRoomPrice(
  hotel: HotelType,
  neededType: string,
  roomConfigs: RoomConfig[] = [],
  checkIn?: Date,
  checkOut?: Date,
  hotelAvailableDates: any[] = [],
  hotelBookings: any[] = [],
): number {
  if (checkIn && checkOut) {
    const stayPricing = getHotelStayPricing(hotel, neededType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
    if (stayPricing) return stayPricing.avg;
  }

  const hotelRooms = Array.isArray(hotel.hotel_rooms) ? hotel.hotel_rooms : [];
  const rooms = hotelRooms.filter(r => r && r.is_active !== false && r.room_type !== "Quadruple" && r.room_type !== "Without-Bed" && r.room_type !== "Infant");
  const specials = (hotel as any).hotel_special_prices || [];
  const requestedRooms = roomConfigs.length || 1;

  // PHASE 1: Date & Inventory Verification
  // If no dates, we can't do inventory-driven, fall back to "cheapest" or "tier 1"
  if (!checkIn || !checkOut) {
    // Default to the first tier (highest inventory band) or cheapest
    const picked = pickRoomBand(rooms as any, neededType, 20); // Assume high inventory
    return Number(picked?.price_adult || picked?.price_per_night || hotel.price_per_night || 0);
  }

  // PHASE 2 & 3: Match Tier based on Inventory and return price
  const dayDetails = buildDayDetails(hotelAvailableDates, hotelBookings, hotel.id);
  const dayKey = (checkIn instanceof Date && !isNaN(checkIn.getTime())) ? format(checkIn, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  const inventoryRemaining = dayDetails[dayKey]?.remaining ?? 0;

  const resolved = resolveRoomPrice(rooms as any, neededType, inventoryRemaining, specials, checkIn);
  if (!resolved) return hotel.price_per_night || 0;

  // Per-room rate: use the adult rate as the flat room price (not per-person)
  return resolved.adult;
}


/**
 * Sum the per-night price across the stay range using hotel_special_prices
 * date ranges (inclusive on both ends). Each night uses the matching special
 * rate for the picked room band, falling back to the room's default price.
 * Returns { total, nights, avg } or null when dates/rooms are missing.
 */
function getHotelStayPricing(
  hotel: HotelType,
  neededType: string,
  roomConfigs: RoomConfig[],
  checkIn?: Date,
  checkOut?: Date,
  hotelAvailableDates: any[] = [],
  hotelBookings: any[] = [],
): { total: number; nights: number; avg: number } | null {
  if (!checkIn || !checkOut) return null;
  const nights = Math.max(0, differenceInDays(checkOut, checkIn));
  if (nights <= 0) return null;

  const hotelRooms = Array.isArray(hotel.hotel_rooms) ? hotel.hotel_rooms : [];
  const rooms = hotelRooms.filter((r: any) => r && r.is_active !== false && r.room_type !== "Quadruple" && r.room_type !== "Without-Bed" && r.room_type !== "Infant");
  const specials: any[] = Array.isArray((hotel as any).hotel_special_prices) ? (hotel as any).hotel_special_prices : [];
  const dayDetails = buildDayDetails(hotelAvailableDates, hotelBookings, hotel.id);

  // Clone dayDetails to track inventory decrements during this pricing calculation
  const tempDayDetailsForPricing = JSON.parse(JSON.stringify(dayDetails));

  let totalForAllRooms = 0;
  const requestedRooms = roomConfigs.length;

  for (let rIdx = 0; rIdx < requestedRooms; rIdx++) {
    const config = roomConfigs[rIdx];
    const type = config 
      ? getRoomTypeFromConfig(config.adults, config.children6to12 + config.children2to6) 
      : neededType;

    for (let i = 0; i < nights; i++) {
      const night = addDays(checkIn, i);
      const dayKey = format(night, "yyyy-MM-dd");
      
      const inv = tempDayDetailsForPricing[dayKey]?.remaining ?? 0;
      const resolved = resolveRoomPrice(rooms as any, type, inv, specials, night);
      if (resolved) {
        // Per-room rate: the adult price is the flat room rate (not per-person)
        totalForAllRooms += resolved.adult;
      } else {
        totalForAllRooms += hotel.price_per_night || 0;
      }
    }

    // After pricing this room for its entire stay, decrement the inventory for all days of that stay
    for (let i = 0; i < nights; i++) {
      const night = addDays(checkIn, i);
      const dayKey = format(night, "yyyy-MM-dd");
      if (tempDayDetailsForPricing[dayKey]) {
        tempDayDetailsForPricing[dayKey].remaining = Math.max(0, tempDayDetailsForPricing[dayKey].remaining - 1);
      }
    }
  }

  const avgPerRoom = totalForAllRooms / Math.max(1, requestedRooms) / nights;
  return { total: totalForAllRooms, nights, avg: avgPerRoom };
}


interface HotelSearchSectionProps {
  onHotelSelect?: (hotel: HotelType, searchParams: { checkIn?: Date; checkOut?: Date; guests: number; rooms: number; adults: number; children: number; infants: number; roomConfigs?: RoomConfig[] }) => void;
}

export function HotelSearchSection({ onHotelSelect }: HotelSearchSectionProps) {
  // Hotel search state
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([{ adults: 2, children6to12: 0, children2to6: 0, infants: 0 }]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!destinationOpen) return;
    const handler = (e: MouseEvent) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target as Node)) {
        setDestinationOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [destinationOpen]);
  const [guestsOpen, setGuestsOpen] = useState(false);

  // Search results state
  const [showResults, setShowResults] = useState(false);
  const [searchedHotels, setSearchedHotels] = useState<HotelType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter state
  const [minStars, setMinStars] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("price-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Comparison state
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(loadRecentSearches());

  // View mode: list, location-grouped, or map
  const [viewMode, setViewMode] = useState<"list" | "location" | "map">("list");



  // Quick-view modal state
  const [quickViewHotel, setQuickViewHotel] = useState<HotelType | null>(null);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);

  // Saved hotels
  const { user } = useAuth();
  const { savedHotelIds } = useSavedHotels();
  const toggleSavedMutation = useToggleSavedHotel();

  // Fetch data from backend
  const { data: hotels, isLoading } = useHotels();
  const { data: hotelAvailableDates = [] } = useHotelAvailableDates();
  const { data: hotelBookings = [] } = useHotelBookings();

  // Sum rooms booked per hotel for a given night (status != canceled/draft)
  const getBookedRoomsForNight = useCallback((hotelId: string, night: Date): number => {
    const t = night.getTime();
    let booked = 0;
    for (const b of hotelBookings) {
      if (b.hotel_id !== hotelId || !b.check_in || !b.check_out) continue;
      const ci = new Date(b.check_in).getTime();
      const co = new Date(b.check_out).getTime();
      // Night is occupied if checkIn <= night < checkOut
      if (t >= ci && t < co) booked += b.rooms;
    }
    return booked;
  }, [hotelBookings]);

  // SHARED POOL MODEL: sum rooms booked whose stay overlaps the given inventory
  // window [windowFrom..windowTo] (inclusive). A booking counts once regardless
  // of how many nights of the window it occupies — the pool is shared across
  // the whole window, not allocated per night.
  const getBookedRoomsForWindow = useCallback(
    (hotelId: string, windowFrom: Date, windowTo: Date): number => {
      const wf = windowFrom.getTime();
      const wt = windowTo.getTime();
      let booked = 0;
      for (const b of hotelBookings) {
        if (b.hotel_id !== hotelId || !b.check_in || !b.check_out) continue;
        const ci = new Date(b.check_in).getTime();
        const co = new Date(b.check_out).getTime() - 1; // last occupied night
        // Overlap test: [ci..co] intersects [wf..wt]
        if (co >= wf && ci <= wt) booked += b.rooms;
      }
      return booked;
    },
    [hotelBookings],
  );

  const totalAdults = roomConfigs.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = roomConfigs.reduce((sum, r) => sum + r.children6to12 + r.children2to6, 0);
  const totalInfants = roomConfigs.reduce((sum, r) => sum + r.infants, 0);
  const roomCount = roomConfigs.length;
  const totalGuests = totalAdults + totalChildren + totalInfants;

  // Derive room type from first room config
  const searchedRoomType = useMemo(() => {
    if (roomConfigs.length === 0) return "Double";
    const first = roomConfigs[0];
    return getRoomTypeFromConfig(first.adults, first.children6to12 + first.children2to6);
  }, [roomConfigs]);

  // Night count
  const nightCount = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    const days = differenceInDays(checkOut, checkIn);
    return days > 0 ? days : null;
  }, [checkIn, checkOut]);

  // Get cities for hotel search with hotel counts
  const hotelCities = useMemo(() => {
    if (!hotels) return [];
    const cityMap = new Map<string, { count: number; image?: string; country?: string }>();
    hotels.filter(h => h.cities).forEach(h => {
      const name = h.cities?.name;
      if (!name) return;
      const existing = cityMap.get(name);
      if (existing) {
        existing.count++;
      } else {
        cityMap.set(name, { count: 1, image: h.images?.[0] || undefined, country: h.cities?.country || undefined });
      }
    });
    return Array.from(cityMap.entries())
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [hotels]);

  // Top trending cities (by hotel count)
  const trendingCities = useMemo(() => {
    return [...hotelCities].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [hotelCities]);

  // Dev-only QA: verify every destination item has a valid cmdk value
  // (must be a non-empty string containing name + country/region in lowercase form)
  useEffect(() => {
    if (!import.meta.env.DEV || !destinationOpen) return;
    const issues: string[] = [];
    const validate = (
      label: string,
      items: Array<any>,
      buildValue: (item: any) => string,
    ) => {
      items.forEach((item, idx) => {
        const value = buildValue(item);
        const name = (item.name ?? item.cities?.name ?? "").toString().trim();
        const region = (item.country ?? item.cities?.country ?? item.cities?.name ?? "").toString().trim();
        if (!value || typeof value !== "string") {
          issues.push(`[${label}#${idx}] missing value (name="${name}")`);
          return;
        }
        const v = value.toLowerCase();
        if (name && !v.includes(name.toLowerCase())) {
          issues.push(`[${label}#${idx}] value missing name "${name}" → "${value}"`);
        }
        if (region && !v.includes(region.toLowerCase())) {
          issues.push(`[${label}#${idx}] value missing region "${region}" → "${value}"`);
        }
      });
    };
    validate("trending", trendingCities, (c) => `${c.name} ${c.country || ""}`);
    validate("city", hotelCities, (c) => `${c.name} ${c.country || ""}`);
    validate("hotel", hotels || [], (h) => `${h.name} ${h.cities?.name || ""} ${h.cities?.country || ""}`);
    if (issues.length) {
      // eslint-disable-next-line no-console
      console.warn("[Destination QA] cmdk value issues:", issues);
    } else {
      // eslint-disable-next-line no-console
      console.debug(`[Destination QA] OK — ${trendingCities.length} trending, ${hotelCities.length} cities, ${hotels?.length || 0} hotels.`);
    }
  }, [destinationOpen, trendingCities, hotelCities, hotels]);

  // Period availability for the selected stay — delegates to the shared
  // `getStayWindowRemaining` helper so search cards and the booking modal
  // resolve the SAME default-rate band (no $60 vs $100 drift).
  const computePeriodAvail = useCallback((hotel: HotelType): number | null => {
    if (!checkIn || !checkOut) return null;
    return getStayWindowRemaining(
      hotel.id,
      checkIn,
      checkOut,
      hotelAvailableDates as any,
      hotelBookings as any,
    );
  }, [checkIn, checkOut, hotelAvailableDates, hotelBookings]);

  const hasInventoryWindow = useCallback((hotelId: string) => {
    return hotelAvailableDates.some(
      (entry) => entry.hotel_id === hotelId && entry.from_date && entry.to_date,
    );
  }, [hotelAvailableDates]);

  // Price bounds for slider — uses period-available inventory to pick the band.
  const priceBounds = useMemo(() => {
    if (!searchedHotels.length) return { min: 0, max: 5000 };
    const prices = searchedHotels
      .map(h => getHotelRoomPrice(h, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings))
      .filter(p => p > 0);
    if (!prices.length) return { min: 0, max: 5000 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [searchedHotels, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings]);


  // Reset price range when results change
  useEffect(() => {
    if (priceBounds.max > 0) {
      setPriceRange([priceBounds.min, priceBounds.max]);
    }
  }, [priceBounds.min, priceBounds.max]);

  // SHARED POOL per-day remaining: every day inside an inventory window shows
  // the same remaining count = window pool - all bookings overlapping the window.
  const getPeriodAvailableRooms = useCallback((hotel: HotelType, date: Date) => {
    const compareDate = startOfDay(date);
    const validFrom = hotel.valid_from ? startOfDay(parseISO(hotel.valid_from)) : null;
    const validUntil = hotel.valid_until ? startOfDay(parseISO(hotel.valid_until)) : null;
    const isInValidPeriod = (!validFrom || compareDate >= validFrom) && (!validUntil || compareDate <= validUntil);
    if (!isInValidPeriod) return null;

    const matches = hotelAvailableDates.filter((entry) => {
      if (entry.hotel_id !== hotel.id) return false;
      const from = startOfDay(parseISO(entry.from_date));
      const to = startOfDay(parseISO(entry.to_date));
      return compareDate >= from && compareDate <= to;
    });

    if (matches.length === 0) return null;
    // For each window the day belongs to, compute its shared-pool remaining,
    // then sum across windows (in case multiple separate windows cover the same day).
    let remaining = 0;
    for (const m of matches) {
      const from = parseISO(m.from_date);
      const to = parseISO(m.to_date);
      const booked = getBookedRoomsForWindow(hotel.id, from, to);
      remaining += Math.max(0, (m.available_rooms || 0) - booked);
    }
    return remaining;
  }, [hotelAvailableDates, getBookedRoomsForWindow]);

  // Calculate available, limited, and sold out dates for hotels using hotel_available_dates only
  const hotelAvailability = useMemo(() => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];
    if (!hotels) return { available, limited, soldOut };

    const relevantHotels = hotels.filter(h => {
      if (!h || !h.is_active) return false;
      const hName = (h.name || "").toLowerCase();
      const cName = (h.cities?.name || "").toLowerCase();
      const d = (destination || "").toLowerCase();
      if (d && !hName.includes(d) && !cName.includes(d)) return false;
      return true;
    });

    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      let availableRooms = 0;
      let hasHotels = false;

      relevantHotels.forEach((hotel) => {
        const periodRooms = getPeriodAvailableRooms(hotel, date);
        if (periodRooms !== null) {
          hasHotels = true;
          availableRooms += periodRooms;
        }
      });

      if (hasHotels) {
        if (availableRooms === 0) soldOut.push(date);
        else if (availableRooms < 5) limited.push(date);
        else available.push(date);
      }
    }

    return { available, limited, soldOut };
  }, [hotels, destination, getPeriodAvailableRooms]);

  const checkOutAvailability = useMemo(() => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];
    if (!hotels) return { available, limited, soldOut };

    const relevantHotels = hotels.filter(h => {
      if (!h || !h.is_active) return false;
      const hName = (h.name || "").toLowerCase();
      const cName = (h.cities?.name || "").toLowerCase();
      const d = (destination || "").toLowerCase();
      if (d && !hName.includes(d) && !cName.includes(d)) return false;
      return true;
    });

    const startDate = checkIn ? addDays(checkIn, 1) : new Date();
    for (let i = 0; i < 90; i++) {
      const date = addDays(startDate, i);
      let availableRooms = 0;
      let hasHotels = false;

      relevantHotels.forEach((hotel) => {
        const periodRooms = getPeriodAvailableRooms(hotel, date);
        if (periodRooms !== null) {
          hasHotels = true;
          availableRooms += periodRooms;
        }
      });

      if (hasHotels) {
        if (availableRooms === 0) soldOut.push(date);
        else if (availableRooms < 5) limited.push(date);
        else available.push(date);
      }
    }

    return { available, limited, soldOut };
  }, [hotels, destination, checkIn, getPeriodAvailableRooms]);

  const handleHotelSearch = async () => {
    if (!hotels) return;
    setIsSearching(true);
    setShowResults(false);
    if (!destination) { toast.error("Please select a destination", { description: "Choose a city or hotel name to search" }); setIsSearching(false); return; }
    if (!checkIn) { toast.error("Please select check-in date", { description: "Choose when you want to check in" }); setIsSearching(false); return; }
    if (!checkOut) { toast.error("Please select check-out date", { description: "Choose when you want to check out" }); setIsSearching(false); return; }

    // Save to recent searches
    const recentEntry: RecentSearch = {
      destination,
      checkIn: checkIn ? checkIn.toISOString() : null,
      checkOut: checkOut ? checkOut.toISOString() : null,
      rooms: roomCount,
      adults: totalAdults,
      children: totalChildren,
      timestamp: Date.now(),
    };
    saveRecentSearch(recentEntry);
    setRecentSearches(loadRecentSearches());

    setCompareIds([]);


    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!hotels || !Array.isArray(hotels)) {
      setIsSearching(false);
      return;
    }

    let results = hotels.filter(h => h && h.is_active);
    if (destination) {
      const d = destination.toLowerCase();
      results = results.filter(h => {
        const hName = (h.name || "").toLowerCase();
        const cName = (h.cities?.name || "").toLowerCase();
        return hName.includes(d) || cName.includes(d);
      });
    }

    setSearchedHotels(results);
    setIsSearching(false);
    setShowResults(true);
    // Reset filters
    setMinStars(0);
    setSelectedAmenities([]);
    setSortBy("price-asc");
  };

  // Apply recent search
  const applyRecentSearch = useCallback((rs: RecentSearch) => {
    setDestination(rs.destination);
    if (rs.checkIn) setCheckIn(new Date(rs.checkIn));
    if (rs.checkOut) setCheckOut(new Date(rs.checkOut));
    setRoomConfigs(Array.from({ length: rs.rooms }, () => ({
      adults: Math.max(1, Math.floor(rs.adults / rs.rooms)),
      children6to12: 0,
      children2to6: Math.floor(rs.children / rs.rooms),
      infants: 0,
    })));
  }, []);

  // Filtered & sorted hotels
  const filteredHotels = useMemo(() => {
    if (!showResults) return [];
    let list = [...searchedHotels];

    // Hide hotels with no remaining inventory for the searched window.
    // (Only applies once both dates are chosen — otherwise we can't compute
    // availability and we keep the hotel visible.)
    if (checkIn && checkOut) {
      list = list.filter(h => {
        if (!hasInventoryWindow(h.id)) return true;
        const avail = computePeriodAvail(h);
        // null = no inventory window covers these dates → treat as sold out.
        return avail !== null && avail > 0;
      });
    }

    // Star filter
    if (minStars > 0) {
      list = list.filter(h => (h.star_rating || 0) >= minStars);
    }

    // Price filter
    list = list.filter(h => {
      const price = getHotelRoomPrice(h, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
      return price >= priceRange[0] && price <= priceRange[1];
    });


    // Amenity filter
    if (selectedAmenities.length > 0) {
      list = list.filter(h => 
        selectedAmenities.every(a => 
          h.amenities?.some(ha => 
            ha && ha.toLowerCase().includes(String(a).toLowerCase())
          )
        )
      );
    }

    // Sort
    list.sort((a, b) => {
      try {
        const priceA = getHotelRoomPrice(a, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
        const priceB = getHotelRoomPrice(b, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
        switch (sortBy) {
          case "price-asc": return priceA - priceB;
          case "price-desc": return priceB - priceA;
          case "rating": return (b.star_rating || 0) - (a.star_rating || 0);
          case "name": return (a.name || "").localeCompare(b.name || "");
          default: return 0;
        }

      } catch (err) {
        console.error("Sorting error:", err);
        return 0;
      }
    });

    return list;
  }, [showResults, searchedHotels, minStars, priceRange, selectedAmenities, sortBy, checkIn, checkOut, computePeriodAvail, hasInventoryWindow, searchedRoomType, roomConfigs, hotelAvailableDates, hotelBookings]);

  // Location-grouped hotels
  const locationGrouped = useMemo(() => {
    const groups = new Map<string, HotelType[]>();
    filteredHotels.forEach(h => {
      const city = h.cities?.name || "Other";
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(h);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredHotels]);

  // Compute stats for results — Best Price + Best Value
  const resultStats = useMemo(() => {
    if (filteredHotels.length === 0) return null;
    const withPrices = filteredHotels.map(h => ({
      id: h.id,
      price: getHotelRoomPrice(h, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings),
      stars: h.star_rating || 0,
    })).filter(h => h.price > 0);

    if (withPrices.length === 0) return null;

    // Best Price = cheapest
    const cheapest = Math.min(...withPrices.map(h => h.price));
    const bestPriceId = withPrices.find(h => h.price === cheapest)?.id || null;

    // Best Value = best stars-to-price ratio (stars/price)
    let bestValueId: string | null = null;
    if (withPrices.length >= 2) {
      let bestRatio = -1;
      withPrices.forEach(h => {
        if (h.stars > 0) {
          const ratio = h.stars / h.price;
          if (ratio > bestRatio) { bestRatio = ratio; bestValueId = h.id; }
        }
      });
      // Don't duplicate badge if same hotel
      if (bestValueId === bestPriceId) bestValueId = null;
    }

    return { bestPriceId, bestValueId };
  }, [filteredHotels, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings]);

  // Total available rooms for the selected stay period from hotel_available_dates
  const getTotalAvailableRooms = (hotel: HotelType) => {
    if (!checkIn || !checkOut) return null;

    let minAvailable: number | null = null;
    const diff = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
    for (let i = 0; i < Math.max(1, diff); i++) {
      const date = addDays(checkIn, i);
      const periodAvailable = getPeriodAvailableRooms(hotel, date);
      if (periodAvailable === null) return null;
      minAvailable = minAvailable === null ? periodAvailable : Math.min(minAvailable, periodAvailable);
    }

    return minAvailable;
  };

  // Toggle compare
  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) { toast.error("Max 3 hotels for comparison"); return prev; }
      return [...prev, id];
    });
  };

  const compareHotels = useMemo(() => {
    return compareIds.map(id => searchedHotels.find(h => h.id === id)).filter(Boolean) as HotelType[];
  }, [compareIds, searchedHotels]);

  // Toggle saved hotel
  const handleToggleSaved = (e: React.MouseEvent, hotelId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to save hotels");
      return;
    }
    const isSaved = savedHotelIds.includes(hotelId);
    toggleSavedMutation.mutate({ hotelId, isSaved }, {
      onSuccess: () => {
        toast.success(isSaved ? "Hotel removed from favorites" : "Hotel saved to favorites");
      },
    });
  };



  // Open quick view
  const openQuickView = (e: React.MouseEvent, hotel: HotelType) => {
    e.stopPropagation();
    setQuickViewHotel(hotel);
    setQuickViewImageIndex(0);
  };

  // Share search results as URL
  const handleShareSearch = () => {
    const params = new URLSearchParams();
    if (destination) params.set("dest", destination);
    if (checkIn) params.set("in", checkIn.toISOString().split("T")[0]);
    if (checkOut) params.set("out", checkOut.toISOString().split("T")[0]);
    params.set("rooms", String(roomCount));
    params.set("adults", String(totalAdults));
    if (totalChildren > 0) params.set("children", String(totalChildren));
    if (minStars > 0) params.set("stars", String(minStars));
    if (sortBy !== "price-asc") params.set("sort", sortBy);

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Search link copied!", { description: "Share this link with your client" });
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  // Export results to PDF
  const handleExportPDF = async () => {
    if (filteredHotels.length === 0) {
      toast.error("No hotels to export");
      return;
    }
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Hotel Search Results", 14, 22);

      // Search info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      let infoLine = `Destination: ${destination || "All"}`;
      if (checkIn) infoLine += `  |  Check-in: ${format(checkIn, "dd/MM/yyyy")}`;
      if (checkOut) infoLine += `  |  Check-out: ${format(checkOut, "dd/MM/yyyy")}`;
      if (nightCount) infoLine += `  |  ${nightCount} night${nightCount !== 1 ? "s" : ""}`;
      doc.text(infoLine, 14, 30);
      doc.text(`${filteredHotels.length} hotel${filteredHotels.length !== 1 ? "s" : ""} found  |  ${roomCount} room${roomCount !== 1 ? "s" : ""}, ${totalAdults} adult${totalAdults !== 1 ? "s" : ""}${totalChildren > 0 ? `, ${totalChildren} child${totalChildren !== 1 ? "ren" : ""}` : ""}`, 14, 36);

      // Line
      doc.setDrawColor(200);
      doc.line(14, 40, pageW - 14, 40);

      // Hotel rows
      let y = 48;
      doc.setTextColor(0);

      filteredHotels.forEach((hotel, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const stayPricing = getHotelStayPricing(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
        const price = stayPricing ? Math.round(stayPricing.avg) : getHotelRoomPrice(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
        const totalPrice = stayPricing ? Math.round(stayPricing.total) : null;
        const stars = "★".repeat(hotel.star_rating || 0);

        // Hotel name
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. ${hotel.name}`, 14, y);

        // Stars
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(180, 150, 0);
        doc.text(stars, pageW - 14 - doc.getTextWidth(stars), y);
        doc.setTextColor(0);

        y += 6;

        // Location
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`📍 ${hotel.cities?.name || "Unknown"} ${hotel.address ? "— " + hotel.address : ""}`, 14, y);
        y += 5;

        // Price
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`$${price}/night`, 14, y);
        if (totalPrice) {
          doc.setFont("helvetica", "normal");
          doc.text(`  (Total: $${totalPrice.toLocaleString()} for ${nightCount} nights)`, 14 + doc.getTextWidth(`$${price}/night`), y);
        }
        y += 5;

        // Amenities
        if (hotel.amenities && hotel.amenities.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`Amenities: ${hotel.amenities.join(", ")}`, 14, y);
          y += 5;
        }

        // Room types
        if (hotel.hotel_rooms && hotel.hotel_rooms.length > 0) {
          doc.setFontSize(8);
          doc.setTextColor(100);
          const roomInfo = hotel.hotel_rooms.filter(r => r.is_active).map(r => `${r.room_type} ($${r.price_per_night}/n, ${r.available_rooms || 0} avail.)`).join("  |  ");
          doc.text(`Rooms: ${roomInfo}`, 14, y);
          y += 5;
        }

        doc.setTextColor(0);
        y += 4;
      });

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`Generated on ${format(new Date(), "dd/MM/yyyy 'at' HH:mm")}`, 14, doc.internal.pageSize.getHeight() - 10);

      doc.save(`hotel-results-${destination || "search"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    }
  };

  // Active filter count
  const activeFilterCount = (minStars > 0 ? 1 : 0) + (selectedAmenities.length > 0 ? 1 : 0) + ((priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max) ? 1 : 0);

  // Filter sidebar content (shared between desktop and mobile)
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort By
        </label>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price-asc">Price: Low → High</SelectItem>
            <SelectItem value="price-desc">Price: High → Low</SelectItem>
            <SelectItem value="rating">Star Rating</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Star Rating */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Star Rating</label>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setMinStars(s)}
              className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${minStars === s
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                }`}
            >
              {s === 0 ? "All" : (
                <>
                  {s}<Star className="h-3 w-3 fill-current" />
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Range (per night)</label>
        <div className="px-1">
          <Slider
            min={priceBounds.min}
            max={priceBounds.max}
            step={10}
            value={priceRange}
            onValueChange={(v) => setPriceRange(v as [number, number])}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="font-medium">${priceRange[0]}</span>
          <span className="font-medium">${priceRange[1]}</span>
        </div>
      </div>

      {/* Amenities */}
      <div className="space-y-2.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amenities</label>
        <div className="space-y-2">
          {FILTER_AMENITIES.map(amenity => {
            const IconComp = getAmenityIcon(amenity);
            const checked = selectedAmenities.includes(amenity);
            return (
              <label key={amenity} className="flex items-center gap-2.5 cursor-pointer group">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    setSelectedAmenities(prev => checked ? prev.filter(a => a !== amenity) : [...prev, amenity]);
                  }}
                />
                <IconComp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary/70 transition-colors" />
                <span className="text-sm text-foreground">{amenity}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => { setMinStars(0); setPriceRange([priceBounds.min, priceBounds.max]); setSelectedAmenities([]); }}
        >
          <X className="h-3.5 w-3.5 mr-1.5" /> Clear Filters
        </Button>
      )}
    </div>
  );



  const allFieldsReady = Boolean(destination && checkIn && checkOut);

  // Render a single hotel card
  const renderHotelCard = (hotel: HotelType, index: number) => {
    const isBestPrice = resultStats?.bestPriceId === hotel.id;
    const isBestValue = resultStats?.bestValueId === hotel.id;
    const totalRooms = getTotalAvailableRooms(hotel);
    const stayPricing = getHotelStayPricing(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
    const price = stayPricing ? Math.round(stayPricing.avg) : getHotelRoomPrice(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
    const totalPrice = stayPricing ? Math.round(stayPricing.total) : null;
    const isComparing = compareIds.includes(hotel.id);
    const isSaved = savedHotelIds.includes(hotel.id);


    return (
      <div
        key={hotel.id}
        className="group relative flex flex-col rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-[0_24px_50px_-18px_hsl(var(--primary)/0.28)] hover:-translate-y-1 transition-all duration-500 animate-[card-slide-up_0.4s_ease-out_forwards] opacity-0 overflow-hidden"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Top hairline brand stripe */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

        <div
          className="relative flex items-stretch gap-0 cursor-pointer"
          onClick={(e) => openQuickView(e, hotel)}
        >
          {/* Best Price tag - polished brass */}
          {isBestPrice && (
            <div className="absolute top-0 left-0 z-20">
              <div className="bg-gradient-to-br from-emerald-700 via-emerald-500 to-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-br-2xl shadow-[0_6px_16px_-4px_hsl(150_60%_30%/0.5)] flex items-center gap-1.5 ring-1 ring-emerald-300/40 ring-inset">
                <TrendingDown className="h-3 w-3" />
                Best Price
              </div>
            </div>
          )}

          {/* Best Value tag */}
          {isBestValue && (
            <div className="absolute top-0 left-0 z-20">
              <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground text-[10px] font-extrabold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-br-2xl shadow-[0_6px_16px_-4px_hsl(var(--primary)/0.5)] flex items-center gap-1.5 ring-1 ring-primary-foreground/20 ring-inset">
                <Sparkles className="h-3 w-3" />
                Best Value
              </div>
            </div>
          )}

          {/* Heart / Save button */}
          <button
            className={`absolute z-20 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md ring-1 ${(isBestPrice || isBestValue) ? "top-10 left-2" : "top-2 left-2"
              } ${isSaved
                ? "bg-red-500/95 text-white ring-red-300/50 shadow-lg"
                : "bg-black/40 text-white ring-white/20 opacity-0 group-hover:opacity-100 hover:bg-red-500/95 hover:ring-red-300/50"
              }`}
            onClick={(e) => handleToggleSaved(e, hotel.id)}
            title={isSaved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
          </button>

          {/* Compare checkbox */}
          <button
            className={`absolute top-2 right-2 z-20 h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-300 backdrop-blur-md ring-1 ${isComparing
                ? "bg-primary text-primary-foreground ring-primary/40 shadow-md"
                : "bg-background/70 ring-border/40 opacity-0 group-hover:opacity-100 hover:ring-primary/60"
              }`}
            onClick={(e) => { e.stopPropagation(); toggleCompare(hotel.id); }}
            title="Compare"
          >
            {isComparing ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>

          {/* Hotel Image - cinematic */}
          <div className="relative w-56 shrink-0 overflow-hidden">
            {hotel.images && hotel.images.length > 0 ? (
              <>
                <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-[1.12] transition-transform duration-[1200ms] ease-out" />
                {/* Cinematic vignette */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
                {/* Right edge fade into card */}
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card via-card/60 to-transparent" />
                {/* Multi-image counter */}
                {hotel.images.length > 1 && (
                  <div className="absolute top-2 right-12 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ring-white/15 flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" />
                    {hotel.images.length}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full min-h-[170px] bg-gradient-to-br from-muted via-muted/70 to-muted/40 flex items-center justify-center">
                <Building className="h-14 w-14 text-muted-foreground/30" />
              </div>
            )}
            {/* Star rating plaque */}
            {(hotel.star_rating || 0) > 0 && (
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 bg-black/65 backdrop-blur-md rounded-md px-2 py-1 ring-1 ring-white/15 shadow-lg">
                {Array.from({ length: Math.max(0, hotel.star_rating || 0) }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                ))}
              </div>
            )}
            {/* City badge */}
            {hotel.cities?.name && (
              <div className="absolute bottom-2.5 right-14 z-10 bg-black/55 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md ring-1 ring-white/15 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" />
                {hotel.cities.name}
              </div>
            )}
          </div>

          {/* Hotel Info */}
          <div className="flex-1 min-w-0 flex items-center justify-between px-6 py-5 gap-5 relative">
            <div className="min-w-0 space-y-3 flex-1 relative">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-foreground truncate text-[16px] tracking-tight group-hover:text-primary transition-colors duration-300">
                    {hotel.name}
                  </h4>
                  {/* Rating badge */}
                  {(hotel as any).rating_score != null && (hotel as any).rating_score > 0 && (
                    <Badge className="bg-gradient-to-br from-primary/15 to-primary/5 text-primary border-primary/30 text-[10px] font-extrabold px-2 py-0 h-5 shrink-0 shadow-sm">
                      ★ {Number((hotel as any).rating_score).toFixed(1)}
                    </Badge>
                  )}
                  {(hotel as any).review_count > 0 && (
                    <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                      ({(hotel as any).review_count} review{(hotel as any).review_count !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>
                {/* Decorative brand underline */}
                <div className="mt-1.5 h-px w-12 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent group-hover:w-20 transition-all duration-500" />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-2 font-medium uppercase tracking-wider">
                  <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                  {hotel.cities?.name || "Unknown location"}
                </p>
              </div>

              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {(() => {
                    // Filter out ALL breakfast/buffet items from the small chips 
                    // because we show it as a dedicated status badge now.
                    const amenities = Array.isArray(hotel.amenities) ? hotel.amenities : [];
                    const list = amenities.filter(a => {
                      const lower = a?.toLowerCase() || "";
                      return !lower.includes("breakfast") && 
                             !lower.includes("buffet") && 
                             lower !== "bb";
                    });
                    
                    return list.slice(0, 4).map((amenity, i) => {
                      const IconComp = getAmenityIcon(amenity);
                      return (
                        <div key={i} className="flex items-center gap-1.5 text-[10.5px] font-medium rounded-full px-2.5 py-1 transition-all ring-1 text-foreground/75 bg-muted/50 ring-border/50 hover:ring-primary/40 hover:text-foreground">
                          <IconComp className="h-2.5 w-2.5 text-primary/70" />
                          <span>{amenity}</span>
                        </div>
                      );
                    });
                  })()
                  }
                  {hotel.amenities.length > 4 && (
                    <div className="flex items-center text-[10.5px] font-bold text-primary bg-primary/10 ring-1 ring-primary/30 rounded-full px-2.5 py-1">
                      +{hotel.amenities.length - 4} more
                    </div>
                  )}
                </div>
              )}

              {/* Availability & Breakfast Status */}
              {allFieldsReady && (
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const avail = getTotalAvailableRooms(hotel);
                    if (avail === null) return null;
                    const isLow = avail > 0 && avail < 5;
                    
                    const hasBreakfast = Array.isArray(hotel.amenities) && hotel.amenities.some(a => {
                      const lower = a?.toLowerCase() || "";
                      return lower.includes("breakfast") || 
                             lower.includes("buffet") || 
                             lower === "bb";
                    });

                    const hasSpecialPrice = (hotel as any).hotel_special_prices && (hotel as any).hotel_special_prices.length > 0;

                    return (
                      <>
                        {(avail === 0 || isLow) && (
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 flex items-center gap-2 backdrop-blur-sm",
                            "bg-gradient-to-r from-rose-500/10 to-transparent text-rose-700 border-rose-500/30"
                          )}>
                            {avail === 0 ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3 opacity-80 text-rose-600" />}
                            {avail === 0 ? "Sold Out" : `Limited Availability`}
                          </Badge>
                        )}

                        {hasBreakfast && (
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-700 border-emerald-500/20 flex items-center gap-2 shadow-sm backdrop-blur-sm transition-all duration-300">
                            <Coffee className="h-3 w-3 opacity-80 text-emerald-600" />
                            Breakfast Included
                          </Badge>
                        )}

                        {hasSpecialPrice && (
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border bg-gradient-to-r from-violet-500/10 to-transparent text-violet-700 border-violet-500/20 flex items-center gap-2 shadow-sm backdrop-blur-sm transition-all duration-300">
                            <Sparkles className="h-3 w-3 opacity-80 text-violet-600" />
                            Special Offer
                          </Badge>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* CTA + Price */}
            <div className="text-right shrink-0 flex flex-col items-end gap-2.5 self-stretch justify-center relative pl-5">
              {/* Vertical brand divider */}
              <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent" />

              {price > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9.5px] font-bold uppercase tracking-[0.15em] border-primary/30 text-primary bg-primary/5">
                      {searchedRoomType}
                    </Badge>
                  </div>
                  {totalPrice ? (
                    <>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">From</p>
                      <p className="text-[26px] font-extrabold bg-gradient-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-none tracking-tight">
                        ${totalPrice.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {nightCount} night{nightCount !== 1 ? "s" : ""} × {roomCount} room{roomCount !== 1 ? "s" : ""} · <span className="text-foreground/80 font-bold">${price}</span>/night
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">From</p>
                      <p className="text-[26px] font-extrabold bg-gradient-to-br from-primary via-primary to-primary/70 bg-clip-text text-transparent leading-none tracking-tight">
                        ${price}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">per night</p>
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-1.5 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-[11px] font-semibold rounded-lg gap-1 border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                  onClick={(e) => openQuickView(e, hotel)}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-[11px] font-bold rounded-lg gap-1 bg-gradient-to-br from-primary via-primary to-primary/85 hover:from-primary hover:to-primary text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.4)] hover:shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.5)] transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHotelSelect?.(hotel, { checkIn, checkOut, guests: totalGuests, rooms: roomCount, adults: totalAdults, children: totalChildren, infants: 0, roomConfigs });
                  }}
                >
                  Reserve
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>


      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hero Banner + Search Panel */}
      <div className="relative rounded-2xl shadow-2xl">
        {/* Hero Background Image with KenBurns */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <img
            src={hotelHeroImg}
            alt=""
            className="w-full h-full object-cover animate-kenburns will-change-transform"
            width={1920}
            height={640}
          />
          {/* Deepened legibility gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/80 via-[#0a1628]/35 to-[#0a1628]/85" />
          {/* Twin radial color glows */}
          <div className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full bg-sky-400/30 blur-3xl mix-blend-screen pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 h-[460px] w-[460px] rounded-full bg-amber-500/20 blur-3xl mix-blend-screen pointer-events-none" />
          {/* Floating ambient sparkles */}
          <Sparkles className="absolute top-[18%] left-[12%] h-3 w-3 text-white/70 animate-pulse pointer-events-none" style={{ animationDelay: "0s", animationDuration: "3.5s" }} />
          <Sparkles className="absolute top-[28%] right-[18%] h-2.5 w-2.5 text-cyan-200/80 animate-pulse pointer-events-none" style={{ animationDelay: "0.8s", animationDuration: "4s" }} />
          <Sparkles className="absolute top-[12%] right-[34%] h-2 w-2 text-amber-200/70 animate-pulse pointer-events-none" style={{ animationDelay: "1.6s", animationDuration: "5s" }} />
          <Sparkles className="absolute top-[40%] left-[30%] h-2 w-2 text-white/60 animate-pulse pointer-events-none" style={{ animationDelay: "2.2s", animationDuration: "4.5s" }} />
          {/* Film grain noise overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          {/* Bottom feather into card surface */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-16 pb-8 sm:pt-24 sm:pb-10">
          <p
            className="text-[11px] sm:text-xs font-semibold text-white/80 uppercase tracking-[0.3em] mb-3 inline-flex items-center gap-1.5 animate-fade-in"
            style={{ animationDelay: "60ms", animationFillMode: "both" }}
          >
            <Sparkles className="h-3 w-3 text-cyan-300" />
            The Digital Concierge
          </p>
          <h1
            className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg font-heading leading-tight animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            Find Your Next{" "}
            <span className="relative bg-gradient-to-r from-sky-400 via-cyan-200 to-sky-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-price-shimmer">
              Azure Horizon.
            </span>
          </h1>

          {/* Search Card */}
          <Card className="backdrop-blur-xl bg-card/95 ring-1 ring-white/10 border-border/30 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.45),inset_0_1px_0_0_hsl(0_0%_100%/0.08)] mx-4 sm:mx-8 mb-6 rounded-2xl animate-fade-in" style={{ animationDelay: "380ms", animationFillMode: "both" }}>
            {/* Header with gradient strip */}
            <div className="relative px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/[0.08] via-blue-500/[0.05] to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center ring-1 ring-primary/30 shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)] animate-scale-in shrink-0">
                  <BedDouble className="h-4 w-4 text-primary-foreground" />
                </div>
                <h2 className="text-sm font-bold text-foreground tracking-tight leading-none">Search Hotels</h2>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">— Find the perfect accommodation for your clients</span>
              </div>
            </div>

            <CardContent className="p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Destination — Enhanced Suggestions */}
                <div className="md:col-span-3 space-y-1.5 group relative" ref={destinationRef}>
                  <div
                    className={`relative w-full h-14 rounded-xl bg-card/70 backdrop-blur border transition-colors duration-200 px-2.5 flex items-center gap-2.5 ${destinationOpen ? "border-primary/50 ring-2 ring-primary/40 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" : "border-border/40 hover:border-primary/40 hover:shadow-md"}`}
                    onClick={() => setDestinationOpen(true)}
                  >
                    <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                      <MapPin className="h-4 w-4 text-primary-foreground" />
                    </span>
                    <div className="flex flex-col leading-tight min-w-0 flex-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em] cursor-text">Where to</label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => { setDestination(e.target.value); if (!destinationOpen) setDestinationOpen(true); }}
                        onFocus={() => setDestinationOpen(true)}
                        placeholder="City or hotel name"
                        className="bg-transparent border-0 outline-none p-0 text-sm text-foreground font-semibold placeholder:text-muted-foreground placeholder:font-normal w-full"
                      />
                    </div>
                  </div>

                  {destinationOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-xl overflow-hidden animate-fade-in">
                      <Command
                        className="bg-card text-foreground"
                        shouldFilter={true}
                        filter={(value, search) => {
                          if (!search) return 1;
                          const v = value.toLowerCase();
                          const s = search.toLowerCase().trim();
                          if (!s) return 1;
                          if (v === s) return 1;
                          if (v.startsWith(s)) return 0.9;
                          const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                          const wordBoundary = new RegExp(`\\b${escaped}`);
                          if (wordBoundary.test(v)) return 0.7;
                          if (v.includes(s)) return 0.5;
                          return 0;
                        }}
                      >
                        {/* Hidden cmdk input — drives filtering from the outer text field */}
                        <div className="sr-only">
                          <CommandInput
                            value={destination}
                            onValueChange={setDestination}
                            aria-hidden
                          />
                        </div>
                        <CommandList className="max-h-[260px] py-1">
                          {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                            </div>
                          ) : hotelCities.length === 0 && (!hotels || hotels.length === 0) ? (
                            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                              <MapPin className="h-5 w-5 opacity-50" />
                              No destinations available yet.
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>
                                <div className="flex flex-col items-center justify-center gap-2 py-7 px-4 text-center">
                                  <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground">No matches found</p>
                                    <p className="text-xs text-muted-foreground">
                                      {destination ? <>We couldn't find any city or hotel for <span className="font-medium text-foreground">"{destination}"</span>.</> : "Try a different search."}
                                    </p>
                                  </div>
                                  {destination && (
                                    <button
                                      type="button"
                                      onClick={() => setDestination("")}
                                      className="mt-1 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
                                    >
                                      Clear search
                                    </button>
                                  )}
                                </div>
                              </CommandEmpty>

                              {trendingCities.length > 0 && (
                                <CommandGroup
                                  heading={
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                                      <Flame className="h-3 w-3 text-amber-500" />
                                      Trending
                                    </span>
                                  }
                                  className="px-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1"
                                >
                                  {trendingCities.map((city) => (
                                    <CommandItem
                                      key={`trending-${city.name}`}
                                      value={`${city.name} ${city.country || ""}`}
                                      onSelect={() => { setDestination(city.name); setDestinationOpen(false); }}
                                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:!bg-muted/60 data-[selected=true]:!bg-muted/70 data-[selected=true]:!text-foreground cursor-pointer"
                                    >
                                      {city.country && getCountryFlagUrl(city.country) ? (
                                        <img src={getCountryFlagUrl(city.country)!} alt="" className="h-4 w-6 object-cover rounded-sm shrink-0" />
                                      ) : (
                                        <div className="h-6 w-6 rounded-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                          <MapPin className="h-3 w-3 text-muted-foreground" />
                                        </div>
                                      )}
                                      <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{city.name}</span>
                                      <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold tabular-nums">
                                        {city.count}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}

                              {hotelCities.length > 0 && (
                                <>
                                  <div className="mx-2 my-0.5 h-px bg-border/50" />
                                  <CommandGroup
                                    heading={<span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Cities</span>}
                                    className="px-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1"
                                  >
                                    {hotelCities.map((city) => (
                                      <CommandItem
                                        key={city.name}
                                        value={`${city.name} ${city.country || ""}`}
                                        onSelect={() => { setDestination(city.name); setDestinationOpen(false); }}
                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:!bg-muted/60 data-[selected=true]:!bg-muted/70 data-[selected=true]:!text-foreground cursor-pointer"
                                      >
                                        {city.country && getCountryFlagUrl(city.country) ? (
                                          <img src={getCountryFlagUrl(city.country)!} alt="" className="h-4 w-6 object-cover rounded-sm shrink-0" />
                                        ) : (
                                          <div className="h-6 w-6 rounded-sm overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        )}
                                        <span className="flex-1 min-w-0 text-sm text-foreground truncate">{city.name}</span>
                                        <span className="shrink-0 text-[10px] font-medium text-muted-foreground tabular-nums">{city.count}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}

                              {hotels && hotels.length > 0 && (
                                <>
                                  <div className="mx-2 my-0.5 h-px bg-border/50" />
                                  <CommandGroup
                                    heading={<span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Hotels</span>}
                                    className="px-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1"
                                  >
                                    {hotels.map((hotel) => (
                                      <CommandItem
                                        key={hotel.id}
                                        value={`${hotel.name} ${hotel.cities?.name || ""} ${hotel.cities?.country || ""}`}
                                        onSelect={() => { setDestination(hotel.name); setDestinationOpen(false); }}
                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:!bg-muted/60 data-[selected=true]:!bg-muted/70 data-[selected=true]:!text-foreground cursor-pointer"
                                      >
                                        <div className="relative h-6 w-6 rounded-sm overflow-hidden shrink-0 bg-muted">
                                          {hotel.images?.[0] ? (
                                            <img src={hotel.images[0]} alt={hotel.name} className="h-full w-full object-cover" />
                                          ) : (
                                            <Building className="h-3 w-3 text-muted-foreground m-auto" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-sm text-foreground block truncate">{hotel.name}</span>
                                          <span className="text-[10px] text-muted-foreground block truncate">{hotel.cities?.name || ""}</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                                            <Star key={i} className="h-2.5 w-2.5 fill-gold text-gold" />
                                          ))}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>

                {/* Check In */}
                <div className="md:col-span-2 space-y-1.5">

                  <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-14 justify-start text-left font-normal bg-card/70 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card data-[state=open]:ring-2 data-[state=open]:ring-primary/50 data-[state=open]:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] transition-all duration-200 px-2.5 gap-2.5">
                        <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                          <Calendar className="h-4 w-4 text-primary-foreground" />
                        </span>
                        {checkIn ? (
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Check-in</span>
                            <span className="font-bold text-foreground text-sm truncate">{format(checkIn, "dd MMM yyyy")}</span>
                          </span>
                        ) : (
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Check-in</span>
                            <span className="text-muted-foreground text-sm">Select date</span>
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <AvailabilityCalendar mode="single" selected={checkIn} onSelect={(d) => { setCheckIn(d); setCheckInOpen(false); if (d) { if (checkOut && checkOut <= d) setCheckOut(undefined); setTimeout(() => setCheckOutOpen(true), 150); } }} disabled={(date) => startOfDay(date) < startOfDay(new Date())} availableDates={hotelAvailability.available} limitedDates={hotelAvailability.limited} soldOutDates={hotelAvailability.soldOut} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Check Out */}
                <div className="md:col-span-2 space-y-1.5 relative">
                  {nightCount && nightCount > 0 && (
                    <div className="hidden md:flex absolute -left-1.5 top-9 z-10 -translate-x-1/2 items-center justify-center px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-[10px] font-bold shadow-lg ring-2 ring-background">
                      {nightCount}n
                    </div>
                  )}

                  <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-14 justify-start text-left font-normal bg-card/70 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card data-[state=open]:ring-2 data-[state=open]:ring-primary/50 data-[state=open]:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] transition-all duration-200 px-2.5 gap-2.5">
                        <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                          <Calendar className="h-4 w-4 text-primary-foreground" />
                        </span>
                        {checkOut ? (
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Check-out</span>
                            <span className="font-bold text-foreground text-sm truncate">{format(checkOut, "dd MMM yyyy")}</span>
                          </span>
                        ) : (
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Check-out</span>
                            <span className="text-muted-foreground text-sm">Select date</span>
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <AvailabilityCalendar mode="single" selected={checkOut} onSelect={(d) => { setCheckOut(d); setCheckOutOpen(false); }} disabled={(date) => checkIn ? startOfDay(date) <= startOfDay(checkIn) : startOfDay(date) < startOfDay(new Date())} availableDates={checkOutAvailability.available} limitedDates={checkOutAvailability.limited} soldOutDates={checkOutAvailability.soldOut} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Guests & Rooms */}
                <div className="md:col-span-3 space-y-1.5">

                  <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-14 justify-start text-left font-normal bg-card/70 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card data-[state=open]:ring-2 data-[state=open]:ring-primary/50 data-[state=open]:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] transition-all duration-200 gap-2.5 px-2.5">
                        <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                          <Home className="h-4 w-4 text-primary-foreground" />
                        </span>
                        <span className="flex flex-col leading-tight min-w-0 flex-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Rooms & Guests</span>
                          <span className="font-bold text-foreground text-sm truncate">
                            {roomCount} {roomCount === 1 ? "room" : "rooms"} · {totalGuests} {totalGuests === 1 ? "guest" : "guests"}
                          </span>
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0 bg-card border border-border shadow-lg z-50" align="start">
                      <HotelRoomConfigurator rooms={roomConfigs} onRoomsChange={setRoomConfigs} onApply={() => setGuestsOpen(false)} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Search Button */}
                <div className="md:col-span-2 flex items-end">
                  <Button
                    onClick={handleHotelSearch}
                    disabled={isLoading || isSearching}
                    className={`relative overflow-hidden group w-full h-14 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-primary-foreground hover:opacity-95 hover:scale-[1.02] active:scale-[0.99] shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.65)] hover:shadow-[0_14px_36px_-10px_hsl(var(--primary)/0.85)] transition-all gap-2 text-sm font-bold tracking-wide`}
                  >
                    <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                    {isLoading || isSearching ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <><Search className="h-4 w-4 relative z-10" /><span className="relative z-10">Search Hotels</span></>}
                  </Button>
                </div>
              </div>

              {/* Recent Searches - inside card */}
              {recentSearches.length > 0 && !showResults && !isSearching && (
                <div
                  className="border-t border-border/20 px-4 md:px-5 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none"
                  style={{
                    maskImage: "linear-gradient(to right, black calc(100% - 48px), transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to right, black calc(100% - 48px), transparent 100%)",
                  }}
                >
                  <span className="text-xs text-muted-foreground font-medium shrink-0 flex items-center gap-1 uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5" /> Recent:
                  </span>
                  {recentSearches.map((rs, i) => (
                    <button
                      key={i}
                      onClick={() => applyRecentSearch(rs)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/40 text-xs text-foreground transition-colors"
                    >
                      <MapPin className="h-3 w-3 text-primary/60" />
                      <span className="font-medium">{rs.destination}</span>
                      {rs.checkIn && (
                        <span className="text-muted-foreground">
                          {format(new Date(rs.checkIn), "dd/MM")}
                          {rs.checkOut && ` - ${format(new Date(rs.checkOut), "dd/MM")}`}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => { clearRecentSearches(); setRecentSearches([]); }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ultra-Sleek & Elegant GTS Hotel Search Animation */}
      {isSearching && (
        <Card className="relative overflow-hidden border border-amber-500/25 bg-card/95 backdrop-blur-2xl shadow-xl rounded-2xl p-6 lg:p-8 max-w-lg mx-auto animate-fade-in my-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Header: GTS Logo + Destination Badge */}
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-amber-500/30 flex items-center shadow-sm">
                <img src={gtsLogo} alt="GTS Logo" className="h-5 w-auto object-contain" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                {destination || "Hotels & Resorts"}
              </span>
            </div>

            {/* Glowing Golden Emblem & Key */}
            <div className="relative w-28 h-28 py-1 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
              <span className="absolute inset-2 rounded-full border border-amber-500/40 border-dashed animate-[spin_10s_linear_infinite]" />
              
              <div className="relative z-10 h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 ring-2 ring-background">
                <BedDouble className="h-8 w-8 animate-pulse" />
              </div>

              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 z-20 h-7 w-7 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 text-white flex items-center justify-center shadow-md ring-2 ring-background"
              >
                <KeyRound className="h-4 w-4" />
              </motion.div>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Unlocking Best Hotel Rates
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scanning luxury suites & wholesale rates in {destination || "destination"}...
              </p>
            </div>

            {/* Sleek Gold Progress Bar */}
            <div className="w-full max-w-xs bg-muted/80 h-1.5 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-full"
                animate={{ width: ["15%", "95%"] }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Search Results — Pro */}
      {showResults && !isSearching && (
        <Card className="border-border/40 animate-fade-in overflow-hidden">
          {/* Stats bar */}
          {resultStats && searchedHotels.length > 0 && (
            <div className="bg-gradient-to-r from-muted/60 via-muted/30 to-transparent border-b border-border/30 px-5 md:px-6 py-3 flex items-center gap-4 flex-wrap text-sm">
              <span className="font-semibold text-foreground">
                {filteredHotels.length} of {searchedHotels.length} Hotel{searchedHotels.length !== 1 ? "s" : ""}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">{filteredHotels.length} matching</span>
              </span>
              {nightCount && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Moon className="h-3.5 w-3.5" />
                    <span className="font-semibold text-foreground">{nightCount}</span> night{nightCount !== 1 ? "s" : ""}
                  </span>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                {/* View mode toggle */}
                <div className="hidden md:flex items-center border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`h-7 px-2.5 flex items-center gap-1 text-xs transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <List className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("location")}
                    className={`h-7 px-2.5 flex items-center gap-1 text-xs transition-colors ${viewMode === "location" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    By Location
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`h-7 px-2.5 flex items-center gap-1 text-xs transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Map
                  </button>
                </div>
                {/* Mobile filter trigger */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden h-7 text-xs gap-1">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[9px]">{activeFilterCount}</Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle>Filters & Sorting</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-7 text-xs" onClick={() => setShowResults(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}

          <CardContent className="p-5 md:p-6">
            {searchedHotels.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-5">
                  <Hotel className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Hotels Found</h3>
                <p className="text-sm max-w-sm mx-auto mb-1">We couldn't find hotels matching your search in <span className="font-medium text-foreground">{destination}</span>.</p>
                <p className="text-xs text-muted-foreground/70 mt-2">Try a different destination, adjust your dates, or broaden your search criteria.</p>
              </div>
            ) : (
              <div className="flex gap-6">
                {/* Desktop Sidebar */}
                <div className="hidden md:block w-56 shrink-0 sticky top-0 self-start">
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-4 w-4 text-primary/70" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge variant="default" className="h-4 min-w-4 p-0 px-1 flex items-center justify-center text-[9px] ml-auto">{activeFilterCount}</Badge>
                      )}
                    </h3>
                    <FilterContent />
                  </div>
                </div>

                {/* Results */}
                <div className="flex-1 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <SlidersHorizontal className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No hotels match your filters</p>
                      <p className="text-xs mt-1">Try adjusting your filter criteria</p>
                    </div>
                  ) : viewMode === "map" ? (
                    // Map view
                    <HotelMapView
                      hotels={filteredHotels}
                      nightCount={nightCount}
                      roomType={searchedRoomType}
                      roomConfigs={roomConfigs}
                      onHotelSelect={(hotel) => onHotelSelect?.(hotel, { checkIn, checkOut, guests: totalGuests, rooms: roomCount, adults: totalAdults, children: totalChildren, infants: 0, roomConfigs })}
                      onQuickView={(hotel) => { setQuickViewHotel(hotel); setQuickViewImageIndex(0); }}
                    />
                  ) : viewMode === "location" ? (
                    // Location-grouped view
                    <div className="space-y-6">
                      {locationGrouped.map(([city, cityHotels]) => (
                        <div key={city}>
                          <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card/95 backdrop-blur-sm z-10 py-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            <h3 className="font-bold text-foreground text-sm">{city}</h3>
                            <Badge variant="outline" className="text-[10px] h-5">{cityHotels.length} hotel{cityHotels.length !== 1 ? "s" : ""}</Badge>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {cityHotels.map((hotel, i) => (
                              <div key={hotel.id}>
                                {renderHotelCard(hotel, i)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // List view
                    filteredHotels.map((hotel, index) => renderHotelCard(hotel, index))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison floating bar */}
      {compareIds.length > 0 && showResults && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {compareIds.length} hotel{compareIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-1.5">
            {compareHotels.map(h => (
              <Badge key={h.id} variant="secondary" className="text-xs gap-1 pr-1">
                {(h.name || "Hotel").slice(0, 12)}{(h.name || "").length > 12 && "…"}
                <button onClick={() => toggleCompare(h.id)} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCompareOpen(true)} disabled={compareIds.length < 2}>
            Compare Now
          </Button>
          <button onClick={() => setCompareIds([])} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Comparison Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-primary" />
              Hotel Comparison
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium w-32">Feature</th>
                  {compareHotels.map(h => (
                    <th key={h.id} className="text-center py-3 px-3 min-w-[160px]">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-sm">{h.name}</p>
                        <div className="flex items-center justify-center gap-0.5">
                          {Array.from({ length: h.star_rating || 0 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                          ))}
                        </div>
                        <button onClick={() => toggleCompare(h.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3 w-3 inline" /> Remove
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 px-2 text-muted-foreground">Location</td>
                  {compareHotels.map(h => (
                    <td key={h.id} className="py-2.5 px-3 text-center text-foreground">{h.cities?.name || "—"}</td>
                  ))}
                </tr>
                <tr className="border-b border-border/50 bg-muted/20">
                  <td className="py-2.5 px-2 text-muted-foreground">Price / Night</td>
                  {compareHotels.map(h => {
                    const p = h.price_per_night || h.hotel_rooms?.[0]?.price_per_night || 0;
                    return <td key={h.id} className="py-2.5 px-3 text-center font-bold text-primary">${p}</td>;
                  })}
                </tr>
                {nightCount && (
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 px-2 text-muted-foreground">Total ({nightCount} nights)</td>
                    {compareHotels.map(h => {
                      const p = h.price_per_night || h.hotel_rooms?.[0]?.price_per_night || 0;
                      return <td key={h.id} className="py-2.5 px-3 text-center font-semibold text-foreground">${(p * nightCount).toLocaleString()}</td>;
                    })}
                  </tr>
                )}
                <tr className="border-b border-border/50 bg-muted/20">
                  <td className="py-2.5 px-2 text-muted-foreground">Room Types</td>
                  {compareHotels.map(h => (
                    <td key={h.id} className="py-2.5 px-3 text-center">{h.hotel_rooms?.length || 0}</td>
                  ))}
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 px-2 text-muted-foreground">Avail. Rooms</td>
                  {compareHotels.map(h => (
                    <td key={h.id} className="py-2.5 px-3 text-center">{getTotalAvailableRooms(h)}</td>
                  ))}
                </tr>
                {/* Amenity rows */}
                {(() => {
                  const allAmenities = new Set<string>();
                  compareHotels.forEach(h => h.amenities?.forEach(a => allAmenities.add(a)));
                  return Array.from(allAmenities).map((amenity, i) => {
                    const IconComp = getAmenityIcon(amenity);
                    return (
                      <tr key={amenity} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                        <td className="py-2 px-2 text-muted-foreground flex items-center gap-1.5">
                          <IconComp className="h-3.5 w-3.5 text-primary/60" />
                          <span className="text-xs">{amenity}</span>
                        </td>
                        {compareHotels.map(h => (
                          <td key={h.id} className="py-2 px-3 text-center">
                            {h.amenities?.some(a => a.toLowerCase() === amenity.toLowerCase()) ? (
                              <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick-View Modal */}
      <Dialog open={!!quickViewHotel} onOpenChange={(open) => { if (!open) setQuickViewHotel(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {quickViewHotel && (() => {
            const hotel = quickViewHotel;
            const images = hotel.images || [];
            const currentImage = images[quickViewImageIndex] || "/placeholder.svg";
            const stayPricing = getHotelStayPricing(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
            const price = stayPricing ? Math.round(stayPricing.avg) : getHotelRoomPrice(hotel, searchedRoomType, roomConfigs, checkIn, checkOut, hotelAvailableDates, hotelBookings);
            const totalPrice = stayPricing ? Math.round(stayPricing.total) : null;
            const totalRooms = getTotalAvailableRooms(hotel);

            return (
              <>
                {/* Image Gallery */}
                <div className="relative aspect-[16/9] bg-muted">
                  <img src={currentImage} alt={hotel.name} className="w-full h-full object-cover" />
                  {/* Stars */}
                  <div className="absolute top-4 left-4 flex items-center gap-0.5 bg-card/80 backdrop-blur-sm rounded-full px-2.5 py-1">
                    {Array.from({ length: hotel.star_rating || 0 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                  {/* Price */}
                  {price > 0 && (
                    <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-border">
                      <span className="text-xs text-muted-foreground">from </span>
                      <span className="text-lg font-bold text-primary">${price}</span>
                      <span className="text-xs text-muted-foreground">/night</span>
                    </div>
                  )}
                  {/* Nav arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setQuickViewImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-card transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => setQuickViewImageIndex((prev) => (prev + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow hover:bg-card transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-foreground" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setQuickViewImageIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === quickViewImageIndex ? "bg-primary-foreground w-5" : "bg-primary-foreground/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{hotel.name}</h3>
                    {hotel.address && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        {hotel.cities?.country && getCountryFlagUrl(hotel.cities.country) && <img src={getCountryFlagUrl(hotel.cities.country)!} alt="" className="h-3.5 w-auto rounded-sm" />}
                        <MapPin className="h-4 w-4" />
                        {hotel.cities?.name ? `${hotel.cities.name} — ` : ""}{hotel.address}
                      </p>
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
                          <Badge key={idx} variant="outline" className="gap-1.5 py-1.5 px-3 text-xs">
                            <Icon className="h-3 w-3" />
                            {amenity}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {/* Price summary */}
                  {totalPrice && (
                    <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{nightCount} night{nightCount !== 1 ? "s" : ""}</span>
                      <span className="text-lg font-bold text-primary">${totalPrice.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Room Types section removed per request */}

                  {/* Availability warning */}
                  {totalRooms > 0 && totalRooms <= 5 && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Only {totalRooms} room{totalRooms !== 1 ? "s" : ""} left!
                      </span>
                    </div>
                  )}

                  {/* Thumbnail strip */}
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setQuickViewImageIndex(i)}
                          className={`w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === quickViewImageIndex ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 h-11 rounded-xl font-bold"
                      onClick={() => {
                        setQuickViewHotel(null);
                        onHotelSelect?.(hotel, { checkIn, checkOut, guests: totalGuests, rooms: roomCount, adults: totalAdults, children: totalChildren, infants: 0, roomConfigs });
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      View & Book
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl"
                      onClick={() => {
                        handleToggleSaved({ stopPropagation: () => { } } as React.MouseEvent, hotel.id);
                      }}
                    >
                      <Heart className={`h-4 w-4 ${savedHotelIds.includes(hotel.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
