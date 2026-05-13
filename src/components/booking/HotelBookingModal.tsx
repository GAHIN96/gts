import { useState, useEffect, useRef } from "react";
import { Hotel, MapPin, Star, CalendarIcon, Users, Bed, DollarSign, FileText, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { BookingPaymentStep } from "./BookingPaymentStep";
import { PassengerDetailsForm, PassengerFormData } from "./PassengerDetailsForm";
import { HotelRoomConfigurator, RoomConfig, evaluateRoom } from "./HotelRoomConfigurator";
import type { Hotel as HotelType } from "@/hooks/useHotels";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { BookingCelebration } from "./BookingCelebration";
import { pickRoomBand, resolveRoomPrice } from "@/lib/roomPricingTier";
import { getStayWindowRemaining, buildDayDetails } from "@/lib/hotelAvailability";
import { useHotelAvailableDates } from "@/hooks/useHotelAvailableDates";
import { useHotelBookings } from "@/hooks/useHotelBookings";
// getStayWindowRemaining already imported above

interface HotelBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: HotelType | null;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  initialRooms?: number;
  initialRoomConfigs?: RoomConfig[];
}

export function HotelBookingModal({ 
  open, 
  onOpenChange, 
  hotel,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  initialRooms = 1,
  initialRoomConfigs,
}: HotelBookingModalProps) {
  const [checkIn, setCheckIn] = useState<Date | undefined>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<Date | undefined>(initialCheckOut);
  const [rooms, setRooms] = useState<RoomConfig[]>(initialRoomConfigs && initialRoomConfigs.length > 0 ? initialRoomConfigs : [{ adults: initialGuests, children6to12: 0, children2to6: 0, infants: 0 }]);
  const [guestsApplied, setGuestsApplied] = useState(false);
  const [step, setStep] = useState<"form" | "review" | "payment" | "voucher">("form");
  const [pendingPassengerData, setPendingPassengerData] = useState<PassengerFormData | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();
  const wasOpenRef = useRef(false);

  // Track if opened from search (has pre-filled params)
  const hasSearchParams = !!(initialCheckIn && initialCheckOut);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;

    if (justOpened) {
      setCheckIn(initialCheckIn || addDays(new Date(), 1));
      setCheckOut(initialCheckOut || addDays(new Date(), 3));
      const initRooms: RoomConfig[] = initialRoomConfigs && initialRoomConfigs.length > 0
        ? initialRoomConfigs
        : Array.from({ length: initialRooms }, () => ({
            adults: Math.max(1, Math.ceil(initialGuests / initialRooms)),
            children6to12: 0,
            children2to6: 0,
            infants: 0,
          }));
      setRooms(initRooms);
      setGuestsApplied(hasSearchParams);
      setBookingResult(null);
      setStep("form");
    }

    wasOpenRef.current = open;
  }, [open, initialCheckIn, initialCheckOut, initialGuests, initialRooms, initialRoomConfigs, hasSearchParams]);

  const nights = checkIn && checkOut ? Math.max(1, differenceInDays(checkOut, checkIn)) : 0;

  // Derive room type per-room using the SAME logic as the configurator badges
  const deriveRoomType = (r: RoomConfig): string => {
    const ev = evaluateRoom(r);
    switch (ev.type) {
      case "single": return "Single";
      case "double": return "Double";
      case "double_extra_bed": return "Double + Extra Bed";
      case "triple": return "Triple";
      default: return "Double";
    }
  };

  const activeRooms = (hotel?.hotel_rooms || []).filter((r: any) => r.is_active !== false && r.room_type !== "Quadruple" && r.room_type !== "Without-Bed" && r.room_type !== "Infant");
  const roomCount = rooms.length;
  const cheapestRoom = activeRooms.length > 0
    ? activeRooms.reduce((min: any, r: any) =>
        ((r.price_per_night ?? r.price_adult ?? 0) < (min.price_per_night ?? min.price_adult ?? 0)) ? r : min
      , activeRooms[0])
    : null;

  // Live availability for the chosen window — used to pick the default-rate
  // band (matches the search card so card price = booking summary price).
  const { data: hotelAvailableDates = [] } = useHotelAvailableDates();
  const { data: hotelBookings = [] } = useHotelBookings();
  // Shared helper — same inputs as the search card so the per-night band
  // (e.g. 10–6 vs 6–1 in admin Default Prices) always matches what the user
  // saw on the card. `null` and `0` both mean "sold out for these dates".
  const availableInPeriod = hotel && checkIn && checkOut
    ? getStayWindowRemaining(
        hotel.id,
        checkIn,
        checkOut,
        hotelAvailableDates as any,
        hotelBookings as any,
      )
    : null;
  const isSoldOut = !!checkIn && !!checkOut && (availableInPeriod === 0 || availableInPeriod === null);

  const dayDetails = buildDayDetails(hotelAvailableDates, hotelBookings, hotel?.id || "");

  const perRoomPricing = rooms.map((r) => {
    const type = deriveRoomType(r);
    
    let totalRoomPrice = 0;
    const dailyLogs: string[] = [];
    if (checkIn && checkOut && nights > 0) {
      const specials = (hotel as any)?.hotel_special_prices || [];
      
      // Calculate bottleneck inventory for the stay
      let bottleneckInventory = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < nights; i++) {
        const night = addDays(checkIn, i);
        const dayKey = format(night, "yyyy-MM-dd");
        const inv = dayDetails[dayKey]?.remaining ?? 0;
        if (inv < bottleneckInventory) bottleneckInventory = inv;
      }
      if (bottleneckInventory === Number.MAX_SAFE_INTEGER) bottleneckInventory = 0;

      for (let i = 0; i < nights; i++) {
        const night = addDays(checkIn, i);
        const resolved = resolveRoomPrice(activeRooms as any, type, bottleneckInventory, specials, night);
        const priceForNight = resolved?.adult ?? hotel?.price_per_night ?? 0;
        totalRoomPrice += priceForNight;
        dailyLogs.push(`${format(night, "MMM dd")}: $${priceForNight} (Inv: ${bottleneckInventory})`);
      }
    } else {
      // Fallback if no dates
      const picked = pickRoomBand(activeRooms as any, type, 20);
      totalRoomPrice = (picked?.price_adult ?? picked?.price_per_night ?? hotel?.price_per_night ?? 0) * Math.max(1, nights);
      dailyLogs.push(`Fallback: $${totalRoomPrice / Math.max(1, nights)}/night`);
    }

    const hasBreakfast = hotel?.amenities?.some(a => 
      a.toLowerCase().includes("breakfast") || 
      a.toLowerCase().includes("buffet") || 
      a.toLowerCase() === "bb"
    );
    const displayType = hasBreakfast ? `${type} with Breakfast` : type;

    const avgPrice = nights > 0 ? totalRoomPrice / nights : totalRoomPrice;
    return { type, displayType, price: avgPrice };
  });

  const displayRoomTypeName = perRoomPricing[0]?.displayType || "Double";
  const pricePerNight = Math.round(perRoomPricing[0]?.price ?? 0);


  const totalPrice = perRoomPricing.reduce((sum, p) => sum + p.price * nights, 0);
  const totalChildren = (r: RoomConfig) => r.children6to12 + r.children2to6;
  const totalGuests = rooms.reduce((sum, r) => sum + r.adults + totalChildren(r) + r.infants, 0);
  const pricePerGuest = totalGuests > 0 ? totalPrice / totalGuests : 0;

  const roomAssignments = rooms.map((room, idx) => {
    const ch = totalChildren(room);
    return {
      roomNumber: idx + 1,
      roomType: `${room.adults} Adult${room.adults > 1 ? 's' : ''}${ch > 0 ? `, ${ch} Child${ch > 1 ? 'ren' : ''}` : ''}${room.infants > 0 ? `, ${room.infants} Infant${room.infants > 1 ? 's' : ''}` : ''}`,
      // Pass the resolved tier-band display name (e.g. "Single", "Double + Extra Bed")
      // so the passenger-form room header matches the booking summary chips.
      bedType: perRoomPricing[idx]?.displayType,
      guestCount: room.adults + ch + room.infants,
      adults: room.adults,
      children6to12: room.children6to12,
      children2to6: room.children2to6,
      infants: room.infants,
    };
  });

  const handleApplyGuests = () => {
    if (isSoldOut) {
      toast.error("Sold out for these dates. Please choose different dates.");
      return;
    }
    setGuestsApplied(true);
  };

  const handleGuestSubmit = (passengerData: PassengerFormData) => {
    if (!hotel || !checkIn || !checkOut) return;
    if (isSoldOut) {
      toast.error("Sold out for these dates. Please choose different dates.");
      return;
    }
    setPendingPassengerData(passengerData);
    setStep("review");
  };

  const handleConfirmBooking = async () => {
    if (!hotel || !checkIn || !checkOut || !pendingPassengerData) return;
    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "hotel",
        hotel_id: hotel.id,
        total_amount: totalPrice,
        passengers: totalGuests,
        passenger_details: pendingPassengerData.passengers.map((p, index) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          passportExpiry: p.passportExpiry,
          documents: p.documents || [],
          isLead: index === 0,
        })),
        special_requests: pendingPassengerData.specialRequests,
        notes: JSON.stringify({
          check_in: checkIn.toISOString(),
          check_out: checkOut.toISOString(),
          rooms: roomCount,
          roomConfig: rooms,
          contactEmail: pendingPassengerData.contactEmail,
          contactPhone: pendingPassengerData.contactPhone,
        }),
        status: "pending_payment",
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        passengerData: pendingPassengerData,
      });
      setStep("payment");
      toast.success(`Booking created! Please complete payment.`);
    } catch (error) {
      toast.error("Failed to submit booking");
    }
  };

  const handleClose = () => {
    setRooms([{ adults: 2, children6to12: 0, children2to6: 0, infants: 0 }]);
    setGuestsApplied(false);
    setShowCelebration(false);
    setBookingResult(null);
    setStep("form");
    onOpenChange(false);
  };

  const handlePaymentComplete = () => {
    setShowCelebration(true);
    setStep("voucher");
  };

  if (!hotel) return null;

  // Voucher view
  if (bookingResult && checkIn && checkOut && step === "voucher") {
    return (
      <>
      <BookingCelebration
        show={showCelebration}
        bookingNumber={bookingResult.number}
        title={hotel.name}
        totalAmount={totalPrice}
        type="hotel"
        summaryItems={[
          { label: "Hotel", value: hotel.name },
          { label: "Location", value: `${hotel.cities?.name}, ${hotel.cities?.country}` },
          { label: "Stay", value: `${nights} night${nights !== 1 ? "s" : ""}` },
          { label: "Guests", value: `${totalGuests} guest${totalGuests !== 1 ? "s" : ""}` },
        ]}
        onClose={() => { setShowCelebration(false); handleClose(); }}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-0 !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-6 overflow-y-auto bg-slate-50">
          <UniversalVoucher
            details={{
              type: "hotel",
              bookingId: bookingResult.id,
              bookingNumber: bookingResult.number,
              serviceName: hotel.name,
              totalAmount: totalPrice,
              passengerCount: totalGuests,
              passengerNames: bookingResult.passengerData.passengers.map(
                p => `${p.firstName} ${p.lastName}`
              ),
              contactEmail: bookingResult.passengerData.contactEmail,
              contactPhone: bookingResult.passengerData.contactPhone,
              destination: `${hotel.cities?.name}, ${hotel.cities?.country}`,
              hotelName: hotel.name,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              status: "pending",
            }}
            onClose={handleClose}
          />
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // Payment step
  if (bookingResult && step === "payment") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-6 overflow-y-auto">
          <BookingPaymentStep
            bookingId={bookingResult.id}
            totalAmount={totalPrice}
            bookingNumber={bookingResult.number}
            onPaymentComplete={handlePaymentComplete}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none overflow-y-auto p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          {/* Left Panel - Main Content */}
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl">Book Hotel</DialogTitle>
            </DialogHeader>

            {/* Hotel Summary Card */}
            <div className="bg-white rounded-2xl p-6 space-y-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="h-24 w-24 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border-2 border-primary/10">
                  {hotel?.images?.[0] ? (
                    <img src={hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover" />
                  ) : (
                    <Hotel className="h-10 w-10 text-primary/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-2xl text-foreground tracking-tight">{hotel.name}</h3>
                    <div className="flex items-center gap-0.5">
                    {([...Array(hotel?.star_rating || 3)]).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                    ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {hotel?.cities?.name}, {hotel?.cities?.country}
                    </span>
                    <span className="text-sm font-medium text-primary bg-primary/5 px-2.5 py-0.5 rounded-full border border-primary/10">
                      {displayRoomTypeName}
                    </span>
                    {hotel?.amenities?.some(a => a.toLowerCase().includes("breakfast") || a.toLowerCase().includes("buffet") || a.toLowerCase() === "bb") && (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] font-black tracking-tight px-1.5 h-5 flex items-center gap-1 shadow-sm ring-1 ring-amber-500/20">
                        <Coffee className="h-2.5 w-2.5" />
                        BB
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end justify-center bg-primary/5 p-4 rounded-xl border border-primary/10 min-w-[140px]">
                  <p className="text-3xl font-bold text-primary tracking-tighter">${pricePerNight}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">avg per night</p>
                </div>
              </div>

              {/* Dates - hide when coming from search (already chosen) */}
              {!hasSearchParams && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border mt-2">
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">Check-in Date</label>
                    <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full h-12 justify-start text-left font-medium rounded-xl border-border/60 hover:border-primary hover:bg-primary/5 transition-all", !checkIn && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                          {checkIn ? format(checkIn, "PPP") : "Select check-in"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={(d) => {
                            setCheckIn(d);
                            setCheckInOpen(false);
                            if (d && (!checkOut || checkOut <= d)) {
                              setCheckOut(addDays(d, 1));
                            }
                          }}
                          disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                          initialFocus
                          className={cn("p-4 bg-white rounded-2xl")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] ml-1">Check-out Date</label>
                    <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full h-12 justify-start text-left font-medium rounded-xl border-border/60 hover:border-primary hover:bg-primary/5 transition-all", !checkOut && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                          {checkOut ? format(checkOut, "PPP") : "Select check-out"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={(d) => {
                            setCheckOut(d);
                            setCheckOutOpen(false);
                          }}
                          disabled={(date) => checkIn ? startOfDay(date) <= startOfDay(checkIn) : startOfDay(date) < startOfDay(new Date())}
                          initialFocus
                          className={cn("p-4 bg-white rounded-2xl")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {isSoldOut && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                Sold out for these dates. Please choose different dates to continue.
              </div>
            )}

            {/* Room Configurator - hide when coming from search */}
            {!hasSearchParams && (
              <HotelRoomConfigurator
                rooms={rooms}
                onRoomsChange={(r) => {
                  setRooms(r);
                  setGuestsApplied(false);
                }}
                onApply={handleApplyGuests}
              />
            )}

            {/* Review Step */}
            {step === "review" && pendingPassengerData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                  <h3 className="text-xl font-bold text-primary mb-1">Final Review</h3>
                  <p className="text-sm text-muted-foreground">Please double check all details before confirming your booking.</p>
                </div>

                {/* Traveler Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Traveler Information
                    </h4>
                    <div className="space-y-3">
                      {pendingPassengerData.passengers.map((p, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{p.firstName} {p.lastName}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                              Passenger {i + 1} {i === 0 ? "(Lead)" : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold">
                            {p.passportNumber || "No Passport ID"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Booking Details
                    </h4>
                    <div className="bg-white p-4 rounded-xl border border-border/60 shadow-sm space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Dates</span>
                        <span className="font-bold text-slate-800">
                          {checkIn && format(checkIn, "MMM dd")} - {checkOut && format(checkOut, "MMM dd, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Rooms</span>
                        <span className="font-bold text-slate-800">{roomCount} Room(s)</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-50">
                        <span className="text-slate-500">Total Price</span>
                        <span className="font-bold text-primary text-lg">${totalPrice}</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Agent / Contact</p>
                      <p className="text-xs font-medium text-amber-900">{pendingPassengerData.agentName || "Self"} · {pendingPassengerData.agencyEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-xl font-bold"
                    onClick={() => setStep("form")}
                  >
                    Back to Edit
                  </Button>
                  <Button
                    className="h-12 flex-[2] rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                    onClick={handleConfirmBooking}
                    disabled={createBooking.isPending}
                  >
                    {createBooking.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Booking...
                      </>
                    ) : (
                      "Confirm & Create Booking"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Passenger Forms - grouped by room */}
            {step === "form" && guestsApplied && nights > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Guest Details
                </h3>
                <PassengerDetailsForm
                  passengerCount={totalGuests}
                  onSubmit={handleGuestSubmit}
                  isLoading={createBooking.isPending}
                  maxPassengers={30}
                  showPassengerCounter={false}
                  roomAssignments={roomAssignments}
                  pricePerGuest={pricePerGuest}
                  hideGuestTotal={true}
                />
              </div>
            )}
          </div>

          {/* Right Panel - Booking Summary Sidebar */}
          <div className="hidden lg:block border-l border-border bg-slate-50/50 p-6">
            <div className="sticky top-0 space-y-6">
              <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Stay Summary
              </h4>

              {/* Hotel mini-card */}
              <div className="rounded-2xl overflow-hidden border border-border bg-white shadow-sm ring-1 ring-black/[0.02]">
                {hotel?.images?.[0] ? (
                  <img src={hotel.images[0]} alt={hotel.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
                    <Hotel className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                <div className="p-4 space-y-1.5">
                  <h5 className="font-bold text-sm text-slate-800 leading-tight">{hotel.name}</h5>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary" />
                    {hotel?.cities?.name}, {hotel?.cities?.country}
                  </p>
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Check-in</span>
                  <span className="font-bold text-slate-800">{checkIn ? format(checkIn, "MMM dd, yyyy") : "—"}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Check-out</span>
                  <span className="font-bold text-slate-800">{checkOut ? format(checkOut, "MMM dd, yyyy") : "—"}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Duration</span>
                  <span className="font-bold text-primary">{nights} night{nights !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Room & Price breakdown */}
              <div className="space-y-4 bg-white p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Details</p>
                  <Badge variant="outline" className="h-5 rounded-full px-2 border-primary/20 bg-primary/5 text-primary text-[10px] font-bold">
                    {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {perRoomPricing.map((p, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-3 last:pb-0 border-b border-slate-50 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Room {idx + 1}</span>
                        <span className="text-xs font-bold text-slate-800">${Math.round(p.price * nights)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{p.displayType}</span>
                        <span className="text-[10px] text-slate-400 font-medium">${Math.round(p.price)} × {nights}n</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/20 relative overflow-hidden group">
                {/* Decorative circle */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                
                <div className="relative z-10 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Total Amount</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${totalPrice}</span>
                    <span className="text-sm font-medium text-white/60">USD</span>
                  </div>
                </div>
                <div className="relative z-10 mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/80">
                    <Users className="h-3 w-3" />
                    {totalGuests} GUESTS TOTAL
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
