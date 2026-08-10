import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  ChevronLeft, 
  Calendar, 
  Building,
  ClipboardList,
  BedDouble,
  Users, 
  Check, 
  MapPin,
  Clock,
  ArrowRight,
  Plane,
  FileCheck,
  Package2,
  FileText,
  Eye,
  AlertTriangle,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePackage, usePackageHotels } from "@/hooks/usePackages";
import { usePackageHotelsByPackage } from "@/hooks/usePackageHotels";
import { useCreateBooking } from "@/hooks/useBookings";
import { usePackageDepartureFlights } from "@/hooks/usePackageDepartureFlights";
import { usePackageHotelAvailability } from "@/hooks/usePackageHotelAvailability";
import { usePackageRates } from "@/hooks/usePackageRates";
import { usePackageSpecialRates } from "@/hooks/usePackageSpecialRates";
import { useAgencyCreditCheck } from "@/hooks/useAgencyCreditCheck";
import { useAirlines } from "@/hooks/useAirlines";


import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookingCelebration } from "@/components/booking/BookingCelebration";
import { BookingPaymentStep } from "@/components/booking/BookingPaymentStep";
import { format } from "date-fns";

import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { EnhancedItinerary } from "@/components/booking/EnhancedItinerary";
import { EnhancedHotelSelector } from "@/components/booking/EnhancedHotelSelector";
import { HotelTierSelector } from "@/components/booking/HotelTierSelector";
import { FlightScheduleCard } from "@/components/booking/FlightScheduleCard";
import { CompactFlightCards } from "@/components/booking/CompactFlightCards";
import { GuestRoomSelector, type RoomAssignment, type RoomConfig } from "@/components/booking/GuestRoomSelector";
import { PassengerDetailsForm, type PassengerFormData } from "@/components/booking/PassengerDetailsForm";
import { PaymentBreakdown } from "@/components/booking/PaymentBreakdown";
import { DigitalVoucher } from "@/components/booking/DigitalVoucher";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { openStorageFile } from "@/utils/openStorageFile";
import { useTermsConditions } from "@/hooks/useTermsConditions";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import packageTurkey from "@/assets/package-turkey.jpg";
import destinationDubai from "@/assets/destination-dubai.jpg";
import destinationMalaysia from "@/assets/destination-malaysia.jpg";
import destinationThailand from "@/assets/destination-thailand.jpg";
import destinationEgypt from "@/assets/destination-egypt.jpg";

interface DayProgram {
  day: number;
  title: string;
  description?: string;
  activities: string[];
  image?: string;
}

// 5 steps booking flow
const steps = [
  { id: 1, name: "Select Date", icon: Calendar },
  { id: 2, name: "Hotel & Flight", icon: BedDouble },
  { id: 3, name: "Details", icon: Users },
  { id: 4, name: "Review", icon: Eye },
  { id: 5, name: "Payment", icon: ShieldCheck },
];

const cityFallbackImages: Record<string, string> = {
  Istanbul: packageTurkey,
  Dubai: destinationDubai,
  "Kuala Lumpur": destinationMalaysia,
  Bangkok: destinationThailand,
  Cairo: destinationEgypt,
  Turkey: packageTurkey,
  UAE: destinationDubai,
  Malaysia: destinationMalaysia,
  Thailand: destinationThailand,
  Egypt: destinationEgypt,
};

