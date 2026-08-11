import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import flightHeroImg from "@/assets/flight-hero.jpg";
import gtsLogo from "@/assets/gts-logo-official.png";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  PlaneTakeoff,
  PlaneLanding,
  Calendar,
  Users,
  Search,
  ArrowRightLeft,
  ArrowLeftRight,
  ArrowRight,
  Plane,
  Loader2,
  User,
  Baby,
  Plus,
  X,
  Globe,
  SlidersHorizontal,
  ArrowUpDown,
  Luggage,
  Clock,
  Award,
  Tag,
  Filter,
  Receipt,
  Sun,
  Sunset,
  Moon,
  Briefcase,
  Share2,
  GitCompareArrows,
  History,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Info,
  Star,
  Sparkles,
  FileText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Armchair,
  ShieldCheck,
} from "lucide-react";
import { InlineFareCalendar } from "@/components/search/InlineFareCalendar";
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
import { format, addDays, isSameDay, getDay, parseISO, differenceInDays, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useFlights, Flight } from "@/hooks/useFlights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/currency";
import { useAirlines } from "@/hooks/useAirlines";
import { useFlightDefaultFares, useFlightSpecialFares, useBulkFlightDefaultFares, useBulkFlightSpecialFares, type FlightDefaultFare, type FlightSpecialFare } from "@/hooks/useFlightFares";
import { useCities } from "@/hooks/useCities";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { FlightDealsCarousel } from "@/components/search/FlightDealsCarousel";

const formatTime = (time: string | null): string => {
  if (!time) return "TBD";
  const parts = time.split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
};

const getCleanFlightNumber = (flight: Flight) => {
  if (flight.departure_flight_number) return flight.departure_flight_number;
  if (flight.flight_number) {
    const fnLower = flight.flight_number.toLowerCase();
    const airLower = (flight.airline || "").toLowerCase();
    if (fnLower === airLower) return null;
    if (fnLower.includes(airLower) && (fnLower.includes("(") || fnLower.includes(")"))) return null;
    return flight.flight_number;
  }
  return null;
};

const RECENT_SEARCHES_KEY = "flight-recent-searches";
const MAX_RECENT_SEARCHES = 5;

interface RecentSearch {
  from: string;
  to: string;
  date: string;
  tripType: string;
  timestamp: number;
}

interface FlightSearchSectionProps {
  onFlightSelect?: (flight: Flight, passengerCount: number, returnFlight?: Flight | null, paxBreakdown?: { adults: number; children: number; infants: number }) => void;
}

interface MultiCityLeg {
  id?: string;
  from: string;
  to: string;
  date: Date | undefined;
}

type TimeOfDay = "morning" | "afternoon" | "evening";
type SortOption = "price_asc" | "price_desc" | "time" | "seats" | "duration";

