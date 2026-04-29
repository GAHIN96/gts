import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import flightHeroImg from "@/assets/flight-hero.jpg";
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
import { format, addDays, isSameDay, getDay, parseISO, differenceInDays } from "date-fns";
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
  from: string;
  to: string;
  date: Date | undefined;
}

type TimeOfDay = "morning" | "afternoon" | "evening";
type SortOption = "price_asc" | "price_desc" | "time" | "seats" | "duration";

export function FlightSearchSection({ onFlightSelect }: FlightSearchSectionProps) {
  // Restore search state from sessionStorage if available
  const savedSearch = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("flightSearchState");
      if (raw) {
        sessionStorage.removeItem("flightSearchState");
        return JSON.parse(raw);
      }
    } catch {}
    return null;
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
    { from: "", to: "", date: undefined },
    { from: "", to: "", date: undefined },
  ]);
  const [multiCityOpenStates, setMultiCityOpenStates] = useState<Record<string, boolean>>({});
  
  // Search results state
  const [showResults, setShowResults] = useState(false);
  const [searchedFlights, setSearchedFlights] = useState<Flight[]>([]);
  const [returnSearchedFlights, setReturnSearchedFlights] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  // Round-trip selection state
  const [selectedOutboundFlight, setSelectedOutboundFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [showCustomFlightSelection, setShowCustomFlightSelection] = useState(false);

  // Fetch fares for selected flights
  const { data: outDefaultFares = [] } = useFlightDefaultFares(selectedOutboundFlight?.id || null);
  const { data: outSpecialFares = [] } = useFlightSpecialFares(selectedOutboundFlight?.id || null);
  const { data: retDefaultFares = [] } = useFlightDefaultFares(selectedReturnFlight?.id || null);
  const { data: retSpecialFares = [] } = useFlightSpecialFares(selectedReturnFlight?.id || null);
  const { data: flights, isLoading } = useFlights();
  const { airlines } = useAirlines();
  const { data: citiesData } = useCities();

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
    } catch {}
  }, []);

  const saveRecentSearch = useCallback((search: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => !(s.from === search.from && s.to === search.to && s.date === search.date));
      const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get official airline logo from airlines table
  const getAirlineLogo = (airlineName: string, fallbackLogo: string | null): string | null => {
    const match = airlines.find(a => a.is_active && a.name.toLowerCase() === airlineName.toLowerCase());
    return match?.logo_url || fallbackLogo;
  };

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
  // Available seats determines which fare tier applies
  const getEffectiveAdultPrice = useCallback((flight: Flight): number => {
    const availSeats = getAvailableSeats(flight);
    const defs = bulkDefaultFares[flight.id] || [];
    const specs = bulkSpecialFares[flight.id] || [];
    const d = new Date(flight.departure_date);
    
    // Try special fares first (adult, date-matching)
    const adultSpecs = specs.filter(f => f.person_type.toLowerCase() === 'adult' && d >= new Date(f.from_date) && d <= new Date(f.to_date));
    const sp = matchTier(availSeats, adultSpecs);
    if (sp) return sp.rate;
    
    // Then default fares (adult)
    const adultDefs = defs.filter(f => f.person_type.toLowerCase() === 'adult');
    const df = matchTier(availSeats, adultDefs);
    if (df) return df.rate;
    
    // Fallback: any person type
    const anySpecs = specs.filter(f => d >= new Date(f.from_date) && d <= new Date(f.to_date));
    const spAny = matchTier(availSeats, anySpecs);
    if (spAny) return spAny.rate;
    const dfAny = matchTier(availSeats, defs);
    if (dfAny) return dfAny.rate;
    
    return flight.price;
  }, [bulkDefaultFares, bulkSpecialFares, getAvailableSeats]);

  // Get next fare tier info: price and how many seats left in current tier before next kicks in
  const getNextTierInfo = useCallback((flight: Flight): { nextPrice: number; seatsLeftInTier: number } | null => {
    const availSeats = getAvailableSeats(flight);
    const defs = bulkDefaultFares[flight.id] || [];
    const specs = bulkSpecialFares[flight.id] || [];
    const d = new Date(flight.departure_date);

    // Find current tier (adult)
    const allAdultTiers = [
      ...specs.filter(f => f.person_type.toLowerCase() === 'adult' && d >= new Date(f.from_date) && d <= new Date(f.to_date)),
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
    
    const getEffective = (basePx: number, flight: Flight, date: string, defs: FlightDefaultFare[], specs: FlightSpecialFare[], pt?: string) => {
      const dd = new Date(date);
      const availSeats = getFlightAvailSeats(flight);
      if (pt) {
        const ptSpecs = specs.filter(f => f.person_type.toLowerCase() === pt.toLowerCase() && dd >= new Date(f.from_date) && dd <= new Date(f.to_date));
        const sp = matchFareTier(availSeats, ptSpecs);
        if (sp) return { rate: sp.rate, commission: sp.commission };
        const ptDefs = defs.filter(f => f.person_type.toLowerCase() === pt.toLowerCase());
        const df = matchFareTier(availSeats, ptDefs);
        if (df) return { rate: df.rate, commission: df.commission };
      }
      const anySpecs = specs.filter(f => dd >= new Date(f.from_date) && dd <= new Date(f.to_date));
      const sp = matchFareTier(availSeats, anySpecs);
      if (sp) return { rate: sp.rate, commission: sp.commission };
      const df = matchFareTier(availSeats, defs);
      if (df) return { rate: df.rate, commission: df.commission };
      return { rate: basePx, commission: 0 };
    };

    // Map passenger counts by category
    const passengerMap: { type: string; count: number }[] = [
      { type: "Adult", count: adults },
      { type: "Child", count: children },
      { type: "Infant", count: infants },
    ].filter(p => p.count > 0);

    return passengerMap.map(p => {
      const outF = getEffective(selectedOutboundFlight.price, selectedOutboundFlight, selectedOutboundFlight.departure_date, outDefaultFares, outSpecialFares, p.type);
      const retF = selectedReturnFlight ? getEffective(selectedReturnFlight.price, selectedReturnFlight, selectedReturnFlight.departure_date, retDefaultFares, retSpecialFares, p.type) : { rate: 0, commission: 0 };
      return { personType: p.type, rate: outF.rate + retF.rate, commission: outF.commission + retF.commission, count: p.count };
    });
  }, [selectedOutboundFlight, selectedReturnFlight, outDefaultFares, outSpecialFares, retDefaultFares, retSpecialFares, adults, children, infants, flightBookedCounts]);

  const selectionTotal = selectionFareLines.reduce((s, fl) => s + fl.rate * fl.count, 0);
  const selectionCommission = selectionFareLines.reduce((s, fl) => s + fl.commission * fl.count, 0);
  const selectionNet = selectionTotal - selectionCommission;

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
  const getBaggage = (flightClass: string | null): string => {
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
    // Try linked return first
    if (outbound.linked_flight_id) {
      const linked = returnSearchedFlights.find(f => f.id === outbound.linked_flight_id);
      if (linked) return getEffectiveAdultPrice(linked);
    }
    const reverseLinked = returnSearchedFlights.find(f => f.linked_flight_id === outbound.id);
    if (reverseLinked) return getEffectiveAdultPrice(reverseLinked);
    // Same airline preferred
    const sameAirline = returnSearchedFlights.filter(f => f.airline === outbound.airline);
    if (sameAirline.length > 0) return Math.min(...sameAirline.map(f => getEffectiveAdultPrice(f)));
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
    const prices = searchedFlights.map(f => getDisplayPrice(f));
    return [Math.min(...prices), Math.max(...prices)] as [number, number];
  }, [searchedFlights, getDisplayPrice]);

  // Reset filters when new search results come in
  useEffect(() => {
    if (searchedFlights.length > 0) {
      const prices = searchedFlights.map(f => getDisplayPrice(f));
      setPriceRange([Math.min(...prices), Math.max(...prices)]);
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

    // Apply time of day filter
    if (timeFilter.length > 0) {
      results = results.filter(f => {
        const tod = getTimeOfDay(f.departure_time);
        return tod ? timeFilter.includes(tod) : false;
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

  // Round-trip paired cards: outbound + best matching return
  // Generate multiple pairs for different airline combinations
  const roundTripPairs = useMemo(() => {
    if (tripType !== "roundtrip") return [];
    
    const pairs: { outbound: Flight; return: Flight | null; combinedPrice: number; priority: number }[] = [];
    
    for (const outbound of filteredResults) {
      // Track which returns we've used for this outbound
      const usedReturnIds = new Set<string>();
      
      // Priority 1: Linked flight (explicit round-trip pair)
      let linkedReturn: Flight | null = null;
      if (outbound.linked_flight_id) {
        linkedReturn = returnSearchedFlights.find(f => f.id === outbound.linked_flight_id) || null;
      }
      if (!linkedReturn) {
        linkedReturn = returnSearchedFlights.find(f => f.linked_flight_id === outbound.id) || null;
      }
      if (linkedReturn) {
        usedReturnIds.add(linkedReturn.id);
        const outPrice = getEffectiveAdultPrice(outbound);
        const retPrice = getEffectiveAdultPrice(linkedReturn);
        pairs.push({ outbound, return: linkedReturn, combinedPrice: outPrice + retPrice, priority: 0 });
      }
      
      // Priority 2: Same airline (cheapest)
      const sameAirlineReturns = returnSearchedFlights
        .filter(f => f.airline === outbound.airline && !usedReturnIds.has(f.id))
        .sort((a, b) => getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b));
      
      if (sameAirlineReturns.length > 0) {
        const best = sameAirlineReturns[0];
        if (!linkedReturn || best.id !== linkedReturn.id) {
          usedReturnIds.add(best.id);
          const outPrice = getEffectiveAdultPrice(outbound);
          const retPrice = getEffectiveAdultPrice(best);
          pairs.push({ outbound, return: best, combinedPrice: outPrice + retPrice, priority: 1 });
        }
      }
      
      // Priority 3: Different airline (cheapest)
      const diffAirlineReturns = returnSearchedFlights
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
  }, [filteredResults, returnSearchedFlights, getEffectiveAdultPrice, tripType]);

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

  // Keep round-trip dates valid: return must always be after departure
  useEffect(() => {
    if (tripType !== "roundtrip" || !departureDate || !returnDate) return;
    if (returnDate <= departureDate) {
      setReturnDate(undefined as any);
      setSelectedReturnFlight(null);
    }
  }, [tripType, departureDate, returnDate]);

  // Helper: get flights operating on a given date for a route
  const getFlightsForDate = (relevantFlights: Flight[], date: Date) => {
    const dayOfWeek = getDay(date);
    return relevantFlights.filter(flight => {
      if (flight.schedule_type === 'recurring' && flight.recurring_days) {
        const validFrom = flight.valid_from ? parseISO(flight.valid_from) : null;
        const validUntil = flight.valid_until ? parseISO(flight.valid_until) : null;
        const isInValidPeriod = (!validFrom || date >= validFrom) && (!validUntil || date <= validUntil);
        return isInValidPeriod && flight.recurring_days.includes(dayOfWeek);
      } else {
        return isSameDay(parseISO(flight.departure_date), date);
      }
    });
  };

  // Compute price maps for departure calendar
  const departurePrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (!flights) return prices;

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      if (fromCity && !f.departure_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      if (toCity && !f.arrival_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      // For one-way only, filter out round-trip-only flights; for round-trip, show all
      if (tripType === "oneway" && f.trip_type === "round_trip") return false;
      return true;
    });

    const today = new Date();
    for (let i = 0; i < 90; i++) {
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
      if (toCity && !f.departure_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      if (fromCity && !f.arrival_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      return true;
    });

    const startDate = departureDate ? addDays(departureDate, 1) : new Date();
    for (let i = 0; i < 90; i++) {
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

  // Block seat auto-selection: when departure is picked, auto-select return from linked flight
  useEffect(() => {
    if (tripType !== "roundtrip" || !departureDate || !flights || !fromCity || !toCity) return;

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      if (!f.departure_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      if (!f.arrival_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      return true;
    });

    const matchingOutbound = getFlightsForDate(relevantFlights, departureDate);
    
    for (const outbound of matchingOutbound) {
      if (outbound.linked_flight_id) {
        const returnFlight = flights.find(f => f.id === outbound.linked_flight_id);
        if (returnFlight) {
          const retDate = parseISO(returnFlight.departure_date);
          if (!returnDate || !isSameDay(returnDate, retDate)) {
            setReturnDate(retDate);
            toast.info("Return date auto-selected from linked flight", {
              description: `${returnFlight.departure_city} → ${returnFlight.arrival_city} on ${format(retDate, "dd/MM/yyyy")}`,
            });
          }
          break;
        }
      }
      const reverseLinked = flights.find(f => f.linked_flight_id === outbound.id);
      if (reverseLinked) {
        const retDate = parseISO(reverseLinked.departure_date);
        if (!returnDate || !isSameDay(returnDate, retDate)) {
          setReturnDate(retDate);
          toast.info("Return date auto-selected from linked flight", {
            description: `${reverseLinked.departure_city} → ${reverseLinked.arrival_city} on ${format(retDate, "dd/MM/yyyy")}`,
          });
        }
        break;
      }
    }
  }, [departureDate, flights, fromCity, toCity, tripType]);

  // Calculate available, limited, and sold out dates for departures
  const departureAvailability = useMemo(() => {
    const available: Date[] = [];
    const limited: Date[] = [];
    const soldOut: Date[] = [];

    if (!flights) return { available, limited, soldOut };

    const relevantFlights = flights.filter(f => {
      if (!f.is_active) return false;
      if (fromCity && !f.departure_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      if (toCity && !f.arrival_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      // For one-way mode, exclude round_trip-only flights
      if (tripType === "oneway" && f.trip_type === "round_trip") return false;
      // For round-trip mode, include ALL flight types (one-way + round-trip) to allow cross-airline combinations
      return true;
    });

    const today = new Date();
    for (let i = 0; i < 90; i++) {
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
      if (toCity && !f.departure_city.toLowerCase().includes(toCity.toLowerCase())) return false;
      if (fromCity && !f.arrival_city.toLowerCase().includes(fromCity.toLowerCase())) return false;
      return true;
    });

    const startDate = departureDate ? addDays(departureDate, 1) : new Date();
    for (let i = 0; i < 90; i++) {
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
      setMultiCityLegs([...multiCityLegs, { from: lastLeg.to, to: "", date: undefined }]);
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
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let allResults: Flight[] = [];
      for (const leg of multiCityLegs) {
        const legResults = flights.filter(f => {
          if (!f.is_active) return false;
          if (!f.departure_city.toLowerCase().includes(leg.from.toLowerCase())) return false;
          if (!f.arrival_city.toLowerCase().includes(leg.to.toLowerCase())) return false;
          if (leg.date) {
            const matchingFlights = getFlightsForDate([f], leg.date);
            if (matchingFlights.length === 0) return false;
          }
          return (f.available_seats || 0) >= totalNonInfants;
        });
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
    
    let results = flights.filter(f => f.is_active);

    // For round-trip: find outbound flights (from→to on departure date), any trip_type is OK
    // For one-way: only show one-way flights
    if (tripType === "oneway") {
      results = results.filter(f => f.trip_type === "one_way" || f.trip_type === "oneway" || !f.trip_type);
    }
    // For roundtrip, don't filter by trip_type — we search outbound leg independently
    
    if (fromCity) {
      results = results.filter(f => 
        f.departure_city.toLowerCase().includes(fromCity.toLowerCase())
      );
    }
    
    if (toCity) {
      results = results.filter(f => 
        f.arrival_city.toLowerCase().includes(toCity.toLowerCase())
      );
    }
    
    if (departureDate) {
      const depDateStr = format(departureDate, "yyyy-MM-dd");
      results = results.filter(f => f.departure_date === depDateStr);
    }
    
    if (flightClass !== "all") {
      results = results.filter(f => 
        f.class?.toLowerCase() === flightClass.toLowerCase()
      );
    }
    
    results = results.filter(f => (f.available_seats || 0) >= totalNonInfants);
    
    // For round-trip, also search for return flights separately
    if (tripType === "roundtrip" && returnDate) {
      const retDateStr = format(returnDate, "yyyy-MM-dd");
      let returnResults = flights.filter(f => f.is_active);
      
      // Return flights: reverse route (to → from)
      if (toCity) {
        returnResults = returnResults.filter(f => 
          f.departure_city.toLowerCase().includes(toCity.toLowerCase())
        );
      }
      if (fromCity) {
        returnResults = returnResults.filter(f => 
          f.arrival_city.toLowerCase().includes(fromCity.toLowerCase())
        );
      }
      
      // Match return date
      returnResults = returnResults.filter(f => f.departure_date === retDateStr);
      
      if (flightClass !== "all") {
        returnResults = returnResults.filter(f => 
          f.class?.toLowerCase() === flightClass.toLowerCase()
        );
      }
      
      returnResults = returnResults.filter(f => (f.available_seats || 0) >= totalNonInfants);

      // Also include linked return flights from outbound results (even if different date)
      const linkedReturnIds = new Set(returnResults.map(f => f.id));
      for (const outbound of results) {
        if (outbound.linked_flight_id && !linkedReturnIds.has(outbound.linked_flight_id)) {
          const linked = flights.find(f => f.id === outbound.linked_flight_id && f.is_active);
          if (linked && (linked.available_seats || 0) >= totalNonInfants) {
            returnResults.push(linked);
            linkedReturnIds.add(linked.id);
          }
        }
        // Check reverse: another flight links to this outbound
        const reverseLinked = flights.find(f => f.linked_flight_id === outbound.id && f.is_active && !linkedReturnIds.has(f.id));
        if (reverseLinked && (reverseLinked.available_seats || 0) >= totalNonInfants) {
          returnResults.push(reverseLinked);
          linkedReturnIds.add(reverseLinked.id);
        }
      }

      setReturnSearchedFlights(returnResults);
    } else {
      setReturnSearchedFlights([]);
    }
    
    // Reset round-trip selections
    setSelectedOutboundFlight(null);
    setSelectedReturnFlight(null);
    
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

  // Apply a recent search
  const applyRecentSearch = (search: RecentSearch) => {
    setFromCity(search.from);
    setToCity(search.to);
    setDepartureDate(parseISO(search.date));
    setTripType(search.tripType as any);
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

  const CitySelector = ({ value, onChange, placeholder, open, onOpenChange, cities }: {
    value: string; onChange: (v: string) => void; placeholder: string;
    open: boolean; onOpenChange: (o: boolean) => void; cities: string[];
  }) => (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox"
          className="w-full h-10 justify-start text-left font-normal bg-secondary/50 border-border/30 rounded-xl hover:bg-secondary hover:border-primary transition-colors text-sm">
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
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
                    const info = cityInfoMap[city];
                    return (
                      <CommandItem key={city} onSelect={() => { onChange(city); onOpenChange(false); }}>
                        {info?.flagUrl && <img src={info.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0" />}
                        <span className="truncate">{city}</span>
                        {info?.airportCode && <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground">{info.airportCode}</span>}
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

  // Check if any filter is active
  const hasActiveFilters = airlineFilter.length > 0 || stopsFilter.length > 0 || timeFilter.length > 0 || classFilter.length > 0 || priceRange[0] > resultPriceRange[0] || priceRange[1] < resultPriceRange[1];
  const activeFilterCount = airlineFilter.length + stopsFilter.length + timeFilter.length + classFilter.length + (priceRange[0] > resultPriceRange[0] || priceRange[1] < resultPriceRange[1] ? 1 : 0);

  // Time of day filter items
  const timeOfDayItems: { value: TimeOfDay; label: string; icon: typeof Sun; range: string }[] = [
    { value: "morning", label: "Morning", icon: Sun, range: "06:00–11:59" },
    { value: "afternoon", label: "Afternoon", icon: Sunset, range: "12:00–17:59" },
    { value: "evening", label: "Evening", icon: Moon, range: "18:00–05:59" },
  ];

  return (
    <div className="space-y-6">
      {/* Recent Searches */}
      {recentSearches.length > 0 && !showResults && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            <span className="font-medium">Recent:</span>
          </div>
          {recentSearches.map((search, i) => (
            <button
              key={i}
              onClick={() => applyRecentSearch(search)}
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/40 hover:border-primary/30 transition-all text-muted-foreground font-medium"
            >
              <Plane className="h-2.5 w-2.5" />
              {search.from} → {search.to}
              <span className="text-muted-foreground/60">•</span>
              {format(new Date(search.date), "dd/MM/yyyy")}
            </button>
          ))}
          <button
            onClick={() => { setRecentSearches([]); localStorage.removeItem(RECENT_SEARCHES_KEY); }}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear
          </button>
        </div>
      )}

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
              flight.
            </span>
          </h1>

      {/* Search Panel */}
      <Card className="overflow-hidden backdrop-blur-xl bg-card/95 ring-1 ring-white/10 border-border/30 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.45),inset_0_1px_0_0_hsl(0_0%_100%/0.08)] mx-4 sm:mx-8 mb-6 rounded-2xl animate-fade-in" style={{ animationDelay: "380ms", animationFillMode: "both" }}>
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

        <CardContent className="p-4 space-y-3">
          {/* Multi-City Legs */}
          {tripType === "multicity" ? (
            <div className="space-y-3">
              {multiCityLegs.map((leg, index) => (
                <div key={index} className="flex items-end gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">From</label>
                    <CitySelector value={leg.from} onChange={(v) => updateLeg(index, "from", v)} placeholder="City"
                      open={multiCityOpenStates[`from-${index}`] || false}
                      onOpenChange={(o) => setMultiCityOpenStates(prev => ({ ...prev, [`from-${index}`]: o }))}
                      cities={departureCities} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">To</label>
                    <CitySelector value={leg.to} onChange={(v) => updateLeg(index, "to", v)} placeholder="City"
                      open={multiCityOpenStates[`to-${index}`] || false}
                      onOpenChange={(o) => setMultiCityOpenStates(prev => ({ ...prev, [`to-${index}`]: o }))}
                      cities={leg.from ? [...new Set(flights?.filter(f => f.is_active && f.departure_city.toLowerCase() === leg.from.toLowerCase()).map(f => f.arrival_city) || [])].sort() : departureCities} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                    <Popover open={multiCityOpenStates[`date-${index}`] || false}
                      onOpenChange={(o) => setMultiCityOpenStates(prev => ({ ...prev, [`date-${index}`]: o }))}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-10 justify-start text-left font-normal bg-secondary/50 border-border/30 rounded-xl text-sm">
                          <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {leg.date ? format(leg.date, "dd/MM") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <AvailabilityCalendar mode="single" selected={leg.date}
                          onSelect={(d) => { updateLeg(index, "date", d); setMultiCityOpenStates(prev => ({ ...prev, [`date-${index}`]: false })); }}
                          disabled={(date) => { if (date < new Date()) return true; if (index > 0 && multiCityLegs[index - 1].date) return date <= multiCityLegs[index - 1].date!; return false; }}
                          initialFocus showLegend={false} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {multiCityLegs.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive/60 hover:text-destructive" onClick={() => removeLeg(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {multiCityLegs.length < 5 && (
                <Button variant="outline" size="sm" onClick={addLeg} className="gap-1 rounded-full border-dashed">
                  <Plus className="h-3.5 w-3.5" /> Add Leg
                </Button>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2 border-t border-border/30">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Passengers</label>
                  <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-10 justify-start text-left font-normal bg-secondary/50 border-border/30 rounded-xl">
                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{getPassengerSummary()}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">{renderPassengerControls()}</PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Class</label>
                  <Select value={flightClass} onValueChange={setFlightClass}>
                    <SelectTrigger className="h-10 bg-secondary/50 border-border/30 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button data-search-trigger onClick={handleFlightSearch} disabled={isLoading || isSearching} className="h-10 rounded-xl gap-2 font-semibold">
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5" /> Search Flights</>}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
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
                        {fromCity && cityInfoMap[fromCity]?.airportCode && <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">({cityInfoMap[fromCity].airportCode})</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
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
                                      setFromCity(city); setFromOpen(false);
                                      if (tripType === "roundtrip" && flights) {
                                        const mf = flights.find(f => f.is_active && f.departure_city.toLowerCase() === city.toLowerCase());
                                        if (mf) setToCity(mf.arrival_city);
                                      }
                                    }}>
                                      {info?.flagUrl ? <img src={info.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0 mr-2" /> : <PlaneTakeoff className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                                      <span className="truncate">{city}</span>
                                      {info?.airportCode && <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground">{info.airportCode}</span>}
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
                        {toCity && cityInfoMap[toCity]?.airportCode && <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">({cityInfoMap[toCity].airportCode})</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
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
                                    <CommandItem key={city} onSelect={() => { setToCity(city); setToOpen(false); }}>
                                      {info?.flagUrl ? <img src={info.flagUrl} alt="" className="w-4 h-3 rounded-[2px] object-cover shrink-0 mr-2" /> : <PlaneLanding className="h-3.5 w-3.5 mr-2 text-muted-foreground" />}
                                      <span className="truncate">{city}</span>
                                      {info?.airportCode && <span className="ml-auto text-[10px] font-mono font-bold text-muted-foreground">{info.airportCode}</span>}
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "grid gap-3 items-end",
                  tripType === "roundtrip"
                    ? "grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
                    : "grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto]"
                )}
              >
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Departure</label>
                  <Popover open={departureDateOpen} onOpenChange={setDepartureDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline"
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
                          <span className="text-sm text-muted-foreground">Select date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <InlineFareCalendar selected={departureDate}
                        onSelect={(d) => {
                          setDepartureDate(d);
                          setDepartureDateOpen(false);
                          // Auto-advance to return date picker on round-trip
                          if (d && (!returnDate || returnDate <= d)) {
                            setTimeout(() => setReturnDateOpen(true), 120);
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        availableDates={departureAvailability.available} limitedDates={departureAvailability.limited}
                        soldOutDates={departureAvailability.soldOut} datePrices={departurePrices} />
                    </PopoverContent>
                  </Popover>
                  {tripType === "roundtrip" && departureDate && returnDate && returnDate > departureDate && (
                    <div className="hidden md:flex absolute -right-3 bottom-3.5 z-10 items-center justify-center h-6 min-w-[34px] px-1.5 rounded-full bg-gradient-to-r from-primary to-blue-500 text-primary-foreground text-[10px] font-bold shadow-md ring-2 ring-background">
                      {differenceInDays(returnDate, departureDate)}n
                    </div>
                  )}
                </div>

                {tripType === "roundtrip" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Return</label>
                    <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline"
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
                            <span className="text-sm text-muted-foreground">Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <InlineFareCalendar selected={returnDate}
                          onSelect={(d) => { setReturnDate(d); setReturnDateOpen(false); }}
                          disabled={(date) => departureDate ? date <= departureDate : date < new Date()}
                          availableDates={returnAvailability.available} limitedDates={returnAvailability.limited}
                          soldOutDates={returnAvailability.soldOut} datePrices={returnPrices}
                          addOnPrice={selectedDeparturePrice}
                          addOnLabel={selectedDeparturePrice > 0 ? "Departure flight" : undefined} />
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
                    <PopoverContent className="w-80 p-4" align="start">{renderPassengerControls()}</PopoverContent>
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
            </div>
          )}
        </CardContent>
      </Card>
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

      {/* Searching Animation */}
      {isSearching && (
        <Card className="border-primary/20 overflow-hidden">
          <div className="py-16 flex flex-col items-center justify-center animate-[fade-in_0.3s_ease-out]">
            <div className="relative w-full max-w-sm mb-8">
              <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 -translate-y-1/2" />
              <div className="relative flex items-center justify-center animate-[plane-fly_2s_ease-in-out_infinite]">
                <div className="bg-primary rounded-full p-3.5 shadow-lg shadow-primary/30">
                  <Plane className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div className="absolute top-1/2 left-8 -translate-y-1/2"><div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-sm" /></div>
              <div className="absolute top-1/2 right-8 -translate-y-1/2"><div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-sm" /></div>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Searching Best Flights</h3>
            <p className="text-sm text-muted-foreground">Finding the perfect options for your journey...</p>
            <div className="flex items-center gap-1.5 mt-5">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
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
          {cheapestByAirline.length > 1 && (
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

                    {/* Time of Day */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> Time of Day
                        </label>
                        {timeFilter.length > 0 && (
                          <button onClick={() => setTimeFilter([])}
                            className="text-[10px] text-primary hover:underline cursor-pointer font-medium">
                            All
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {timeOfDayItems.map((item) => {
                          const isSelected = timeFilter.length === 0 || timeFilter.includes(item.value);
                          const count = searchedFlights.filter(f => getTimeOfDay(f.departure_time) === item.value).length;
                          const Icon = item.icon;
                          return (
                            <button key={item.value}
                              onClick={() => {
                                if (timeFilter.length === 0) setTimeFilter([item.value]);
                                else if (timeFilter.includes(item.value)) {
                                  const nf = timeFilter.filter(t => t !== item.value);
                                  setTimeFilter(nf);
                                } else setTimeFilter([]);
                              }}
                              className={cn(
                                "flex items-center gap-2.5 w-full text-left text-xs px-3 py-2 rounded-lg border transition-all",
                                isSelected
                                  ? "bg-primary/8 border-primary/25 text-foreground font-medium"
                                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/40"
                              )}>
                              <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center", isSelected ? "bg-primary/10" : "bg-muted/30")}>
                                <Icon className={cn("h-3 w-3", isSelected ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <div className="flex-1">
                                <span>{item.label}</span>
                                <span className="block text-[9px] text-muted-foreground">{item.range}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
                            </button>
                          );
                        })}
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
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Time of Day</label>
                      <div className="flex flex-wrap gap-1.5">
                        {timeOfDayItems.map((item) => {
                          const isSelected = timeFilter.includes(item.value);
                          const count = searchedFlights.filter(f => getTimeOfDay(f.departure_time) === item.value).length;
                          return (
                            <button key={item.value} onClick={() => {
                              setTimeFilter(prev => prev.includes(item.value) ? prev.filter(t => t !== item.value) : [...prev, item.value]);
                            }} className={cn("text-[10px] px-2 py-1 rounded-full border", isSelected ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground")}>
                              {item.label} ({count})
                            </button>
                          );
                        })}
                      </div>
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
                <Card className="border-border/40">
                  <div className="text-center py-16">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Plane className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-semibold text-foreground/70">No flights match your criteria</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or search parameters</p>
                  </div>
                </Card>
              ) : tripType === "roundtrip" ? (
                /* ========== ROUND-TRIP: Paired cards first, optional custom selection ========== */
                <div className="space-y-6">
                  {/* Toggle between paired view and custom selection */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant={!showCustomFlightSelection ? "default" : "outline"}
                      size="sm"
                      className="rounded-full gap-1.5 text-xs"
                      onClick={() => { setShowCustomFlightSelection(false); setSelectedOutboundFlight(null); setSelectedReturnFlight(null); }}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Round Trip Pairs
                    </Button>
                    <Button
                      variant={showCustomFlightSelection ? "default" : "outline"}
                      size="sm"
                      className="rounded-full gap-1.5 text-xs"
                      onClick={() => setShowCustomFlightSelection(true)}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Customize Flights
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
                          const combinedPrice = outPrice + retPrice;
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

                          return (
                            <Card
                              key={`${pair.outbound.id}-${pair.return?.id || 'no-return'}-${pair.priority}`}
                              className={cn(
                                "group relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/40 rounded-2xl cursor-pointer",
                                "transition-all duration-200 ease-out shadow-sm",
                                "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40",
                                isLinked && "ring-1 ring-primary/25 border-primary/30",
                                isSelected && "ring-2 ring-primary shadow-lg shadow-primary/15 border-primary/50",
                                isCheapestPair && !isLinked && !isSelected && "ring-1 ring-amber-400/25 border-amber-400/30"
                              )}
                              onClick={() => {
                                setSelectedOutboundFlight(pair.outbound);
                                if (pair.return) setSelectedReturnFlight(pair.return);
                              }}
                            >
                              {/* Special Offer badge */}
                              {(pair.outbound.is_featured || pair.return?.is_featured) && (
                                <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/8 to-transparent px-4 py-1.5 border-b border-amber-400/30 flex items-center gap-2">
                                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 animate-pulse" />
                                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 tracking-[0.12em] uppercase">Special Offer</span>
                                  <Badge className="ml-auto bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/20 text-[9px]">Limited</Badge>
                                </div>
                              )}
                              {/* Priority label */}
                              {isLinked && (
                                <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-1.5 border-b border-primary/20 flex items-center gap-2">
                                  <ArrowRightLeft className="h-3 w-3 text-primary transition-transform duration-300 group-hover:rotate-180" />
                                  <span className="text-[10px] font-extrabold text-primary tracking-[0.12em] uppercase">Round Trip Flight</span>
                                  <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-[9px] relative overflow-hidden">
                                    <span className="relative z-10">Recommended</span>
                                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/30 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
                                  </Badge>
                                </div>
                              )}
                              {!isLinked && isSameAirline && (
                                <div className="bg-gradient-to-r from-primary/8 via-primary/3 to-transparent px-4 py-1 border-b border-primary/10 flex items-center gap-2">
                                  <Check className="h-3 w-3 text-primary" />
                                  <span className="text-[10px] font-bold text-primary tracking-[0.12em] uppercase">Same Airline</span>
                                </div>
                              )}
                              {!isLinked && !isSameAirline && pair.return && (
                                <div className="bg-gradient-to-r from-amber-500/8 via-amber-400/3 to-transparent px-4 py-1 border-b border-amber-400/15 flex items-center gap-2">
                                  <GitCompareArrows className="h-3 w-3 text-amber-600" />
                                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 tracking-[0.12em] uppercase">Mixed Airlines</span>
                                </div>
                              )}

                              <div className="p-4 space-y-3">
                                {/* Outbound leg */}
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 w-[60px] flex items-center justify-center">
                                    {outLogo ? (
                                      <div className="h-8 w-[56px] rounded-md bg-white/95 dark:bg-white/90 shadow-sm border border-border/30 flex items-center justify-center p-1">
                                        <img src={outLogo} alt={pair.outbound.airline} className="max-h-6 max-w-full object-contain" />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Plane className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="text-center min-w-[52px]">
                                      <p className="text-xl font-extrabold text-foreground leading-none tracking-tight tabular-nums">{formatTime(pair.outbound.departure_time)}</p>
                                      <p className="text-[10px] font-bold text-primary mt-1 underline decoration-dotted decoration-primary/40 underline-offset-2">
                                        {pair.outbound.departure_airport_code || pair.outbound.departure_city?.substring(0, 3).toUpperCase()}
                                      </p>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                                      <span className="text-[9px] text-muted-foreground font-medium">{calcDuration(pair.outbound.departure_time, pair.outbound.arrival_time) || ""}</span>
                                      <div className="flex items-center gap-0 w-full">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                                        <div className="flex-1 h-px border-t border-dashed border-primary/40 relative">
                                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-full p-0.5 shadow-sm border border-primary/20">
                                            <Plane className="h-2.5 w-2.5 text-primary rotate-90" />
                                          </div>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                                      </div>
                                      <span className="inline-flex items-center rounded-full bg-primary/8 text-primary text-[8px] font-semibold px-1.5 py-px tracking-wide">Direct</span>
                                    </div>
                                    <div className="text-center min-w-[52px]">
                                      <p className="text-xl font-extrabold text-foreground leading-none tracking-tight tabular-nums">{formatTime(pair.outbound.arrival_time)}</p>
                                      <p className="text-[10px] font-bold text-primary mt-1 underline decoration-dotted decoration-primary/40 underline-offset-2">
                                        {pair.outbound.arrival_airport_code || pair.outbound.arrival_city?.substring(0, 3).toUpperCase()}
                                      </p>
                                    </div>
                                  </div>

                                </div>

                                {/* Date divider */}
                                <div className="flex items-center gap-3 px-2">
                                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
                                  <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 border border-border/40 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                                    <Calendar className="h-2.5 w-2.5 text-primary" />
                                    <span className="text-foreground/80">{pair.outbound.departure_date ? format(new Date(pair.outbound.departure_date), "dd MMM") : ""}</span>
                                    {pair.return?.departure_date && (
                                      <>
                                        <span className="text-primary/60">·</span>
                                        <span className="font-semibold text-primary">{nights} {nights === 1 ? "night" : "nights"}</span>
                                        <span className="text-primary/60">·</span>
                                        <span className="text-foreground/80">{format(new Date(pair.return.departure_date), "dd MMM")}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
                                </div>

                                {/* Return leg */}
                                {pair.return ? (
                                  <div className="flex items-center gap-3">
                                    <div className="shrink-0 w-[60px] flex items-center justify-center">
                                      {retLogo ? (
                                        <div className="h-8 w-[56px] rounded-md bg-white/95 dark:bg-white/90 shadow-sm border border-border/30 flex items-center justify-center p-1">
                                          <img src={retLogo} alt={pair.return.airline} className="max-h-6 max-w-full object-contain" />
                                        </div>
                                      ) : (
                                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                          <Plane className="h-3.5 w-3.5 text-primary -rotate-90" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="text-center min-w-[52px]">
                                        <p className="text-xl font-extrabold text-foreground leading-none tracking-tight tabular-nums">{formatTime(pair.return.departure_time)}</p>
                                        <p className="text-[10px] font-bold text-primary mt-1 underline decoration-dotted decoration-primary/40 underline-offset-2">
                                          {pair.return.departure_airport_code || pair.return.departure_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                                        <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                                          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-px tracking-wide uppercase">Return</span>
                                          {calcDuration(pair.return.departure_time, pair.return.arrival_time) || ""}
                                        </span>
                                        <div className="flex items-center gap-0 w-full">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                                          <div className="flex-1 h-px border-t border-dashed border-primary/40 relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-full p-0.5 shadow-sm border border-primary/20">
                                              <Plane className="h-2.5 w-2.5 text-primary -rotate-90" />
                                            </div>
                                          </div>
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-primary/8 text-primary text-[8px] font-semibold px-1.5 py-px tracking-wide">Direct</span>
                                      </div>
                                      <div className="text-center min-w-[52px]">
                                        <p className="text-xl font-extrabold text-foreground leading-none tracking-tight tabular-nums">{formatTime(pair.return.arrival_time)}</p>
                                        <p className="text-[10px] font-bold text-primary mt-1 underline decoration-dotted decoration-primary/40 underline-offset-2">
                                          {pair.return.arrival_airport_code || pair.return.arrival_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>
                                    </div>

                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-3 bg-muted/20 rounded-xl p-3 border border-dashed border-border/40">
                                    <div className="flex items-center gap-2">
                                      <Plane className="h-4 w-4 text-muted-foreground -rotate-90" />
                                      <span className="text-xs text-muted-foreground">No return flight available</span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1 group/cta"
                                      onClick={(e) => { e.stopPropagation(); setShowCustomFlightSelection(true); }}
                                    >
                                      Pick a return separately
                                      <ArrowRight className="h-3 w-3 transition-transform group-hover/cta:translate-x-0.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Footer: combined price + select */}
                              <div className="border-t border-border/30 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <span className="text-[10px] text-muted-foreground font-medium truncate">
                                    {pair.outbound.airline}
                                    {pair.return && pair.return.airline !== pair.outbound.airline && (
                                      <> + {pair.return.airline}</>
                                    )}
                                  </span>
                                  {pair.outbound.flight_number && (
                                    <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/40 px-1.5 py-px text-[9px] font-mono font-semibold text-foreground/70">
                                      {pair.outbound.flight_number}
                                    </span>
                                  )}
                                  {pair.return?.flight_number && pair.return.flight_number !== pair.outbound.flight_number && (
                                    <span className="inline-flex items-center rounded-md bg-muted/60 border border-border/40 px-1.5 py-px text-[9px] font-mono font-semibold text-foreground/70">
                                      {pair.return.flight_number}
                                    </span>
                                  )}
                                  {lowSeats && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-px text-[9px] font-bold text-amber-700 dark:text-amber-400 animate-pulse">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      {minSeats} seat{minSeats === 1 ? "" : "s"} left
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="text-right">
                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Round Trip</p>
                                    <p className="text-2xl font-black text-primary leading-none tabular-nums price-glow">${combinedPrice}</p>
                                    {totalPassengers > 1 ? (
                                      <p className="text-[9px] text-muted-foreground mt-0.5">
                                        × {totalPassengers} pax = <span className="font-bold text-foreground/80 tabular-nums">${totalForAllPax}</span>
                                      </p>
                                    ) : (
                                      <p className="text-[9px] text-muted-foreground mt-0.5">per person</p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Button
                                      size="sm"
                                      className="rounded-xl gap-1.5 font-bold text-xs shadow-md shadow-primary/25 h-9 px-4 group/btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (pair.return) {
                                          handleFlightSelectWithSave?.(pair.outbound, totalPassengers, pair.return, { adults, children, infants });
                                        }
                                      }}
                                    >
                                      Book Round-trip
                                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/50 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                              <PlaneTakeoff className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground tracking-tight">Outbound Flights</h3>
                              <p className="text-[10px] text-muted-foreground font-medium">{fromCity} → {toCity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold tracking-wide hover:bg-primary/15">
                              {filteredResults.length} flight{filteredResults.length !== 1 ? "s" : ""}
                            </Badge>
                            {!selectedOutboundFlight && selectedReturnFlight && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse text-[10px]">
                                Pick your outbound →
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Sort: round-trip flights first, then others by price */}
                        {[...filteredResults].sort((a, b) => {
                          const aIsRT = a.trip_type === 'round_trip' || !!a.linked_flight_id ? 0 : 1;
                          const bIsRT = b.trip_type === 'round_trip' || !!b.linked_flight_id ? 0 : 1;
                          if (aIsRT !== bIsRT) return aIsRT - bIsRT;
                          return getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b);
                        }).map((flight) => {
                          const duration = calcDuration(flight.departure_time, flight.arrival_time);
                          const effectivePrice = getEffectiveAdultPrice(flight);
                          const isCheapest = effectivePrice === Math.min(...filteredResults.map(f => getEffectiveAdultPrice(f))) && filteredResults.length > 1;
                          const isSelected = selectedOutboundFlight?.id === flight.id;
                          const outLogo = getAirlineLogo(flight.airline, flight.airline_logo);
                          const seatsLeft = flight.available_seats || 0;

                          return (
                            <Card key={flight.id}
                              className={cn(
                                "group relative overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm rounded-2xl cursor-pointer",
                                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
                                isCheapest && !isSelected && "ring-1 ring-amber-400/30 border-amber-400/30",
                                isSelected && "ring-2 ring-primary border-primary/60 shadow-lg shadow-primary/20"
                              )}
                              onClick={() => setSelectedOutboundFlight(flight)}
                            >
                              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-1.5 border-b border-primary/15 flex items-center gap-2">
                                <PlaneTakeoff className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-extrabold text-primary tracking-[0.15em] uppercase">Outbound</span>
                                {isCheapest && (
                                  <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] font-bold tracking-wide">
                                    <Tag className="h-2.5 w-2.5 mr-0.5" /> Cheapest
                                  </Badge>
                                )}
                              </div>

                              {isSelected && (
                                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 z-10">
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row">
                                <div className="flex-1 p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="shrink-0 w-[72px] h-9 rounded-lg bg-white border border-border/40 flex items-center justify-center shadow-sm">
                                      {outLogo ? (
                                        <img src={outLogo} alt={flight.airline} className="h-6 max-w-[60px] object-contain" />
                                      ) : (
                                        <Plane className="h-4 w-4 text-primary" />
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="text-center min-w-[52px]">
                                        <p className="text-xl font-black text-foreground leading-none tabular-nums tracking-tight">{formatTime(flight.departure_time)}</p>
                                        <p className="text-[10px] font-bold text-primary mt-1 flex items-center justify-center gap-0.5 [text-decoration:underline_dotted] underline-offset-2 decoration-primary/40">
                                          {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover" />}
                                          {flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center gap-1 px-1">
                                        {duration && <span className="text-[9px] text-muted-foreground font-semibold tracking-wide">{duration}</span>}
                                        <div className="flex items-center gap-0 w-full">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                          <div className="flex-1 border-t border-dashed border-primary/40 relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-primary/30 rounded-full p-1 shadow-sm">
                                              <Plane className="h-2.5 w-2.5 text-primary rotate-90" />
                                            </div>
                                          </div>
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                        </div>
                                        <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 font-bold border-primary/20 text-primary/80 bg-primary/5">Direct</Badge>
                                      </div>
                                      <div className="text-center min-w-[52px]">
                                        <p className="text-xl font-black text-foreground leading-none tabular-nums tracking-tight">{formatTime(flight.arrival_time)}</p>
                                        <p className="text-[10px] font-bold text-primary mt-1 flex items-center justify-center gap-0.5 [text-decoration:underline_dotted] underline-offset-2 decoration-primary/40">
                                          {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover" />}
                                          {flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 mt-3 ml-[84px] text-[10px] text-muted-foreground">
                                    <span className="font-semibold">{flight.airline}</span>
                                    {flight.flight_number && (
                                      <span className="font-mono px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 text-[9px] font-bold tracking-wider">{flight.flight_number}</span>
                                    )}
                                    {flight.class && <span>• {flight.class}</span>}
                                    {seatsLeft > 0 && seatsLeft <= 10 && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-amber-600 border-amber-300 bg-amber-50/50 animate-pulse">{seatsLeft} seats left</Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 sm:border-l border-t sm:border-t-0 border-border/30 p-4 flex items-center justify-end sm:min-w-[130px] bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
                                  <div className="text-right">
                                    <p className="text-2xl font-black text-primary leading-none tabular-nums animate-price-glow">${effectivePrice}</p>
                                    <p className="text-[9px] text-muted-foreground mt-1 font-medium">per person</p>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>

                      {/* ── RETURN FLIGHTS ── */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/50 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                              <PlaneLanding className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                                Return Flights
                                <Badge className="bg-primary/10 text-primary border-0 text-[8px] h-4 px-1.5 font-bold tracking-wider">↩ RETURN</Badge>
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-medium">{toCity} → {fromCity}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold tracking-wide hover:bg-primary/15">
                              {returnSearchedFlights.length} flight{returnSearchedFlights.length !== 1 ? "s" : ""}
                            </Badge>
                            {selectedOutboundFlight && !selectedReturnFlight && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse text-[10px]">
                                Pick your return →
                              </Badge>
                            )}
                          </div>
                        </div>

                        {returnSearchedFlights.length === 0 ? (
                          <Card className="p-8 text-center border-dashed border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl">
                            <Plane className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2 rotate-180" />
                            <p className="text-sm text-muted-foreground font-medium">No return flights available for this date</p>
                          </Card>
                        ) : (
                          (() => {
                            const sorted = [...returnSearchedFlights].sort((a, b) => {
                              const aIsRT = a.trip_type === 'round_trip' || !!a.linked_flight_id ? 0 : 1;
                              const bIsRT = b.trip_type === 'round_trip' || !!b.linked_flight_id ? 0 : 1;
                              if (aIsRT !== bIsRT) return aIsRT - bIsRT;
                              if (selectedOutboundFlight) {
                                const aMatch = a.airline === selectedOutboundFlight.airline ? 0 : 1;
                                const bMatch = b.airline === selectedOutboundFlight.airline ? 0 : 1;
                                if (aMatch !== bMatch) return aMatch - bMatch;
                              }
                              return getEffectiveAdultPrice(a) - getEffectiveAdultPrice(b);
                            });
                            const cheapestReturn = Math.min(...sorted.map(f => getEffectiveAdultPrice(f)));

                            return sorted.map((flight) => {
                              const duration = calcDuration(flight.departure_time, flight.arrival_time);
                              const effectivePrice = getEffectiveAdultPrice(flight);
                              const isCheapest = effectivePrice === cheapestReturn && sorted.length > 1;
                              const isSelected = selectedReturnFlight?.id === flight.id;
                              const isSameAirline = selectedOutboundFlight && flight.airline === selectedOutboundFlight.airline;
                              const retLogo = getAirlineLogo(flight.airline, flight.airline_logo);
                              const seatsLeft = flight.available_seats || 0;

                              return (
                                <Card key={flight.id}
                                  className={cn(
                                    "group relative overflow-hidden border-border/40 bg-card/80 backdrop-blur-sm rounded-2xl cursor-pointer",
                                    "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
                                    isCheapest && !isSelected && "ring-1 ring-amber-400/30 border-amber-400/30",
                                    isSelected && "ring-2 ring-primary border-primary/60 shadow-lg shadow-primary/20"
                                  )}
                                  onClick={() => setSelectedReturnFlight(flight)}
                                >
                                  <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-1.5 border-b border-primary/15 flex items-center gap-2">
                                    <PlaneLanding className="h-3 w-3 text-primary" />
                                    <span className="text-[10px] font-extrabold text-primary tracking-[0.15em] uppercase">Return</span>
                                    {isSameAirline && (
                                      <Badge className="bg-primary/10 text-primary border-0 text-[9px] font-bold tracking-wide">
                                        <Check className="h-2.5 w-2.5 mr-0.5" /> Same Airline
                                      </Badge>
                                    )}
                                    {isCheapest && (
                                      <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-[9px] font-bold tracking-wide">
                                        <Tag className="h-2.5 w-2.5 mr-0.5" /> Cheapest
                                      </Badge>
                                    )}
                                  </div>

                                  {isSelected && (
                                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/30 z-10">
                                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                    </div>
                                  )}

                                  <div className="flex flex-col sm:flex-row">
                                    <div className="flex-1 p-4">
                                      <div className="flex items-center gap-3">
                                        <div className="shrink-0 w-[72px] h-9 rounded-lg bg-white border border-border/40 flex items-center justify-center shadow-sm">
                                          {retLogo ? (
                                            <img src={retLogo} alt={flight.airline} className="h-6 max-w-[60px] object-contain" />
                                          ) : (
                                            <Plane className="h-4 w-4 text-primary rotate-180" />
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className="text-center min-w-[52px]">
                                            <p className="text-xl font-black text-foreground leading-none tabular-nums tracking-tight">{formatTime(flight.departure_time)}</p>
                                            <p className="text-[10px] font-bold text-primary mt-1 flex items-center justify-center gap-0.5 [text-decoration:underline_dotted] underline-offset-2 decoration-primary/40">
                                              {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover" />}
                                              {flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()}
                                            </p>
                                          </div>
                                          <div className="flex-1 flex flex-col items-center gap-1 px-1">
                                            {duration && <span className="text-[9px] text-muted-foreground font-semibold tracking-wide">{duration}</span>}
                                            <div className="flex items-center gap-0 w-full">
                                              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                              <div className="flex-1 border-t border-dashed border-primary/40 relative">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-primary/30 rounded-full p-1 shadow-sm">
                                                  <Plane className="h-2.5 w-2.5 text-primary -rotate-90" />
                                                </div>
                                              </div>
                                              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                            </div>
                                            <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 font-bold border-primary/20 text-primary/80 bg-primary/5">Direct</Badge>
                                          </div>
                                          <div className="text-center min-w-[52px]">
                                            <p className="text-xl font-black text-foreground leading-none tabular-nums tracking-tight">{formatTime(flight.arrival_time)}</p>
                                            <p className="text-[10px] font-bold text-primary mt-1 flex items-center justify-center gap-0.5 [text-decoration:underline_dotted] underline-offset-2 decoration-primary/40">
                                              {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3 h-2 rounded-[1px] object-cover" />}
                                              {flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 mt-3 ml-[84px] text-[10px] text-muted-foreground">
                                        <span className="font-semibold">{flight.airline}</span>
                                        {flight.flight_number && (
                                          <span className="font-mono px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 text-[9px] font-bold tracking-wider">{flight.flight_number}</span>
                                        )}
                                        {flight.class && <span>• {flight.class}</span>}
                                        {seatsLeft > 0 && seatsLeft <= 10 && (
                                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-amber-600 border-amber-300 bg-amber-50/50 animate-pulse">{seatsLeft} seats left</Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="shrink-0 sm:border-l border-t sm:border-t-0 border-border/30 p-4 flex items-center justify-end sm:min-w-[130px] bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
                                      <div className="text-right">
                                        <p className="text-2xl font-black text-primary leading-none tabular-nums animate-price-glow">${effectivePrice}</p>
                                        <p className="text-[9px] text-muted-foreground mt-1 font-medium">per person</p>
                                      </div>
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
                    <Card className="border-primary/30 bg-card/90 backdrop-blur-xl overflow-hidden sticky bottom-4 z-10 shadow-2xl shadow-primary/20 rounded-2xl">
                      {/* Header strip */}
                      <div className="relative bg-gradient-to-r from-primary/95 via-primary to-primary/85 px-5 py-3 flex items-center justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent animate-price-shimmer pointer-events-none" />
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
                            <span className="text-lg font-black text-primary-foreground tabular-nums">${selectionTotal}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedOutboundFlight ? (
                            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3.5 border border-primary/20 hover:border-primary/40 transition-all group/sel hover:shadow-md hover:shadow-primary/10">
                              <div className="h-10 w-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                                {(() => {
                                  const logo = getAirlineLogo(selectedOutboundFlight.airline, selectedOutboundFlight.airline_logo);
                                  return logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Plane className="h-5 w-5 text-primary" />;
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-extrabold truncate text-foreground flex items-center gap-1">
                                  <PlaneTakeoff className="h-3 w-3 text-primary" /> Outbound
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {selectedOutboundFlight.airline} • {formatTime(selectedOutboundFlight.departure_time)}
                                </p>
                                <p className="text-xs font-bold text-primary mt-0.5 tabular-nums">${getEffectiveAdultPrice(selectedOutboundFlight)}/pp</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover/sel:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setSelectedOutboundFlight(null); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-muted/20 rounded-xl p-3.5 border-2 border-dashed border-primary/30 text-muted-foreground animate-pulse">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><PlaneTakeoff className="h-5 w-5 text-primary/60" /></div>
                              <span className="text-xs font-semibold text-primary/70">Pick your outbound →</span>
                            </div>
                          )}
                          {selectedReturnFlight ? (
                            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3.5 border border-primary/20 hover:border-primary/40 transition-all group/sel hover:shadow-md hover:shadow-primary/10">
                              <div className="h-10 w-10 rounded-xl bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                                {(() => {
                                  const logo = getAirlineLogo(selectedReturnFlight.airline, selectedReturnFlight.airline_logo);
                                  return logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Plane className="h-5 w-5 text-primary rotate-180" />;
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-extrabold truncate text-foreground flex items-center gap-1">
                                  <PlaneLanding className="h-3 w-3 text-primary" /> Return
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {selectedReturnFlight.airline} • {formatTime(selectedReturnFlight.departure_time)}
                                </p>
                                <p className="text-xs font-bold text-primary mt-0.5 tabular-nums">${getEffectiveAdultPrice(selectedReturnFlight)}/pp</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover/sel:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setSelectedReturnFlight(null); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 bg-muted/20 rounded-xl p-3.5 border-2 border-dashed border-primary/30 text-muted-foreground animate-pulse">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><PlaneLanding className="h-5 w-5 text-primary/60" /></div>
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
                                      <span className="font-bold text-foreground tabular-nums">${fl.rate}</span>
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
                                      <span className="font-bold text-primary tabular-nums">${selectionCommission}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-muted-foreground">Net:</span>
                                      <span className="font-bold text-foreground tabular-nums">${selectionNet}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                                    <p className="text-3xl font-black text-primary tracking-tight tabular-nums animate-price-glow">${selectionTotal}</p>
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
                  {filteredResults.map((flight, index) => {
                    const duration = calcDuration(flight.departure_time, flight.arrival_time);
                    const baggage = getBaggage(flight.class);
                    const effectivePrice = getEffectiveAdultPrice(flight);
                    const isCheapest = effectivePrice === cheapestPrice && searchedFlights.length > 1;
                    const totalPrice = effectivePrice * totalPassengers;
                    const isCompareSelected = compareIds.includes(flight.id);
                    const seatsLeft = flight.available_seats || 0;
                    const isSelected = selectedOutboundFlight?.id === flight.id;
                    
                    return (
                      <Card key={flight.id}
                        className={cn(
                          "group overflow-hidden border-border/30 hover:border-primary/40 transition-all duration-500 animate-[card-slide-up_0.4s_ease-out_forwards] opacity-0 cursor-pointer rounded-2xl",
                          "shadow-sm hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-0.5",
                          isCheapest && "ring-2 ring-[hsl(var(--success))]/20 border-[hsl(var(--success))]/30",
                          isCompareSelected && "ring-2 ring-primary/30 border-primary/40",
                          isSelected && "ring-2 ring-primary/50 border-primary/50 bg-primary/[0.02]"
                        )}
                        style={{ animationDelay: `${index * 60}ms` }}
                        onClick={() => setSelectedOutboundFlight(flight)}>
                        
                        {isCheapest && (
                          <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-6 py-2 border-b border-amber-400/15 flex items-center gap-2">
                            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
                              <Tag className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 tracking-[0.15em] uppercase">Best Price</span>
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          </div>
                        )}

                        <div className="p-5 sm:p-6">
                          <div className="flex items-start gap-4 sm:gap-5">
                            {/* Selection indicator */}
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-5",
                              isSelected ? "border-primary bg-primary shadow-md shadow-primary/30" : "border-border/40 group-hover:border-primary/40"
                            )}>
                              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>

                            {/* Airline Logo */}
                            <div className="shrink-0 flex flex-col items-center gap-1.5">
                              {(() => {
                                const logo = getAirlineLogo(flight.airline, flight.airline_logo);
                                return logo ? (
                                  <div className="h-14 w-14 rounded-2xl border border-border/30 p-2 bg-background shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                                    <img src={logo} alt={flight.airline} className="h-full w-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/15 shadow-sm">
                                    <Plane className="h-6 w-6 text-primary" />
                                  </div>
                                );
                              })()}
                              <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight max-w-[60px] truncate">{flight.airline}</span>
                            </div>

                            {/* Route Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded-md">{flight.flight_number || "—"}</span>
                                {flight.class && (
                                  <Badge className="text-[10px] capitalize font-semibold h-5 bg-secondary text-secondary-foreground border-none">
                                    {flight.class}
                                  </Badge>
                                )}
                                {seatsLeft > 0 && seatsLeft < 5 && (
                                  <Badge className="bg-destructive/10 text-destructive text-[10px] border-destructive/20 font-bold h-5 gap-1 animate-pulse">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Only {seatsLeft} left!
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-center min-w-[50px] sm:min-w-[70px]">
                                  <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tighter leading-none">{formatTime(flight.departure_time)}</p>
                                  <p className="text-[10px] sm:text-xs font-bold text-primary mt-1.5 tracking-wide flex items-center justify-center gap-1">
                                    {cityInfoMap[flight.departure_city]?.flagUrl && <img src={cityInfoMap[flight.departure_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[1px] object-cover" />}
                                    {flight.departure_airport_code || flight.departure_city?.substring(0, 3).toUpperCase()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{flight.departure_city}</p>
                                </div>
                                <div className="flex-1 flex flex-col items-center gap-1.5 px-1 sm:px-3">
                                  {duration && (
                                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/20">
                                      <Clock className="h-2.5 w-2.5" />{duration}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-0 w-full">
                                    <div className="w-2 h-2 rounded-full border-2 border-primary bg-background shrink-0" />
                                    <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/60 via-primary/20 to-primary/60 relative">
                                      <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-primary to-primary/40 animate-pulse opacity-30" />
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-full p-1 shadow-md border border-border/30">
                                        <Plane className="h-3.5 w-3.5 text-primary" style={{ transform: "rotate(90deg)" }} />
                                      </div>
                                    </div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/30 shrink-0" />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-medium tracking-wide">Direct</p>
                                </div>
                                <div className="text-center min-w-[50px] sm:min-w-[70px]">
                                  <p className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tighter leading-none">{formatTime(flight.arrival_time)}</p>
                                  <p className="text-[10px] sm:text-xs font-bold text-primary mt-1.5 tracking-wide flex items-center justify-center gap-1">
                                    {cityInfoMap[flight.arrival_city]?.flagUrl && <img src={cityInfoMap[flight.arrival_city].flagUrl!} alt="" className="w-3.5 h-2.5 rounded-[1px] object-cover" />}
                                    {flight.arrival_airport_code || flight.arrival_city?.substring(0, 3).toUpperCase()}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{flight.arrival_city}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <Badge variant="outline" className="text-[10px] gap-1 font-medium h-5.5 rounded-lg bg-muted/30">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {flight.departure_date ? format(new Date(flight.departure_date), "dd/MM/yyyy") : "Flexible"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] gap-1 font-medium h-5.5 rounded-lg bg-muted/30">
                                  <Luggage className="h-2.5 w-2.5" />{baggage}
                                </Badge>
                                <Badge variant="outline" className={cn(
                                  "text-[10px] gap-1 font-medium h-5.5 rounded-lg",
                                  seatsLeft < 5 ? "border-destructive/50 text-destructive bg-destructive/5" :
                                  seatsLeft < 10 ? "border-amber-400/50 text-amber-600 bg-amber-50/50" : "bg-muted/30"
                                )}>
                                  <Users className="h-2.5 w-2.5" />{seatsLeft} seats
                                </Badge>
                              </div>
                            </div>

                            {/* Price Column + Actions */}
                            <div className="shrink-0 text-right pl-3 sm:pl-5 border-l border-border/20 min-w-[100px] sm:min-w-[140px] flex flex-col items-end">
                              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl px-3 sm:px-5 py-3 sm:py-4 border border-primary/15 shadow-sm">
                                <p className="text-2xl sm:text-3xl font-black text-primary leading-none tracking-tight">${getEffectiveAdultPrice(flight)}</p>
                                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium tracking-wide">per person</p>
                                {(() => {
                                  const nextTier = getNextTierInfo(flight);
                                  if (nextTier) {
                                    return (
                                      <div className="mt-2 space-y-0.5 text-[9px] border-t border-primary/10 pt-1.5">
                                        <div className="text-muted-foreground">
                                          <span className="text-amber-600 dark:text-amber-400 font-bold">{nextTier.seatsLeftInTier}</span> seats at this price
                                        </div>
                                        <div className="text-muted-foreground">
                                          Next: <span className="font-bold text-foreground">${nextTier.nextPrice}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              
                              <div className="flex items-center gap-1.5 mt-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                                      onClick={(e) => { e.stopPropagation(); copyFlightDetails(flight); }}>
                                      <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">Copy details</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant={isCompareSelected ? "default" : "ghost"} size="icon" 
                                      className={cn("h-7 w-7 rounded-lg", isCompareSelected ? "bg-primary/15 text-primary hover:bg-primary/20" : "text-muted-foreground hover:text-primary")}
                                      onClick={(e) => { e.stopPropagation(); toggleCompare(flight.id); }}>
                                      <GitCompareArrows className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">{isCompareSelected ? "Remove from compare" : "Compare"}</TooltipContent>
                                </Tooltip>
                              </div>

                              <Button size="sm" className={cn(
                                "mt-2.5 rounded-xl w-full gap-1.5 font-bold text-xs h-9 transition-all duration-300",
                                isSelected 
                                  ? "bg-primary/90 shadow-lg shadow-primary/20" 
                                  : "shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]"
                              )}
                                onClick={(e) => { e.stopPropagation(); setSelectedOutboundFlight(flight); }}>
                                {isSelected ? "Selected ✓" : "Select"} {!isSelected && <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Expand/Collapse Toggle */}
                        <div className="border-t border-border/15 bg-muted/20">
                          <button
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-primary hover:bg-primary/5 transition-all font-bold tracking-[0.1em] uppercase"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedFlightId(expandedFlightId === flight.id ? null : flight.id);
                            }}
                          >
                            {expandedFlightId === flight.id ? (
                              <>Hide details <ChevronUp className="h-3.5 w-3.5" /></>
                            ) : (
                              <>Flight details <ChevronDown className="h-3.5 w-3.5" /></>
                            )}
                          </button>
                        </div>

                        {/* Expanded Flight Details - Pro Google Flights Style */}
                        {expandedFlightId === flight.id && (() => {
                          const returnFl = getLinkedReturnFlight(flight);
                          const returnDuration = returnFl ? calcDuration(returnFl.departure_time, returnFl.arrival_time) : null;
                          const returnBaggage = returnFl ? getBaggage(returnFl.class) : null;

                          const FlightLegDetail = ({ fl, legLabel, legDuration, legBaggage, colorScheme }: { fl: typeof flight; legLabel: string; legDuration: string | null; legBaggage: string; colorScheme: "primary" | "emerald" }) => {
                            const isPrimary = colorScheme === "primary";
                            const accentText = isPrimary ? "text-primary" : "text-emerald-600 dark:text-emerald-400";
                            const accentBg = isPrimary ? "bg-primary/10" : "bg-emerald-500/10";
                            const accentBorder = isPrimary ? "border-primary/20" : "border-emerald-500/20";
                            const accentDot = isPrimary ? "border-primary" : "border-emerald-500";
                            const accentDotFill = isPrimary ? "bg-primary" : "bg-emerald-500";
                            const accentLine = isPrimary ? "bg-primary/20" : "bg-emerald-500/20";
                            const flLogo = getAirlineLogo(fl.airline, fl.airline_logo);

                            return (
                              <div className="space-y-4">
                                {/* Leg header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", accentDotFill)} style={{ boxShadow: `0 0 8px ${isPrimary ? 'hsl(var(--primary) / 0.4)' : 'rgb(16 185 129 / 0.4)'}` }} />
                                    <span className={cn("text-[11px] font-extrabold uppercase tracking-[0.2em]", accentText)}>{legLabel}</span>
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      · {fl.departure_date ? format(new Date(fl.departure_date), "EEE, dd MMM yyyy") : ""}
                                    </span>
                                  </div>
                                  {legDuration && (
                                    <span className={cn("text-[11px] font-bold px-3 py-1 rounded-lg border", accentBg, accentBorder, accentText)}>{legDuration}</span>
                                  )}
                                </div>

                                {/* Airline + flight number */}
                                <div className="flex items-center gap-3">
                                  {flLogo ? (
                                    <img src={flLogo} alt={fl.airline} className="h-8 max-w-[90px] object-contain" />
                                  ) : (
                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", accentBg)}>
                                      <Plane className={cn("h-4 w-4", accentText)} />
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold text-foreground">{fl.airline}</span>
                                  <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">{fl.flight_number || "TBD"}</span>
                                  {fl.class && (
                                    <Badge className={cn("text-[10px] capitalize font-semibold h-5 border-none", accentBg, accentText)}>
                                      {fl.class}
                                    </Badge>
                                  )}
                                </div>

                                {/* Timeline */}
                                <div className="flex items-start gap-4 pl-1">
                                  {/* Vertical timeline dots + line */}
                                  <div className="flex flex-col items-center pt-1">
                                    <div className={cn("w-3.5 h-3.5 rounded-full border-[2.5px] bg-background shadow-sm", accentDot)} />
                                    <div className={cn("w-[2px] flex-1 min-h-[60px] rounded-full", accentLine)} />
                                    <div className={cn("w-3.5 h-3.5 rounded-full border-[2.5px] shadow-sm", accentDot, accentDotFill)} />
                                  </div>
                                  {/* Departure + Arrival info */}
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-baseline gap-3">
                                      <p className="text-base font-extrabold text-foreground tracking-tight">{formatTime(fl.departure_time)}</p>
                                      <p className="text-sm text-muted-foreground font-medium">
                                        {fl.departure_airport_code || fl.departure_city?.substring(0, 3).toUpperCase()}
                                        <span className="ml-1.5 text-foreground/70">{fl.departure_city}</span>
                                      </p>
                                    </div>
                                    {/* Mid info: duration, baggage, etc. */}
                                    <div className="flex items-center gap-3 py-3 ml-0">
                                      <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border", accentBg, accentBorder, accentText)}>
                                        {isPrimary ? <PlaneTakeoff className="h-3 w-3" /> : <PlaneLanding className="h-3 w-3" />}
                                        {legDuration || "—"}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Luggage className="h-3 w-3" />{legBaggage}</span>
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                      <p className="text-base font-extrabold text-foreground tracking-tight">{formatTime(fl.arrival_time)}</p>
                                      <p className="text-sm text-muted-foreground font-medium">
                                        {fl.arrival_airport_code || fl.arrival_city?.substring(0, 3).toUpperCase()}
                                        <span className="ml-1.5 text-foreground/70">{fl.arrival_city}</span>
                                      </p>
                                    </div>
                                    {fl.arrival_date && fl.arrival_date !== fl.departure_date && (
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                        Arrives {format(new Date(fl.arrival_date), "EEE, dd MMM")}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <div className="border-t border-border/15 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent px-6 py-5 space-y-5">
                              {/* Outbound leg */}
                              <FlightLegDetail
                                fl={flight}
                                legLabel={returnFl ? "Departure" : "Flight"}
                                legDuration={duration}
                                legBaggage={baggage}
                                colorScheme="primary"
                              />

                              {/* Return leg */}
                              {returnFl && (
                                <>
                                  <div className="border-t border-dashed border-border/40 my-1" />
                                  <FlightLegDetail
                                    fl={returnFl}
                                    legLabel="Return"
                                    legDuration={returnDuration}
                                    legBaggage={returnBaggage || baggage}
                                    colorScheme="emerald"
                                  />
                                </>
                              )}

                              {/* Footer */}
                              <div className="flex items-center gap-4 pt-3 border-t border-border/15 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md"><Clock className="h-3 w-3" /> All times are local</span>
                                {returnFl && <span className="text-border">•</span>}
                                {returnFl && <span className="font-medium">Round-trip total: {duration}{returnDuration ? ` + ${returnDuration}` : ""}</span>}
                              </div>
                            </div>
                          );
                        })()}
                      </Card>
                    );
                  })}

                  {/* Selection summary bar - BOTTOM */}
                  {selectedOutboundFlight && (
                    <Card className="border-primary/30 bg-card/95 backdrop-blur-xl overflow-hidden sticky bottom-4 z-10 shadow-2xl shadow-primary/15 rounded-2xl">
                      {/* Header strip */}
                      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                            <Plane className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <span className="font-bold text-sm text-primary-foreground tracking-wide">Your Selection</span>
                        </div>
                        {selectionFareLines.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary-foreground/70">Total</span>
                            <span className="text-lg font-black text-primary-foreground">${selectionTotal}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3.5 border border-primary/15 hover:border-primary/30 transition-colors group/sel mb-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                            {(() => {
                              const logo = getAirlineLogo(selectedOutboundFlight.airline, selectedOutboundFlight.airline_logo);
                              return logo ? <img src={logo} alt="" className="h-6 w-6 object-contain" /> : <Plane className="h-5 w-5 text-primary" />;
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-extrabold truncate text-foreground">
                              {selectedOutboundFlight.departure_city} → {selectedOutboundFlight.arrival_city}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {selectedOutboundFlight.airline} • {formatTime(selectedOutboundFlight.departure_time)}
                            </p>
                            <p className="text-xs font-bold text-primary mt-0.5">${getEffectiveAdultPrice(selectedOutboundFlight)}/pp</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover/sel:opacity-100 transition-opacity" onClick={() => setSelectedOutboundFlight(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
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
                                    <span className="font-bold text-foreground">${fl.rate}</span>
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
                                    <span className="font-bold text-[hsl(var(--success))]">${selectionCommission}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">Net:</span>
                                    <span className="font-bold text-primary">${selectionNet}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground font-medium">Total Amount</p>
                                  <p className="text-2xl font-black text-primary tracking-tight">${selectionTotal}</p>
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
                  { label: "Baggage", render: (f: Flight) => getBaggage(f.class) },
                  { label: "Seats", render: (f: Flight) => `${f.available_seats || 0} available` },
                  { label: "Price", render: (f: Flight) => <span className="text-primary font-black text-base">${getEffectiveAdultPrice(f)}</span> },
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