const BookPackage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: pkg, isLoading: pkgLoading } = usePackage(id || "");
  const { data: hotels } = usePackageHotels(pkg?.city_id || null);
  const { data: packageHotels } = usePackageHotelsByPackage(id || null);
  const destinationCountry = pkg?.cities?.country || "";
  const destinationCityName = pkg?.cities?.name || "";
  const packageHeroImage =
    pkg?.images?.find((image): image is string => Boolean(image && image.trim())) ||
    pkg?.cover_photo_url ||
    pkg?.cities?.image_url ||
    cityFallbackImages[destinationCityName] ||
    cityFallbackImages[destinationCountry] ||
    packageTurkey;
  const { airlines } = useAirlines();
  const airlineLogoUrl = useMemo(() => {
    if (!pkg?.airline || !airlines.length) return null;
    const match = airlines.find(a => a.name.toLowerCase() === pkg.airline!.toLowerCase());
    return match?.logo_url || null;
  }, [pkg?.airline, airlines]);
  
  
  const createBooking = useCreateBooking();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassengerForms, setShowPassengerForms] = useState(false);

  // Track if returning from review to preserve passenger forms
  const cameFromReviewRef = useRef(false);

  // Booking selections
  const [selectedDeparture, setSelectedDeparture] = useState<string | null>(searchParams.get("departure"));
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hotelPriceAdjustment, setHotelPriceAdjustment] = useState(0);
  const [groupSize, setGroupSize] = useState(parseInt(searchParams.get("passengers") || "1", 10));
  const [guestBreakdown, setGuestBreakdown] = useState({
    adults: parseInt(searchParams.get("passengers") || "1", 10),
    children6to12: 0,
    children2to6: 0,
    infants: 0,
  });
  const [flightIncluded, setFlightIncluded] = useState(true);
  const [visaIncluded, setVisaIncluded] = useState(true);
  const [roomAssignments, setRoomAssignments] = useState<RoomAssignment[]>([]);
  const [roomConfigs, setRoomConfigs] = useState<RoomConfig[]>([]);
  const [passengerVisaSelections, setPassengerVisaSelections] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const initialSize = parseInt(searchParams.get("passengers") || "1", 10);
    for (let i = 0; i < initialSize; i++) initial[i] = true;
    return initial;
  });


  
  // Form data for review step
  const [pendingFormData, setPendingFormData] = useState<PassengerFormData | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [agencyCommission, setAgencyCommission] = useState<number>(0);

  // Terms & Conditions
  const { settings: tcSettings } = useTermsConditions();

  // Fetch agency commission rate
  useEffect(() => {
    const fetchCommission = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("agencies")
        .select("commission_rate")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.commission_rate) setAgencyCommission(data.commission_rate);
    };
    fetchCommission();
  }, [user]);

  // Booking result
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    booking_number: string;
    leadTraveler: string;
    contactEmail: string;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Fetch flight details for selected departure
  const { data: departureFlights } = usePackageDepartureFlights(selectedDeparture);
  const defaultOutboundFlight = departureFlights?.find(f => f.flight_type === "outbound");
  const defaultReturnFlight = departureFlights?.find(f => f.flight_type === "return");

  const outboundFlight = defaultOutboundFlight;
  const returnFlight = defaultReturnFlight;

  // Fetch hotel availability for package
  const { data: hotelAvailability } = usePackageHotelAvailability(id || null);
  
  // Fetch package rates (default + special)
  const { data: packageRates } = usePackageRates(id || null);
  const { data: packageSpecialRates } = usePackageSpecialRates(id || null);

  // Determine room type string from a room config (mirrors GuestRoomSelector logic)
  const getRoomTypeForPricing = useCallback((room: { adults: number; children6to12: number; children2to6: number; infants: number }): string => {
    const { adults, children6to12, children2to6 } = room;
    const totalNonInfant = adults + children6to12 + children2to6;
    if (totalNonInfant === 1) return "Single";
    if (adults === 3 && children6to12 === 0 && children2to6 === 0) return "Triple";
    if (children6to12 >= 1 && totalNonInfant >= 3) return "Double";
    if (adults === 2 && children6to12 === 1) return "Double";
    if (adults === 1 && totalNonInfant === 2) return "Double";
    if (adults === 2 && children6to12 === 0) return "Double";
    return "Double";
  }, []);

  // Get the effective rate for a guest type + hotel + room type, checking special rates first
  const getGuestRate = useCallback((guestType: string, hotelId: string | null, roomType?: string): { price: number; commission: number } | null => {
    if (!hotelId) return null;
    
    // Find selected departure date
    const depDate = pkg?.package_departures?.find(d => d.id === selectedDeparture)?.departure_date;
    
    // Check special rates for the selected departure date first
    if (packageSpecialRates && depDate) {
      const specialRate = packageSpecialRates.find(r => 
        r.hotel_id === hotelId && 
        r.guest_type === guestType &&
        r.departure_date === depDate &&
        (!roomType || r.room_type === roomType)
      );
      if (specialRate) return { price: specialRate.price, commission: specialRate.commission };
    }
    
    // Fall back to default rates - match room type if provided
    if (packageRates) {
      if (roomType) {
        const exactMatch = packageRates.find(r => r.hotel_id === hotelId && r.guest_type === guestType && r.room_type === roomType);
        if (exactMatch) return { price: exactMatch.price, commission: exactMatch.commission };
      }
      // Fallback: any rate for this guest type
      const matching = packageRates.filter(r => r.hotel_id === hotelId && r.guest_type === guestType);
      if (matching.length > 0) {
        return { price: matching[0].price, commission: matching[0].commission };
      }
    }
    
    return null;
  }, [packageRates, packageSpecialRates, selectedDeparture, pkg]);

  // Build hotel adult prices map for HotelTierSelector
  const hotelAdultPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    if (!packageHotels) return prices;
    for (const ph of packageHotels) {
      const rate = getGuestRate("Adult", ph.hotel_id, "Double");
      if (rate) {
        prices[ph.hotel_id] = rate.price;
      }
    }
    return prices;
  }, [packageHotels, getGuestRate]);

  // Use visa amounts per guest type from the package
  const visaPriceAdt = (pkg as any)?.visa_amount_adt || (pkg as any)?.visa_amount || 0;
  const visaPriceChd = (pkg as any)?.visa_amount_chd || 0;
  const visaPriceInf = (pkg as any)?.visa_amount_inf || 0;
  const visaPrice = visaPriceAdt; // fallback for legacy/flat usage
  const flightPrice = 450; // Fixed round-trip from Erbil

  // Build a map of passenger index -> guest type for visa pricing
  const getPassengerGuestTypes = useCallback((): Record<number, string> => {
    const types: Record<number, string> = {};
    let idx = 0;
    for (const room of roomAssignments) {
      for (let a = 0; a < room.adults; a++) types[idx++] = "adult";
      for (let c = 0; c < room.children6to12; c++) types[idx++] = "child";
      for (let c = 0; c < room.children2to6; c++) types[idx++] = "child";
      for (let i = 0; i < room.infants; i++) types[idx++] = "infant";
    }
    // Fill remaining with adult
    for (let i = idx; i < groupSize; i++) types[i] = "adult";
    return types;
  }, [roomAssignments, groupSize]);

  const getVisaPriceForGuest = useCallback((guestIndex: number): number => {
    const types = getPassengerGuestTypes();
    const type = types[guestIndex] || "adult";
    if (type === "child") return visaPriceChd;
    if (type === "infant") return visaPriceInf;
    return visaPriceAdt;
  }, [getPassengerGuestTypes, visaPriceAdt, visaPriceChd, visaPriceInf]);

  const selectedDep = pkg?.package_departures?.find((d) => d.id === selectedDeparture);
  const selectedHotel = hotels?.find((h) => h.id === selectedHotelId);
  const selectedRoom = selectedHotel?.hotel_rooms?.find((r) => r.id === selectedRoomId);
  
  const basePrice = selectedDep?.price_per_person || pkg?.starting_price || 0;
  const adjustedBasePrice = basePrice + hotelPriceAdjustment;
  const roomPrice = selectedRoom ? selectedRoom.price_per_night * (pkg?.nights || 1) : 0;
  const dayProgram = (pkg?.day_program as unknown as DayProgram[]) || [];
  const destinationName = pkg?.cities?.name || "";
  const passportRequired = (pkg as any)?.passport_required ?? true;
  const visaRequired = (pkg as any)?.visa_required ?? true;
  
  // Update visa state when package loads
  useEffect(() => {
    if (pkg) {
      const pkgVisaRequired = (pkg as any)?.visa_required ?? true;
      setVisaIncluded(pkgVisaRequired);
    }
  }, [pkg]);

  // Default all passengers to visa=yes when group size changes
  useEffect(() => {
    setPassengerVisaSelections(prev => {
      const updated: Record<number, boolean> = {};
      for (let i = 0; i < groupSize; i++) {
        updated[i] = prev[i] !== undefined ? prev[i] : true;
      }
      return updated;
    });
  }, [groupSize]);

  // Keep guest breakdown in sync with groupSize
  const totalGuests = guestBreakdown.adults + guestBreakdown.children6to12 + guestBreakdown.children2to6 + guestBreakdown.infants;
  
  // Update groupSize when guestBreakdown changes
  const handleGuestsChange = useCallback((newBreakdown: typeof guestBreakdown) => {
    setGuestBreakdown(newBreakdown);
    const newTotal = newBreakdown.adults + newBreakdown.children6to12 + newBreakdown.children2to6 + newBreakdown.infants;
    setGroupSize(newTotal);
  }, []);



  // Check if package has configured hotel tiers
  const hasPackageHotels = packageHotels && packageHotels.length > 0;

  // Helper: count children that should be priced as adults
  // Rules:
  // 1. If a room has exactly 1 adult and exactly 1 child (any age), that child is priced as adult (Double)
  // 2. If a room has 2 children (CHD 2-6 + CHD 2-12), the CHD 2-12 is priced as adult
  const getChildrenPricedAsAdults = useCallback(() => {
    let children612AsAdult = 0;
    let children26AsAdult = 0;
    for (const room of roomAssignments) {
      const totalChildren = room.children6to12 + room.children2to6;
      // Case 1: 1 ADT + 1 CHD = Double → child priced as adult
      if (room.adults === 1 && totalChildren === 1) {
        children612AsAdult += room.children6to12;
        children26AsAdult += room.children2to6;
      }
      // Case 2: 2 children in room → CHD 2-12 priced as adult
      else if (totalChildren === 2 && room.children6to12 >= 1 && room.children2to6 >= 1) {
        children612AsAdult += room.children6to12;
      }
      // Case 3: 1 ADT + 2 CHD 2-12 → 1 CHD 2-12 priced as adult
      else if (room.adults === 1 && room.children6to12 >= 2) {
        children612AsAdult += 1;
      }
    }
    return { children612AsAdult, children26AsAdult };
  }, [roomAssignments]);

  const calculateGrandTotal = () => {
    // Use per-guest-type rates if available
    const hasRates = selectedHotelId && (packageRates?.length || packageSpecialRates?.length);
    
    if (hasRates) {
      let total = 0;
      
      // Price per room based on room type
      for (const room of roomAssignments) {
        const roomType = getRoomTypeForPricing(room);
        const totalChildren = room.children6to12 + room.children2to6;
        
        // Adults in this room
        const adultRate = getGuestRate("Adult", selectedHotelId, roomType);
        const adultPrice = adultRate?.price || adjustedBasePrice;
        total += adultPrice * room.adults;
        
        // Determine which children are priced as adults in this room
        let ch612AsAdult = 0;
        let ch26AsAdult = 0;
        // Case 1: 1 ADT + 1 CHD = Double → child priced as adult
        if (room.adults === 1 && totalChildren === 1) {
          ch612AsAdult = room.children6to12;
          ch26AsAdult = room.children2to6;
        }
        // Case 2: 1 ADT + 2 children (CHD 2-6 + CHD 2-12) → CHD 2-12 priced as adult
        else if (room.adults <= 1 && totalChildren === 2 && room.children6to12 >= 1 && room.children2to6 >= 1) {
          ch612AsAdult = room.children6to12;
        }
        // Case 3: 1 ADT + 2 CHD 2-12 → 1 CHD 2-12 priced as adult
        else if (room.adults === 1 && room.children6to12 >= 2) {
          ch612AsAdult = 1;
        }
        
        // Children priced as adults use adult rate for THIS room type
        total += adultPrice * (ch612AsAdult + ch26AsAdult);
        
        // Normal children 2-12
        const normalCh612 = room.children6to12 - ch612AsAdult;
        if (normalCh612 > 0) {
          // For extra bed children, use "Extra Bed" room type rate
          const childRoomType = (room.children6to12 >= 1 && (room.adults + room.children2to6 + room.children6to12) >= 3) ? "Extra Bed" : roomType;
          const ch612Rate = getGuestRate("Child (2-12)", selectedHotelId, childRoomType);
          total += (ch612Rate?.price || adjustedBasePrice) * normalCh612;
        }
        
        // Normal children 2-6
        const normalCh26 = room.children2to6 - ch26AsAdult;
        if (normalCh26 > 0) {
          const ch26Rate = getGuestRate("Child (2-6)", selectedHotelId, roomType);
          total += (ch26Rate?.price || adjustedBasePrice) * normalCh26;
        }
        
        // Infants
        if (room.infants > 0) {
          const infantRate = getGuestRate("Infant", selectedHotelId, "Without-Bed");
          total += (infantRate?.price || adjustedBasePrice) * room.infants;
        }
      }
      
      // Visa deductions - per guest type
      if (visaRequired) {
        for (const [idx, hasVisa] of Object.entries(passengerVisaSelections)) {
          if (hasVisa === false) {
            total -= getVisaPriceForGuest(Number(idx));
          }
        }
      }
      return total;
    }
    
    // Fallback to flat pricing
    let total = adjustedBasePrice * groupSize;
    if (!hasPackageHotels) total += roomPrice;
    if (visaRequired) {
      for (const [idx, hasVisa] of Object.entries(passengerVisaSelections)) {
        if (hasVisa === false) {
          total -= getVisaPriceForGuest(Number(idx));
        }
      }
    }
    return total;
  };

  const handlePassengerVisaChange = (index: number, hasVisa: boolean) => {
    setPassengerVisaSelections(prev => ({ ...prev, [index]: hasVisa }));
  };

  // Calculate per-guest prices based on actual rates
  const calculateGuestPrices = useCallback((): Record<number, number> => {
    const prices: Record<number, number> = {};
    const hasRates = selectedHotelId && (packageRates?.length || packageSpecialRates?.length);
    
    if (hasRates && roomAssignments.length > 0) {
      let guestIdx = 0;
      for (const room of roomAssignments) {
        const roomType = getRoomTypeForPricing(room);
        const totalChildren = room.children6to12 + room.children2to6;
        const adultRate = getGuestRate("Adult", selectedHotelId, roomType);
        const adultPrice = adultRate?.price || adjustedBasePrice;
        
        // Determine children priced as adults
        let ch612AsAdult = 0;
        let ch26AsAdult = 0;
        if (room.adults === 1 && totalChildren === 1) {
          ch612AsAdult = room.children6to12;
          ch26AsAdult = room.children2to6;
        } else if (room.adults <= 1 && totalChildren === 2 && room.children6to12 >= 1 && room.children2to6 >= 1) {
          ch612AsAdult = room.children6to12;
        } else if (room.adults === 1 && room.children6to12 >= 2) {
          ch612AsAdult = 1;
        }
        
        // Adults
        for (let a = 0; a < room.adults; a++) {
          prices[guestIdx++] = adultPrice;
        }
        
        // Children 2-12
        let ch612Remaining = room.children6to12;
        // First assign those priced as adult
        for (let c = 0; c < ch612AsAdult && ch612Remaining > 0; c++) {
          prices[guestIdx++] = adultPrice;
          ch612Remaining--;
        }
        // Normal children 2-12
        if (ch612Remaining > 0) {
          const childRoomType = (room.children6to12 >= 1 && (room.adults + room.children2to6 + room.children6to12) >= 3) ? "Extra Bed" : roomType;
          const ch612Rate = getGuestRate("Child (2-12)", selectedHotelId, childRoomType);
          const ch612Price = ch612Rate?.price || adjustedBasePrice;
          for (let c = 0; c < ch612Remaining; c++) {
            prices[guestIdx++] = ch612Price;
          }
        }
        
        // Children 2-6
        let ch26Remaining = room.children2to6;
        for (let c = 0; c < ch26AsAdult && ch26Remaining > 0; c++) {
          prices[guestIdx++] = adultPrice;
          ch26Remaining--;
        }
        if (ch26Remaining > 0) {
          const ch26Rate = getGuestRate("Child (2-6)", selectedHotelId, roomType);
          const ch26Price = ch26Rate?.price || adjustedBasePrice;
          for (let c = 0; c < ch26Remaining; c++) {
            prices[guestIdx++] = ch26Price;
          }
        }
        
        // Infants
        if (room.infants > 0) {
          const infantRate = getGuestRate("Infant", selectedHotelId, "Without-Bed");
          const infantPrice = infantRate?.price || adjustedBasePrice;
          for (let i = 0; i < room.infants; i++) {
            prices[guestIdx++] = infantPrice;
          }
        }
      }
    } else {
      // Flat pricing fallback
      for (let i = 0; i < groupSize; i++) {
        prices[i] = adjustedBasePrice;
      }
    }
    
    return prices;
  }, [selectedHotelId, packageRates, packageSpecialRates, roomAssignments, getRoomTypeForPricing, getGuestRate, adjustedBasePrice, groupSize]);

  const triggerCelebration = () => {
    setShowCelebration(true);
  };

  const handleSearchHotels = () => {
    if (selectedDeparture) {
      setCurrentStep(2);
    }
  };

  const handleSelectRoom = (hotelId: string, roomId: string) => {
    console.log("handleSelectRoom called:", hotelId, roomId);
    setSelectedHotelId(hotelId);
    setSelectedRoomId(roomId);
    toast.success("Room selected!", { duration: 1500 });
  };

  const handleSelectHotelTier = (hotelId: string, priceAdjustment: number) => {
    setSelectedHotelId(hotelId);
    setHotelPriceAdjustment(priceAdjustment);
    // For tier-based selection, we don't need a room
    setSelectedRoomId("tier-selected");
    toast.success("Hotel tier selected!", { duration: 1500 });
  };

  const handleContinueToFinalize = () => {
    // When called from HotelTierSelector, hotel is already selected via handleSelectHotelTier
    // so selectedHotelId should be set. If not set yet (race condition), just proceed.
    if (!hasPackageHotels && (!selectedHotelId || !selectedRoomId)) {
      toast.error("Please select a hotel and room to continue");
      return;
    }
    setShowPassengerForms(false);
    setCurrentStep(3);
  };

  const handleGoToReview = (data: PassengerFormData) => {
    setPendingFormData(data);
    setCurrentStep(4);
  };

  // Credit check for booking amount
  const bookingTotal = useMemo(() => {
    // Calculate a rough estimate for credit check
    const hasRates = selectedHotelId && (packageRates?.length || packageSpecialRates?.length);
    if (hasRates && roomAssignments.length > 0) {
      let total = 0;
      for (const room of roomAssignments) {
        const occupants = room.adults + room.children6to12 + room.children2to6 + room.infants;
        total += adjustedBasePrice * occupants;
      }
      return total;
    }
    return adjustedBasePrice * groupSize;
  }, [selectedHotelId, packageRates, packageSpecialRates, roomAssignments, adjustedBasePrice, groupSize]);

  const { data: creditCheck } = useAgencyCreditCheck(bookingTotal);

  const handleBookingSubmit = async (data: PassengerFormData) => {
    if (!selectedDep) return;
    
    // Check hard credit limit before proceeding
    if (creditCheck?.isHardLimitExceeded) {
      toast.error("Credit limit exceeded", {
        description: `Your available credit is $${creditCheck.availableCredit.toFixed(2)}. Please contact admin to increase your limit.`
      });
      return;
    }
    
    try {
      const leadPassenger = data.passengers[0];
      const booking = await createBooking.mutateAsync({
        booking_type: "package",
        departure_id: selectedDep.id,
        hotel_id: selectedHotelId,
        passengers: data.passengers.length,
        passenger_details: data.passengers.map(p => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          nationality: p.nationality,
          documents: p.documents || [],
        })) as any,
        total_amount: calculateGrandTotal(),
        status: "pending_payment" as const,
        special_requests: data.specialRequests || null,
        notes: JSON.stringify({
          flightIncluded,
          visaIncluded,
          hotelName: selectedHotel?.name,
          hotelStarRating: selectedHotel?.star_rating,
          hotelTier: hasPackageHotels ? (packageHotels?.find(ph => ph.hotel_id === selectedHotelId)?.tier || null) : null,
          hotelPriceAdjustment: hotelPriceAdjustment,
          hotelIsUpgrade: !packageHotels?.find(ph => ph.hotel_id === selectedHotelId)?.is_default,
          hotelIsDefault: packageHotels?.find(ph => ph.hotel_id === selectedHotelId)?.is_default || false,
          roomType: selectedRoom?.room_type,
          flightRoute: flightIncluded ? `${outboundFlight?.flights?.departure_city || 'Erbil'} ↔ ${destinationName}` : null,
          departureCity: outboundFlight?.flights?.departure_city || null,
          departureAirportCode: (outboundFlight?.flights as any)?.departure_airport_code || null,
          customOutboundFlight: null,
          customReturnFlight: null,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          guideName: (pkg as any)?.guide_name || null,
          guidePhone: (pkg as any)?.phone || null,
          gateNumber: (pkg as any)?.gate_number || null,
          groupPolicy: (pkg as any)?.group_policy || null,
          packageName: pkg?.name || null,
          destination: destinationName || null,
          nights: pkg?.nights || null,
        }),
      });
      
      setBookingResult({
        id: booking.id,
        booking_number: booking.booking_number,
        leadTraveler: `${leadPassenger.firstName} ${leadPassenger.lastName}`,
        contactEmail: data.contactEmail,
      });
      
      // Go to payment step instead of celebration
      setCurrentStep(5);
      toast.success("Booking created! Please complete payment.");
    } catch (error: any) {
      toast.error("Failed to create booking", { description: error?.message || "Unknown error" });
    }
  };

  // Check if we can proceed
  const canProceedFromHotel = hasPackageHotels 
    ? !!selectedHotelId 
    : (selectedHotelId && selectedRoomId);

  if (pkgLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted to-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Package not found</h2>
          <p className="text-muted-foreground mb-6">The package you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/packages")} className="rounded-2xl h-12 px-8">
            Back to Packages
          </Button>
        </div>
      </div>
    );
  }

  // If booking is complete, show pending confirmation
  if (bookingResult && selectedDep) {
    const destinationName = pkg?.cities?.name || "Destination";
    const totalAmount = calculateGrandTotal();

    return (
      <>
      <BookingCelebration
        show={showCelebration}
        bookingNumber={bookingResult.booking_number}
        title={pkg?.name || "Package"}
        totalAmount={totalAmount}
        type="package"
        summaryItems={[
          { label: "Destination", value: destinationName },
          { label: "Dates", value: `${format(new Date(selectedDep.departure_date), "dd/MM")} - ${format(new Date(selectedDep.return_date), "dd/MM")}` },
          { label: "Travelers", value: `${groupSize} traveler${groupSize > 1 ? "s" : ""}` },
          { label: "Lead", value: bookingResult.leadTraveler },
        ]}
        onClose={() => { setShowCelebration(false); navigate("/bookings"); }}
      />
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted/50">
        {/* Frosted top bar matching booking wizard */}
        <div className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-sm font-heading font-bold text-foreground">Booking Submitted</h2>
                <p className="text-[11px] text-muted-foreground">#{bookingResult.booking_number}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold gap-1.5 px-3 py-1">
              <Clock className="h-3.5 w-3.5" />
              Pending
            </Badge>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
          {/* Hero Success Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            {/* Subtle gradient accent at top */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
            
            <div className="px-6 py-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25 animate-scale-in">
                <Clock className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2 animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                  Awaiting Confirmation
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your booking has been submitted successfully and is being processed by our team.
                </p>
              </div>
            </div>
          </div>

          {/* Trip Summary Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <Package2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider">Trip Summary</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Package & Destination */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-foreground truncate">{pkg?.name}</p>
                  <p className="text-sm text-muted-foreground">{destinationName} · {pkg?.nights} nights</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-primary/[0.04] border border-primary/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Departure</p>
                  <p className="text-sm font-semibold text-foreground">{format(new Date(selectedDep.departure_date), "dd/MM/yyyy")}</p>
                </div>
                <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Return</p>
                  <p className="text-sm font-semibold text-foreground">{format(new Date(selectedDep.return_date), "dd/MM/yyyy")}</p>
                </div>
              </div>

              {/* Traveler & Lead */}
              <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{bookingResult.leadTraveler}</p>
                  <p className="text-xs text-muted-foreground">{groupSize} traveler{groupSize > 1 ? "s" : ""} · {bookingResult.contactEmail}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider">Payment Summary</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {groupSize} traveler{groupSize > 1 ? "s" : ""} × ${adjustedBasePrice.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-foreground">${(groupSize * adjustedBasePrice).toLocaleString()}</span>
              </div>
              {(() => {
                const optOutTotal = Object.entries(passengerVisaSelections)
                  .filter(([, v]) => v === false)
                  .reduce((sum, [idx]) => sum + getVisaPriceForGuest(Number(idx)), 0);
                const optOutCount = Object.values(passengerVisaSelections).filter(v => v === false).length;
                return optOutCount > 0 ? (
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">{optOutCount} visa opt-out</span>
                    <span className="text-emerald-600 font-medium">-${optOutTotal.toLocaleString()}</span>
                  </div>
                ) : null;
              })()}
              {hotelPriceAdjustment > 0 && (
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-muted-foreground">Hotel upgrade</span>
                  <span className="font-medium text-foreground">+${(hotelPriceAdjustment * groupSize).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                <span className="font-heading font-bold text-foreground">Total Amount</span>
                <span className="text-2xl font-heading font-bold text-primary">${totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Info Notice */}
          <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 p-4 flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Processing in Progress</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Please proceed with payment to ensure smooth processing and confirmation of your booking. You'll be notified once confirmed.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => navigate("/bookings")}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-heading font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            View My Bookings
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Stepper — Flat icon + label, evenly spaced */}
      <div className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Desktop stepper */}
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isActive = isCompleted || isCurrent;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => { if (step.id < currentStep) setCurrentStep(step.id); }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground/40"
                    )}>
                      <step.icon className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-[0.12em] transition-colors whitespace-nowrap",
                      isActive ? "text-primary" : "text-muted-foreground/40"
                    )}>
                      {step.name}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-2 mb-5">
                      <div className={cn(
                        "h-[2px] w-full rounded-full transition-colors duration-500",
                        isCompleted ? "bg-primary" : "bg-border"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile stepper */}
          <div className="md:hidden flex items-center gap-1.5">
            {steps.map((step) => (
              <div key={step.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  "w-full h-1.5 rounded-full transition-all duration-500",
                  currentStep >= step.id ? "bg-primary" : "bg-border/60"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Step 1: Select Date — Reference-matched layout */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Hero + Calendar */}
            <div className="lg:col-span-3 space-y-6">
              {/* Hero Image Card — compact */}
              <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
                {packageHeroImage ? (
                  <img
                    src={packageHeroImage}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary via-primary/70 to-accent" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5 md:p-6">
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{pkg.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5 text-white/80 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{pkg.cities?.country}</span>
                    <span className="mx-1">•</span>
                    <span>{pkg.nights} Nights Premium Experience</span>
                  </div>
                </div>
              </div>

              {/* Calendar Card */}
              <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Select your departure</h3>
                </div>
                <div className="px-4 pb-4">
                  <AvailabilityCalendar
                    departures={pkg.package_departures || []}
                    selectedDeparture={selectedDeparture}
                    onSelect={setSelectedDeparture}
                    onSearch={handleSearchHotels}
                    showSearchButton={false}
                    fallbackPrice={pkg.starting_price}
                  />
                </div>
              </div>
            </div>

              {/* Right: Package Includes + Pricing */}
              <div className="lg:col-span-2 space-y-6">
                {/* Package Includes — Clean white card */}
                <div className="bg-card rounded-3xl shadow-sm border border-border">
                  <div className="px-6 py-5 border-b border-border">
                    <h3 className="text-lg font-bold text-foreground">Package Includes</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    {pkg.includes_hotel && (
                      <div className="flex items-start gap-4">
                        <Building className="h-5 w-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-sm font-bold text-foreground">Boutique Hotel</p>
                          <p className="text-xs text-muted-foreground">{pkg.nights} Nights Accommodation</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <Plane className="h-5 w-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div>
                        <p className="text-sm font-bold text-foreground">Round-trip Flights</p>
                        <p className="text-xs text-muted-foreground">{pkg.airline ? `via ${pkg.airline}` : `Erbil ↔ ${destinationName}`}</p>
                      </div>
                    </div>
                    {pkg.includes_transfer && (
                      <div className="flex items-start gap-4">
                        <ArrowRight className="h-5 w-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-sm font-bold text-foreground">Private Transfers</p>
                          <p className="text-xs text-muted-foreground">Airport to Hotel chauffeured service</p>
                        </div>
                      </div>
                    )}
                    {pkg.includes_tours && (
                      <div className="flex items-start gap-4">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" strokeWidth={1.5} />
                        <div>
                          <p className="text-sm font-bold text-foreground">Guided Tours</p>
                          <p className="text-xs text-muted-foreground">Certified local expert for all landmarks</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Summary — Dark blue card with white text */}
                <div className="bg-primary rounded-3xl shadow-lg p-6 space-y-4">
                  {selectedDep ? (
                    <>
                      <div className="space-y-2 border-b border-white/20 pb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">Subtotal per person</span>
                          <span className="text-white font-medium">${(selectedDep.price_per_person || basePrice).toLocaleString()}.00</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">Taxes & Fees</span>
                          <span className="text-white font-medium">$215.00</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-bold text-lg">Total Amount</span>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-white/60 mb-0.5">Total for 1 guest</p>
                            <p className="text-3xl font-bold text-white">${(selectedDep.price_per_person || basePrice).toLocaleString()}.00</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleSearchHotels}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-white text-primary font-semibold text-sm shadow-sm transition-colors hover:bg-white/90"
                      >
                        Continue to Hotel & Flight
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <p className="text-center text-[11px] text-white/50">
                        Cancellation is free up to 48 hours before departure.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-center py-4">
                        <p className="text-xs text-white/60 uppercase tracking-wider mb-1">From</p>
                        <p className="text-4xl font-bold text-white">${basePrice.toLocaleString()}</p>
                        <p className="text-xs text-white/60 mt-1">per person</p>
                      </div>
                      <button
                        disabled
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-white/20 text-white/50 font-semibold text-sm cursor-not-allowed"
                      >
                        Continue to Hotel & Flight
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Help section */}
                <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Need assistance with your booking?</span>
                </div>
            </div>
          </div>
        )}

        {/* Step 2: Hotel & Flight Selection */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Included banner - navy rounded */}
              <div className="bg-primary rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-foreground">Hotel & Flight Included</p>
                  <p className="text-xs text-primary-foreground/70">Your package is ready. You can still upgrade your stay or flight options below.</p>
                </div>
              </div>

              {/* Flight Summary */}
              <CompactFlightCards
                departure={selectedDep}
                pkg={pkg}
                airlineLogoUrl={airlineLogoUrl}
              />

              {/* Hotel Selection */}
              {hasPackageHotels ? (
                <HotelTierSelector
                  packageHotels={packageHotels}
                  selectedHotelId={selectedHotelId}
                  onSelectHotel={handleSelectHotelTier}
                  basePrice={basePrice}
                  packageStartingPrice={pkg.starting_price}
                  onContinue={handleContinueToFinalize}
                  showContinueButton={true}
                  availability={hotelAvailability || []}
                  selectedDepartureId={selectedDeparture}
                  hotelAdultPrices={hotelAdultPrices}
                />
              ) : (
                <EnhancedHotelSelector
                  hotels={hotels || []}
                  selectedHotelId={selectedHotelId}
                  onSelectHotel={(hotelId) => {
                    setSelectedHotelId(hotelId);
                    setSelectedRoomId("hotel-selected");
                  }}
                  nights={pkg.nights}
                  onContinue={handleContinueToFinalize}
                />
              )}
            </div>
            
            {/* Trip Summary Sidebar */}
            <div className="space-y-4">
              <div className="bg-card rounded-2xl p-5 shadow-lg border border-border sticky top-28">
                <h3 className="font-bold text-foreground text-lg mb-5">Trip Summary</h3>
                
                {selectedDep && (
                  <div className="space-y-4">
                    {/* Dates */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Dates</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">
                            {format(new Date(selectedDep.departure_date), "dd/MM")} - {format(new Date(selectedDep.return_date), "dd/MM")}
                          </p>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Nights</p>
                            <p className="text-sm font-bold text-foreground">{pkg.nights}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Travelers */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Travelers</p>
                        <p className="text-sm font-bold text-foreground">{groupSize} {groupSize === 1 ? "Adult" : "Travelers"}</p>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Destination</p>
                        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {destinationName}
                          {destinationCountry && getCountryFlagUrl(destinationCountry) && (
                            <img src={getCountryFlagUrl(destinationCountry, 20)!} alt={destinationCountry} className="h-3 w-auto rounded-[2px]" />
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Flights & Hotel</span>
                        <span className="font-semibold text-foreground">${adjustedBasePrice.toLocaleString()}.00</span>
                      </div>
                      {hotelPriceAdjustment > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hotel Upgrade</span>
                          <span className="font-semibold text-foreground">+${hotelPriceAdjustment.toLocaleString()}.00</span>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="pt-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Price</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-bold text-foreground">${(adjustedBasePrice + hotelPriceAdjustment).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">Starting from ${adjustedBasePrice}/pp</span>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <Button
                      onClick={handleContinueToFinalize}
                      disabled={!selectedHotelId}
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm gap-2 mt-2"
                    >
                      Continue to Details
                      <ArrowRight className="h-4 w-4" />
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                      Price includes all taxes and carrier fees. Non-refundable package.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {currentStep === 3 && selectedDep && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ overflowAnchor: 'none' }}>
            <div className={cn("lg:col-span-2 space-y-6", !showPassengerForms && "order-2 lg:order-1")}>
              {!showPassengerForms ? (
                <Card className="border-border" style={{ overflowAnchor: 'none' }}>
                  <CardContent className="pt-6 space-y-6">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">Configure Guests & Rooms</h2>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Add all your rooms and guests, then click the button below when you're ready.
                      </p>
                    </div>

                    {/* Guest summary - always show all rows to prevent layout shifts */}
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adults (12+)</span>
                        <span className="font-medium">{guestBreakdown.adults}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Children (2-12)</span>
                        <span className="font-medium">{guestBreakdown.children6to12}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Children (2-6)</span>
                        <span className="font-medium">{guestBreakdown.children2to6}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Infants (Under 2)</span>
                        <span className="font-medium">{guestBreakdown.infants}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border">
                        <span className="font-semibold">Total Guests</span>
                        <span className="font-bold text-primary">{groupSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rooms</span>
                        <span className="font-medium">{roomAssignments.length || 1}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={guestBreakdown.adults < 1}
                      onClick={() => setShowPassengerForms(true)}
                    >
                      Continue to Passenger Details <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassengerForms(false)}
                    className="mb-2"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to Edit Guests
                  </Button>
                  <PassengerDetailsForm
                    passengerCount={groupSize}
                    onPassengerCountChange={setGroupSize}
                    onSubmit={handleGoToReview}
                    isLoading={false}
                    requiredDocuments={(pkg as any)?.required_documents || []}
                    roomAssignments={roomAssignments}
                    showPassengerCounter={false}
                    visaPrice={visaRequired ? visaPrice : undefined}
                    getVisaPriceForGuest={visaRequired ? getVisaPriceForGuest : undefined}
                    onPassengerVisaChange={handlePassengerVisaChange}
                    passengerVisaSelections={passengerVisaSelections}
                    guestPrices={calculateGuestPrices()}
                    submitLabel="Review Booking →"
                    departureDate={selectedDep?.departure_date}
                    initialData={pendingFormData || undefined}
                  />
                </>
              )}
            </div>
            <div className={cn("space-y-5 sticky top-28", !showPassengerForms && "order-1 lg:order-2")}>
              {/* Unified Modern Sidebar */}
              <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                {/* Compact Header */}
                <div className="px-5 py-4 border-b border-border/50 bg-muted/30">
                  <h3 className="font-bold text-foreground text-lg">{pkg.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {destinationName}
                      {destinationCountry && getCountryFlagUrl(destinationCountry) && (
                        <img src={getCountryFlagUrl(destinationCountry, 20)!} alt={destinationCountry} className="h-3 w-auto rounded-[2px]" />
                      )}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(selectedDep.departure_date), "dd/MM")} – {format(new Date(selectedDep.return_date), "dd/MM")}
                    </span>
                  </div>
                </div>

                {/* Info Chips */}
                <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-border/50">
                  <Badge variant="secondary" className="rounded-lg text-xs gap-1.5 px-2.5 py-1">
                    <Clock className="h-3 w-3" />
                    {pkg.nights}N
                  </Badge>
                  {(selectedHotel || (hasPackageHotels && selectedHotelId)) && (
                    <Badge variant="secondary" className="rounded-lg text-xs gap-1.5 px-2.5 py-1">
                      <Building className="h-3 w-3" />
                      {hasPackageHotels
                        ? packageHotels?.find(h => h.hotel_id === selectedHotelId)?.hotels?.name
                        : selectedHotel?.name}
                    </Badge>
                  )}
                  {hotelPriceAdjustment === 0 && selectedHotelId && (
                    <Badge className="rounded-lg text-xs gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-200/50 hover:bg-emerald-500/15">
                      <Check className="h-3 w-3" /> Included
                    </Badge>
                  )}
                  {hotelPriceAdjustment > 0 && (
                    <Badge className="rounded-lg text-xs gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 border-amber-200/50 hover:bg-amber-500/15">
                      +${hotelPriceAdjustment}/pp
                    </Badge>
                  )}
                </div>

                {/* Guests & Rooms Section */}
                <div className="px-5 py-4 border-b border-border/50">
                  <GuestRoomSelector
                    departureDate={selectedDep ? new Date(selectedDep.departure_date) : null}
                    returnDate={selectedDep ? new Date(selectedDep.return_date) : null}
                    availableSeats={selectedDep?.available_seats || 20}
                    availableLabel="seats left"
                    maxRooms={(() => {
                      if (selectedHotelId && selectedDeparture && hotelAvailability) {
                        const avail = hotelAvailability.find(
                          a => a.hotel_id === selectedHotelId && a.departure_id === selectedDeparture
                        );
                        if (avail) return Math.max(0, avail.available_rooms - avail.booked_rooms);
                      }
                      return undefined;
                    })()}
                    guests={guestBreakdown}
                    onGuestsChange={handleGuestsChange}
                    nights={pkg.nights}
                    onRoomAssignmentsChange={setRoomAssignments}
                    selectedHotelId={selectedHotelId}
                    initialRooms={roomConfigs.length > 0 ? roomConfigs : undefined}
                    onRoomConfigsChange={setRoomConfigs}
                  />
                </div>

                {/* Rate Breakdown */}
                <div className="px-5 py-4 border-b border-border/50 space-y-2 text-sm">
                  {(() => {
                    const guestTypeMap: { abbr: string; count: number; perPerson: number; perPersonCom: number; note?: string }[] = [];
                    const priceAccum: Record<string, { count: number; price: number; commission: number }> = {};
                    
                    for (const room of roomAssignments) {
                      const roomType = getRoomTypeForPricing(room);
                      const totalChildren = room.children6to12 + room.children2to6;
                      const adultRate = getGuestRate("Adult", selectedHotelId, roomType);
                      const adultPrice = adultRate?.price || adjustedBasePrice;
                      const adultCom = adultRate?.commission || 0;
                      
                      // Adults
                      if (room.adults > 0) {
                        const key = `ADT@${adultPrice}`;
                        priceAccum[key] = priceAccum[key] || { count: 0, price: adultPrice, commission: adultCom };
                        priceAccum[key].count += room.adults;
                      }
                      
                      // Children priced as adults
                      let ch612AsAdult = 0, ch26AsAdult = 0;
                      if (room.adults === 1 && totalChildren === 1) { ch612AsAdult = room.children6to12; ch26AsAdult = room.children2to6; }
                      else if (room.adults <= 1 && totalChildren === 2 && room.children6to12 >= 1 && room.children2to6 >= 1) { ch612AsAdult = room.children6to12; }
                      else if (room.adults === 1 && room.children6to12 >= 2) { ch612AsAdult = 1; }
                      
                      if (ch612AsAdult > 0) { const k = `CHD 2-12 (ADT)@${adultPrice}`; priceAccum[k] = priceAccum[k] || { count: 0, price: adultPrice, commission: adultCom }; priceAccum[k].count += ch612AsAdult; }
                      if (ch26AsAdult > 0) { const k = `CHD 2-6 (ADT)@${adultPrice}`; priceAccum[k] = priceAccum[k] || { count: 0, price: adultPrice, commission: adultCom }; priceAccum[k].count += ch26AsAdult; }
                      
                      const normalCh612 = room.children6to12 - ch612AsAdult;
                      if (normalCh612 > 0) { const childRoomType = (room.children6to12 >= 1 && (room.adults + room.children2to6 + room.children6to12) >= 3) ? "Extra Bed" : roomType; const r = getGuestRate("Child (2-12)", selectedHotelId, childRoomType); const p = r?.price || adjustedBasePrice; const c = r?.commission || 0; const k = `CHD 2-12@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, commission: c }; priceAccum[k].count += normalCh612; }
                      const normalCh26 = room.children2to6 - ch26AsAdult;
                      if (normalCh26 > 0) { const r = getGuestRate("Child (2-6)", selectedHotelId, roomType); const p = r?.price || adjustedBasePrice; const c = r?.commission || 0; const k = `CHD 2-6@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, commission: c }; priceAccum[k].count += normalCh26; }
                      if (room.infants > 0) { const r = getGuestRate("Infant", selectedHotelId, "Without-Bed"); const p = r?.price || adjustedBasePrice; const c = r?.commission || 0; const k = `INF@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, commission: c }; priceAccum[k].count += room.infants; }
                    }
                    
                    for (const [key, val] of Object.entries(priceAccum)) {
                      const abbr = key.split('@')[0];
                      const isAsAdult = abbr.includes('(ADT)');
                      guestTypeMap.push({ abbr: abbr.replace(' (ADT)', ''), count: val.count, perPerson: val.price, perPersonCom: val.commission, note: isAsAdult ? 'priced as ADT' : undefined });
                    }

                    let totalRate = 0;
                    let totalCom = 0;

                    const lines = guestTypeMap.map((t, i) => {
                      const typeRate = t.perPerson * t.count;
                      const typeCom = t.perPersonCom * t.count;
                      totalRate += typeRate;
                      totalCom += typeCom;
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{t.count} {t.abbr} {t.note && <span className="text-amber-600 text-[10px]">({t.note})</span>} <span className="text-muted-foreground">×${t.perPerson}</span></span>
                          <div className="flex items-center gap-2">
                            <span>${typeRate.toLocaleString()}</span>
                            {t.perPersonCom > 0 && (
                              <span className="text-emerald-600 text-[10px]">-${typeCom.toLocaleString()} com</span>
                            )}
                          </div>
                        </div>
                      );
                    });

                    const totalNet = totalRate - totalCom;

                    return (
                      <>
                        {lines}
                        {totalCom > 0 && (
                          <>
                            <div className="h-px bg-border/50 my-1" />
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>Total</span>
                              <div className="flex items-center gap-2">
                                <span>${totalRate.toLocaleString()}</span>
                                <span className="text-emerald-600">-${totalCom.toLocaleString()} Com</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-primary">
                              <span>Total Net</span>
                              <span>${totalNet.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                  {visaRequired && (() => {
                    // Build list of opted-out guests with their labels and per-guest visa prices
                    const optOutGuests: { label: string; price: number }[] = [];
                    let guestIndex = 0;
                    for (const room of roomAssignments) {
                      for (let a = 0; a < room.adults; a++) {
                        if (passengerVisaSelections[guestIndex] === false) {
                          optOutGuests.push({ label: `Guest ${guestIndex + 1} (Adult)`, price: getVisaPriceForGuest(guestIndex) });
                        }
                        guestIndex++;
                      }
                      for (let c = 0; c < room.children6to12; c++) {
                        if (passengerVisaSelections[guestIndex] === false) {
                          optOutGuests.push({ label: `Guest ${guestIndex + 1} (CHD 2-12)`, price: getVisaPriceForGuest(guestIndex) });
                        }
                        guestIndex++;
                      }
                      for (let c = 0; c < room.children2to6; c++) {
                        if (passengerVisaSelections[guestIndex] === false) {
                          optOutGuests.push({ label: `Guest ${guestIndex + 1} (CHD 2-6)`, price: getVisaPriceForGuest(guestIndex) });
                        }
                        guestIndex++;
                      }
                      for (let inf = 0; inf < room.infants; inf++) {
                        if (passengerVisaSelections[guestIndex] === false) {
                          optOutGuests.push({ label: `Guest ${guestIndex + 1} (Infant)`, price: getVisaPriceForGuest(guestIndex) });
                        }
                        guestIndex++;
                      }
                    }
                    for (let i = guestIndex; i < groupSize; i++) {
                      if (passengerVisaSelections[i] === false) {
                        optOutGuests.push({ label: `Guest ${i + 1}`, price: getVisaPriceForGuest(i) });
                      }
                    }
                    const totalOptOut = optOutGuests.reduce((s, g) => s + g.price, 0);
                    return optOutGuests.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-destructive font-medium">
                          <span>Visa opt-out</span>
                          <span>-${totalOptOut.toLocaleString()}</span>
                        </div>
                        <div className="pl-2 space-y-0.5">
                          {optOutGuests.map((guest, i) => (
                            <div key={i} className="flex justify-between text-[10px] text-destructive/70">
                              <span>{guest.label}</span>
                              <span>-${guest.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Grand Total */}
                <div className="px-5 py-5 bg-primary/5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">TOTAL</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{groupSize} traveler{groupSize !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-primary tracking-tight">
                      ${calculateGrandTotal().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && selectedDep && pendingFormData && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            {/* Clean Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">Review Your Booking</h2>
                <p className="text-sm text-muted-foreground mt-1">Verify your itinerary and passenger details before proceeding.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 border-border"
                onClick={() => {
                  cameFromReviewRef.current = false;
                  setCurrentStep(3);
                  setShowPassengerForms(false);
                }}
              >
                <FileCheck className="h-3.5 w-3.5" /> Edit Details
              </Button>
            </div>

            {/* Two-column layout */}
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left Column: Details (3 cols) */}
              <div className="lg:col-span-3 space-y-6">
                {/* Package & Travel Dates */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Package & Travel Dates
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-foreground text-lg">{pkg.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {destinationName}
                        {destinationCountry && getCountryFlagUrl(destinationCountry) && (
                          <img src={getCountryFlagUrl(destinationCountry, 20)!} alt={destinationCountry} className="h-3 w-auto rounded-[2px] inline ml-1.5" />
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{format(new Date(selectedDep.departure_date), "dd/MM/yyyy")} — {format(new Date(selectedDep.return_date), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {pkg.nights} Nights, {pkg.nights + 1} Days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Hotel Accommodation */}
                {(selectedHotel || (hasPackageHotels && selectedHotelId)) && (() => {
                  const hotelName = hasPackageHotels
                    ? packageHotels?.find(h => h.hotel_id === selectedHotelId)?.hotels?.name
                    : selectedHotel?.name;
                  const hotelImages = hasPackageHotels
                    ? packageHotels?.find(h => h.hotel_id === selectedHotelId)?.hotels?.images
                    : selectedHotel?.images;
                  const hotelStars = hasPackageHotels
                    ? packageHotels?.find(h => h.hotel_id === selectedHotelId)?.hotels?.star_rating
                    : selectedHotel?.star_rating;
                  const hotelImg = hotelImages?.find((img): img is string => Boolean(img?.trim()));
                  return (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Hotel Accommodation
                      </p>
                      <div className="flex items-center gap-4">
                        {hotelImg ? (
                          <img src={hotelImg} alt={hotelName || ''} className="w-24 h-20 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-24 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <Building className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-bold text-foreground">{hotelName}</p>
                          {hotelStars && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {Array.from({ length: hotelStars }).map((_, i) => (
                                <span key={i} className="text-amber-400 text-xs">★</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span><span className="font-semibold text-foreground">Room Type</span> Deluxe</span>
                            <span><span className="font-semibold text-foreground">Board</span> Breakfast Included</span>
                          </div>
                        </div>
                        {hotelPriceAdjustment === 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200/50 text-xs shrink-0">Included</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200/50 text-xs shrink-0">+${hotelPriceAdjustment}/pp</Badge>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(selectedHotel || (hasPackageHotels && selectedHotelId)) && <div className="h-px bg-border" />}

                {/* Traveler Information */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Traveler Information</p>
                  <div className="space-y-2">
                    {pendingFormData.passengers.map((p, i) => {
                      const hasVisa = passengerVisaSelections[i] !== false;
                      return (
                        <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{p.firstName} {p.lastName}</p>
                              <p className="text-[11px] text-muted-foreground">Adult Passenger</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {visaRequired && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] rounded-full px-2.5",
                                hasVisa 
                                  ? "border-amber-500/30 text-amber-600 bg-amber-500/5 font-semibold" 
                                  : "border-destructive/30 text-destructive bg-destructive/5"
                              )}>
                                {hasVisa ? "Visa Required" : "No Visa"}
                              </Badge>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Agency & Contact Info */}
                {(pendingFormData.agentName || pendingFormData.agencyEmail || pendingFormData.agencyName || pendingFormData.agencyPhone) && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contact Information</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {pendingFormData.agentName && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Agent</p>
                            <p className="font-medium text-foreground">{pendingFormData.agentName}</p>
                          </div>
                        )}
                        {pendingFormData.agencyEmail && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Agency Email</p>
                            <p className="font-medium text-foreground">{pendingFormData.agencyEmail}</p>
                          </div>
                        )}
                        {pendingFormData.agencyName && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Leader Name</p>
                            <p className="font-medium text-foreground">{pendingFormData.agencyName}</p>
                          </div>
                        )}
                        {pendingFormData.agencyPhone && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Leader Phone</p>
                            <p className="font-medium text-foreground">{pendingFormData.agencyPhone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Special Requests */}
                {pendingFormData.specialRequests && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Special Requests</p>
                      <p className="text-sm text-foreground leading-relaxed">{pendingFormData.specialRequests}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Booking Summary Sidebar (2 cols) */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-20 space-y-5">
                  {/* Booking Summary Card */}
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3">
                      <h3 className="font-heading font-bold text-foreground text-lg">Booking Summary</h3>
                      <p className="text-xs text-muted-foreground">Trip to {destinationName}</p>
                    </div>

                    {/* Mini Stepper */}
                    <div className="px-5 pb-4 space-y-2">
                      {[
                        { label: "Review", icon: Eye, active: true },
                        { label: "Payment", icon: CreditCard, active: false },
                        { label: "Confirm", icon: Check, active: false },
                      ].map((s, i) => (
                        <div key={i} className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          s.active ? "bg-primary/5 text-primary font-semibold" : "text-muted-foreground"
                        )}>
                          <s.icon className={cn("h-4 w-4", s.active ? "text-primary" : "text-muted-foreground/60")} />
                          {s.label}
                        </div>
                      ))}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Price Lines */}
                    <div className="p-5 space-y-2 text-sm">
                      {(() => {
                        const guestTypeMap: { label: string; count: number; perPerson: number }[] = [];
                        const priceAccum: Record<string, { count: number; price: number; label: string }> = {};
                        
                        for (const room of roomAssignments) {
                          const roomType = getRoomTypeForPricing(room);
                          const totalChildren = room.children6to12 + room.children2to6;
                          const adultRate = getGuestRate("Adult", selectedHotelId, roomType);
                          const adultPrice = adultRate?.price || adjustedBasePrice;
                          
                          if (room.adults > 0) { const k = `ADT@${adultPrice}`; priceAccum[k] = priceAccum[k] || { count: 0, price: adultPrice, label: 'Adult Traveller' }; priceAccum[k].count += room.adults; }
                          
                          let ch612AsAdult = 0, ch26AsAdult = 0;
                          if (room.adults === 1 && totalChildren === 1) { ch612AsAdult = room.children6to12; ch26AsAdult = room.children2to6; }
                          else if (room.adults <= 1 && totalChildren === 2 && room.children6to12 >= 1 && room.children2to6 >= 1) { ch612AsAdult = room.children6to12; }
                          else if (room.adults === 1 && room.children6to12 >= 2) { ch612AsAdult = 1; }
                          
                          if (ch612AsAdult > 0) { const k = `CHD612ADT@${adultPrice}`; priceAccum[k] = priceAccum[k] || { count: 0, price: adultPrice, label: 'Child (as ADT)' }; priceAccum[k].count += ch612AsAdult; }
                          if (ch26AsAdult > 0) { const k = `CHD26ADT@${adultPrice}`; priceAccum[k] = priceAccum[k] || { count: 0, price: adultPrice, label: 'Child 2-6 (as ADT)' }; priceAccum[k].count += ch26AsAdult; }
                          
                          const normalCh612 = room.children6to12 - ch612AsAdult;
                          if (normalCh612 > 0) { const childRoomType = (room.children6to12 >= 1 && (room.adults + room.children2to6 + room.children6to12) >= 3) ? "Extra Bed" : roomType; const r = getGuestRate("Child (2-12)", selectedHotelId, childRoomType); const p = r?.price || adjustedBasePrice; const k = `CHD612@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, label: 'Child 2-12' }; priceAccum[k].count += normalCh612; }
                          const normalCh26 = room.children2to6 - ch26AsAdult;
                          if (normalCh26 > 0) { const r = getGuestRate("Child (2-6)", selectedHotelId, roomType); const p = r?.price || adjustedBasePrice; const k = `CHD26@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, label: 'Child 2-6' }; priceAccum[k].count += normalCh26; }
                          if (room.infants > 0) { const r = getGuestRate("Infant", selectedHotelId, "Without-Bed"); const p = r?.price || adjustedBasePrice; const k = `INF@${p}`; priceAccum[k] = priceAccum[k] || { count: 0, price: p, label: 'Infant' }; priceAccum[k].count += room.infants; }
                        }
                        
                        for (const [, val] of Object.entries(priceAccum)) {
                          guestTypeMap.push({ label: val.label, count: val.count, perPerson: val.price });
                        }

                        return guestTypeMap.map((t, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t.count}× {t.label}</span>
                            <span className="font-medium text-foreground">${(t.perPerson * t.count).toLocaleString()}.00</span>
                          </div>
                        ));
                      })()}

                      {hotelPriceAdjustment > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Luxury Resort Supplement</span>
                          <span className="font-medium text-foreground">+${(hotelPriceAdjustment * groupSize).toLocaleString()}.00</span>
                        </div>
                      )}
                      {hotelPriceAdjustment === 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Luxury Resort Supplement</span>
                          <span className="font-medium text-muted-foreground">Included</span>
                        </div>
                      )}

                      {/* Visa opt-out */}
                      {visaRequired && (() => {
                        const optOutTotal = Object.entries(passengerVisaSelections)
                          .filter(([, v]) => v === false)
                          .reduce((sum, [idx]) => sum + getVisaPriceForGuest(Number(idx)), 0);
                        const optOutCount = Object.values(passengerVisaSelections).filter(v => v === false).length;
                        return optOutCount > 0 ? (
                          <div className="flex justify-between items-center text-destructive">
                            <span>Visa opt-out ({optOutCount})</span>
                            <span className="font-medium">-${optOutTotal.toLocaleString()}.00</span>
                          </div>
                        ) : null;
                      })()}

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Booking Fee</span>
                        <span className="font-medium text-foreground">$0.00</span>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="px-5 pb-5">
                      {(() => {
                        const grandTotal = calculateGrandTotal();
                        const totalCommission = agencyCommission > 0 ? Math.round(grandTotal * agencyCommission / 100) : 0;
                        const totalNet = grandTotal - totalCommission;
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Total Price</span>
                              <span className="text-2xl font-heading font-bold text-foreground">${grandTotal.toLocaleString()}.00</span>
                            </div>
                            {agencyCommission > 0 && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-emerald-600">Commission ({agencyCommission}%)</span>
                                  <span className="font-semibold text-emerald-600">-${totalCommission.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-border">
                                  <span className="font-heading font-bold text-primary text-sm">Net Cost</span>
                                  <span className="text-lg font-heading font-bold text-primary">${totalNet.toLocaleString()}</span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Credit Limit Warning */}
                  {creditCheck && creditCheck.creditLimit > 0 && (
                    <div className={cn(
                      "rounded-2xl border p-4",
                      creditCheck.isHardLimitExceeded 
                        ? "bg-destructive/5 border-destructive/20" 
                        : creditCheck.availableCredit < calculateGrandTotal() 
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-card border-border"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          creditCheck.isHardLimitExceeded ? "bg-destructive" : "bg-amber-500"
                        )}>
                          <AlertTriangle className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-heading font-bold text-sm",
                            creditCheck.isHardLimitExceeded ? "text-destructive" : "text-amber-700 dark:text-amber-400"
                          )}>
                            {creditCheck.isHardLimitExceeded ? "Booking Blocked" : "Credit Warning"}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            Limit: ${creditCheck.creditLimit.toLocaleString()} · 
                            Used: ${creditCheck.usedCredit.toLocaleString()} · 
                            Available: ${creditCheck.availableCredit.toLocaleString()}
                          </p>
                          {creditCheck.isHardLimitExceeded && (
                            <p className="text-[11px] text-destructive font-medium mt-1">
                              Requires ${calculateGrandTotal().toLocaleString()}. Contact admin.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  {tcSettings.isEnabled && tcSettings.content && (
                    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-border/50">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Terms & Conditions</p>
                      </div>
                      <div className="p-4">
                        <ScrollArea className="h-32 rounded-lg border border-border bg-muted/20 p-3">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{tcSettings.content}</p>
                        </ScrollArea>
                      </div>
                      <div className="px-5 py-3 border-t border-border/50 flex items-center gap-3">
                        <Checkbox
                          id="terms-accept"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className={cn(
                            "h-4 w-4 rounded",
                            termsAccepted && "border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          )}
                        />
                        <label htmlFor="terms-accept" className="text-xs font-medium leading-tight cursor-pointer select-none text-foreground">
                          I agree to the terms and conditions stated above for this curated experience.
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Continue to Payment Button */}
                  <Button
                    className={cn(
                      "w-full h-12 rounded-xl text-sm font-heading font-semibold",
                      "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20",
                      (tcSettings.isEnabled && tcSettings.content && !termsAccepted) && "opacity-60"
                    )}
                    onClick={() => handleBookingSubmit(pendingFormData)}
                    disabled={
                      createBooking.isPending || 
                      (tcSettings.isEnabled && tcSettings.content ? !termsAccepted : false) ||
                      creditCheck?.isHardLimitExceeded
                    }
                  >
                    {createBooking.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : creditCheck?.isHardLimitExceeded ? (
                      "Credit Limit Exceeded"
                    ) : (
                      <span className="flex items-center gap-2">
                        Continue to Payment
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>

                  {/* Help Footer */}
                  <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
                    <p className="font-heading font-bold text-foreground text-sm">Need help with your booking?</p>
                    <p className="text-xs text-muted-foreground mt-1">Our travel concierges are available 24/7 to assist with your journey arrangements.</p>
                    <button className="text-xs text-primary font-semibold mt-2 hover:underline">Contact Support</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Payment */}
        {currentStep === 5 && bookingResult && (
          <div className="max-w-lg mx-auto">
            <BookingPaymentStep
              bookingId={bookingResult.id}
              totalAmount={calculateGrandTotal()}
              bookingNumber={bookingResult.booking_number}
              onPaymentComplete={() => {
                triggerCelebration();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BookPackage;