export function FlightSearchSection({ onFlightSelect }: FlightSearchSectionProps) {
  const navigate = useNavigate();
  // Restore search state from sessionStorage if available
  const savedSearch = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("flightSearchState");
      if (raw) {
        sessionStorage.removeItem("flightSearchState");
        return JSON.parse(raw);
      }
    } catch { }
    return null;
  }, []);

  // Auto-migrate missing return flight using active authenticated admin session
  useEffect(() => {
    async function runAutoMigration() {
      const returnFlightId = 'a0000000-0000-0000-0000-000000000001';
      const outboundFlightId = '954c8e2d-f2c5-4a02-b505-3c6a35d81b0a';

      // Check if return flight exists
      const { data: existing } = await supabase.from('flights').select('id').eq('id', returnFlightId).maybeSingle();
      if (!existing) {
        console.log("Auto-migrating missing return flight...");
        const returnFlight = {
          id: returnFlightId,
          airline: "Turkish Airline",
          flight_number: "IST NKT IST",
          departure_city: "Istanbul",
          arrival_city: "Sirnak",
          departure_date: "2026-06-01",
          departure_time: "12:00:00",
          arrival_date: "2026-06-01",
          arrival_time: "14:00:00",
          price: 0,
          available_seats: 15,
          class: "economy",
          is_active: true,
          airline_logo: "https://jsiwkbowgmjzywxcywgd.supabase.co/storage/v1/object/public/airline-logos/1774688046413-l3kl3n.png",
          schedule_type: "specific",
          total_seats: 15,
          trip_type: "round_trip",
          linked_flight_id: outboundFlightId,
          departure_airport_code: "IST",
          arrival_airport_code: "NKT",
          description: "BLOCK SEATS RETURN",
          passport_required: false,
          photo_required: false,
          id_scan_required: false,
          id_backside_required: false,
          visa_amount: 0,
          currency: "USD",
          is_featured: true,
          flight_policy: "non refundable",
          ops_email: "group@gashtyartravel.com",
          order_number: "2"
        };

        const { error: insErr } = await supabase.from('flights').insert([returnFlight]);
        if (!insErr) {
          console.log("Return flight inserted successfully.");
          // Update outbound flight link
          await supabase.from('flights').update({ linked_flight_id: returnFlightId }).eq('id', outboundFlightId);

          // Clean existing default fares if any
          await supabase.from('flight_default_fares').delete().eq('flight_id', returnFlightId);

          // Insert default fares matching exact pricing
          const fares = [
            { flight_id: returnFlightId, person_type: "Adult", seat_from: 10, seat_to: 1, rate: 320, commission: 20 },
            { flight_id: returnFlightId, person_type: "Child", seat_from: 10, seat_to: 1, rate: 320, commission: 20 },
            { flight_id: returnFlightId, person_type: "Infant", seat_from: 10, seat_to: 1, rate: 70, commission: 0 },
            { flight_id: returnFlightId, person_type: "Adult", seat_from: 15, seat_to: 11, rate: 290, commission: 15 },
            { flight_id: returnFlightId, person_type: "Child", seat_from: 15, seat_to: 11, rate: 290, commission: 15 },
            { flight_id: returnFlightId, person_type: "Infant", seat_from: 15, seat_to: 11, rate: 60, commission: 0 }
          ];
          await supabase.from('flight_default_fares').insert(fares);
          console.log("Migration complete! Reloading page...");
          window.location.reload();
        } else {
          console.error("Auto-migration insert error:", insErr);
        }
      }
    }
    runAutoMigration();
  }, []);

  // Flight search state
  const [tripType, setTripType] = useState<"oneway" | "roundtrip" | "multicity">(savedSearch?.tripType || "roundtrip");
  const [fromCity, setFromCity] = useState(savedSearch?.fromCity || "");
  const [toCity, setToCity] = useState(savedSearch?.toCity || "");
  const [departureDate, setDepartureDate] = useState<Date>(savedSearch?.departureDate ? new Date(savedSearch.departureDate) : undefined as any);
  const [returnDate, setReturnDate] = useState<Date>(savedSearch?.returnDate ? new Date(savedSearch.returnDate) : undefined as any);
  const [adults, setAdults] = useState(savedSearch?.adults ?? 1);
  const [children, setChildren] = useState(savedSearch?.children ?? 0);
  const [infants, setInfants] = useState(savedSearch?.infants ?? 0);
  const [flightClass, setFlightClass] = useState(savedSearch?.flightClass || "all");
  const [departureDateOpen, setDepartureDateOpen] = useState(false);
  const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [passengersOpen, setPassengersOpen] = useState(false);

  // Multi-city state
  const [multiCityLegs, setMultiCityLegs] = useState<MultiCityLeg[]>([
    { id: "leg-1", from: "", to: "", date: undefined },
    { id: "leg-2", from: "", to: "", date: undefined },
  ]);
  const [multiCityOpenStates, setMultiCityOpenStates] = useState<Record<string, boolean>>({});

  // Synchronize leg 0 with fromCity, toCity, departureDate
  useEffect(() => {
    setMultiCityLegs(prev => {
      const updated = [...prev];
      if (updated[0]) {
        let changed = false;
        if (updated[0].from !== fromCity) {
          updated[0].from = fromCity;
          changed = true;
        }
        if (updated[0].to !== toCity) {
          updated[0].to = toCity;
          changed = true;
        }
        if (updated[0].date !== departureDate) {
          updated[0].date = departureDate;
          changed = true;
        }
        if (changed) return updated;
      }
      return prev;
    });
  }, [fromCity, toCity, departureDate]);

  // Search results state
  const [showResults, setShowResults] = useState(false);
  const [searchedFlights, setSearchedFlights] = useState<Flight[]>([]);
  const [returnSearchedFlights, setReturnSearchedFlights] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  // Round-trip selection state
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [selectedMultiCityFlights, setSelectedMultiCityFlights] = useState<Record<number, Flight>>({});
  const [showCustomFlightSelection, setShowCustomFlightSelection] = useState(false);

  // Fetch fares for selected flights
  const { data: outDefaultFares = [] } = useFlightDefaultFares(selectedOutboundFlight?.id || null);
  const { data: outSpecialFares = [] } = useFlightSpecialFares(selectedOutboundFlight?.id || null);
  const { data: retDefaultFares = [] } = useFlightDefaultFares(selectedReturnFlight?.id || null);
  const { data: retSpecialFares = [] } = useFlightSpecialFares(selectedReturnFlight?.id || null);
  const { data: flights = [], isLoading } = useFlights();
  const packageFlightIds = useMemo(() => {
    const ids = new Set<string>();
    if (!flights) return ids;
    for (const f of flights) {
      if (f.trip_type === "round_trip") {
        ids.add(f.id);
      }
      if (f.linked_flight_id) {
        ids.add(f.id);
        ids.add(f.linked_flight_id);
      }
    }
    return ids;
  }, [flights]);

  const isPackageFlight = useCallback((f: Flight): boolean => {
    return packageFlightIds.has(f.id);
  }, [packageFlightIds]);
  const { airlines = [], getAirlineLogo } = useAirlines();
  const { data: citiesData = [] } = useCities();

  // Build city → { airportCode, country, flagUrl } lookup from flights + cities tables
  const cityInfoMap = useMemo(() => {
    const map: Record<string, { airportCode: string; country: string; flagUrl: string | null }> = {};
    // From flights: get airport codes per city
    if (flights) {
      for (const f of flights) {
        if (f.departure_city && !map[f.departure_city]?.airportCode && f.departure_airport_code) {
          map[f.departure_city] = { ...(map[f.departure_city] || { airportCode: "", country: "", flagUrl: null }), airportCode: f.departure_airport_code };
        }
        if (f.arrival_city && !map[f.arrival_city]?.airportCode && f.arrival_airport_code) {
          map[f.arrival_city] = { ...(map[f.arrival_city] || { airportCode: "", country: "", flagUrl: null }), airportCode: f.arrival_airport_code };
        }
      }
    }
    // From cities table: get country + flag
    if (citiesData) {
      for (const c of citiesData) {
        const existing = map[c.name] || { airportCode: "", country: "", flagUrl: null };
        existing.country = c.country;
        existing.flagUrl = getCountryFlagUrl(c.country, 20);
        map[c.name] = existing;
      }
    }
    return map;
  }, [flights, citiesData]);

  // Bulk fetch fares ONLY for flights that can appear on cards/calendars.
  // Fetching fares for *all* flights can hit the 1000-row limit and cause missing tiers (falls back to base price).
  const fareFlightIds = useMemo(() => {
    const ids = new Set<string>();

    // Always include anything currently shown/selected
    for (const f of searchedFlights) ids.add(f.id);
    for (const f of returnSearchedFlights) ids.add(f.id);
    if (selectedOutboundFlight?.id) ids.add(selectedOutboundFlight.id);
    if (selectedReturnFlight?.id) ids.add(selectedReturnFlight.id);
    Object.values(selectedMultiCityFlights).forEach(f => {
      if (f?.id) ids.add(f.id);
    });

    // Include flights needed for calendars (route-based), but avoid pulling unrelated routes.
    if (flights) {
      if (tripType === "multicity") {
        for (const leg of multiCityLegs) {
          if (!leg.from || !leg.to) continue;
          const from = leg.from.toLowerCase();
          const to = leg.to.toLowerCase();
          for (const f of flights) {
            if (!f.is_active) continue;
            if (f.departure_city?.toLowerCase().includes(from) && f.arrival_city?.toLowerCase().includes(to)) {
              ids.add(f.id);
            }
          }
        }
      } else if (fromCity && toCity) {
        const from = fromCity.toLowerCase();
        const to = toCity.toLowerCase();
        for (const f of flights) {
          if (!f.is_active) continue;
          // one-way calendar should not show round-trip-only flights
          if (tripType === "oneway" && f.trip_type === "round_trip") continue;

          // Outbound calendar (from → to)
          if (f.departure_city?.toLowerCase().includes(from) && f.arrival_city?.toLowerCase().includes(to)) {
            ids.add(f.id);
            continue;
          }

          // Return calendar (to → from)
          if (
            tripType === "roundtrip" &&
            f.departure_city?.toLowerCase().includes(to) &&
            f.arrival_city?.toLowerCase().includes(from)
          ) {
            ids.add(f.id);
          }
        }
      }
    }

    return Array.from(ids);
  }, [flights, searchedFlights, returnSearchedFlights, selectedOutboundFlight?.id, selectedReturnFlight?.id, fromCity, toCity, tripType, multiCityLegs]);

  const { data: bulkDefaultFares = {} } = useBulkFlightDefaultFares(fareFlightIds);
  const { data: bulkSpecialFares = {} } = useBulkFlightSpecialFares(fareFlightIds);

  // Fetch booked seat counts per flight (confirmed + pending statuses)
  const [flightBookedCounts, setFlightBookedCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (fareFlightIds.length === 0) return;
    const fetchBooked = async () => {
      const counts: Record<string, number> = {};
      const batchSize = 50;
      for (let i = 0; i < fareFlightIds.length; i += batchSize) {
        const batch = fareFlightIds.slice(i, i + batchSize);
        const { data } = await supabase
          .from("bookings")
          .select("flight_id, passengers")
          .in("flight_id", batch)
          .in("status", ["confirmed", "pending_payment", "payment_under_review"] as any[]);
        (data || []).forEach((b: any) => {
          if (b.flight_id) counts[b.flight_id] = (counts[b.flight_id] || 0) + (b.passengers || 0);
        });
      }
      setFlightBookedCounts(counts);
    };
    fetchBooked();
  }, [fareFlightIds]);


  const [sortBy, setSortBy] = useState<SortOption>("price_asc");
  const [airlineFilter, setAirlineFilter] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [stopsFilter, setStopsFilter] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeOfDay[]>([]);
  const [classFilter, setClassFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Compare state
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { }
  }, []);

  const saveRecentSearch = useCallback((search: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => !(s.from === search.from && s.to === search.to && s.date === search.date));
      const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);



  const totalPassengers = adults + children + infants;
  const totalNonInfants = adults + children;

  // Get available seats remaining for a flight
  const getAvailableSeats = useCallback((flight: Flight): number => {
    const booked = flightBookedCounts[flight.id] || 0;
    const total = flight.available_seats ?? flight.total_seats ?? 100;
    return Math.max(0, total - booked);
  }, [flightBookedCounts]);

  // Match fare tier based on available seats remaining (counting DOWN from total)
  // e.g. seat_from=20, seat_to=11 means "when 11-20 seats are still available"
  const matchTier = (availSeats: number, tiers: { seat_from: number; seat_to: number; rate: number; commission?: number }[]) => {
    return tiers.find(t => {
      const lo = Math.min(t.seat_from, t.seat_to);
      const hi = Math.max(t.seat_from, t.seat_to);
      return availSeats >= lo && availSeats <= hi;
    });
  };

  // Get effective adult price for a flight (used on cards)
  // Calculates average price across requested adult seats if they span multiple tiers
  const getEffectiveAdultPrice = useCallback((flight: Flight): number => {
    const totalAvailSeats = getAvailableSeats(flight);
    const defs = bulkDefaultFares[flight.id] || [];
    const specs = bulkSpecialFares[flight.id] || [];
    const flightDate = flight.departure_date?.split('T')[0] || "";

    const getPriceForSeat = (availSeats: number) => {
      // Try special fares first (adult, date-matching)
      const adultSpecs = specs.filter(f => {
        const from = f.from_date?.split('T')[0] || "";
        const to = f.to_date?.split('T')[0] || "";
        return f.person_type.toLowerCase() === 'adult' && flightDate >= from && flightDate <= to;
      });
      const sp = matchTier(availSeats, adultSpecs);
      if (sp) return sp.rate;

      // Then default fares (adult)
      const adultDefs = defs.filter(f => f.person_type.toLowerCase() === 'adult');
      const df = matchTier(availSeats, adultDefs);
      if (df) return df.rate;

      // Fallback: any person type
      const anySpecs = specs.filter(f => {
        const from = f.from_date?.split('T')[0] || "";
        const to = f.to_date?.split('T')[0] || "";
        return flightDate >= from && flightDate <= to;
      });
      const spAny = matchTier(availSeats, anySpecs);
      if (spAny) return spAny.rate;
      const dfAny = matchTier(availSeats, defs);
      if (dfAny) return dfAny.rate;

      return flight.price;
    };

    const count = Math.max(1, adults);
    let totalPrice = 0;
    let currentAvail = totalAvailSeats;
    for (let i = 0; i < count; i++) {
      totalPrice += getPriceForSeat(currentAvail);
      if (currentAvail > 0) currentAvail--;
    }
    return Math.round(totalPrice / count);
  }, [bulkDefaultFares, bulkSpecialFares, getAvailableSeats, adults]);

  // Get next fare tier info: price and how many seats left in current tier before next kicks in
  const getNextTierInfo = useCallback((flight: Flight): { nextPrice: number; seatsLeftInTier: number } | null => {
    const availSeats = getAvailableSeats(flight);
    const defs = bulkDefaultFares[flight.id] || [];
    const specs = bulkSpecialFares[flight.id] || [];
    const flightDate = flight.departure_date?.split('T')[0] || "";

    // Find current tier (adult)
    const allAdultTiers = [
      ...specs.filter(f => {
        const from = f.from_date?.split('T')[0] || "";
        const to = f.to_date?.split('T')[0] || "";
        return f.person_type.toLowerCase() === 'adult' && flightDate >= from && flightDate <= to;
      }),
      ...defs.filter(f => f.person_type.toLowerCase() === 'adult'),
    ];

    // Deduplicate: prefer special fares
    const tierMap = new Map<string, { seat_from: number; seat_to: number; rate: number }>();
    for (const t of allAdultTiers) {
      const key = `${Math.min(t.seat_from, t.seat_to)}-${Math.max(t.seat_from, t.seat_to)}`;
      if (!tierMap.has(key)) {
        tierMap.set(key, { seat_from: t.seat_from, seat_to: t.seat_to, rate: t.rate });
      }
    }
    // Sort tiers by their lower bound descending (higher available seats first)
    const tiers = Array.from(tierMap.values()).sort((a, b) => {
      const aLo = Math.min(a.seat_from, a.seat_to);
      const bLo = Math.min(b.seat_from, b.seat_to);
      return bLo - aLo; // descending: 11-20 comes before 1-10
    });

    if (tiers.length <= 1) return null;

    // Find current tier using available seats
    const currentTierIdx = tiers.findIndex(t => {
      const lo = Math.min(t.seat_from, t.seat_to);
      const hi = Math.max(t.seat_from, t.seat_to);
      return availSeats >= lo && availSeats <= hi;
    });
    if (currentTierIdx === -1 || currentTierIdx >= tiers.length - 1) return null;

    const currentTier = tiers[currentTierIdx];
    const nextTier = tiers[currentTierIdx + 1]; // next tier has fewer available seats
    const currentLo = Math.min(currentTier.seat_from, currentTier.seat_to);
    const seatsLeftInTier = availSeats - currentLo + 1; // seats until we drop to next tier (inclusive)

    return { nextPrice: nextTier.rate, seatsLeftInTier };
  }, [bulkDefaultFares, bulkSpecialFares, getAvailableSeats]);

  // Build fare breakdown for selection summary
  const selectionFareLines = useMemo(() => {
    if (!selectedOutboundFlight) return [];

    const getFlightAvailSeats = (flight: Flight) => {
      const booked = flightBookedCounts[flight.id] || 0;
      const total = flight.available_seats ?? flight.total_seats ?? 100;
      return Math.max(0, total - booked);
    };

    const matchFareTier = (availSeats: number, tiers: { seat_from: number; seat_to: number; rate: number; commission: number }[]) => {
      return tiers.find(t => {
        const lo = Math.min(t.seat_from, t.seat_to);
        const hi = Math.max(t.seat_from, t.seat_to);
        return availSeats >= lo && availSeats <= hi;
      });
    };

    const getEffective = (basePx: number, flight: Flight, date: string, defs: FlightDefaultFare[], specs: FlightSpecialFare[], pt: string, currentAvailSeats: number) => {
      const flightDate = date?.split('T')[0] || "";
      if (pt) {
        const ptSpecs = specs.filter(f => {
          const from = f.from_date?.split('T')[0] || "";
          const to = f.to_date?.split('T')[0] || "";
          return f.person_type.toLowerCase() === pt.toLowerCase() && flightDate >= from && flightDate <= to;
        });
        const sp = matchFareTier(currentAvailSeats, ptSpecs);
        if (sp) return { rate: sp.rate, commission: sp.commission };
        const ptDefs = defs.filter(f => f.person_type.toLowerCase() === pt.toLowerCase());
        const df = matchFareTier(currentAvailSeats, ptDefs);
        if (df) return { rate: df.rate, commission: df.commission };
      }
      const anySpecs = specs.filter(f => {
        const from = f.from_date?.split('T')[0] || "";
        const to = f.to_date?.split('T')[0] || "";
        return flightDate >= from && flightDate <= to;
      });
      const sp = matchFareTier(currentAvailSeats, anySpecs);
      if (sp) return { rate: sp.rate, commission: sp.commission };
      const df = matchFareTier(currentAvailSeats, defs);
      if (df) return { rate: df.rate, commission: df.commission };
      return { rate: basePx, commission: 0 };
    };

    const passengerMap: { type: string; count: number }[] = [
      { type: "Adult", count: adults },
      { type: "Child", count: children },
      { type: "Infant", count: infants },
    ].filter(p => p.count > 0);

    const lines: any[] = [];
    let currentOutboundAvail = getFlightAvailSeats(selectedOutboundFlight);
    let currentReturnAvail = selectedReturnFlight ? getFlightAvailSeats(selectedReturnFlight) : 0;

    passengerMap.forEach(p => {
      const typeGroups = new Map<string, { rate: number, commission: number, count: number }>();

      for (let i = 0; i < p.count; i++) {
        const outF = getEffective(selectedOutboundFlight.price, selectedOutboundFlight, selectedOutboundFlight.departure_date, outDefaultFares, outSpecialFares, p.type, currentOutboundAvail);
        const retF = selectedReturnFlight ? getEffective(selectedReturnFlight.price, selectedReturnFlight, selectedReturnFlight.departure_date, retDefaultFares, retSpecialFares, p.type, currentReturnAvail) : { rate: 0, commission: 0 };

        const isExplicitPair = (selectedOutboundFlight.trip_type === "round_trip" || selectedOutboundFlight.linked_flight_id) && selectedReturnFlight;
        const rate = isExplicitPair ? outF.rate : outF.rate + retF.rate;
        const commission = isExplicitPair ? outF.commission : outF.commission + retF.commission;

        const key = `${rate}-${commission}`;
        if (!typeGroups.has(key)) {
          typeGroups.set(key, { rate, commission, count: 1 });
        } else {
          typeGroups.get(key)!.count += 1;
        }

        if (p.type !== "Infant") {
          if (currentOutboundAvail > 0) currentOutboundAvail--;
          if (currentReturnAvail > 0) currentReturnAvail--;
        }
      }

      typeGroups.forEach(group => {
        lines.push({
          personType: p.type,
          rate: group.rate,
          commission: group.commission,
          count: group.count
        });
      });
    });

    return lines;
  }, [selectedOutboundFlight, selectedReturnFlight, outDefaultFares, outSpecialFares, retDefaultFares, retSpecialFares, adults, children, infants, flightBookedCounts]);

  const selectionTotal = selectionFareLines.reduce((s, fl) => s + fl.rate * fl.count, 0);
  const selectionCommission = selectionFareLines.reduce((s, fl) => s + fl.commission * fl.count, 0);
  const selectionNet = selectionTotal - selectionCommission;

  const multiCityFareLines = useMemo(() => {
    const selectedFlights = Object.values(selectedMultiCityFlights);
    if (selectedFlights.length === 0) return [];

    const getFlightAvailSeats = (flight: Flight) => {
      const booked = flightBookedCounts[flight.id] || 0;
      const total = flight.available_seats ?? flight.total_seats ?? 100;
      return Math.max(0, total - booked);
    };

    const matchFareTier = (availSeats: number, tiers: { seat_from: number; seat_to: number; rate: number; commission: number }[]) => {
      return tiers.find(t => {
        const lo = Math.min(t.seat_from, t.seat_to);
        const hi = Math.max(t.seat_from, t.seat_to);
        return availSeats >= lo && availSeats <= hi;
      });
    };

    const getEffective = (basePx: number, flight: Flight, date: string, pt: string) => {
      const flightDate = date?.split('T')[0] || "";
      const availSeats = getFlightAvailSeats(flight);
      const defs = bulkDefaultFares[flight.id] || [];
      const specs = bulkSpecialFares[flight.id] || [];

      // Try special fares first
      const ptSpecs = specs.filter(f => {
        const from = f.from_date?.split('T')[0] || "";
        const to = f.to_date?.split('T')[0] || "";
        return f.person_type.toLowerCase() === pt.toLowerCase() && flightDate >= from && flightDate <= to;
      });
      const sp = matchFareTier(availSeats, ptSpecs);
      if (sp) return { rate: sp.rate, commission: sp.commission };

      // Try default fares
      const ptDefs = defs.filter(f => f.person_type.toLowerCase() === pt.toLowerCase());
      const df = matchFareTier(availSeats, ptDefs);
      if (df) return { rate: df.rate, commission: df.commission };

      return { rate: basePx, commission: 0 };
    };

    const passengerMap = [
      { type: "Adult", count: adults },
      { type: "Child", count: children },
      { type: "Infant", count: infants },
    ].filter(p => p.count > 0);

    return passengerMap.map(p => {
      let totalRate = 0;
      let totalCommission = 0;
      for (const flight of selectedFlights) {
        const fare = getEffective(flight.price, flight, flight.departure_date, p.type);
        totalRate += fare.rate;
        totalCommission += fare.commission;
      }
      return {
        personType: p.type,
        rate: totalRate,
        commission: totalCommission,
        count: p.count
      };
    });
  }, [selectedMultiCityFlights, bulkDefaultFares, bulkSpecialFares, adults, children, infants, flightBookedCounts]);

  const multiCityTotal = multiCityFareLines.reduce((s, fl) => s + fl.rate * fl.count, 0);
  const multiCityCommission = multiCityFareLines.reduce((s, fl) => s + fl.commission * fl.count, 0);
  const multiCityNet = multiCityTotal - multiCityCommission;

  const isAllMultiCityLegsSelected = useMemo(() => {
    return multiCityLegs.every((_, idx) => !!selectedMultiCityFlights[idx]);
  }, [multiCityLegs, selectedMultiCityFlights]);

  const calcDuration = (depTime: string | null, arrTime: string | null): string | null => {
    if (!depTime || !arrTime) return null;
    const [dh, dm] = depTime.split(":").map(Number);
    const [ah, am] = arrTime.split(":").map(Number);
    if (isNaN(dh) || isNaN(dm) || isNaN(ah) || isNaN(am)) return null;
    let diffMin = (ah * 60 + am) - (dh * 60 + dm);
    if (diffMin <= 0) diffMin += 24 * 60;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Helper: get duration in minutes for sorting
  const calcDurationMinutes = (depTime: string | null, arrTime: string | null): number => {
    if (!depTime || !arrTime) return 9999;
    const [dh, dm] = depTime.split(":").map(Number);
    const [ah, am] = arrTime.split(":").map(Number);
    if (isNaN(dh) || isNaN(dm) || isNaN(ah) || isNaN(am)) return 9999;
    let diffMin = (ah * 60 + am) - (dh * 60 + dm);
    if (diffMin <= 0) diffMin += 24 * 60;
    return diffMin;
  };

  // Helper: get time of day from departure_time
  const getTimeOfDay = (time: string | null): TimeOfDay | null => {
    if (!time) return null;
    const hour = parseInt(time.split(":")[0], 10);
    if (isNaN(hour)) return null;
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
  };

  // Helper: baggage allowance based on class
  const getBaggage = (flightClass: string | null, baggageOverride?: string | null): string => {
    if (baggageOverride && baggageOverride.trim() !== "") {
      return baggageOverride;
    }
    switch (flightClass?.toLowerCase()) {
      case "business": return "32kg";
      case "first": return "40kg";
      default: return "23kg";
    }
  };

  // Get unique airlines from search results
  const resultAirlines = useMemo(() => {
    return [...new Set(searchedFlights.map(f => f.airline))].sort();
  }, [searchedFlights]);

  // Get unique classes from search results
  const resultClasses = useMemo(() => {
    return [...new Set(searchedFlights.map(f => f.class || "economy").filter(Boolean))].sort();
  }, [searchedFlights]);

  // Get price range from search results
  // Helper: get cheapest return price for an outbound flight (for round-trip combined pricing)
  const getCheapestReturnPrice = useCallback((outbound: Flight): number => {
    if (tripType !== "roundtrip" || returnSearchedFlights.length === 0) return 0;
    // For package deals (linked pairs), the outbound flight's price already covers the whole round trip.
    if (outbound.trip_type === "round_trip" || outbound.linked_flight_id) {
      return 0;
    }
    // Same airline preferred for custom combos
    const sameAirline = returnSearchedFlights.filter(f => f.airline === outbound.airline);
    if (sameAirline.length > 0) return Math.min(...sameAirline.map(f => getEffectiveAdultPrice(f)));
    if (returnSearchedFlights.length === 0) return 0;
    return Math.min(...returnSearchedFlights.map(f => getEffectiveAdultPrice(f)));
  }, [tripType, returnSearchedFlights, getEffectiveAdultPrice]);

  // Get display price: combined for round-trip, single for one-way
  const getDisplayPrice = useCallback((flight: Flight): number => {
    const outPrice = getEffectiveAdultPrice(flight);
    if (tripType === "roundtrip") return outPrice + getCheapestReturnPrice(flight);
    return outPrice;
  }, [getEffectiveAdultPrice, getCheapestReturnPrice, tripType]);

  const resultPriceRange = useMemo(() => {
    if (searchedFlights.length === 0) return [0, 10000] as [number, number];
    const prices = searchedFlights.map(f => getDisplayPrice(f)).filter(p => !isNaN(p));
    if (prices.length === 0) return [0, 10000] as [number, number];
    return [Math.min(...prices), Math.max(...prices)] as [number, number];
  }, [searchedFlights, getDisplayPrice]);

  // Reset filters when new search results come in
  useEffect(() => {
    if (searchedFlights.length > 0) {
      const prices = searchedFlights.map(f => getDisplayPrice(f)).filter(p => !isNaN(p));
      if (prices.length > 0) {
        setPriceRange([Math.min(...prices), Math.max(...prices)]);
      }
      setAirlineFilter([]);
      setStopsFilter([]);
      setTimeFilter([]);
      setClassFilter([]);
      setSortBy("price_asc");
      setCompareIds([]);
    }
  }, [searchedFlights, getDisplayPrice]);

  // Find the cheapest price in results
  const cheapestPrice = useMemo(() => {
    if (searchedFlights.length === 0) return 0;
    return Math.min(...searchedFlights.map(f => getDisplayPrice(f)));
  }, [searchedFlights, getDisplayPrice]);

  // Cheapest price by airline
  const cheapestByAirline = useMemo(() => {
    if (searchedFlights.length === 0) return [];
    const map = new Map<string, { airline: string; logo: string | null; price: number }>();
    for (const f of searchedFlights) {
      const effectivePrice = getDisplayPrice(f);
      const existing = map.get(f.airline);
      if (!existing || effectivePrice < existing.price) {
        map.set(f.airline, { airline: f.airline, logo: f.airline_logo, price: effectivePrice });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.price - b.price);
  }, [searchedFlights, getDisplayPrice]);

  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    let results = [...searchedFlights];

    // Apply airline filter
    if (airlineFilter.length > 0) {
      results = results.filter(f => airlineFilter.includes(f.airline));
    }

    // Apply price range filter
    results = results.filter(f => { const ep = getDisplayPrice(f); return ep >= priceRange[0] && ep <= priceRange[1]; });

    // Apply stops filter
    if (stopsFilter.length > 0) {
      results = results.filter(f => {
        const isDirect = !f.linked_flight_id;
        if (stopsFilter.includes("direct") && isDirect) return true;
        if (stopsFilter.includes("1stop") && !isDirect) return true;
        return false;
      });
    }



    // Apply class filter
    if (classFilter.length > 0) {
      results = results.filter(f => classFilter.includes(f.class || "economy"));
    }

    // Primary sort: order_number (ascending, nullish/empty last)
    const getOrderNum = (f: Flight) => {
      const n = parseInt(f.order_number || "", 10);
      return isNaN(n) ? Infinity : n;
    };

    // For round-trip: check if a flight has a linked return flight available
    const hasLinkedReturn = (f: Flight): boolean => {
      if (!flights) return false;
      if (f.linked_flight_id) return true;
      return !!flights.find(r => r.linked_flight_id === f.id);
    };

    // Apply sort with order_number as primary
    results.sort((a, b) => {
      // For round-trip mode: flights with linked return come first
      if (tripType === "roundtrip") {
        const aHasReturn = hasLinkedReturn(a) ? 0 : 1;
        const bHasReturn = hasLinkedReturn(b) ? 0 : 1;
        if (aHasReturn !== bHasReturn) return aHasReturn - bHasReturn;
      }

      const orderA = getOrderNum(a);
      const orderB = getOrderNum(b);
      if (orderA !== orderB) return orderA - orderB;

      // Secondary sort
      switch (sortBy) {
        case "price_asc":
          return getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b);
        case "price_desc":
          return getEffectiveAdultPrice(b) - getEffectiveAdultPrice(a);
        case "time":
          return (a.departure_time || "").localeCompare(b.departure_time || "");
        case "seats":
          return (b.available_seats || 0) - (a.available_seats || 0);
        case "duration":
          return calcDurationMinutes(a.departure_time, a.arrival_time) - calcDurationMinutes(b.departure_time, b.arrival_time);
        default:
          return 0;
      }
    });

    return results;
  }, [searchedFlights, airlineFilter, priceRange, stopsFilter, timeFilter, classFilter, sortBy, getEffectiveAdultPrice, tripType, flights]);

  const customOutboundFlights = useMemo(() => {
    // 1. If we have a selected return package flight, show only its linked outbound flight!
    if (selectedReturnFlight && isPackageFlight(selectedReturnFlight)) {
      let linkedOutbound: Flight | null = filteredResults.find(f => f.id === selectedReturnFlight.linked_flight_id) || null;
      if (!linkedOutbound) linkedOutbound = filteredResults.find(f => f.linked_flight_id === selectedReturnFlight.id) || null;
      // Fallback: search all flights in case the outbound isn't in filteredResults
      if (!linkedOutbound && selectedReturnFlight.linked_flight_id) {
        linkedOutbound = flights.find(f => f.id === selectedReturnFlight.linked_flight_id && f.is_active) || null;
      }
      return linkedOutbound ? [linkedOutbound] : [];
    }

    // 2. If we have a selected return flight but it is NOT a package flight:
    // The outbound flight cannot be a package flight.
    // So we show only non-package outbound flights!
    if (selectedReturnFlight) {
      const filtered = filteredResults.filter(f => !isPackageFlight(f));
      if (selectedOutboundFlight) {
        return filtered.filter(f => f.id === selectedOutboundFlight.id);
      }
      return filtered;
    }

    // 3. If no return flight is selected yet:
    // If an outbound flight is selected, just show it.
    if (selectedOutboundFlight) {
      return filteredResults.filter(f => f.id === selectedOutboundFlight.id);
    }

    if (tripType === "oneway") {
      return filteredResults.filter(f => !packageFlightIds.has(f.id));
    }

    // Show all outbound flights (package and non-package)
    return filteredResults;
  }, [filteredResults, selectedOutboundFlight, selectedReturnFlight, isPackageFlight, tripType, packageFlightIds]);

  const customReturnFlights = useMemo(() => {
    // 1. If we have a selected outbound package flight, show only its linked return flight!
    // IMPORTANT: For package flights, the return has a fixed date that may differ from the user's
    // selected return date. So we search ALL flights, not just returnSearchedFlights.
    if (selectedOutboundFlight && isPackageFlight(selectedOutboundFlight)) {
      let linkedReturn: Flight | null = returnSearchedFlights.find(f => f.id === selectedOutboundFlight.linked_flight_id) || null;
      if (!linkedReturn) linkedReturn = returnSearchedFlights.find(f => f.linked_flight_id === selectedOutboundFlight.id) || null;
      // Fallback: search all flights for the package return (fixed dates)
      if (!linkedReturn && selectedOutboundFlight.linked_flight_id) {
        linkedReturn = flights.find(f => f.id === selectedOutboundFlight.linked_flight_id && f.is_active) || null;
      }
      if (!linkedReturn) {
        linkedReturn = flights.find(f => f.linked_flight_id === selectedOutboundFlight.id && f.is_active) || null;
      }
      return linkedReturn ? [linkedReturn] : [];
    }

    // 2. If we have a selected outbound flight but it is NOT a package flight:
    // The return flight cannot be a package flight (since it can't be mixed with a package).
    // So we show only non-package return flights!
    if (selectedOutboundFlight) {
      const filtered = returnSearchedFlights.filter(f => !isPackageFlight(f));
      if (selectedReturnFlight) {
        return filtered.filter(f => f.id === selectedReturnFlight.id);
      }
      return filtered;
    }

    // 3. If no outbound flight is selected yet:
    // If a return flight is selected, just show it.
    if (selectedReturnFlight) {
      return returnSearchedFlights.filter(f => f.id === selectedReturnFlight.id);
    }

    // Show all return flights (package and non-package)
    return returnSearchedFlights;
  }, [returnSearchedFlights, selectedReturnFlight, selectedOutboundFlight, isPackageFlight, flights]);

  const scrollToSection = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
  };

  const handleSelectCustomOutbound = useCallback((flight: Flight) => {
    if (selectedOutboundFlight?.id === flight.id) {
      setSelectedOutboundFlight(null);
      if (isPackageFlight(flight)) {
        setSelectedReturnFlight(null);
      }
      return;
    }

    setSelectedOutboundFlight(flight);

    let nextSection = "custom-return-flights-section";
    if (isPackageFlight(flight)) {
      let linkedReturn: Flight | undefined = returnSearchedFlights.find(f => f.id === flight.linked_flight_id);
      if (!linkedReturn) linkedReturn = returnSearchedFlights.find(f => f.linked_flight_id === flight.id);
      // Fallback: search all flights (package has fixed return date that may differ from user's choice)
      if (!linkedReturn && flight.linked_flight_id) {
        linkedReturn = flights.find(f => f.id === flight.linked_flight_id && f.is_active);
      }
      if (!linkedReturn) {
        linkedReturn = flights.find(f => f.linked_flight_id === flight.id && f.is_active);
      }
      if (linkedReturn) {
        setSelectedReturnFlight(linkedReturn);
        nextSection = "custom-selection-summary-section";
      }
    } else if (selectedReturnFlight) {
      nextSection = "custom-selection-summary-section";
    }

    scrollToSection(nextSection);
  }, [returnSearchedFlights, selectedOutboundFlight, selectedReturnFlight, isPackageFlight, flights]);

  const handleSelectCustomReturn = useCallback((flight: Flight) => {
    if (selectedReturnFlight?.id === flight.id) {
      setSelectedReturnFlight(null);
      if (isPackageFlight(flight)) {
        setSelectedOutboundFlight(null);
      }
      return;
    }

    setSelectedReturnFlight(flight);

    let nextSection = "custom-selection-summary-section";
    if (isPackageFlight(flight)) {
      let linkedOutbound: Flight | undefined = filteredResults.find(f => f.id === flight.linked_flight_id);
      if (!linkedOutbound) linkedOutbound = filteredResults.find(f => f.linked_flight_id === flight.id);
      // Fallback: search all flights (package outbound may not be in filteredResults)
      if (!linkedOutbound && flight.linked_flight_id) {
        linkedOutbound = flights.find(f => f.id === flight.linked_flight_id && f.is_active);
      }
      if (linkedOutbound) {
        setSelectedOutboundFlight(linkedOutbound);
      }
    } else if (!selectedOutboundFlight) {
      nextSection = "custom-outbound-flights-section";
    }

    scrollToSection(nextSection);
  }, [filteredResults, selectedOutboundFlight, selectedReturnFlight, isPackageFlight, flights]);

  // Round-trip paired cards: outbound + best matching return
  // Generate multiple pairs for different airline combinations
  const roundTripPairs = useMemo(() => {
    if (tripType !== "roundtrip") return [];

    const pairs: { outbound: Flight; return: Flight | null; combinedPrice: number; priority: number }[] = [];

    for (const outbound of filteredResults) {
      const isExplicitOutbound = isPackageFlight(outbound);

      // Priority 1: Linked flight (explicit round-trip pair)
      // For package flights, search ALL flights (not just returnSearchedFlights) to find the fixed return leg
      let linkedReturn: Flight | null = null;
      if (outbound.linked_flight_id) {
        linkedReturn = returnSearchedFlights.find(f => f.id === outbound.linked_flight_id) || null;
        // Fallback to all flights if not in returnSearchedFlights (package has fixed dates)
        if (!linkedReturn && isExplicitOutbound) {
          linkedReturn = flights.find(f => f.id === outbound.linked_flight_id && f.is_active) || null;
        }
      }
      if (!linkedReturn) {
        linkedReturn = returnSearchedFlights.find(f => f.linked_flight_id === outbound.id) || null;
        // Fallback to all flights if not in returnSearchedFlights (package has fixed dates)
        if (!linkedReturn && isExplicitOutbound) {
          linkedReturn = flights.find(f => f.linked_flight_id === outbound.id && f.is_active) || null;
        }
      }

      if (linkedReturn) {
        const outPrice = getEffectiveAdultPrice(outbound);
        pairs.push({ outbound, return: linkedReturn, combinedPrice: outPrice, priority: 0 });
      }

      // If outbound is a dedicated round-trip flight from back office, NEVER mix it with any other return flights!
      if (isExplicitOutbound) {
        if (!linkedReturn) {
          const outPrice = getEffectiveAdultPrice(outbound);
          pairs.push({ outbound, return: null, combinedPrice: outPrice, priority: 3 });
        }
        continue;
      }

      // For standard one-way outbound flights:
      // Track which returns we've used for this outbound
      const usedReturnIds = new Set<string>();
      if (linkedReturn) usedReturnIds.add(linkedReturn.id);

      // Only mix with return flights that are also pure one-way flights (NEVER mix with back office round trip flights!)
      const availableOneWayReturns = returnSearchedFlights.filter(f => f.trip_type !== "round_trip" && !f.linked_flight_id && !usedReturnIds.has(f.id));

      // Priority 2: Same airline (cheapest)
      const sameAirlineReturns = availableOneWayReturns
        .filter(f => f.airline === outbound.airline)
        .sort((a, b) => getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b));

      if (sameAirlineReturns.length > 0) {
        const best = sameAirlineReturns[0];
        usedReturnIds.add(best.id);
        const outPrice = getEffectiveAdultPrice(outbound);
        const retPrice = getEffectiveAdultPrice(best);
        pairs.push({ outbound, return: best, combinedPrice: outPrice + retPrice, priority: 1 });
      }

      // Priority 3: Different airline (cheapest)
      const diffAirlineReturns = availableOneWayReturns
        .filter(f => f.airline !== outbound.airline && !usedReturnIds.has(f.id))
        .sort((a, b) => getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b));

      if (diffAirlineReturns.length > 0) {
        const best = diffAirlineReturns[0];
        usedReturnIds.add(best.id);
        const outPrice = getEffectiveAdultPrice(outbound);
        const retPrice = getEffectiveAdultPrice(best);
        pairs.push({ outbound, return: best, combinedPrice: outPrice + retPrice, priority: 2 });
      }

      // If no return flights at all, still show outbound
      if (pairs.filter(p => p.outbound.id === outbound.id).length === 0) {
        const outPrice = getEffectiveAdultPrice(outbound);
        pairs.push({ outbound, return: null, combinedPrice: outPrice, priority: 3 });
      }
    }

    // Sort: linked first, then same-airline, then cross-airline, then by price
    pairs.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.combinedPrice - b.combinedPrice;
    });

    return pairs;
  }, [filteredResults, returnSearchedFlights, getEffectiveAdultPrice, tripType, flights, isPackageFlight]);

  // Compare flights data
  const compareFlightsData = useMemo(() => {
    return compareIds.map(id => searchedFlights.find(f => f.id === id)).filter(Boolean) as Flight[];
  }, [compareIds, searchedFlights]);

  // Get unique departure cities (origins only)
  const departureCities = useMemo(() => {
    if (!flights) return [];
    return [...new Set(flights.filter(f => f.is_active).map(f => f.departure_city))].sort();
  }, [flights]);

  // Get destination cities reachable from the selected fromCity
  // For round-trip, only show destinations that also have return flights back
  const destinationCities = useMemo(() => {
    if (!flights || !fromCity) return [];
    const from = fromCity.toLowerCase();
    const outboundDestinations = [...new Set(
      flights
        .filter(f => f.is_active && f.departure_city.toLowerCase() === from)
        .map(f => f.arrival_city)
    )];
    if (tripType === "roundtrip") {
      // Only keep destinations that have at least one return flight back to fromCity
      return outboundDestinations.filter(dest =>
        flights.some(f => f.is_active && f.departure_city.toLowerCase() === dest.toLowerCase() && f.arrival_city.toLowerCase() === from)
      ).sort();
    }
    return outboundDestinations.sort();
  }, [flights, fromCity, tripType]);

  // Reset toCity if it's no longer a valid destination when fromCity changes
  useEffect(() => {
    if (fromCity && toCity && destinationCities.length > 0 && !destinationCities.some(c => c.toLowerCase() === toCity.toLowerCase())) {
      setToCity("");
    }
  }, [fromCity, destinationCities]);

  // Keep round-trip dates valid: return must not be before departure (same-day return is allowed)
  useEffect(() => {
    if (tripType !== "roundtrip" || !departureDate || !returnDate) return;
    if (returnDate < departureDate) {
      setReturnDate(undefined as any);
      setSelectedReturnFlight(null);
    }
  }, [tripType, departureDate, returnDate]);

  // Helper: get flights operating on a given date for a route
  const getFlightsForDate = (relevantFlights: Flight[], date: Date) => {
    const dayOfWeek = getDay(date);
    return relevantFlights.filter(flight => {
      if (flight.schedule_type === 'recurring' && flight.recurring_days) {
        try {
          const validFrom = flight.valid_from ? parseISO(flight.valid_from) : null;
          const validUntil = flight.valid_until ? parseISO(flight.valid_until) : null;
          const isInValidPeriod = (!validFrom || date >= validFrom) && (!validUntil || date <= validUntil);
          return isInValidPeriod && flight.recurring_days.includes(dayOfWeek);
        } catch (e) {
          return false;
        }
      } else {
        if (!flight.departure_date) return false;
        try {
          const parsedDate = parseISO(flight.departure_date);
          if (isNaN(parsedDate.getTime())) return false;
          return isSameDay(parsedDate, date);
        } catch (e) {
          return false;
        }
      }
    });
  };



  const getLegAvailability = (from: string, to: string) => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];
    const prices: Record<string, number> = {};
    if (!flights || !from || !to) return { available, limited, soldOut, prices };

    const relevant = flights.filter(f =>
      f.is_active &&
      f.departure_city.toLowerCase().includes(from.toLowerCase()) &&
      f.arrival_city.toLowerCase().includes(to.toLowerCase())
    );

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = addDays(today, i);
      const matching = getFlightsForDate(relevant, date);
      if (matching.length > 0) {
        const total = matching.reduce((sum, f) => sum + getAvailableSeats(f), 0);
        if (total === 0) soldOut.push(date);
        else if (total < 10) limited.push(date);
        else available.push(date);

        const cheapest = Math.min(...matching.map(f => getEffectiveAdultPrice(f)));
        prices[format(date, "yyyy-MM-dd")] = cheapest;
      }
    }
    return { available, limited, soldOut, prices };
  };

  // Compute price maps for departure calendar
  const departurePrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (!flights) return prices;

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      const from = fromCity ? fromCity.toLowerCase().trim() : "";
      const to = toCity ? toCity.toLowerCase().trim() : "";
      if (from && !f.departure_city.toLowerCase().includes(from) && (!f.departure_airport_code || !f.departure_airport_code.toLowerCase().includes(from))) return false;
      if (to && !f.arrival_city.toLowerCase().includes(to) && (!f.arrival_airport_code || !f.arrival_airport_code.toLowerCase().includes(to))) return false;
      // For one-way only, filter out round-trip-only and package flights; for round-trip, show all
      if (tripType === "oneway" && packageFlightIds.has(f.id)) return false;
      return true;
    });

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = addDays(today, i);
      const matchingFlights = getFlightsForDate(relevantFlights, date);
      if (matchingFlights.length > 0) {
        const cheapest = Math.min(...matchingFlights.map(f => getEffectiveAdultPrice(f)));
        prices[format(date, "yyyy-MM-dd")] = cheapest;
      }
    }
    return prices;
  }, [flights, fromCity, toCity, tripType, getEffectiveAdultPrice]);

  // Compute price maps for return calendar
  const returnPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (!flights || tripType !== "roundtrip") return prices;

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      const from = fromCity ? fromCity.toLowerCase().trim() : "";
      const to = toCity ? toCity.toLowerCase().trim() : "";
      if (to && !f.departure_city.toLowerCase().includes(to) && (!f.departure_airport_code || !f.departure_airport_code.toLowerCase().includes(to))) return false;
      if (from && !f.arrival_city.toLowerCase().includes(from) && (!f.arrival_airport_code || !f.arrival_airport_code.toLowerCase().includes(from))) return false;
      return true;
    });

    const startDate = departureDate ? addDays(departureDate, 1) : new Date();
    for (let i = 0; i < 365; i++) {
      const date = addDays(startDate, i);
      const matchingFlights = getFlightsForDate(relevantFlights, date);
      if (matchingFlights.length > 0) {
        const cheapest = Math.min(...matchingFlights.map(f => getEffectiveAdultPrice(f)));
        prices[format(date, "yyyy-MM-dd")] = cheapest;
      }
    }
    return prices;
  }, [flights, fromCity, toCity, tripType, departureDate, getEffectiveAdultPrice]);

  // Get the cheapest departure price for the selected departure date
  const selectedDeparturePrice = useMemo(() => {
    if (!departureDate) return 0;
    const dateKey = format(departureDate, "yyyy-MM-dd");
    return departurePrices[dateKey] || 0;
  }, [departureDate, departurePrices]);

  // Block seat auto-selection removed per user request

  // Calculate available, limited, and sold out dates for departures
  const departureAvailability = useMemo(() => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];

    if (!flights) return { available, limited, soldOut };

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      const from = fromCity ? fromCity.toLowerCase().trim() : "";
      const to = toCity ? toCity.toLowerCase().trim() : "";
      if (from && !f.departure_city.toLowerCase().includes(from) && (!f.departure_airport_code || !f.departure_airport_code.toLowerCase().includes(from))) return false;
      if (to && !f.arrival_city.toLowerCase().includes(to) && (!f.arrival_airport_code || !f.arrival_airport_code.toLowerCase().includes(to))) return false;
      if (tripType === "oneway" && packageFlightIds.has(f.id)) return false;
      return true;
    });

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = addDays(today, i);
      const matchingFlights = getFlightsForDate(relevantFlights, date);

      if (matchingFlights.length > 0) {
        const totalSeats = matchingFlights.reduce((sum, f) => sum + (f.available_seats || 0), 0);
        if (totalSeats === 0) {
          soldOut.push(date);
        } else if (totalSeats < 10) {
          limited.push(date);
        } else {
          available.push(date);
        }
      }
    }

    return { available, limited, soldOut };
  }, [flights, fromCity, toCity, tripType]);

  // Calculate available, limited, and sold out dates for returns
  const returnAvailability = useMemo(() => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];

    if (!flights || tripType !== "roundtrip") return { available, limited, soldOut };

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      const from = fromCity ? fromCity.toLowerCase().trim() : "";
      const to = toCity ? toCity.toLowerCase().trim() : "";
      if (to && !f.departure_city.toLowerCase().includes(to) && (!f.departure_airport_code || !f.departure_airport_code.toLowerCase().includes(to))) return false;
      if (from && !f.arrival_city.toLowerCase().includes(from) && (!f.arrival_airport_code || !f.arrival_airport_code.toLowerCase().includes(from))) return false;
      return true;
    });

    const startDate = departureDate ? addDays(departureDate, 1) : new Date();
    for (let i = 0; i < 365; i++) {
      const date = addDays(startDate, i);
      const matchingFlights = getFlightsForDate(relevantFlights, date);

      if (matchingFlights.length > 0) {
        const totalSeats = matchingFlights.reduce((sum, f) => sum + (f.available_seats || 0), 0);
        if (totalSeats === 0) {
          soldOut.push(date);
        } else if (totalSeats < 10) {
          limited.push(date);
        } else {
          available.push(date);
        }
      }
    }

    return { available, limited, soldOut };
  }, [flights, fromCity, toCity, tripType, departureDate]);

  const handleSwapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  // Multi-city leg helpers
  const addLeg = () => {
    if (multiCityLegs.length < 5) {
      const lastLeg = multiCityLegs[multiCityLegs.length - 1];
      setMultiCityLegs([
        ...multiCityLegs,
        { id: `leg-${Date.now()}-${Math.random()}`, from: lastLeg.to, to: "", date: undefined }
      ]);
    }
  };

  const removeLeg = (index: number) => {
    if (multiCityLegs.length > 2) {
      setMultiCityLegs(multiCityLegs.filter((_, i) => i !== index));
    }
  };

  const updateLeg = (index: number, field: keyof MultiCityLeg, value: any) => {
    const updated = [...multiCityLegs];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "to" && index < updated.length - 1) {
      updated[index + 1] = { ...updated[index + 1], from: value };
    }
    setMultiCityLegs(updated);

    // Keep global state in sync for leg 0
    if (index === 0) {
      if (field === "from") setFromCity(value);
      if (field === "to") setToCity(value);
      if (field === "date") setDepartureDate(value);
    }
  };

  // Copy flight details to clipboard
  const copyFlightDetails = (flight: Flight) => {
    const returnFl = tripType === "roundtrip" ? getLinkedReturnFlight(flight) : null;
    let details = `✈️ Flight Details\n`;
    details += `${flight.departure_city} → ${flight.arrival_city}\n`;
    details += `Flight: ${flight.flight_number || "N/A"}\n`;
    details += `Date: ${flight.departure_date}\n`;
    details += `Time: ${formatTime(flight.departure_time)} - ${formatTime(flight.arrival_time)}\n`;
    details += `Class: ${flight.class || "Economy"}\n`;
    details += `Price: $${getEffectiveAdultPrice(flight)}/person\n`;
    if (returnFl) {
      details += `\n↩️ Return: ${returnFl.departure_city} → ${returnFl.arrival_city}\n`;
      details += `Flight: ${returnFl.flight_number || "N/A"}\n`;
      details += `Date: ${returnFl.departure_date}\n`;
      details += `Price: ${getEffectiveAdultPrice(returnFl) === 0 ? "Included" : `$${getEffectiveAdultPrice(returnFl)}/person`}\n`;
    }
    navigator.clipboard.writeText(details);
    toast.success("Flight details copied to clipboard!");
  };

  // Toggle compare
  const toggleCompare = (flightId: string) => {
    setCompareIds(prev => {
      if (prev.includes(flightId)) return prev.filter(id => id !== flightId);
      if (prev.length >= 3) {
        toast.error("You can compare up to 3 flights");
        return prev;
      }
      return [...prev, flightId];
    });
  };

  const handleFlightSearch = async () => {
    if (!flights) return;

    if (tripType === "multicity") {
      for (let i = 0; i < multiCityLegs.length; i++) {
        if (!multiCityLegs[i].from || !multiCityLegs[i].to) {
          toast.error(`Please complete leg ${i + 1} cities`);
          return;
        }
        if (!multiCityLegs[i].date) {
          toast.error(`Please select date for leg ${i + 1}`);
          return;
        }
      }

      setIsSearching(true);
      setShowResults(false);
      await new Promise(resolve => setTimeout(resolve, 1000));

      let allResults: Flight[] = [];
      for (let index = 0; index < multiCityLegs.length; index++) {
        const leg = multiCityLegs[index];
        const legResults = flights.filter(f => {
          if (!f.is_active) return false;
          if (!f.departure_city.toLowerCase().includes(leg.from.toLowerCase())) return false;
          if (!f.arrival_city.toLowerCase().includes(leg.to.toLowerCase())) return false;
          if (leg.date) {
            const matchingFlights = getFlightsForDate([f], leg.date);
            if (matchingFlights.length === 0) return false;
          }
          const avail = getAvailableSeats(f);
          return avail >= totalNonInfants;
        }).map(f => ({ ...f, _legIndex: index } as any));
        allResults = [...allResults, ...legResults];
      }

      setSearchedFlights(allResults);
      setIsSearching(false);
      setShowResults(true);
      return;
    }

    if (!fromCity) {
      toast.error("Please select departure city");
      return;
    }
    if (!toCity) {
      toast.error("Please select destination city");
      return;
    }
    if (!departureDate) {
      toast.error("Please select departure date");
      return;
    }
    if (tripType === "roundtrip" && !returnDate) {
      toast.error("Please select return date");
      return;
    }
    if (tripType === "roundtrip" && departureDate && returnDate && returnDate <= departureDate) {
      toast.error("Return date must be after departure date");
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    // Save recent search
    saveRecentSearch({
      from: fromCity,
      to: toCity,
      date: format(departureDate, "yyyy-MM-dd"),
      tripType,
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!flights || !Array.isArray(flights)) {
      setIsSearching(false);
      return;
    }

    let results = flights.filter(f => f.is_active);

    // For one-way: only show pure one-way flights — exclude any flight that belongs to a round-trip package pair
    if (tripType === "oneway") {
      results = results.filter(f => !packageFlightIds.has(f.id));
    }

    if (fromCity) {
      const from = fromCity.toLowerCase().trim();
      results = results.filter(f =>
        f.departure_city.toLowerCase().includes(from) ||
        (f.departure_airport_code && f.departure_airport_code.toLowerCase().includes(from))
      );
    }

    if (toCity) {
      const to = toCity.toLowerCase().trim();
      results = results.filter(f =>
        f.arrival_city.toLowerCase().includes(to) ||
        (f.arrival_airport_code && f.arrival_airport_code.toLowerCase().includes(to))
      );
    }

    if (departureDate) {
      results = getFlightsForDate(results, departureDate);
    }

    if (flightClass !== "all") {
      results = results.filter(f =>
        f.class?.toLowerCase() === flightClass.toLowerCase()
      );
    }

    results = results.filter(f => getAvailableSeats(f) >= totalNonInfants);

    // For round-trip, also search for return flights separately
    if (tripType === "roundtrip" && returnDate) {
      const retDateStr = format(returnDate, "yyyy-MM-dd");
      let returnResults = flights.filter(f => f.is_active);

      // Return flights: reverse route (to → from)
      if (toCity) {
        const to = toCity.toLowerCase().trim();
        returnResults = returnResults.filter(f =>
          f.departure_city.toLowerCase().includes(to) ||
          (f.departure_airport_code && f.departure_airport_code.toLowerCase().includes(to))
        );
      }
      if (fromCity) {
        const from = fromCity.toLowerCase().trim();
        returnResults = returnResults.filter(f =>
          f.arrival_city.toLowerCase().includes(from) ||
          (f.arrival_airport_code && f.arrival_airport_code.toLowerCase().includes(from))
        );
      }

      // Match return date
      returnResults = getFlightsForDate(returnResults, returnDate);

      if (flightClass !== "all") {
        returnResults = returnResults.filter(f =>
          f.class?.toLowerCase() === flightClass.toLowerCase()
        );
      }

      returnResults = returnResults.filter(f => getAvailableSeats(f) >= totalNonInfants);

      setReturnSearchedFlights(returnResults);
    } else {
      setReturnSearchedFlights([]);
    }

    // Reset selections
    setSelectedOutboundFlight(null);
    setSelectedReturnFlight(null);
    setSelectedMultiCityFlights({});

    setSearchedFlights(results);
    setIsSearching(false);
    setShowResults(true);
  };

  // Auto-search when returning from booking page
  useEffect(() => {
    if (savedSearch && !autoSearchDone && flights && flights.length > 0) {
      setAutoSearchDone(true);
      handleFlightSearch();
    }
  }, [savedSearch, autoSearchDone, flights]);

  // Save search state to sessionStorage before navigating to booking
  const saveSearchState = useCallback(() => {
    const state = {
      tripType, fromCity, toCity,
      departureDate: departureDate?.toISOString(),
      returnDate: returnDate?.toISOString(),
      adults, children, infants, flightClass,
    };
    sessionStorage.setItem("flightSearchState", JSON.stringify(state));
  }, [tripType, fromCity, toCity, departureDate, returnDate, adults, children, infants, flightClass]);

  // Wrap onFlightSelect to save state first
  const handleFlightSelectWithSave: typeof onFlightSelect = useCallback((...args) => {
    saveSearchState();
    onFlightSelect?.(...args);
  }, [saveSearchState, onFlightSelect]);

  const handleMultiCityBook = useCallback(() => {
    const legsArray = multiCityLegs.map((_, idx) => selectedMultiCityFlights[idx]?.id).filter(Boolean);
    if (legsArray.length === 0) return;
    const firstLegId = legsArray[0];
    const otherLegs = legsArray.slice(1).join(",");
    const params = new URLSearchParams({
      passengers: String(totalPassengers),
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      multiCityLegs: otherLegs
    });
    saveSearchState();
    navigate(`/flights/${firstLegId}/book?${params.toString()}`);
  }, [selectedMultiCityFlights, multiCityLegs, totalPassengers, adults, children, infants, saveSearchState, navigate]);

  // Apply a recent search
  const applyRecentSearch = (search: RecentSearch) => {
    setFromCity(search.from);
    setToCity(search.to);
    setDepartureDate(parseISO(search.date));
    setTripType(search.tripType as any);

    // Use a small timeout to ensure state is set before triggering search
    setTimeout(() => {
      const searchTrigger = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
      if (searchTrigger) {
        searchTrigger.click();
      } else {
        handleFlightSearch();
      }
    }, 150);
  };

  // Find the return flight for a given outbound flight
  // 1. Check linked_flight_id first
  // 2. If no linked flight, find ANY return flight (to→from on return date) - even different airline
  const getLinkedReturnFlight = (flight: Flight): Flight | null => {
    if (!flights) return null;
    // Check direct link
    if (flight.linked_flight_id) {
      const linked = flights.find(f => f.id === flight.linked_flight_id);
      if (linked) return linked;
    }
    // Check reverse link
    const reverseLinked = flights.find(f => f.linked_flight_id === flight.id);
    if (reverseLinked) return reverseLinked;

    // For round-trip without linked flights: find best return flight on return date
    if (tripType === "roundtrip" && returnDate) {
      const retDateStr = format(returnDate, "yyyy-MM-dd");
      const returnCandidates = flights.filter(f => {
        if (!f.is_active) return false;
        if (!f.departure_city.toLowerCase().includes(flight.arrival_city.toLowerCase())) return false;
        if (!f.arrival_city.toLowerCase().includes(flight.departure_city.toLowerCase())) return false;
        if ((f.available_seats || 0) < totalNonInfants) return false;
        // Match by date
        if (f.schedule_type === 'recurring' && f.recurring_days) {
          const dayOfWeek = getDay(returnDate);
          const validFrom = f.valid_from ? parseISO(f.valid_from) : null;
          const validUntil = f.valid_until ? parseISO(f.valid_until) : null;
          const isInValidPeriod = (!validFrom || returnDate >= validFrom) && (!validUntil || returnDate <= validUntil);
          return isInValidPeriod && f.recurring_days.includes(dayOfWeek);
        }
        return f.departure_date === retDateStr;
      });
      // Return cheapest candidate
      if (returnCandidates.length > 0) {
        return returnCandidates.sort((a, b) => a.price - b.price)[0];
      }
    }
    return null;
  };

  const getPassengerSummary = () => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(', ') : '1 Adult';
  };

  const CitySelector = ({ value, onChange, placeholder, open, onOpenChange, cities, type = 'from' }: {
    value: string; onChange: (v: string) => void; placeholder: string;
    open: boolean; onOpenChange: (o: boolean) => void; cities: string[];
    type?: 'from' | 'to';
  }) => {
    const info = cityInfoMap[value];
    const Icon = type === 'from' ? PlaneTakeoff : PlaneLanding;
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox"
            className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-300 ease-in-out gap-2.5 px-2.5">
            {info?.flagUrl ? (
              <img src={info.flagUrl} alt="" className="w-6 h-4 rounded-[2px] object-cover shrink-0" />
            ) : (
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                <Icon className="h-4 w-4 text-primary-foreground" />
              </span>
            )}
            <div className="flex-1 min-w-0 text-left">
              {value ? (
                <>
                  <div className="text-sm font-semibold leading-tight truncate">{value}</div>
                  {info?.country && (
                    <div className="text-[10px] text-muted-foreground leading-tight truncate">{info.country}</div>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select {type === 'from' ? 'departure' : 'destination'}</span>
              )}
            </div>
            {value && info?.airportCode && <span className="text-[10px] font-sans font-medium font-bold text-muted-foreground shrink-0">({info.airportCode})</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start" side="bottom" avoidCollisions={false}>
          <Command>
            <CommandInput placeholder="Search city..." />
            <CommandList>
              {cities.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {placeholder === "City" ? "Select departure first" : "No cities available"}
                </div>
              ) : (
                <>
                  <CommandEmpty>No city found.</CommandEmpty>
                  <CommandGroup>
                    {cities.map((city) => {
                      const itemInfo = cityInfoMap[city];
                      return (
                        <CommandItem key={city} onSelect={() => { onChange(city); onOpenChange(false); }}>
                          {itemInfo?.flagUrl ? <img src={itemInfo.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0 mr-2" /> : <Icon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                          <span className="truncate">{city}</span>
                          {itemInfo?.airportCode && <span className="ml-auto text-[10px] font-sans font-medium font-bold text-muted-foreground">{itemInfo.airportCode}</span>}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderFlightCard = (flight: Flight, index: number, keyPrefix: string = "f") => {
    const duration = calcDuration(flight.departure_time, flight.arrival_time);
    const baggage = getBaggage(flight.class, flight.baggage);
    const effectivePrice = getEffectiveAdultPrice(flight);
    const isCheapest = effectivePrice === cheapestPrice && searchedFlights.length > 1;
    const isCompareSelected = compareIds.includes(flight.id);
    const seatsLeft = getAvailableSeats(flight);
    const flightTierInfo = getNextTierInfo(flight);

    const legMatch = keyPrefix.match(/^leg-(\d+)$/);
    const legIndex = legMatch ? parseInt(legMatch[1], 10) : null;
    const isSelected = legIndex !== null
      ? selectedMultiCityFlights[legIndex]?.id === flight.id
      : selectedOutboundFlight?.id === flight.id;

    return (
      <Card key={`${keyPrefix}-${flight.id}`}
        className={cn(
          "group relative overflow-hidden transition-all duration-300 ease-out animate-[card-slide-up_0.4s_ease-out_forwards] opacity-0 cursor-pointer rounded-2xl bg-white",
          isSelected
            ? "border-2 border-[#2A3F8B] shadow-[0_8px_30px_rgba(42,63,139,0.12)] scale-[1.005] bg-gradient-to-br from-white to-blue-50/30 ring-1 ring-[#2A3F8B]/10"
            : "border-border/60 shadow-sm hover:border-[#2A3F8B]/40 hover:shadow-lg hover:-translate-y-0.5",
          isCheapest && !isSelected && "border-amber-500/40 hover:border-amber-500/60",
          isCompareSelected && "ring-2 ring-primary/30 border-primary/40"
        )}
        style={{ animationDelay: `${index * 60}ms` }}
        onClick={() => {
          if (legIndex !== null) {
            setSelectedMultiCityFlights(prev => {
              const updated = { ...prev };
              if (updated[legIndex]?.id === flight.id) {
                delete updated[legIndex];
              } else {
                updated[legIndex] = flight;
              }
              return updated;
            });
          } else {
            if (isSelected) {
              setSelectedOutboundFlight(null);
              if (selectedOutboundFlight?.trip_type === "round_trip" || selectedOutboundFlight?.linked_flight_id) {
                setSelectedReturnFlight(null);
              }
            } else {
              setSelectedOutboundFlight(flight);
            }
          }
        }}>

        <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#2A3F8B] border-l-transparent z-10 pointer-events-none" />

        {isCheapest && (
          <div className="bg-emerald-50 text-emerald-600 border-b border-emerald-100 px-6 py-1.5 flex items-center gap-2">
            <Tag className="h-3 w-3" />
            <span className="text-[10px] font-bold tracking-wide uppercase">Best Value</span>
          </div>
        )}

        <div className="pt-4 px-5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-2.5 py-0.5 rounded-full text-[10px] shadow-none">
              Flight • {flight.departure_date && !isNaN(new Date(flight.departure_date).getTime()) ? format(new Date(flight.departure_date), "EEE, d MMM yyyy") : "Date TBD"}
            </Badge>
            {isPackageFlight(flight) && (
              <Badge className="bg-amber-500 text-white border-0 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-sm">
                <ArrowRightLeft className="h-3 w-3" /> Special Round Trip Offer
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch">
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 sm:w-16 h-12 sm:h-16 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-1.5">
                {(() => {
                  const logo = getAirlineLogo(flight.airline, flight.airline_logo);
                  return logo ? (
                    <img src={logo} alt={flight.airline} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Plane className="h-10 w-10 text-[#2A3F8B]" />
                  );
                })()}
              </div>

              <div className="flex items-center justify-between gap-4 sm:gap-6 flex-1">
                <div className="text-left min-w-[50px] sm:min-w-[65px]">
                  <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-none">{formatTime(flight.departure_time)}</p>
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1 tracking-wide">
                    {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover shrink-0" />}
                    {flight.departure_city} ({flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()})
                  </p>
                </div>

                <div className="flex-1 max-w-[180px] flex items-center mt-2">
                  <div className="h-[1.5px] flex-1 bg-border/60" />
                  <div className="bg-white px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-[#2A3F8B] border border-border/60 rounded-full flex items-center gap-1 whitespace-nowrap shadow-sm mx-1.5">
                    <span className="text-muted-foreground">
                      {flight.transit_airport && flight.transit_airport.trim() !== "" ? flight.transit_duration || "Transit" : duration || "1h 30m"}
                    </span>
                    {flight.transit_airport && flight.transit_airport.trim() !== "" ? (
                      <span className="text-amber-600 uppercase font-black text-[8px]">1 STOP ({flight.transit_airport})</span>
                    ) : (
                      <span className="text-[#2A3F8B] text-[8px]">DIRECT</span>
                    )}
                  </div>
                  <div className="h-[1.5px] flex-1 bg-border/60" />
                </div>

                <div className="text-right min-w-[50px] sm:min-w-[65px]">
                  <div className="flex items-baseline justify-end gap-0.5">
                    <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-none">{formatTime(flight.arrival_time)}</p>
                  </div>
                  <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-end gap-1 tracking-wide">
                    {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover shrink-0" />}
                    {flight.arrival_city} ({flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-3 ml-[60px] sm:ml-[80px] flex-wrap">
              <span className="font-semibold text-foreground/80">{flight.airline}</span>
              {(flight.departure_flight_number || flight.flight_number) && (
                <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground/70">
                  {flight.departure_flight_number || flight.flight_number}
                </span>
              )}
              {flight.class && <span>• {flight.class}</span>}
              <span>• {baggage}</span>
              {flightTierInfo ? (
                <Badge className={cn("border-0 font-semibold px-2.5 py-1 rounded-full text-[10px] shadow-none",
                  flightTierInfo.seatsLeftInTier <= 2 ? "bg-destructive/15 text-destructive animate-pulse" :
                  flightTierInfo.seatsLeftInTier <= 5 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-emerald-50 text-emerald-700 border border-emerald-200"
                )}>
                  Just {flightTierInfo.seatsLeftInTier} at this price
                </Badge>
              ) : (
                seatsLeft > 0 && seatsLeft <= 10 && (
                  <Badge className="bg-destructive/10 text-destructive border-0 font-semibold px-2 py-0.5 rounded-full text-[10px] animate-pulse shadow-none">
                    Only {seatsLeft} seats left
                  </Badge>
                )
              )}
            </div>
          </div>

          <div className="sm:border-l border-t sm:border-t-0 border-border/40 bg-white p-4 sm:p-5 flex flex-col justify-center items-end sm:w-[160px] shrink-0">
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-black text-[#2A3F8B] leading-none tabular-nums">{formatCurrency(effectivePrice, flight.currency)}</p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">per person</p>
              {flightTierInfo && (
                <p className="text-[9px] text-muted-foreground font-bold tracking-wide mt-1.5 uppercase whitespace-nowrap bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                  Next rate: <span className="text-[#2A3F8B] font-black">{formatCurrency(flightTierInfo.nextPrice, flight.currency)}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); copyFlightDetails(flight); }}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant={isCompareSelected ? "default" : "ghost"} size="icon" className={cn("h-7 w-7 rounded-lg", isCompareSelected ? "bg-primary/15 text-primary" : "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleCompare(flight.id); }}>
                <GitCompareArrows className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isSelected ? (
              <Button size="sm" variant="outline" className="mt-3 rounded-full w-full gap-1.5 font-bold text-xs h-9 border-destructive text-destructive hover:bg-destructive/10 bg-destructive/5" onClick={(e) => {
                e.stopPropagation();
                if (legIndex !== null) {
                  setSelectedMultiCityFlights(prev => {
                    const updated = { ...prev };
                    delete updated[legIndex];
                    return updated;
                  });
                } else {
                  setSelectedOutboundFlight(null);
                  if (selectedOutboundFlight?.trip_type === "round_trip" || selectedOutboundFlight?.linked_flight_id) {
                    setSelectedReturnFlight(null);
                  }
                }
              }}>
                <X className="h-3.5 w-3.5 mr-1" /> Unselect
              </Button>
            ) : (
              <Button size="sm" className="mt-3 rounded-full w-full gap-1.5 font-bold text-xs h-9 bg-white text-[#2A3F8B] border border-[#2A3F8B] hover:bg-[#F0F4F8]" onClick={(e) => {
                e.stopPropagation();
                if (legIndex !== null) {
                  setSelectedMultiCityFlights(prev => ({
                    ...prev,
                    [legIndex]: flight
                  }));
                } else {
                  setSelectedOutboundFlight(flight);
                }
              }}>
                Select <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border/15 bg-[#F0F4F8]/50">
          <button className="w-full flex items-center justify-center gap-2 py-2 text-[10px] text-[#2A3F8B] hover:bg-[#2A3F8B]/5 transition-all font-bold tracking-[0.1em] uppercase" onClick={(e) => { e.stopPropagation(); setExpandedFlightId(expandedFlightId === flight.id ? null : flight.id); }}>
            {expandedFlightId === flight.id ? <>Hide details <ChevronUp className="h-3 w-3" /></> : <>Flight details <ChevronDown className="h-3 w-3" /></>}
          </button>
        </div>

        {expandedFlightId === flight.id && (
          <div className="border-t border-border/15 bg-gradient-to-b from-muted/40 via-muted/10 to-transparent px-6 py-6 space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Header / Route Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                  <Info className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">Complete Flight Technical Details</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5 text-primary tracking-wide">
                {flight.transit_airport && flight.transit_airport.trim() !== "" ? `1 Stop via ${flight.transit_airport} • ${flight.transit_duration || 'Duration TBD'}` : `Direct Flight • ${duration}`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Timeline Column */}
              <div className="lg:col-span-7 relative">
                <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1.5px] bg-gradient-to-b from-primary via-primary/40 to-primary/20 rounded-full" />

                <div className="space-y-10 relative">
                  {/* Departure */}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-4 h-4 rounded-full border-[3px] border-primary bg-background shadow-[0_0_10px_rgba(var(--primary),0.3)] mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Departure</p>
                          <p className="text-lg font-black text-foreground">{formatTime(flight.departure_time)}</p>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {flight.departure_city} ({flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted-foreground">{flight.departure_date && !isNaN(new Date(flight.departure_date).getTime()) ? format(new Date(flight.departure_date), "EEEE, dd MMM yyyy") : ""}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60">{flight.airline} Terminal — TBD</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {flight.transit_airport && flight.transit_airport.trim() !== "" ? (
                    <>
                      {/* Segment to Transit */}
                      <div className="flex items-center gap-4 py-2 opacity-60">
                        <div className="w-4 flex justify-center">
                          <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            Leg 1 Flight to {flight.transit_airport}
                          </span>
                          <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                        </div>
                      </div>

                      {/* Transit Layover */}
                      <div className="flex items-start gap-4">
                        <div className="relative z-10 w-4 h-4 rounded-full border-[3px] border-amber-500 bg-background shadow-[0_0_10px_rgba(245,158,11,0.3)] mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Transit Layover
                              </p>
                              <p className="text-sm font-black text-foreground">Stopover at {flight.transit_airport}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-amber-600">{flight.transit_duration || "Duration TBD"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Segment from Transit */}
                      <div className="flex items-center gap-4 py-2 opacity-60">
                        <div className="w-4 flex justify-center">
                          <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            Leg 2 Flight to {flight.arrival_city}
                          </span>
                          <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Flight Segment Icon */
                    <div className="flex items-center gap-4 py-2 opacity-60">
                      <div className="w-4 flex justify-center">
                        <Plane className="h-3 w-3 text-muted-foreground rotate-90" />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="h-2.5 w-2.5" /> {duration}
                        </span>
                        <div className="h-px flex-1 bg-border/40 border-dashed border-t" />
                      </div>
                    </div>
                  )}

                  {/* Arrival */}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-4 h-4 rounded-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.5)] mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Arrival</p>
                          <p className="text-lg font-black text-foreground">{formatTime(flight.arrival_time)}</p>
                          <p className="text-sm font-semibold text-muted-foreground">
                            {flight.arrival_city} ({flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()})
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted-foreground">{flight.arrival_date && !isNaN(new Date(flight.arrival_date).getTime()) ? format(new Date(flight.arrival_date), "EEEE, dd MMM yyyy") : ""}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60">{flight.airline} Terminal — TBD</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-muted/40 rounded-2xl p-5 border border-border/15 space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-border/20">
                    {(() => {
                      const logo = getAirlineLogo(flight.airline, flight.airline_logo);
                      return logo ? (
                        <img src={logo} alt={flight.airline} className="h-10 w-10 object-contain bg-background p-1.5 rounded-lg border border-border/20" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Plane className="h-5 w-5 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-xs font-bold text-foreground">{flight.airline}</p>
                      <p className="text-[10px] font-medium text-muted-foreground tracking-tight">Flight {flight.flight_number || "IA101"}</p>
                    </div>
                  </div>

                  {/* Spec Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Baggage Allowance</p>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-background border border-border/20">
                          <Luggage className="h-3.5 w-3.5 text-primary/80" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{baggage}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Cabin Class</p>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-background border border-border/20">
                          <Armchair className="h-3.5 w-3.5 text-primary/80" />
                        </div>
                        <span className="text-xs font-bold text-foreground capitalize">{flight.class || "Economy"}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Availability</p>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-background border border-border/20">
                          <Users className="h-3.5 w-3.5 text-primary/80" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{seatsLeft} Seats Left</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Notes */}
                  {flight.flight_policy && (
                    <div className="pt-4 border-t border-border/20">
                      <div className="bg-background/50 rounded-lg p-3 border border-border/10">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Policy</p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground/80">{flight.flight_policy}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground/60 font-medium italic">
                  <Clock className="h-3 w-3" />
                  Prices and availability are real-time and subject to change until ticketing.
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // Check if any filter is active
  const hasActiveFilters = airlineFilter.length > 0 || stopsFilter.length > 0 || classFilter.length > 0 || priceRange[0] > resultPriceRange[0] || priceRange[1] < resultPriceRange[1];
  const activeFilterCount = airlineFilter.length + stopsFilter.length + classFilter.length + (priceRange[0] > resultPriceRange[0] || priceRange[1] < resultPriceRange[1] ? 1 : 0);

  // Time of day filter items
  const timeOfDayItems: { value: TimeOfDay; label: string; icon: typeof Sun; range: string }[] = [
    { value: "morning", label: "Morning", icon: Sun, range: "06:00–11:59" },
    { value: "afternoon", label: "Afternoon", icon: Sunset, range: "12:00–17:59" },
    { value: "evening", label: "Evening", icon: Moon, range: "18:00–05:59" },
  ];

  return (
    <div className="space-y-6">


      {/* Hero Banner + Search Panel */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl min-h-[320px]">
        {/* Hero Background Image with KenBurns + ambient layers */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={flightHeroImg}
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
        <div className="relative z-10 flex flex-col items-center text-center px-4 pt-6 pb-8 sm:pt-10 sm:pb-10">
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
              flight.
            </span>
          </h1>

          {/* Search Panel */}
          <motion.div
            layout
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
            className="overflow-hidden backdrop-blur-xl bg-card/95 ring-1 ring-white/10 border-border/30 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.45),inset_0_1px_0_0_hsl(0_0%_100%/0.08)] mx-4 sm:mx-8 mb-6 rounded-2xl animate-fade-in w-full max-w-6xl"
            style={{ animationDelay: "380ms", animationFillMode: "both" }}
          >
            {/* Header with trip type toggle */}
            <div className="relative px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/[0.08] via-blue-500/[0.05] to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center ring-1 ring-primary/30 shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)]"
                  >
                    <Search className="h-4 w-4 text-primary-foreground" />
                  </motion.div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground tracking-tight leading-none">Search Flights</h2>
                  </div>
                </div>
                {/* Trip Type Toggle - sliding pill */}
                <div className="relative flex bg-muted/60 rounded-full p-1 gap-0.5">
                  {([
                    { val: "roundtrip" as const, label: "Round-trip", icon: ArrowRightLeft },
                    { val: "oneway" as const, label: "One-way", icon: ArrowRight },
                    { val: "multicity" as const, label: "Multi-city", icon: Globe },
                  ]).map(({ val, label, icon: Icon }) => {
                    const active = tripType === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTripType(val)}
                        className={cn(
                          "relative z-10 inline-flex items-center gap-1.5 rounded-full text-xs font-medium h-8 px-3 transition-all hover:-translate-y-px",
                          active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="flightTripTab"
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-blue-500 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.6)]"
                            transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className="h-3 w-3" />
                          <span className="hidden sm:inline">{label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <CardContent className="p-4 space-y-3 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {tripType === "multicity" ? (
                  <motion.div
                    key="multicity"
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <div className="space-y-3">
                      <AnimatePresence initial={false}>
                        {multiCityLegs.map((leg, index) => (
                          <motion.div
                            key={leg.id || index}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-3 pb-3 border-b border-border/20 last:border-0 last:pb-0 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_auto_1.5fr_1fr_auto] gap-3 items-end w-full">
                              {/* From */}
                              <div className="space-y-1.5 min-w-0">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                                  <PlaneTakeoff className="h-3 w-3" /> Flight {index + 1}
                                </label>
                                <CitySelector type="from" value={leg.from} onChange={(v) => updateLeg(index, "from", v)} placeholder="Select departure"
                                  open={multiCityOpenStates[`from-${index}`] || false}
                                  onOpenChange={(o) => setMultiCityOpenStates(prev => ({ ...prev, [`from-${index}`]: o }))}
                                  cities={departureCities} />
                              </div>

                              {/* Arrow */}
                              <div className="hidden md:flex items-center justify-center pb-3 text-muted-foreground shrink-0">
                                <ArrowRight className="h-4 w-4" />
                              </div>

                              {/* To */}
                              <div className="space-y-1.5 min-w-0">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                                  <PlaneLanding className="h-3 w-3" /> To
                                </label>
                                <CitySelector type="to" value={leg.to} onChange={(v) => updateLeg(index, "to", v)} placeholder="Select destination"
                                  open={multiCityOpenStates[`to-${index}`] || false}
                                  onOpenChange={(o) => setMultiCityOpenStates(prev => ({ ...prev, [`to-${index}`]: o }))}
                                  cities={leg.from ? [...new Set(flights?.filter(f => f.is_active && f.departure_city.toLowerCase() === leg.from.toLowerCase()).map(f => f.arrival_city) || [])].sort() : departureCities} />
                              </div>

                              {/* Date */}
                              <div className="space-y-1.5 min-w-0">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" /> Date
                                </label>
                                <Popover open={multiCityOpenStates[`date-${index}`] || false}
                                  onOpenChange={(o) => {
                                    if (o && (!leg.from || !leg.to)) {
                                      toast.error("Please select departure and destination cities for this leg first");
                                      return;
                                    }
                                    setMultiCityOpenStates(prev => ({ ...prev, [`date-${index}`]: o }));
                                  }}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline"
                                      disabled={!leg.from || !leg.to}
                                      className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all px-2.5 gap-2.5">
                                      <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                        <Calendar className="h-4 w-4 text-primary-foreground" />
                                      </span>
                                      {leg.date ? (
                                        <div className="flex flex-col items-start min-w-0">
                                          <span className="text-sm font-bold leading-tight truncate">{format(leg.date, "dd MMM yyyy")}</span>
                                          <span className="text-[10px] text-muted-foreground leading-tight">{format(leg.date, "EEEE")}</span>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          {!leg.from || !leg.to ? "Select route first" : "Select date"}
                                        </span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[100]" align="center" side="bottom" sideOffset={8} avoidCollisions={false}>
                                    <InlineFareCalendar selected={leg.date}
                                      onSelect={(d) => { updateLeg(index, "date", d); setMultiCityOpenStates(prev => ({ ...prev, [`date-${index}`]: false })); }}
                                      disabled={(date) => { if (startOfDay(date) < startOfDay(new Date())) return true; if (index > 0 && multiCityLegs[index - 1].date) return startOfDay(date) <= startOfDay(multiCityLegs[index - 1].date!); return false; }}
                                      availableDates={getLegAvailability(leg.from, leg.to).available}
                                      limitedDates={getLegAvailability(leg.from, leg.to).limited}
                                      soldOutDates={getLegAvailability(leg.from, leg.to).soldOut}
                                      datePrices={getLegAvailability(leg.from, leg.to).prices} />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Remove Button */}
                              <div className="flex items-center h-12">
                                {multiCityLegs.length > 2 && index > 0 ? (
                                  <Button variant="ghost" size="icon" className="h-12 w-12 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors" onClick={() => removeLeg(index)}>
                                    <X className="h-5 w-5" />
                                  </Button>
                                ) : (
                                  <div className="w-12 hidden md:block"></div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end pt-3 border-t border-border/40">
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-bold text-transparent uppercase tracking-widest hidden md:block select-none">Add Leg</label>
                        {multiCityLegs.length < 5 ? (
                          <Button variant="outline" onClick={addLeg} className="w-full h-12 justify-center text-center font-normal bg-card/40 border-dashed border-primary/40 hover:border-primary font-semibold text-primary hover:bg-primary/5 transition-all px-2.5 gap-2 rounded-xl">
                            <Plus className="h-4 w-4" /> Add Next Flight
                          </Button>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-xs text-muted-foreground italic bg-muted/20 border border-border/20 rounded-xl px-4">
                            Maximum 5 flights reached
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                          <Users className="h-3 w-3" /> Passengers
                        </label>
                        <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all px-2.5 gap-2.5">
                              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                <Users className="h-4 w-4 text-primary-foreground" />
                              </span>
                              <div className="flex flex-col leading-tight min-w-0 text-left">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Passengers</span>
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {adults} Adult{adults !== 1 ? "s" : ""}
                                  {children > 0 && `, ${children} Child${children !== 1 ? "ren" : ""}`}
                                  {infants > 0 && `, ${infants} Infant${infants !== 1 ? "s" : ""}`}
                                </span>
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start" side="bottom" avoidCollisions={false}>{renderPassengerControls()}</PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" /> Class
                        </label>
                        <Select value={flightClass} onValueChange={setFlightClass}>
                          <SelectTrigger className="h-12 bg-card/60 backdrop-blur border-border/40 rounded-xl focus:ring-2 focus:ring-primary/40 px-2.5 gap-2.5 [&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span]:flex-1 [&>span]:min-w-0">
                            <SelectValue>
                              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                <Briefcase className="h-4 w-4 text-primary-foreground" />
                              </span>
                              <span className="flex flex-col leading-tight min-w-0 text-left">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Class</span>
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {flightClass === "all" ? "All Classes" : flightClass === "economy" ? "Economy" : flightClass === "business" ? "Business" : "First Class"}
                                </span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            <SelectItem value="economy">Economy</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="first">First Class</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button data-search-trigger onClick={handleFlightSearch} disabled={isLoading || isSearching}
                        className="relative overflow-hidden group h-12 rounded-xl px-6 gap-2 font-semibold bg-gradient-to-r from-primary to-blue-500 text-primary-foreground hover:opacity-95 shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.65)] hover:shadow-[0_14px_36px_-10px_hsl(var(--primary)/0.8)] transition-all w-full md:w-auto">
                        <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                        {isLoading || isSearching ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <><Search className="h-5 w-5 relative z-10" /><span className="relative z-10">Search Flights</span></>}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={tripType}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    {/* Cities Row */}
                    <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                      {/* Faint dashed connector behind swap on md+ */}
                      <div aria-hidden className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[calc(100%-1.5rem)] md:top-auto md:bottom-5 w-[120px] border-t border-dashed border-primary/25 pointer-events-none" style={{ top: '70%' }} />

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                          <PlaneTakeoff className="h-3 w-3" /> From
                        </label>
                        <Popover open={fromOpen} onOpenChange={setFromOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox"
                              className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all gap-2.5 px-2.5">
                              {cityInfoMap[fromCity]?.flagUrl ? (
                                <img src={cityInfoMap[fromCity].flagUrl!} alt="" className="w-6 h-4 rounded-[2px] object-cover shrink-0" />
                              ) : (
                                <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                  <PlaneTakeoff className="h-4 w-4 text-primary-foreground" />
                                </span>
                              )}
                              <div className="flex-1 min-w-0 text-left">
                                {fromCity ? (
                                  <>
                                    <div className="text-sm font-semibold leading-tight truncate">{fromCity}</div>
                                    {cityInfoMap[fromCity]?.country && (
                                      <div className="text-[10px] text-muted-foreground leading-tight truncate">{cityInfoMap[fromCity].country}</div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Select departure</span>
                                )}
                              </div>
                              {fromCity && cityInfoMap[fromCity]?.airportCode && <span className="text-[10px] font-sans font-medium font-bold text-muted-foreground shrink-0">({cityInfoMap[fromCity].airportCode})</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start" side="bottom" avoidCollisions={false}>
                            <Command>
                              <CommandInput placeholder="Search city..." />
                              <CommandList>
                                {isLoading ? (
                                  <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                                  </div>
                                ) : departureCities.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">No cities available</div>
                                ) : (
                                  <>
                                    <CommandEmpty>No city found.</CommandEmpty>
                                    <CommandGroup>
                                      {departureCities.map((city) => {
                                        const info = cityInfoMap[city];
                                        return (
                                          <CommandItem key={city} onSelect={() => {
                                            setFromCity(city);
                                            setFromOpen(false);

                                            if (flights) {
                                              // Calculate available destinations for this specific origin
                                              const destinations = [...new Set(
                                                flights
                                                  .filter(f => f.is_active && f.departure_city.toLowerCase() === city.toLowerCase())
                                                  .map(f => f.arrival_city)
                                              )];
                                            }
                                          }}>
                                            {info?.flagUrl ? <img src={info.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0 mr-2" /> : <PlaneTakeoff className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                                            <span className="truncate">{city}</span>
                                            {info?.airportCode && <span className="ml-auto text-[10px] font-sans font-medium font-bold text-muted-foreground">{info.airportCode}</span>}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex justify-center pb-1 relative z-10">
                        <motion.button
                          type="button"
                          onClick={handleSwapCities}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ rotate: 180, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                          className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-blue-500 text-primary-foreground flex items-center justify-center ring-2 ring-background shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.55)] hover:shadow-[0_10px_30px_-6px_hsl(var(--primary)/0.7)] transition-shadow"
                          aria-label="Swap cities"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </motion.button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                          <PlaneLanding className="h-3 w-3" /> To
                        </label>
                        <Popover open={toOpen} onOpenChange={setToOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox"
                              className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all gap-2.5 px-2.5">
                              {cityInfoMap[toCity]?.flagUrl ? (
                                <img src={cityInfoMap[toCity].flagUrl!} alt="" className="w-6 h-4 rounded-[2px] object-cover shrink-0" />
                              ) : (
                                <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                  <PlaneLanding className="h-4 w-4 text-primary-foreground" />
                                </span>
                              )}
                              <div className="flex-1 min-w-0 text-left">
                                {toCity ? (
                                  <>
                                    <div className="text-sm font-semibold leading-tight truncate">{toCity}</div>
                                    {cityInfoMap[toCity]?.country && (
                                      <div className="text-[10px] text-muted-foreground leading-tight truncate">{cityInfoMap[toCity].country}</div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Select destination</span>
                                )}
                              </div>
                              {toCity && cityInfoMap[toCity]?.airportCode && <span className="text-[10px] font-sans font-medium font-bold text-muted-foreground shrink-0">({cityInfoMap[toCity].airportCode})</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[250px] p-0" align="start" side="bottom" avoidCollisions={false}>
                            <Command>
                              <CommandInput placeholder="Search city..." />
                              <CommandList>
                                {isLoading ? (
                                  <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                                ) : !fromCity ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">Select departure city first</div>
                                ) : destinationCities.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">No destinations from {fromCity}</div>
                                ) : (
                                  <>
                                    <CommandEmpty>No city found.</CommandEmpty>
                                    <CommandGroup>
                                      {destinationCities.map((city) => {
                                        const info = cityInfoMap[city];
                                        return (
                                          <CommandItem key={city} onSelect={() => {
                                            setToCity(city);
                                            setToOpen(false);
                                          }}>
                                            {info?.flagUrl ? <img src={info.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0 mr-2" /> : <PlaneLanding className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                                            <span className="truncate">{city}</span>
                                            {info?.airportCode && <span className="ml-auto text-[10px] font-sans font-medium font-bold text-muted-foreground">{info.airportCode}</span>}
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Dates + Passengers + Class + Search */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={tripType}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "grid gap-3 items-end",
                          tripType === "roundtrip"
                            ? "grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                            : "grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto]"
                        )}
                      >
                        <div className="space-y-1.5 relative">
                          <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Departure</label>
                          <Popover open={departureDateOpen} onOpenChange={(open) => {
                            if (open && (!fromCity || !toCity)) {
                              toast.error("Please select departure and destination cities first");
                              return;
                            }
                            setDepartureDateOpen(open);
                          }}>
                            <PopoverTrigger asChild>
                              <Button variant="outline"
                                disabled={!fromCity || !toCity}
                                className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all px-2.5 gap-2.5">
                                <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                  <Calendar className="h-4 w-4 text-primary-foreground" />
                                </span>
                                {departureDate ? (
                                  <div className="flex flex-col items-start min-w-0">
                                    <span className="text-sm font-bold leading-tight truncate">{format(departureDate, "dd MMM yyyy")}</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight">{format(departureDate, "EEEE")}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {!fromCity || !toCity ? "Select route first" : "Select date"}
                                  </span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 z-[100]"
                              align="center"
                              side="bottom"
                              sideOffset={8}
                              avoidCollisions={false}
                              onOpenAutoFocus={(e) => e.preventDefault()}
                              onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                              <InlineFareCalendar selected={departureDate}
                                onSelect={(d) => {
                                  setDepartureDate(d);
                                  setDepartureDateOpen(false);
                                  if (tripType === "roundtrip") {
                                    setTimeout(() => setReturnDateOpen(true), 150);
                                  }
                                }}
                                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                                availableDates={departureAvailability.available} limitedDates={departureAvailability.limited}
                                soldOutDates={departureAvailability.soldOut} datePrices={departurePrices} />
                            </PopoverContent>
                          </Popover>

                        </div>

                        {tripType === "roundtrip" && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Return</label>
                            <Popover open={returnDateOpen} onOpenChange={(open) => {
                              if (open && (!fromCity || !toCity)) {
                                toast.error("Please select departure and destination cities first");
                                return;
                              }
                              setReturnDateOpen(open);
                            }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline"
                                  disabled={!fromCity || !toCity}
                                  className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all px-2.5 gap-2.5">
                                  <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                    <Calendar className="h-4 w-4 text-primary-foreground" />
                                  </span>
                                  {returnDate ? (
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className="text-sm font-bold leading-tight truncate">{format(returnDate, "dd MMM yyyy")}</span>
                                      <span className="text-[10px] text-muted-foreground leading-tight">{format(returnDate, "EEEE")}</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {!fromCity || !toCity ? "Select route first" : "Select date"}
                                    </span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 z-[100]"
                                align="center"
                                side="bottom"
                                sideOffset={8}
                                avoidCollisions={false}
                                onOpenAutoFocus={(e) => e.preventDefault()}
                              >
                                <InlineFareCalendar selected={returnDate}
                                  defaultMonth={departureDate ? new Date(departureDate.getTime() + 86400000) : undefined}
                                  onSelect={(d) => { setReturnDate(d); setReturnDateOpen(false); }}
                                  disabled={(date) => departureDate ? startOfDay(date) <= startOfDay(departureDate) : startOfDay(date) < startOfDay(new Date())}
                                  availableDates={returnAvailability.available} limitedDates={returnAvailability.limited}
                                  soldOutDates={returnAvailability.soldOut} datePrices={returnPrices} />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Passengers</label>
                          <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline"
                                className="w-full h-12 justify-start text-left font-normal bg-card/60 backdrop-blur border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/40 transition-all px-2.5 gap-2.5">
                                <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                  <Users className="h-4 w-4 text-primary-foreground" />
                                </span>
                                <div className="flex flex-col leading-tight min-w-0">
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Passengers</span>
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {adults} Adult{adults !== 1 ? "s" : ""}
                                    {children > 0 && `, ${children} Child${children !== 1 ? "ren" : ""}`}
                                    {infants > 0 && `, ${infants} Infant${infants !== 1 ? "s" : ""}`}
                                  </span>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start" side="bottom" avoidCollisions={false}>{renderPassengerControls()}</PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Class</label>
                          <Select value={flightClass} onValueChange={setFlightClass}>
                            <SelectTrigger className="h-12 bg-card/60 backdrop-blur border-border/40 rounded-xl focus:ring-2 focus:ring-primary/40 px-2.5 gap-2.5 [&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span]:flex-1 [&>span]:min-w-0">
                              <SelectValue>
                                <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0 ring-1 ring-primary/30 shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.6)]">
                                  <Briefcase className="h-4 w-4 text-primary-foreground" />
                                </span>
                                <span className="flex flex-col leading-tight min-w-0 text-left">
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">Class</span>
                                  <span className="text-sm font-semibold text-foreground truncate">
                                    {flightClass === "all" ? "All Classes" : flightClass === "economy" ? "Economy" : flightClass === "business" ? "Business" : "First Class"}
                                  </span>
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Classes</SelectItem>
                              <SelectItem value="economy">Economy</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="first">First Class</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={handleFlightSearch} disabled={isLoading || isSearching}
                          className="relative overflow-hidden group h-12 rounded-xl px-6 gap-2 font-semibold bg-gradient-to-r from-primary to-blue-500 text-primary-foreground hover:opacity-95 shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.65)] hover:shadow-[0_14px_36px_-10px_hsl(var(--primary)/0.8)] transition-all w-full md:w-auto">
                          <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                          {isLoading || isSearching ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <><Search className="h-5 w-5 relative z-10" /><span className="relative z-10">Search Flights</span></>}
                        </Button>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
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
                    <History className="h-3.5 w-3.5" /> Recent:
                  </span>
                  {recentSearches.map((search, i) => (
                    <button
                      key={i}
                      onClick={() => applyRecentSearch(search)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted border border-border/40 text-xs text-foreground transition-colors"
                    >
                      <Plane className="h-3 w-3 text-primary/60" />
                      <span className="font-medium">{search.from} → {search.to}</span>
                      {search.date && (
                        <span className="text-muted-foreground">
                          {(() => { try { return format(new Date(search.date), "dd/MM/yyyy"); } catch { return ""; } })()}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => { setRecentSearches([]); localStorage.removeItem(RECENT_SEARCHES_KEY); }}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </CardContent>
          </motion.div>
        </div>
      </div>

      {/* Flight Deals / Airline Promotions */}
      {!showResults && !isSearching && (
        <FlightDealsCarousel onDealClick={(deal) => {
          if (deal.flight) {
            setTripType("oneway");
            setFromCity(deal.flight.departure_city);
            setToCity(deal.flight.arrival_city);
            if (deal.flight.departure_date) {
              setDepartureDate(new Date(deal.flight.departure_date));
            }
            // Trigger search after state updates
            setTimeout(() => {
              const searchBtn = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
              searchBtn?.click();
            }, 100);
          }
        }} />
      )}

      {/* Ultra-Sleek & Elegant GTS Flight Search Animation */}
      {isSearching && (
        <Card className="relative overflow-hidden border border-primary/20 bg-card/95 backdrop-blur-2xl shadow-xl rounded-2xl p-6 lg:p-8 max-w-lg mx-auto animate-fade-in my-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            {/* Header: GTS Logo + Route Badge */}
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-primary/30 flex items-center shadow-sm">
                <img src={gtsLogo} alt="GTS Logo" className="h-5 w-auto object-contain" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {fromCity || "Departure"} → {toCity || "Destination"}
              </span>
            </div>

            {/* Parabolic SVG Flight Arc Animation */}
            <div className="relative w-full max-w-sm py-2">
              <svg className="w-full h-16 overflow-visible" viewBox="0 0 320 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 20 45 Q 160 5 300 45" stroke="hsl(var(--primary) / 0.15)" strokeWidth="2" strokeDasharray="4 4" />
                <motion.path
                  d="M 20 45 Q 160 5 300 45"
                  stroke="url(#flightArcGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="flightArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Origin Marker */}
              <div className="absolute left-2 bottom-0 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-foreground">{fromCity || "DEP"}</span>
              </div>

              {/* Parabolic Flying Jet Icon */}
              <motion.div
                animate={{
                  x: [15, 275],
                  y: [25, -20, 25],
                  rotate: [-10, 0, 15]
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute left-0 top-1/2 -mt-5 pointer-events-none z-20"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-background">
                  <Plane className="h-4 w-4 rotate-45" />
                </div>
              </motion.div>

              {/* Destination Marker */}
              <div className="absolute right-2 bottom-0 flex items-center gap-1">
                <span className="text-[11px] font-bold text-foreground">{toCity || "ARR"}</span>
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Searching Best Flight Deals
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparing live availability across 150+ international airlines...
              </p>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full max-w-xs bg-muted/80 h-1.5 rounded-full overflow-hidden relative">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-cyan-400 to-indigo-500 rounded-full"
                animate={{ width: ["15%", "95%"] }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showResults && !isSearching && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
                <Plane className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  {filteredResults.length} Flight{filteredResults.length !== 1 ? "s" : ""} Found
                </h3>
                <p className="text-xs text-muted-foreground">
                  {fromCity} → {toCity}{tripType === "roundtrip" && " (Round-trip)"}
                  {filteredResults.length !== searchedFlights.length && ` • Showing ${filteredResults.length} of ${searchedFlights.length}`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowResults(false)} className="text-xs rounded-full">
              <X className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          </div>

          {/* Cheapest by Airline Summary - Top Banner */}
          {cheapestByAirline.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 shrink-0">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground/80 whitespace-nowrap">Cheapest by airline</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {cheapestByAirline.map((entry) => {
                  const logo = getAirlineLogo(entry.airline, entry.logo);
                  const isOverallCheapest = entry.price === cheapestPrice;
                  return (
                    <button
                      key={entry.airline}
                      onClick={() => {
                        setAirlineFilter(prev =>
                          prev.includes(entry.airline)
                            ? prev.filter(a => a !== entry.airline)
                            : [entry.airline]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition-all shrink-0",
                        "hover:border-primary/40 hover:bg-primary/5",
                        isOverallCheapest
                          ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5"
                          : "border-border/40 bg-background",
                        airlineFilter.includes(entry.airline) && "ring-2 ring-primary/30 border-primary/40"
                      )}
                    >
                      {logo ? (
                        <img src={logo} alt={entry.airline} className="h-5 w-5 rounded-md object-contain" />
                      ) : (
                        <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground/80 text-xs">{entry.airline}</span>
                      <span className={cn(
                        "font-bold text-xs",
                        isOverallCheapest ? "text-[hsl(var(--success))]" : "text-foreground"
                      )}>
                        ${entry.price}
                      </span>
                      {isOverallCheapest && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0">
                          Best
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sidebar + Cards Layout */}
          <div className="flex gap-5">
            {/* Sticky Filter Sidebar */}
            <div className="w-[260px] shrink-0 hidden lg:block">
              <div className="sticky top-4 space-y-5">
                <Card className="border-border/40 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Filters
                      </h4>
                      {hasActiveFilters && (
                        <button onClick={() => { setAirlineFilter([]); setPriceRange(resultPriceRange); setStopsFilter([]); setTimeFilter([]); setClassFilter([]); }}
                          className="text-[10px] text-destructive hover:underline cursor-pointer font-medium">
                          Reset All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-5">
                    {/* Sort */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowUpDown className="h-3 w-3" /> Sort By
                      </label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="h-9 rounded-lg bg-secondary/30 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price_asc">Price: Low → High</SelectItem>
                          <SelectItem value="price_desc">Price: High → Low</SelectItem>
                          <SelectItem value="time">Departure Time</SelectItem>
                          <SelectItem value="duration">Duration: Shortest</SelectItem>
                          <SelectItem value="seats">Most Seats</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price Range</label>
                      </div>
                      <div className="bg-secondary/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-primary">${priceRange[0]}</span>
                          <span className="text-[10px] text-muted-foreground">—</span>
                          <span className="text-sm font-bold text-primary">${priceRange[1]}</span>
                        </div>
                        <Slider min={resultPriceRange[0]} max={resultPriceRange[1]} step={10} value={priceRange}
                          onValueChange={(v) => setPriceRange(v as [number, number])} />
                      </div>
                    </div>



                    {/* Stops */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3" /> Stops
                        </label>
                        {stopsFilter.length > 0 && (
                          <button onClick={() => setStopsFilter([])}
                            className="text-[10px] text-primary hover:underline cursor-pointer font-medium">
                            All
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {[
                          { value: "direct", label: "Direct", count: searchedFlights.filter(f => !f.linked_flight_id).length },
                          { value: "1stop", label: "1 Stop", count: searchedFlights.filter(f => !!f.linked_flight_id).length },
                        ].map((stop) => {
                          const isSelected = stopsFilter.length === 0 || stopsFilter.includes(stop.value);
                          return (
                            <button key={stop.value}
                              onClick={() => {
                                if (stopsFilter.length === 0) {
                                  setStopsFilter([stop.value]);
                                } else if (stopsFilter.includes(stop.value)) {
                                  const nf = stopsFilter.filter(s => s !== stop.value);
                                  setStopsFilter(nf);
                                } else {
                                  setStopsFilter([]);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2.5 w-full text-left text-xs px-3 py-2 rounded-lg border transition-all",
                                isSelected
                                  ? "bg-primary/8 border-primary/25 text-foreground font-medium"
                                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                              )}>
                              <div className={cn(
                                "h-6 w-6 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-primary/10" : "bg-muted/30"
                              )}>
                                <ArrowRight className={cn("h-3 w-3", isSelected ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <span className="flex-1">{stop.label}</span>
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{stop.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Class Filter */}
                    {resultClasses.length > 1 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3" /> Class
                          </label>
                          {classFilter.length > 0 && (
                            <button onClick={() => setClassFilter([])}
                              className="text-[10px] text-primary hover:underline cursor-pointer font-medium">
                              All
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {resultClasses.map((cls) => {
                            const isSelected = classFilter.length === 0 || classFilter.includes(cls);
                            const count = searchedFlights.filter(f => (f.class || "economy") === cls).length;
                            return (
                              <button key={cls}
                                onClick={() => {
                                  if (classFilter.length === 0) setClassFilter([cls]);
                                  else if (classFilter.includes(cls)) {
                                    const nf = classFilter.filter(c => c !== cls);
                                    setClassFilter(nf.length === 0 ? [] : nf);
                                  } else {
                                    const nf = [...classFilter, cls];
                                    setClassFilter(nf.length === resultClasses.length ? [] : nf);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-2.5 w-full text-left text-xs px-3 py-2 rounded-lg border transition-all capitalize",
                                  isSelected
                                    ? "bg-primary/8 border-primary/25 text-foreground font-medium"
                                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                                )}>
                                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", isSelected ? "bg-primary/10" : "bg-muted/30")}>
                                  <Briefcase className={cn("h-3 w-3", isSelected ? "text-primary" : "text-muted-foreground")} />
                                </div>
                                <span className="flex-1">{cls}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Airlines */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Filter className="h-3 w-3" /> Airlines
                        </label>
                        {airlineFilter.length > 0 && (
                          <button onClick={() => setAirlineFilter([])}
                            className="text-[10px] text-primary hover:underline cursor-pointer font-medium">
                            All
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {resultAirlines.map((airline) => {
                          const logo = getAirlineLogo(airline, null);
                          const isSelected = airlineFilter.length === 0 || airlineFilter.includes(airline);
                          const count = searchedFlights.filter(f => f.airline === airline).length;
                          return (
                            <button key={airline}
                              onClick={() => {
                                if (airlineFilter.length === 0) {
                                  setAirlineFilter([airline]);
                                } else if (airlineFilter.includes(airline)) {
                                  const nf = airlineFilter.filter(a => a !== airline);
                                  setAirlineFilter(nf.length === 0 ? [] : nf);
                                } else {
                                  const nf = [...airlineFilter, airline];
                                  setAirlineFilter(nf.length === resultAirlines.length ? [] : nf);
                                }
                              }}
                              className={cn(
                                "flex items-center gap-2.5 w-full text-left text-xs px-3 py-2 rounded-lg border transition-all",
                                isSelected
                                  ? "bg-primary/8 border-primary/25 text-foreground font-medium"
                                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                              )}>
                              {logo ? (
                                <img src={logo} alt={airline} className="h-6 w-6 rounded-lg object-contain border border-border/30 p-0.5 bg-background" />
                              ) : (
                                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Plane className="h-3 w-3 text-primary" />
                                </div>
                              )}
                              <span className="flex-1 truncate">{airline}</span>
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Active Filters Badges */}
                  {hasActiveFilters && (
                    <div className="px-4 py-3 border-t border-border/30 bg-muted/20">
                      <div className="flex flex-wrap gap-1.5">
                        {airlineFilter.map(a => (
                          <Badge key={a} variant="secondary" className="text-[9px] gap-1 rounded-full px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                            {a}
                            <X className="h-2 w-2 cursor-pointer" onClick={() => {
                              const nf = airlineFilter.filter(x => x !== a);
                              setAirlineFilter(nf.length === 0 ? [] : nf);
                            }} />
                          </Badge>
                        ))}
                        {stopsFilter.map(s => (
                          <Badge key={s} variant="secondary" className="text-[9px] gap-1 rounded-full px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                            {s === "direct" ? "Direct" : "1 Stop"}
                            <X className="h-2 w-2 cursor-pointer" onClick={() => {
                              setStopsFilter(stopsFilter.filter(x => x !== s));
                            }} />
                          </Badge>
                        ))}
                        {timeFilter.map(t => (
                          <Badge key={t} variant="secondary" className="text-[9px] gap-1 rounded-full px-2 py-0.5 bg-primary/10 text-primary border-primary/20 capitalize">
                            {t}
                            <X className="h-2 w-2 cursor-pointer" onClick={() => {
                              setTimeFilter(timeFilter.filter(x => x !== t));
                            }} />
                          </Badge>
                        ))}
                        {classFilter.map(c => (
                          <Badge key={c} variant="secondary" className="text-[9px] gap-1 rounded-full px-2 py-0.5 bg-primary/10 text-primary border-primary/20 capitalize">
                            {c}
                            <X className="h-2 w-2 cursor-pointer" onClick={() => {
                              const nf = classFilter.filter(x => x !== c);
                              setClassFilter(nf.length === 0 ? [] : nf);
                            }} />
                          </Badge>
                        ))}
                        {(priceRange[0] > resultPriceRange[0] || priceRange[1] < resultPriceRange[1]) && (
                          <Badge variant="secondary" className="text-[9px] gap-1 rounded-full px-2 py-0.5">
                            ${priceRange[0]}–${priceRange[1]}
                            <X className="h-2 w-2 cursor-pointer" onClick={() => setPriceRange(resultPriceRange)} />
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden w-full">
              <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5 rounded-full text-xs mb-3 w-full">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters & Sort
                {activeFilterCount > 0 && (
                  <span className="ml-1 h-4 w-4 flex items-center justify-center text-[9px] bg-primary-foreground text-primary rounded-full font-bold">{activeFilterCount}</span>
                )}
              </Button>
              {showFilters && (
                <Card className="border-border/40 shadow-sm mb-4 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sort</label>
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="h-9 rounded-lg bg-secondary/30 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price_asc">Price: Low → High</SelectItem>
                          <SelectItem value="price_desc">Price: High → Low</SelectItem>
                          <SelectItem value="time">Departure Time</SelectItem>
                          <SelectItem value="duration">Duration: Shortest</SelectItem>
                          <SelectItem value="seats">Most Seats</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Price: ${priceRange[0]}–${priceRange[1]}</label>
                      <Slider min={resultPriceRange[0]} max={resultPriceRange[1]} step={10} value={priceRange}
                        onValueChange={(v) => setPriceRange(v as [number, number])} className="mt-3" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stops</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(["direct", "1stop"] as const).map((stop) => {
                          const isSelected = stopsFilter.includes(stop);
                          const count = searchedFlights.filter(f => stop === "direct" ? !f.linked_flight_id : !!f.linked_flight_id).length;
                          return (
                            <button key={stop} onClick={() => {
                              setStopsFilter(prev => prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]);
                            }} className={cn("text-[10px] px-2 py-1 rounded-full border", isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground")}>
                              {stop === "direct" ? "Direct" : "1 Stop"} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {resultClasses.length > 1 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Class</label>
                        <div className="flex flex-wrap gap-1.5">
                          {resultClasses.map((cls) => {
                            const isSelected = classFilter.includes(cls);
                            return (
                              <button key={cls} onClick={() => {
                                setClassFilter(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
                              }} className={cn("text-[10px] px-2 py-1 rounded-full border capitalize", isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground")}>
                                {cls}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Airlines</label>
                      <div className="flex flex-wrap gap-1.5">
                        {resultAirlines.map((airline) => {
                          const isSelected = airlineFilter.length === 0 || airlineFilter.includes(airline);
                          return (
                            <button key={airline} onClick={() => {
                              if (airlineFilter.length === 0) setAirlineFilter([airline]);
                              else if (airlineFilter.includes(airline)) { const nf = airlineFilter.filter(a => a !== airline); setAirlineFilter(nf.length === 0 ? [] : nf); }
                              else { const nf = [...airlineFilter, airline]; setAirlineFilter(nf.length === resultAirlines.length ? [] : nf); }
                            }} className={cn("text-[10px] px-2 py-1 rounded-full border", isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground")}>
                              {airline}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>




            {/* Flight Cards */}
            <div className="flex-1 min-w-0">
              {filteredResults.length === 0 && returnSearchedFlights.length === 0 ? (
                <Card className="border-border/40 overflow-hidden bg-card/50 backdrop-blur-sm">
                  <div className="text-center py-16 px-6">
                    <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6 relative">
                      <Plane className="h-10 w-10 text-muted-foreground/40 -rotate-45" />
                      <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/20 rounded-2xl animate-[spin_10s_linear_infinite]" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">No flights match your search</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                      We couldn't find any flights for {fromCity} to {toCity} on this specific date.
                    </p>

                    <div className="mt-8 space-y-4">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest">Try these alternatives:</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="outline" size="sm" className="rounded-xl gap-2"
                          onClick={() => {
                            // Suggest +1 day
                            if (departureDate) {
                              const nextDay = addDays(departureDate, 1);
                              setDepartureDate(nextDay);
                              setTimeout(handleFlightSearch, 100);
                            }
                          }}>
                          <ArrowRight className="h-3.5 w-3.5" /> Next Day
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl gap-2"
                          onClick={() => setDepartureDateOpen(true)}>
                          <Calendar className="h-3.5 w-3.5" /> Open Calendar
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-xl"
                          onClick={() => { setAirlineFilter([]); setClassFilter([]); setPriceRange(resultPriceRange); }}>
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : tripType === "multicity" ? (
                <div className="space-y-8">
                  {multiCityLegs.map((leg, legIdx) => {
                    const legFlights = filteredResults.filter((f: any) => f._legIndex === legIdx);
                    if (legFlights.length === 0) return null;

                    return (
                      <div key={legIdx} className="space-y-4">
                        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
                          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {legIdx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-foreground">{leg.from} → {leg.to}</p>
                            <p className="text-[10px] text-muted-foreground">{leg.date ? format(leg.date, "dd MMM yyyy") : "Flexible"}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {legFlights.map((flight, index) => renderFlightCard(flight, index, `leg-${legIdx}`))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Multi-city bottom selection summary panel */}
                  {Object.keys(selectedMultiCityFlights).length > 0 && (
                    <Card className="border-[#2A3F8B]/30 bg-card overflow-hidden mt-8 shadow-md rounded-2xl animate-[card-slide-up_0.3s_ease-out]">
                      {/* Header strip */}
                      <div className="bg-[#2A3F8B] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                            <Plane className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span className="font-bold text-sm text-primary-foreground tracking-wide">Multi-City Selection ({Object.keys(selectedMultiCityFlights).length} of {multiCityLegs.length} legs selected)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {multiCityFareLines.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-primary-foreground/70">Estimated Total</span>
                              <span className="text-lg font-bold text-primary-foreground">{formatCurrency(multiCityTotal, Object.values(selectedMultiCityFlights)[0]?.currency)}</span>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedMultiCityFlights({})}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-primary-foreground text-xs font-bold transition-all"
                          >
                            <X className="h-3 w-3" /> Clear Selection
                          </button>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {multiCityLegs.map((leg, idx) => {
                          const flight = selectedMultiCityFlights[idx];
                          return (
                            <div key={idx} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border/60 bg-muted/20">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-[#2A3F8B]/10 text-[#2A3F8B] flex items-center justify-center text-xs font-bold shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground truncate">{leg.from} → {leg.to}</p>
                                  {flight ? (
                                    <p className="text-[11px] text-muted-foreground truncate font-medium">
                                      {flight.airline} • {flight.flight_number || "IA"} • {formatTime(flight.departure_time)} - {formatTime(flight.arrival_time)}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-destructive font-medium italic">No flight selected for this leg</p>
                                  )}
                                </div>
                              </div>
                              {flight && (
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-primary">${getEffectiveAdultPrice(flight)}/pp</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Rate Breakdown */}
                        {multiCityFareLines.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end pt-4 border-t border-border/45">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Receipt className="h-3.5 w-3.5 text-[#2A3F8B]" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rate Breakdown</span>
                              </div>
                              {multiCityFareLines.map((fl, i) => (
                                <div key={i} className="flex justify-between text-xs items-center">
                                  <span className="text-muted-foreground font-medium">{fl.count}x {fl.personType}</span>
                                  <div className="text-right flex items-center gap-2">
                                    <span className="font-bold text-foreground">{formatCurrency(fl.rate, selectedOutboundFlight?.currency)}</span>
                                    {fl.commission > 0 && (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0 font-semibold">
                                        ${fl.commission} comm.
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">Commission:</span>
                                    <span className="font-bold text-[hsl(var(--success))]">{formatCurrency(multiCityCommission, Object.values(selectedMultiCityFlights)[0]?.currency)}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">Net:</span>
                                    <span className="font-bold text-[#2A3F8B]">{formatCurrency(multiCityNet, Object.values(selectedMultiCityFlights)[0]?.currency)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground font-medium">Total Amount</p>
                                  <p className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(multiCityTotal, Object.values(selectedMultiCityFlights)[0]?.currency)}</p>
                                </div>
                              </div>
                            </div>
                            <Button
                              className="rounded-xl px-8 gap-2 font-bold shadow-lg shadow-primary/25 h-11 text-sm bg-gradient-to-r from-primary to-blue-500 text-primary-foreground hover:opacity-95"
                              disabled={!isAllMultiCityLegsSelected}
                              onClick={handleMultiCityBook}
                            >
                              {isAllMultiCityLegsSelected ? "Book Multi-city" : "Select all legs to book"} <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              ) : tripType === "roundtrip" ? (
                /* ========== ROUND-TRIP: Paired cards first, optional custom selection ========== */
                <div className="space-y-6">
                  {/* Toggle between paired view and custom selection */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant={showCustomFlightSelection ? "default" : "outline"}
                      size="sm"
                      className="rounded-full gap-1.5 text-xs"
                      onClick={() => setShowCustomFlightSelection(true)}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Select your flight
                    </Button>
                    <Button
                      variant={!showCustomFlightSelection ? "default" : "outline"}
                      size="sm"
                      className="rounded-full gap-1.5 text-xs"
                      onClick={() => { setShowCustomFlightSelection(false); setSelectedOutboundFlight(null); setSelectedReturnFlight(null); }}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Round Trip Flight Offer
                    </Button>
                  </div>

                  {!showCustomFlightSelection ? (
                    /* ── PAIRED ROUND-TRIP CARDS ── */
                    <div className="space-y-4">
                      {roundTripPairs.length === 0 ? (
                        <Card className="p-8 text-center border-border/30">
                          <Plane className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">No round-trip combinations found</p>
                          <Button variant="link" size="sm" className="mt-2" onClick={() => setShowCustomFlightSelection(true)}>
                            Try custom selection →
                          </Button>
                        </Card>
                      ) : (
                        roundTripPairs.map((pair, index) => {
                          const outPrice = getEffectiveAdultPrice(pair.outbound);
                          const retPrice = pair.return ? getEffectiveAdultPrice(pair.return) : 0;
                          const combinedPrice = pair.combinedPrice;
                          const outLogo = getAirlineLogo(pair.outbound.airline, pair.outbound.airline_logo);
                          const retLogo = pair.return ? getAirlineLogo(pair.return.airline, pair.return.airline_logo) : null;
                          const isLinked = pair.priority === 0;
                          const isSameAirline = pair.return && pair.outbound.airline === pair.return.airline;
                          const isSelected = selectedOutboundFlight?.id === pair.outbound.id && selectedReturnFlight?.id === pair.return?.id;
                          const isCheapestPair = index === 0 || combinedPrice === roundTripPairs[0].combinedPrice;

                          const nights = pair.return?.departure_date && pair.outbound.departure_date
                            ? Math.max(1, differenceInDays(new Date(pair.return.departure_date), new Date(pair.outbound.departure_date)))
                            : 0;
                          const minSeats = Math.min(
                            pair.outbound.available_seats ?? 999,
                            pair.return?.available_seats ?? 999
                          );
                          const lowSeats = minSeats > 0 && minSeats <= 10;
                          const totalForAllPax = combinedPrice * Math.max(1, totalPassengers);

                          // Calculate tier info for the round trip pair
                          const outTierInfo = getNextTierInfo(pair.outbound);
                          const retTierInfo = pair.return ? getNextTierInfo(pair.return) : null;
                          let pairTierInfo: { nextPrice: number; seatsLeftInTier: number } | null = null;
                          
                          if (isLinked || !pair.return) {
                            pairTierInfo = outTierInfo;
                          } else {
                            if (outTierInfo && retTierInfo) {
                              const seatsLeftInTier = Math.min(outTierInfo.seatsLeftInTier, retTierInfo.seatsLeftInTier);
                              let nextPrice = combinedPrice;
                              if (outTierInfo.seatsLeftInTier < retTierInfo.seatsLeftInTier) {
                                nextPrice = outTierInfo.nextPrice + retPrice;
                              } else if (retTierInfo.seatsLeftInTier < outTierInfo.seatsLeftInTier) {
                                nextPrice = outPrice + retTierInfo.nextPrice;
                              } else {
                                nextPrice = outTierInfo.nextPrice + retTierInfo.nextPrice;
                              }
                              pairTierInfo = { nextPrice, seatsLeftInTier };
                            } else if (outTierInfo) {
                              pairTierInfo = {
                                nextPrice: outTierInfo.nextPrice + retPrice,
                                seatsLeftInTier: outTierInfo.seatsLeftInTier
                              };
                            } else if (retTierInfo) {
                              pairTierInfo = {
                                nextPrice: outPrice + retTierInfo.nextPrice,
                                seatsLeftInTier: retTierInfo.seatsLeftInTier
                              };
                            }
                          }

                          return (
                            <Card
                              key={`${pair.outbound.id}-${pair.return?.id || 'no-return'}-${pair.priority}`}
                              className={cn(
                                "group relative overflow-hidden transition-all duration-500 cursor-pointer rounded-2xl bg-white",
                                isSelected ? "border-[1.5px] border-[#2A3F8B] shadow-md" : "border-border/60 shadow-sm hover:border-[#2A3F8B]/40 hover:shadow-xl hover:-translate-y-0.5",
                                isCheapestPair && !isSelected && "border-amber-500/40 hover:border-amber-500/60"
                              )}
                              onClick={() => {
                                setSelectedOutboundFlight(pair.outbound);
                                if (pair.return) setSelectedReturnFlight(pair.return);
                              }}
                            >
                              <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#2A3F8B] border-l-transparent z-10 pointer-events-none" />

                              {/* Header bar / badges */}
                              {isCheapestPair && (
                                <div className="bg-emerald-50 text-emerald-600 border-b border-emerald-100 px-6 py-1.5 flex items-center gap-2">
                                  <Tag className="h-3 w-3" />
                                  <span className="text-[10px] font-bold tracking-wide uppercase">Best Value Package</span>
                                </div>
                              )}

                              <div className="pt-5 px-6 pb-0 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-none">
                                    Round Trip Pair
                                  </Badge>
                                  {isLinked && (
                                    <Badge className="bg-amber-500 text-white border-0 font-bold px-3 py-0.5 rounded-full text-[11px] flex items-center gap-1.5 shadow-sm">
                                      <ArrowRightLeft className="h-3 w-3" /> Special Round Trip Offer
                                    </Badge>
                                  )}
                                  {isSameAirline && !isLinked && (
                                    <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-none">
                                      Same Airline
                                    </Badge>
                                  )}
                                  {!isSameAirline && pair.return && (
                                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-none">
                                      Mixed Airlines
                                    </Badge>
                                  )}
                                  {(pair.outbound.is_featured || pair.return?.is_featured) && (
                                    <Badge className="bg-amber-500 text-white border-0 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                      <Star className="h-2.5 w-2.5 fill-white" /> Featured
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col md:flex-row">
                                <div className="flex-1 p-6 space-y-6">
                                  {/* Outbound leg */}
                                  <div className="flex items-center gap-5">
                                    <div className="shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-2">
                                      {outLogo ? (
                                        <img src={outLogo} alt={pair.outbound.airline} className="max-h-full max-w-full object-contain" />
                                      ) : (
                                        <Plane className="h-10 w-10 text-[#2A3F8B]" />
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between gap-4 sm:gap-6 flex-1">
                                      <div className="text-left min-w-[50px] sm:min-w-[70px]">
                                        <p className="text-xl sm:text-3xl font-black tracking-tight text-[#2A3F8B] leading-none">{formatTime(pair.outbound.departure_time)}</p>
                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5 flex items-center gap-1 tracking-wide">
                                          {pair.outbound.departure_airport_code || pair.outbound.departure_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">{pair.outbound.departure_date && !isNaN(new Date(pair.outbound.departure_date).getTime()) ? format(new Date(pair.outbound.departure_date), "dd MMM yyyy") : ""}</p>
                                      </div>

                                      <div className="flex-1 max-w-[200px] flex items-center relative mx-2">
                                        <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-white absolute left-0 z-10" />
                                        <div className="w-full border-t-[1.5px] border-dashed border-[#2A3F8B]/30" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bg-white px-3 py-1 text-[9px] font-black tracking-widest text-[#2A3F8B] border border-[#2A3F8B]/10 rounded-full flex flex-col items-center justify-center shadow-[0_2px_10px_-3px_rgba(42,63,139,0.15)] z-10">
                                          <span className="text-muted-foreground/80 mb-0.5">{calcDuration(pair.outbound.departure_time, pair.outbound.arrival_time) || "1h 30m"}</span>
                                          <span className="text-[#2A3F8B]">OUTBOUND</span>
                                        </div>
                                        <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-[#2A3F8B] absolute right-0 z-10" />
                                      </div>

                                      <div className="text-right min-w-[50px] sm:min-w-[70px]">
                                        <div className="flex items-baseline justify-end gap-0.5">
                                          <p className="text-xl sm:text-3xl font-black tracking-tight text-[#2A3F8B] leading-none">{formatTime(pair.outbound.arrival_time)}</p>
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5 flex items-center justify-end gap-1 tracking-wide">
                                          {pair.outbound.arrival_airport_code || pair.outbound.arrival_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">{pair.outbound.departure_date && !isNaN(new Date(pair.outbound.departure_date).getTime()) ? format(new Date(pair.outbound.departure_date), "dd MMM yyyy") : ""}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Return leg */}
                                  {pair.return ? (
                                    <div className="flex items-center gap-5 pt-6 border-t border-border/40">
                                      <div className="shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-2">
                                        {retLogo ? (
                                          <img src={retLogo} alt={pair.return.airline} className="max-h-full max-w-full object-contain" />
                                        ) : (
                                          <Plane className="h-10 w-10 text-[#2A3F8B] -rotate-90" />
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between gap-4 sm:gap-6 flex-1">
                                        <div className="text-left min-w-[50px] sm:min-w-[70px]">
                                          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-none">{formatTime(pair.return.departure_time)}</p>
                                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1 tracking-wide">
                                            {pair.return.departure_airport_code || pair.return.departure_city?.substring(0, 3).toUpperCase()}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">{pair.return.departure_date && !isNaN(new Date(pair.return.departure_date).getTime()) ? format(new Date(pair.return.departure_date), "dd MMM yyyy") : ""}</p>
                                        </div>

                                        <div className="flex-1 max-w-xs flex items-center mt-2">
                                          <div className="h-[1.5px] flex-1 bg-border/60" />
                                          <div className="bg-white px-3 py-1 text-[10px] font-bold tracking-wider text-[#2A3F8B] border border-border/60 rounded-full flex flex-col items-center gap-0.5 whitespace-nowrap shadow-sm mx-2">
                                            <span className="text-[#2A3F8B]">RETURN</span>
                                            <span className="text-muted-foreground text-[9px]">{calcDuration(pair.return.departure_time, pair.return.arrival_time) || "Direct"}</span>
                                          </div>
                                          <div className="h-[1.5px] flex-1 bg-border/60" />
                                        </div>

                                        <div className="text-right min-w-[50px] sm:min-w-[70px]">
                                          <div className="flex items-baseline justify-end gap-0.5">
                                            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-none">{formatTime(pair.return.arrival_time)}</p>
                                          </div>
                                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-1 flex items-center justify-end gap-1 tracking-wide">
                                            {pair.return.arrival_airport_code || pair.return.arrival_city?.substring(0, 3).toUpperCase()}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">{pair.return.departure_date && !isNaN(new Date(pair.return.departure_date).getTime()) ? format(new Date(pair.return.departure_date), "dd MMM yyyy") : ""}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}

                                  {/* Airline / flight details */}
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 flex-wrap">
                                    <span className="font-semibold text-foreground/80">{pair.outbound.airline}</span>
                                    {(pair.outbound.departure_flight_number || pair.outbound.flight_number) && (
                                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-foreground/70">
                                        {pair.outbound.departure_flight_number || pair.outbound.flight_number}
                                      </span>
                                    )}
                                    {pair.return && (
                                      <>
                                        {pair.return.airline !== pair.outbound.airline && (
                                          <>
                                            <span>•</span>
                                            <span className="font-semibold text-foreground/80">{pair.return.airline}</span>
                                          </>
                                        )}
                                        {(pair.return.return_flight_number || pair.outbound.return_flight_number || pair.return.departure_flight_number || pair.return.flight_number) && (
                                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[10px] font-mono font-bold text-blue-700 border border-blue-100">
                                            {pair.return.return_flight_number || pair.outbound.return_flight_number || pair.return.departure_flight_number || pair.return.flight_number}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {nights > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="font-medium">{nights} {nights === 1 ? "night trip" : "nights trip"}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span>Outbound: {getBaggage(pair.outbound.class, pair.outbound.baggage)}</span>
                                    {pair.return && (
                                      <>
                                        <span>•</span>
                                        <span>Return: {getBaggage(pair.return.class, pair.return.baggage)}</span>
                                      </>
                                    )}
                                    {lowSeats && (
                                      <Badge className="bg-destructive/10 text-destructive border-0 font-semibold px-2 py-0.5 rounded-full text-[10px] animate-pulse shadow-none">
                                        Only {minSeats} left
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {/* Pricing / Booking Column */}
                                <div className="md:border-l border-t md:border-t-0 border-border/40 bg-gradient-to-b from-white to-[#F8FAFC] p-6 flex flex-col justify-center items-end md:w-[220px] shrink-0 group-hover:bg-[#F0F4F8] transition-colors">
                                  <div className="text-right w-full">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Round Trip Total</p>
                                    <p className="text-3xl font-black text-[#2A3F8B] leading-none tabular-nums">{formatCurrency(combinedPrice, pair.outbound.currency)}</p>
                                    {totalPassengers > 1 ? (
                                      <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">
                                        × {totalPassengers} pax = <span className="text-[#2A3F8B] font-black">{formatCurrency(totalForAllPax, pair.outbound.currency)}</span>
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider">per person</p>
                                    )}
                                    <div className="mt-2 flex flex-col items-end gap-1">
                                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        pairTierInfo
                                          ? pairTierInfo.seatsLeftInTier <= 2
                                            ? 'bg-destructive/15 text-destructive animate-pulse'
                                            : pairTierInfo.seatsLeftInTier <= 5
                                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : minSeats === 0
                                            ? 'bg-destructive text-white'
                                            : minSeats <= 5
                                              ? 'bg-destructive/15 text-destructive animate-pulse'
                                              : minSeats <= 10
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}>
                                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        {pairTierInfo ? `Just ${pairTierInfo.seatsLeftInTier} at this price` : minSeats === 0 ? 'Sold Out' : `${minSeats} seats`}
                                      </div>
                                      {pairTierInfo && (
                                        <span className="text-[10px] font-extrabold text-[#2A3F8B] tracking-wide mt-0.5 whitespace-nowrap bg-blue-50/70 px-2.5 py-1 rounded border border-blue-200">
                                          Next rate: <span className="font-black text-[#2A3F8B]">{formatCurrency(pairTierInfo.nextPrice, pair.outbound.currency)}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {isSelected ? (
                                    <Button
                                      className="w-full rounded-full font-bold tracking-wide shadow-md shadow-[#2A3F8B]/20 bg-[#2A3F8B] hover:bg-[#1f2f6a] group/btn mt-4 h-11 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (pair.return) {
                                          handleFlightSelectWithSave?.(pair.outbound, totalPassengers, pair.return, { adults, children, infants });
                                        }
                                      }}
                                    >
                                      Confirm & Book
                                      <ArrowRight className="h-4 w-4 ml-2 transition-transform duration-200 group-hover/btn:translate-x-1" />
                                    </Button>
                                  ) : (
                                    <Button size="sm" className="w-full rounded-full mt-4 gap-1.5 font-bold text-xs h-11 bg-white text-[#2A3F8B] border border-[#2A3F8B]/30 hover:bg-[#2A3F8B] hover:text-white transition-all shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedOutboundFlight(pair.outbound);
                                        if (pair.return) setSelectedReturnFlight(pair.return);
                                      }}>
                                      Select Pair <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    /* ── CUSTOM SELECTION: Separate outbound + return lists ── */
                    <div className="space-y-6">
                      {/* ── OUTBOUND FLIGHTS ── */}
                      <div className="space-y-3" id="custom-outbound-flights-section">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F0F4F8] border border-border/40 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#2A3F8B] flex items-center justify-center shadow-sm">
                              <PlaneTakeoff className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[#2A3F8B] tracking-tight">
                                  Outbound Flights
                                </h3>
                                <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 text-[8px] h-4 px-1.5 font-bold tracking-wider">✈ OUTBOUND</Badge>
                                {departureDate && (
                                  <Badge className="bg-white text-[#2A3F8B] border border-[#2A3F8B]/20 text-xs px-3 py-0.5 font-bold shadow-sm ml-1">
                                    {format(departureDate, "EEE, d MMM yyyy")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{fromCity} → {toCity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border border-border/40 text-[10px] font-bold tracking-wide hover:bg-[#D1D5DB]">
                              {customOutboundFlights.length} flight{customOutboundFlights.length !== 1 ? "s" : ""}
                            </Badge>
                            {!selectedOutboundFlight && selectedReturnFlight && (
                              <Badge className="bg-[#2A3F8B] text-white border-0 animate-pulse text-[10px]">
                                Pick your outbound →
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Sort package flights first, then by price */}
                        {[...customOutboundFlights].sort((a, b) => {
                          const aPkg = isPackageFlight(a) ? 0 : 1;
                          const bPkg = isPackageFlight(b) ? 0 : 1;
                          if (aPkg !== bPkg) return aPkg - bPkg;
                          return getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b);
                        }).map((flight) => {
                          const duration = calcDuration(flight.departure_time, flight.arrival_time);
                          const effectivePrice = getEffectiveAdultPrice(flight);
                          const isCheapest = effectivePrice === Math.min(...customOutboundFlights.map(f => getEffectiveAdultPrice(f))) && customOutboundFlights.length > 1;
                          const isSelected = selectedOutboundFlight?.id === flight.id;
                          const outLogo = getAirlineLogo(flight.airline, flight.airline_logo);
                          const seatsLeft = flight.available_seats || 0;

                          return (
                            <Card
                              key={flight.id}
                              className={cn(
                                "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer rounded-2xl bg-white",
                                isSelected
                                  ? "border-2 border-[#2A3F8B] shadow-[0_8px_30px_rgba(42,63,139,0.12)] scale-[1.005] bg-gradient-to-br from-white to-blue-50/30 ring-1 ring-[#2A3F8B]/10"
                                  : "border-border/60 shadow-sm hover:border-[#2A3F8B]/40 hover:shadow-lg hover:-translate-y-0.5",
                                isCheapest && !isSelected && "border-amber-500/40 hover:border-amber-500/60"
                              )}
                              onClick={() => handleSelectCustomOutbound(flight)}
                            >
                              <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#2A3F8B] border-l-transparent z-10 pointer-events-none" />
                              <div className="pt-4 px-5 pb-0 flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isPackageFlight(flight) && (
                                    <Badge className="bg-amber-500 text-white border-0 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-sm">
                                      <ArrowRightLeft className="h-3 w-3" /> Special Round Trip Offer
                                    </Badge>
                                  )}
                                  {isCheapest && (
                                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide shadow-none flex items-center gap-1">
                                      <Tag className="h-3 w-3" /> Best Value
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch">
                                <div className="flex-1 p-4 sm:p-5">
                                  <div className="flex items-center gap-4">
                                    <div className="shrink-0 w-12 sm:w-16 h-12 sm:h-16 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-1.5">
                                      {outLogo ? (
                                        <img src={outLogo} alt={flight.airline} className="max-h-full max-w-full object-contain" />
                                      ) : (
                                        <Plane className="h-10 w-10 text-[#2A3F8B]" />
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between gap-4 sm:gap-6 flex-1">
                                      <div className="text-left min-w-[50px] sm:min-w-[70px]">
                                        <p className="text-xl sm:text-3xl font-black tracking-tight text-[#2A3F8B] leading-none">{formatTime(flight.departure_time)}</p>
                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5 flex items-center gap-1 tracking-wide">
                                          {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover shrink-0 shadow-sm" />}
                                          {flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>

                                      <div className="flex-1 max-w-[200px] flex items-center relative mx-2">
                                        <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-white absolute left-0 z-10" />
                                        <div className="w-full border-t-[1.5px] border-dashed border-[#2A3F8B]/30" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bg-white px-3 py-1 text-[9px] font-black tracking-widest text-[#2A3F8B] border border-[#2A3F8B]/10 rounded-full flex flex-col items-center justify-center shadow-[0_2px_10px_-3px_rgba(42,63,139,0.15)] z-10">
                                          <span className="text-muted-foreground/80 mb-0.5">{duration || "1h 30m"}</span>
                                          <span className="text-[#2A3F8B]">DIRECT</span>
                                        </div>
                                        <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-[#2A3F8B] absolute right-0 z-10" />
                                      </div>

                                      <div className="text-right min-w-[50px] sm:min-w-[70px]">
                                        <p className="text-xl sm:text-3xl font-black tracking-tight text-[#2A3F8B] leading-none">{formatTime(flight.arrival_time)}</p>
                                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5 flex items-center justify-end gap-1 tracking-wide">
                                          {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover shrink-0 shadow-sm" />}
                                          {flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4 ml-[70px] sm:ml-[100px] flex-wrap">
                                    <span className="font-bold text-[#2A3F8B]">{flight.airline}</span>
                                    {(flight.departure_flight_number || flight.flight_number) && (
                                      <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-mono font-bold text-muted-foreground">
                                        {flight.departure_flight_number || flight.flight_number}
                                      </span>
                                    )}
                                    {flight.class && <span className="font-medium">• {flight.class}</span>}
                                    <span className="font-medium">• {getBaggage(flight.class, flight.baggage)}</span>
                                    {seatsLeft === 0 ? (
                                      <Badge className="bg-destructive text-white border-0 font-bold px-2 py-0.5 rounded-full text-[10px] shadow-none">Sold Out</Badge>
                                    ) : seatsLeft <= 5 ? (
                                      <Badge className="bg-destructive/15 text-destructive border-0 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse shadow-none">Only {seatsLeft} left!</Badge>
                                    ) : seatsLeft <= 10 ? (
                                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px] shadow-none">{seatsLeft} seats left</Badge>
                                    ) : (
                                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[10px] shadow-none">{seatsLeft} seats available</Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="sm:border-l border-t sm:border-t-0 border-border/40 bg-gradient-to-b from-white to-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-center items-end sm:w-[160px] shrink-0 group-hover:bg-[#F0F4F8] transition-colors">
                                  <div className="text-right w-full">
                                    <p className="text-2xl sm:text-3xl font-black text-[#2A3F8B] leading-none tabular-nums">{formatCurrency(effectivePrice, flight.currency)}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">per person</p>
                                    <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${seatsLeft === 0 ? 'bg-destructive text-white' :
                                        seatsLeft <= 5 ? 'bg-destructive/15 text-destructive animate-pulse' :
                                          seatsLeft <= 10 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}>
                                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                                      {seatsLeft === 0 ? 'Sold Out' : `${seatsLeft} seats`}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <Button variant="outline" size="sm" className="w-full mt-4 rounded-full border-destructive text-destructive hover:bg-destructive/10 bg-destructive/5 font-bold h-9 text-xs transition-all shadow-sm" onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCustomOutbound(flight);
                                    }}>
                                      <X className="h-3.5 w-3.5 mr-1" /> Unselect
                                    </Button>
                                  ) : (
                                    <Button variant="outline" size="sm" className="w-full mt-4 rounded-full border-[#2A3F8B]/30 text-[#2A3F8B] hover:bg-[#2A3F8B] hover:text-white font-bold h-9 text-xs transition-all shadow-sm" disabled={seatsLeft === 0} onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCustomOutbound(flight);
                                    }}>
                                      {seatsLeft === 0 ? 'Sold Out' : 'Select Flight'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>

                      {/* ── RETURN FLIGHTS ── */}
                      <div className="space-y-3" id="custom-return-flights-section">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F0F4F8] border border-border/40 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-[#2A3F8B] flex items-center justify-center shadow-sm">
                              <PlaneLanding className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[#2A3F8B] tracking-tight">
                                  Return Flights
                                </h3>
                                <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 text-[8px] h-4 px-1.5 font-bold tracking-wider">↩ RETURN</Badge>
                                {returnDate && (
                                  <Badge className="bg-white text-[#2A3F8B] border border-[#2A3F8B]/20 text-xs px-3 py-0.5 font-bold shadow-sm ml-1">
                                    {format(returnDate, "EEE, d MMM yyyy")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{toCity} → {fromCity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border border-border/40 text-[10px] font-bold tracking-wide hover:bg-[#D1D5DB]">
                              {customReturnFlights.length} flight{customReturnFlights.length !== 1 ? "s" : ""}
                            </Badge>
                            {selectedOutboundFlight && !selectedReturnFlight && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse text-[10px]">
                                Pick your return →
                              </Badge>
                            )}
                          </div>
                        </div>

                        {customReturnFlights.length === 0 ? (
                          <Card className="p-8 text-center border-dashed border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl">
                            <Plane className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2 rotate-180" />
                            <p className="text-sm text-muted-foreground font-medium">No return flights available for this date</p>
                          </Card>
                        ) : (
                          (() => {
                            const sorted = [...customReturnFlights].sort((a, b) => {
                              const aPkg = isPackageFlight(a) ? 0 : 1;
                              const bPkg = isPackageFlight(b) ? 0 : 1;
                              if (aPkg !== bPkg) return aPkg - bPkg;

                              if (selectedOutboundFlight) {
                                const aMatch = a.airline === selectedOutboundFlight.airline ? 0 : 1;
                                const bMatch = b.airline === selectedOutboundFlight.airline ? 0 : 1;
                                if (aMatch !== bMatch) return aMatch - bMatch;
                              }
                              return getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b);
                            });
                            const cheapestReturn = Math.min(...sorted.map(f => getEffectiveAdultPrice(f)));

                            return sorted.map((flight) => {
                              const effectivePrice = getEffectiveAdultPrice(flight);
                              const isCheapest = effectivePrice === cheapestReturn && sorted.length > 1;
                              const isSelected = selectedReturnFlight?.id === flight.id;
                              const isSameAirline = selectedOutboundFlight && flight.airline === selectedOutboundFlight.airline;
                              const retLogo = getAirlineLogo(flight.airline, flight.airline_logo);
                              const seatsLeft = flight.available_seats || 0;
                              const isRoundTripReturn = isPackageFlight(flight) || (selectedOutboundFlight && isPackageFlight(selectedOutboundFlight));
                              const duration = calcDuration(flight.departure_time, flight.arrival_time);

                              return (
                                <Card
                                  key={flight.id}
                                  className={cn(
                                    "group relative overflow-hidden border rounded-2xl cursor-pointer transition-all duration-300 ease-out",
                                    isSelected
                                      ? "border-2 border-[#2A3F8B] shadow-[0_8px_30px_rgba(42,63,139,0.12)] scale-[1.005] bg-gradient-to-br from-white to-blue-50/30 ring-1 ring-[#2A3F8B]/10"
                                      : "border-border/60 shadow-sm hover:border-[#2A3F8B]/40 hover:shadow-lg hover:-translate-y-0.5 bg-white",
                                    isCheapest && !isSelected && "border-amber-500/40 hover:border-amber-500/60"
                                  )}
                                  onClick={() => handleSelectCustomReturn(flight)}
                                >
                                  <div className="absolute top-0 right-0 border-t-[30px] border-l-[30px] border-t-[#2A3F8B] border-l-transparent z-10 pointer-events-none" />
                                  <div className="pt-5 px-6 pb-0 flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {isPackageFlight(flight) && (
                                        <Badge className="bg-amber-500 text-white border-0 font-bold px-3 py-0.5 rounded-full text-[11px] flex items-center gap-1 shadow-sm">
                                          <ArrowRightLeft className="h-3 w-3" /> Special Round Trip Offer
                                        </Badge>
                                      )}
                                      {isSameAirline && (
                                        <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-3 py-0.5 rounded-full text-[11px] shadow-none">
                                          Same Airline
                                        </Badge>
                                      )}
                                      {isCheapest && (
                                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide shadow-none flex items-center gap-1">
                                          <Tag className="h-3 w-3" /> Best Value
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row items-stretch">
                                    <div className="flex-1 p-4 sm:p-5">
                                      <div className="flex items-center gap-4">
                                        <div className="shrink-0 w-12 sm:w-16 h-12 sm:h-16 rounded-xl bg-white border border-border/60 shadow-sm flex items-center justify-center p-1.5">
                                          {retLogo ? (
                                            <img src={retLogo} alt={flight.airline} className="max-h-full max-w-full object-contain" />
                                          ) : (
                                            <Plane className="h-8 w-8 text-[#2A3F8B] -rotate-90" />
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between gap-4 sm:gap-6 flex-1">
                                          <div className="text-left min-w-[50px] sm:min-w-[65px]">
                                            <p className="text-lg sm:text-xl font-bold tracking-tight text-[#2A3F8B] leading-none">{formatTime(flight.departure_time)}</p>
                                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1 tracking-wide">
                                              {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover shrink-0 shadow-sm" />}
                                              {flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">{flight.departure_date && !isNaN(new Date(flight.departure_date).getTime()) ? format(new Date(flight.departure_date), "dd MMM yyyy") : ""}</p>
                                          </div>

                                          <div className="flex-1 max-w-[180px] flex items-center relative mx-1.5">
                                            <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-white absolute left-0 z-10" />
                                            <div className="w-full border-t-[1.5px] border-dashed border-[#2A3F8B]/30" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bg-white px-2.5 py-0.5 text-[9px] font-black tracking-widest text-[#2A3F8B] border border-[#2A3F8B]/10 rounded-full flex flex-col items-center justify-center shadow-[0_2px_10px_-3px_rgba(42,63,139,0.15)] z-10">
                                              <span className="text-muted-foreground/80 mb-0.5">{duration || "1h 30m"}</span>
                                              <span className="text-[#2A3F8B] text-[8px]">DIRECT</span>
                                            </div>
                                            <div className="h-2 w-2 rounded-full border-[1.5px] border-[#2A3F8B] bg-[#2A3F8B] absolute right-0 z-10" />
                                          </div>

                                          <div className="text-right min-w-[50px] sm:min-w-[65px]">
                                            <p className="text-lg sm:text-xl font-bold tracking-tight text-[#2A3F8B] leading-none">{formatTime(flight.arrival_time)}</p>
                                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1 flex items-center justify-end gap-1 tracking-wide">
                                              {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[2px] object-cover shrink-0 shadow-sm" />}
                                              {flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-3 ml-[60px] sm:ml-[80px] flex-wrap">
                                        <span className="font-bold text-[#2A3F8B]">{flight.airline}</span>
                                        {(flight.return_flight_number || flight.departure_flight_number || flight.flight_number) && (
                                          <span className="px-2 py-0.5 rounded bg-muted/60 text-[10px] font-mono font-bold text-muted-foreground">
                                            {flight.return_flight_number || flight.departure_flight_number || flight.flight_number}
                                          </span>
                                        )}
                                        {flight.class && <span className="font-medium">• {flight.class}</span>}
                                        <span className="font-medium">• {getBaggage(flight.class, flight.baggage)}</span>
                                        {seatsLeft === 0 ? (
                                          <Badge className="bg-destructive text-white border-0 font-bold px-2 py-0.5 rounded-full text-[10px] shadow-none">Sold Out</Badge>
                                        ) : seatsLeft <= 5 ? (
                                          <Badge className="bg-destructive/15 text-destructive border-0 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse shadow-none">Only {seatsLeft} left!</Badge>
                                        ) : seatsLeft <= 10 ? (
                                          <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px] shadow-none">{seatsLeft} seats left</Badge>
                                        ) : (
                                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full text-[10px] shadow-none">{seatsLeft} seats available</Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="sm:border-l border-t sm:border-t-0 border-border/40 bg-gradient-to-b from-white to-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-center items-end sm:w-[160px] shrink-0 group-hover:bg-[#F0F4F8] transition-colors">
                                      <div className="text-right w-full">
                                        {isRoundTripReturn ? (
                                          <>
                                            <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold py-1 px-4 rounded-full text-[10px] shadow-none w-full justify-center">Included</Badge>
                                            <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-wider text-center">Round Trip Pkg</p>
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-2xl sm:text-3xl font-black text-[#2A3F8B] leading-none tabular-nums">{formatCurrency(effectivePrice, flight.currency)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">per person</p>
                                          </>
                                        )}
                                        <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${seatsLeft === 0 ? 'bg-destructive text-white' :
                                            seatsLeft <= 5 ? 'bg-destructive/15 text-destructive animate-pulse' :
                                              seatsLeft <= 10 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          }`}>
                                          <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                                          {seatsLeft === 0 ? 'Sold Out' : `${seatsLeft} seats`}
                                        </div>
                                      </div>
                                      {isSelected ? (
                                        <Button variant="outline" size="sm" className="w-full mt-4 rounded-full border-destructive text-destructive hover:bg-destructive/10 bg-destructive/5 font-bold h-9 text-xs transition-all shadow-sm" onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectCustomReturn(flight);
                                        }}>
                                          <X className="h-3.5 w-3.5 mr-1" /> Unselect
                                        </Button>
                                      ) : (
                                        <Button variant="outline" size="sm" className="w-full mt-4 rounded-full border-[#2A3F8B]/30 text-[#2A3F8B] hover:bg-[#2A3F8B] hover:text-white font-bold h-9 text-xs transition-all shadow-sm" disabled={seatsLeft === 0} onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectCustomReturn(flight);
                                        }}>
                                          {seatsLeft === 0 ? 'Sold Out' : 'Select Flight'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SELECTION SUMMARY BAR ── */}
                  {(selectedOutboundFlight || selectedReturnFlight) && showCustomFlightSelection && (
                    <Card id="custom-selection-summary-section" className="border-border/40 bg-card overflow-hidden mt-8 shadow-sm rounded-2xl">
                      {/* Header strip */}
                      <div className="bg-[#2A3F8B] px-5 py-3 flex items-center justify-between">
                        <div className="relative flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm shadow-sm">
                            <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span className="font-bold text-sm text-primary-foreground tracking-wide">Your Selection</span>
                          {selectedOutboundFlight && selectedReturnFlight && selectedOutboundFlight.airline !== selectedReturnFlight.airline && (
                            <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-[9px]">Mixed Airlines</Badge>
                          )}
                        </div>
                        {selectedOutboundFlight && selectedReturnFlight && (
                          <div className="relative flex items-center gap-2">
                            <span className="text-xs text-primary-foreground/80 font-medium">Total</span>
                            <span className="text-lg font-bold text-primary-foreground tabular-nums">{formatCurrency(selectionTotal, selectedOutboundFlight?.currency)}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex flex-col gap-3">
                          {selectedOutboundFlight ? (
                            <div className="bg-[#F8F9FB] dark:bg-muted/10 rounded-xl p-3 border border-border hover:border-primary/30 transition-all group/sel">
                              <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                                <div className="flex items-center gap-3.5 flex-1 min-w-0 flex-wrap md:flex-nowrap">
                                  {/* Badge indicating direction */}
                                  <Badge className="bg-[#2A3F8B] text-white border-0 font-bold px-2.5 py-1 rounded-lg text-[10px] tracking-wide shrink-0">
                                    OUTBOUND
                                  </Badge>

                                  {/* Airline Logo */}
                                  <div className="h-9 w-9 rounded-lg bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                                    {(() => {
                                      const logo = getAirlineLogo(selectedOutboundFlight.airline, selectedOutboundFlight.airline_logo);
                                      return logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Plane className="h-4 w-4 text-primary" />;
                                    })()}
                                  </div>

                                  {/* Info Line */}
                                  <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-sm flex-1 min-w-0">
                                    {/* Route */}
                                    <span className="text-sm font-extrabold text-[#2A3F8B] dark:text-blue-400 shrink-0">
                                      {selectedOutboundFlight.departure_city} → {selectedOutboundFlight.arrival_city}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Airline Info */}
                                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 shrink-0">
                                      <span>{selectedOutboundFlight.airline}</span>
                                      {(() => {
                                        const cleanFn = getCleanFlightNumber(selectedOutboundFlight);
                                        return cleanFn ? (
                                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 font-mono text-[10px] font-bold">
                                            {cleanFn}
                                          </span>
                                        ) : null;
                                      })()}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Date */}
                                    {selectedOutboundFlight.departure_date && (
                                      <span className="text-muted-foreground text-xs flex items-center gap-1 shrink-0 font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                                        {format(new Date(selectedOutboundFlight.departure_date), 'EEE, d MMM yyyy')}
                                      </span>
                                    )}

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Times */}
                                    <span className="text-[#2A3F8B] dark:text-blue-300 text-xs font-bold flex items-center gap-1 shrink-0">
                                      <Clock className="h-3.5 w-3.5 text-[#2A3F8B]/80 dark:text-blue-300/80" />
                                      <span>{formatTime(selectedOutboundFlight.departure_time)}</span>
                                      {selectedOutboundFlight.arrival_time && (
                                        <>
                                          <span className="text-muted-foreground font-normal">→</span>
                                          <span>{formatTime(selectedOutboundFlight.arrival_time)}</span>
                                        </>
                                      )}
                                      {calcDuration(selectedOutboundFlight.departure_time, selectedOutboundFlight.arrival_time) && (
                                        <span className="text-[10px] text-muted-foreground bg-muted dark:bg-muted/40 px-1 py-0.5 rounded font-bold ml-1">
                                          {calcDuration(selectedOutboundFlight.departure_time, selectedOutboundFlight.arrival_time)}
                                        </span>
                                      )}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Badges */}
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      {selectedOutboundFlight.class && (
                                        <span className="text-[10px] capitalize bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                                          {selectedOutboundFlight.class}
                                        </span>
                                      )}
                                      <span className="text-[10px] bg-muted dark:bg-muted/40 text-muted-foreground font-bold px-2 py-0.5 rounded-full">
                                        {getBaggage(selectedOutboundFlight.class)}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* Price & Close Button */}
                                <div className="flex items-center gap-3 shrink-0 justify-end w-full md:w-auto border-t md:border-t-0 pt-1.5 md:pt-0 border-border/40">
                                  <span className="text-xs font-extrabold text-primary dark:text-primary-foreground tabular-nums">
                                    ${getEffectiveAdultPrice(selectedOutboundFlight)}/pp
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOutboundFlight(null);
                                    if (selectedOutboundFlight && isPackageFlight(selectedOutboundFlight)) {
                                      setSelectedReturnFlight(null);
                                    }
                                  }}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 bg-[#F8F9FB] dark:bg-muted/10 rounded-xl p-3 border-2 border-dashed border-border text-muted-foreground">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><PlaneTakeoff className="h-4 w-4 text-primary/60" /></div>
                              <span className="text-xs font-semibold text-primary/70">Pick your outbound →</span>
                            </div>
                          )}

                          {selectedReturnFlight ? (
                            <div className="bg-[#F8F9FB] dark:bg-muted/10 rounded-xl p-3 border border-border hover:border-primary/30 transition-all group/sel">
                              <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                                <div className="flex items-center gap-3.5 flex-1 min-w-0 flex-wrap md:flex-nowrap">
                                  {/* Badge indicating direction */}
                                  <Badge className="bg-[#E2E8F0] text-[#2A3F8B] border-0 font-bold px-2.5 py-1 rounded-lg text-[10px] tracking-wide shrink-0">
                                    RETURN
                                  </Badge>

                                  {/* Airline Logo */}
                                  <div className="h-9 w-9 rounded-lg bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                                    {(() => {
                                      const logo = getAirlineLogo(selectedReturnFlight.airline, selectedReturnFlight.airline_logo);
                                      return logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Plane className="h-4 w-4 text-primary rotate-180" />;
                                    })()}
                                  </div>

                                  {/* Info Line */}
                                  <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-sm flex-1 min-w-0">
                                    {/* Route */}
                                    <span className="text-sm font-extrabold text-[#2A3F8B] dark:text-blue-400 shrink-0">
                                      {selectedReturnFlight.departure_city} → {selectedReturnFlight.arrival_city}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Airline Info */}
                                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5 shrink-0">
                                      <span>{selectedReturnFlight.airline}</span>
                                      {(() => {
                                        const cleanFn = getCleanFlightNumber(selectedReturnFlight);
                                        return cleanFn ? (
                                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 font-mono text-[10px] font-bold">
                                            {cleanFn}
                                          </span>
                                        ) : null;
                                      })()}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Date */}
                                    {selectedReturnFlight.departure_date && (
                                      <span className="text-muted-foreground text-xs flex items-center gap-1 shrink-0 font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                                        {format(new Date(selectedReturnFlight.departure_date), 'EEE, d MMM yyyy')}
                                      </span>
                                    )}

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Times */}
                                    <span className="text-[#2A3F8B] dark:text-blue-300 text-xs font-bold flex items-center gap-1 shrink-0">
                                      <Clock className="h-3.5 w-3.5 text-[#2A3F8B]/80 dark:text-blue-300/80" />
                                      <span>{formatTime(selectedReturnFlight.departure_time)}</span>
                                      {selectedReturnFlight.arrival_time && (
                                        <>
                                          <span className="text-muted-foreground font-normal">→</span>
                                          <span>{formatTime(selectedReturnFlight.arrival_time)}</span>
                                        </>
                                      )}
                                      {calcDuration(selectedReturnFlight.departure_time, selectedReturnFlight.arrival_time) && (
                                        <span className="text-[10px] text-muted-foreground bg-muted dark:bg-muted/40 px-1 py-0.5 rounded font-bold ml-1">
                                          {calcDuration(selectedReturnFlight.departure_time, selectedReturnFlight.arrival_time)}
                                        </span>
                                      )}
                                    </span>

                                    <span className="h-3 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                    {/* Badges */}
                                    <span className="flex items-center gap-1.5 shrink-0">
                                      {selectedReturnFlight.class && (
                                        <span className="text-[10px] capitalize bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                                          {selectedReturnFlight.class}
                                        </span>
                                      )}
                                      <span className="text-[10px] bg-muted dark:bg-muted/40 text-muted-foreground font-bold px-2 py-0.5 rounded-full">
                                        {getBaggage(selectedReturnFlight.class)}
                                      </span>
                                    </span>
                                  </div>
                                </div>

                                {/* Price & Close Button */}
                                <div className="flex items-center gap-3 shrink-0 justify-end w-full md:w-auto border-t md:border-t-0 pt-1.5 md:pt-0 border-border/40">
                                  <span className="text-xs font-extrabold text-primary dark:text-primary-foreground tabular-nums">
                                    {(() => {
                                      const isRetIncluded = isPackageFlight(selectedReturnFlight) && selectedOutboundFlight && isPackageFlight(selectedOutboundFlight);
                                      return isRetIncluded ? "Included" : `${formatCurrency(getEffectiveAdultPrice(selectedReturnFlight), selectedReturnFlight?.currency)}/pp`;
                                    })()}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReturnFlight(null);
                                    if (selectedReturnFlight && isPackageFlight(selectedReturnFlight)) {
                                      setSelectedOutboundFlight(null);
                                    }
                                  }}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4 bg-[#F8F9FB] dark:bg-muted/10 rounded-xl p-3 border-2 border-dashed border-border text-muted-foreground">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><PlaneLanding className="h-4 w-4 text-primary/60 rotate-180" /></div>
                              <span className="text-xs font-semibold text-primary/70">Pick your return →</span>
                            </div>
                          )}
                        </div>

                        {/* Rate Breakdown & Book button */}
                        {selectedOutboundFlight && selectedReturnFlight && (
                          <div className="mt-5 pt-4 border-t border-border/40">
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Receipt className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Rate Breakdown</span>
                                </div>
                                {selectionFareLines.map((fl, i) => (
                                  <div key={i} className="flex justify-between text-xs items-center py-0.5">
                                    <span className="text-muted-foreground font-medium">{fl.count}× {fl.personType}</span>
                                    <div className="text-right flex items-center gap-2">
                                      <span className="font-bold text-foreground tabular-nums">{formatCurrency(fl.rate, selectedOutboundFlight?.currency)}</span>
                                      {fl.commission > 0 && (
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0 font-bold tabular-nums">
                                          +${fl.commission}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-muted-foreground">Commission:</span>
                                      <span className="font-bold text-primary tabular-nums">{formatCurrency(selectionCommission, selectedOutboundFlight?.currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-muted-foreground">Net:</span>
                                      <span className="font-bold text-foreground tabular-nums">{formatCurrency(selectionNet, selectedOutboundFlight?.currency)}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                                    <p className="text-3xl font-bold text-primary tracking-tight tabular-nums">{formatCurrency(selectionTotal, selectedOutboundFlight?.currency)}</p>
                                  </div>
                                </div>
                              </div>
                              <Button className="rounded-xl px-8 gap-2 font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 h-12 text-sm group/book"
                                onClick={() => handleFlightSelectWithSave?.(selectedOutboundFlight, totalPassengers, selectedReturnFlight, { adults, children, infants })}>
                                Book Round-trip
                                <ArrowRight className="h-4 w-4 transition-transform group-hover/book:translate-x-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                /* ========== ONE-WAY / MULTI-CITY: Card layout with selection & breakdown ========== */
                <div className="space-y-4">
                  {filteredResults
                    .filter(flight => !selectedOutboundFlight || flight.id === selectedOutboundFlight.id)
                    .map((flight, index) => renderFlightCard(flight, index))}

                  {/* Selection summary bar - BOTTOM */}
                  {selectedOutboundFlight && (
                    <Card className="border-border/40 bg-card overflow-hidden mt-8 shadow-sm rounded-2xl">
                      {/* Header strip */}
                      <div className="bg-[#2A3F8B] px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                            <Plane className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span className="font-bold text-sm text-primary-foreground tracking-wide">Your Selection</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {selectionFareLines.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-primary-foreground/70">Total</span>
                              <span className="text-lg font-bold text-primary-foreground">{formatCurrency(selectionTotal, selectedOutboundFlight?.currency)}</span>
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedOutboundFlight(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-primary-foreground text-xs font-bold transition-all"
                          >
                            <X className="h-3 w-3" /> Change Flight
                          </button>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="bg-[#F8F9FB] dark:bg-muted/10 rounded-xl p-4 border border-border hover:border-primary/30 transition-all group/sel mb-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                            <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap md:flex-nowrap">
                              {/* Airline Logo */}
                              <div className="h-11 w-11 rounded-xl bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                                {(() => {
                                  const logo = getAirlineLogo(selectedOutboundFlight.airline, selectedOutboundFlight.airline_logo);
                                  return logo ? <img src={logo} alt="" className="h-7 w-7 object-contain" /> : <Plane className="h-5 w-5 text-primary" />;
                                })()}
                              </div>

                              {/* Info Line */}
                              <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm flex-1 min-w-0">
                                {/* Route */}
                                <span className="text-base font-extrabold text-[#2A3F8B] dark:text-blue-400 shrink-0">
                                  {selectedOutboundFlight.departure_city} → {selectedOutboundFlight.arrival_city}
                                </span>

                                <span className="h-4 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                {/* Airline Info */}
                                <span className="font-semibold text-foreground flex items-center gap-2 shrink-0">
                                  <span>{selectedOutboundFlight.airline}</span>
                                  {(() => {
                                    const cleanFn = getCleanFlightNumber(selectedOutboundFlight);
                                    return cleanFn ? (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 font-mono text-[11px] font-bold">
                                        {cleanFn}
                                      </span>
                                    ) : null;
                                  })()}
                                </span>

                                <span className="h-4 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                {/* Date */}
                                {selectedOutboundFlight.departure_date && (
                                  <span className="text-muted-foreground flex items-center gap-1.5 shrink-0 font-medium">
                                    <Calendar className="h-4 w-4 text-primary/70" />
                                    {format(new Date(selectedOutboundFlight.departure_date), 'EEE, d MMM yyyy')}
                                  </span>
                                )}

                                <span className="h-4 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                {/* Times */}
                                <span className="text-[#2A3F8B] dark:text-blue-300 font-bold flex items-center gap-1.5 shrink-0">
                                  <Clock className="h-4 w-4 text-[#2A3F8B]/80 dark:text-blue-300/80" />
                                  <span>{formatTime(selectedOutboundFlight.departure_time)}</span>
                                  {selectedOutboundFlight.arrival_time && (
                                    <>
                                      <span className="text-muted-foreground font-normal">→</span>
                                      <span>{formatTime(selectedOutboundFlight.arrival_time)}</span>
                                    </>
                                  )}
                                  {calcDuration(selectedOutboundFlight.departure_time, selectedOutboundFlight.arrival_time) && (
                                    <span className="text-[11px] text-muted-foreground bg-muted dark:bg-muted/40 px-1.5 py-0.5 rounded font-bold ml-1">
                                      {calcDuration(selectedOutboundFlight.departure_time, selectedOutboundFlight.arrival_time)}
                                    </span>
                                  )}
                                </span>

                                <span className="h-4 w-[1px] bg-border/60 hidden md:inline shrink-0"></span>

                                {/* Badges */}
                                <span className="flex items-center gap-2 shrink-0">
                                  {selectedOutboundFlight.class && (
                                    <span className="text-[11px] capitalize bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-bold px-2.5 py-0.5 rounded-full">
                                      {selectedOutboundFlight.class}
                                    </span>
                                  )}
                                  <span className="text-[11px] bg-muted dark:bg-muted/40 text-muted-foreground font-bold px-2.5 py-0.5 rounded-full">
                                    {getBaggage(selectedOutboundFlight.class, selectedOutboundFlight.baggage)}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Price & Close Button */}
                            <div className="flex items-center gap-3 shrink-0 justify-end w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
                              <span className="text-base font-extrabold text-primary dark:text-primary-foreground tabular-nums">
                                ${getEffectiveAdultPrice(selectedOutboundFlight)}/pp
                              </span>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-60 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all animate-none" onClick={() => setSelectedOutboundFlight(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Rate Breakdown */}
                        {selectionFareLines.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end pt-4 border-t border-border/40">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Receipt className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rate Breakdown</span>
                              </div>
                              {selectionFareLines.map((fl, i) => (
                                <div key={i} className="flex justify-between text-xs items-center">
                                  <span className="text-muted-foreground font-medium">{fl.count}x {fl.personType}</span>
                                  <div className="text-right flex items-center gap-2">
                                    <span className="font-bold text-foreground">{formatCurrency(fl.rate, selectedOutboundFlight?.currency)}</span>
                                    {fl.commission > 0 && (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-0 font-semibold">
                                        ${fl.commission} comm.
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">Commission:</span>
                                    <span className="font-bold text-[hsl(var(--success))]">{formatCurrency(selectionCommission, selectedOutboundFlight?.currency)}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">Net:</span>
                                    <span className="font-bold text-primary">{formatCurrency(selectionNet, selectedOutboundFlight?.currency)}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground font-medium">Total Amount</p>
                                  <p className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(selectionTotal, selectedOutboundFlight?.currency)}</p>
                                </div>
                              </div>
                            </div>
                            <Button className="rounded-xl px-8 gap-2 font-bold shadow-lg shadow-primary/25 h-11 text-sm"
                              onClick={() => handleFlightSelectWithSave?.(selectedOutboundFlight, totalPassengers, undefined, { adults, children, infants })}>
                              Book Flight <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Compare Bar */}
      {compareIds.length >= 2 && showResults && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-[card-slide-up_0.3s_ease-out]">
          <div className="bg-background/95 backdrop-blur-lg border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 px-5 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">{compareIds.length} flights selected</span>
            </div>
            <Button size="sm" className="rounded-xl gap-1.5 font-bold" onClick={() => setShowCompareDialog(true)}>
              Compare Now
            </Button>
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => setCompareIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-primary" />
              Compare Flights
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase">Detail</th>
                  {compareFlightsData.map(f => (
                    <th key={f.id} className="text-center py-3 px-3 min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        {(() => {
                          const logo = getAirlineLogo(f.airline, f.airline_logo);
                          return logo ? (
                            <img src={logo} alt={f.airline} className="h-8 w-8 rounded-lg object-contain border border-border/30 p-0.5" />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plane className="h-4 w-4 text-primary" />
                            </div>
                          );
                        })()}
                        <span className="text-[10px] font-medium text-muted-foreground">{f.airline}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {[
                  { label: "Flight", render: (f: Flight) => f.flight_number || "—" },
                  { label: "Route", render: (f: Flight) => `${f.departure_city} → ${f.arrival_city}` },
                  { label: "Departure", render: (f: Flight) => formatTime(f.departure_time) },
                  { label: "Arrival", render: (f: Flight) => formatTime(f.arrival_time) },
                  { label: "Duration", render: (f: Flight) => calcDuration(f.departure_time, f.arrival_time) || "—" },
                  { label: "Class", render: (f: Flight) => <span className="capitalize">{f.class || "Economy"}</span> },
                  { label: "Baggage", render: (f: Flight) => f.baggage || getBaggage(f.class) },
                  { label: "Seats", render: (f: Flight) => `${f.available_seats || 0} available` },
                  { label: "Price", render: (f: Flight) => <span className="text-primary font-bold text-base">{formatCurrency(getEffectiveAdultPrice(f), f.currency)}</span> },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 px-2 text-xs font-semibold text-muted-foreground">{row.label}</td>
                    {compareFlightsData.map(f => (
                      <td key={f.id} className="py-2.5 px-3 text-center text-xs font-medium">{row.render(f)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border/30">
            {compareFlightsData.map(f => (
              <Button key={f.id} size="sm" className="rounded-xl gap-1.5 text-xs font-bold"
                onClick={() => { handleFlightSelectWithSave?.(f, totalPassengers, undefined, { adults, children, infants }); setShowCompareDialog(false); }}>
                Book {f.flight_number || f.airline} <ArrowRight className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderPassengerControls() {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-sm text-foreground">Passenger Details</h4>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
            <div><p className="font-medium text-sm">Adults</p><p className="text-xs text-muted-foreground">Age 12+</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAdults(Math.max(1, adults - 1))} disabled={adults <= 1}>-</Button>
            <span className="w-8 text-center font-medium">{adults}</span>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setAdults(Math.min(9 - children, adults + 1))} disabled={totalNonInfants >= 9}>+</Button>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center"><User className="h-4 w-4 text-accent-foreground" /></div>
            <div><p className="font-medium text-sm">Children</p><p className="text-xs text-muted-foreground">Age 2–11</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setChildren(Math.max(0, children - 1))} disabled={children <= 0}>-</Button>
            <span className="w-8 text-center font-medium">{children}</span>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setChildren(Math.min(9 - adults, children + 1))} disabled={totalNonInfants >= 9}>+</Button>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-coral/10 flex items-center justify-center"><Baby className="h-4 w-4 text-coral" /></div>
            <div><p className="font-medium text-sm">Infants</p><p className="text-xs text-muted-foreground">Under 2 (on lap)</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setInfants(Math.max(0, infants - 1))} disabled={infants <= 0}>-</Button>
            <span className="w-8 text-center font-medium">{infants}</span>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setInfants(infants + 1)} disabled={infants >= adults}>+</Button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center pt-1">{totalNonInfants}/9 passengers max (infants not counted)</div>
        <Button className="w-full mt-2" onClick={() => setPassengersOpen(false)}>Done</Button>
      </div>
    );
  }
}
