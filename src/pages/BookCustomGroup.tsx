import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Plane, Building, Users, ArrowLeftRight, Package2,
  MapPin, CalendarIcon, Clock, Star, Sparkles, CreditCard, Receipt,
  Shield, Moon, ArrowRight, Check, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFlight } from "@/hooks/useFlights";
import { useHotel } from "@/hooks/useHotels";
import { useCreateBooking } from "@/hooks/useBookings";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PassengerDetailsForm, type PassengerFormData } from "@/components/booking/PassengerDetailsForm";
import { BookingPaymentStep } from "@/components/booking/BookingPaymentStep";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
  }),
};

const BookCustomGroup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const createBooking = useCreateBooking();

  const outboundFlightId = searchParams.get("outboundFlightId") || "";
  const returnFlightId = searchParams.get("returnFlightId") || "";
  const hotelId = searchParams.get("hotelId") || "";
  const transferId = searchParams.get("transferId") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const nights = parseInt(searchParams.get("nights") || "0");
  const total = parseFloat(searchParams.get("total") || "0");

  const { data: outboundFlight } = useFlight(outboundFlightId);
  const { data: returnFlight } = useFlight(returnFlightId);
  const { data: hotel } = useHotel(hotelId);
  const { data: transfer } = useQuery({
    queryKey: ["transfer", transferId],
    queryFn: async () => {
      if (!transferId) return null;
      const { data, error } = await supabase.from("transfers").select("*").eq("id", transferId).single();
      if (error) return null;
      return data;
    },
    enabled: !!transferId,
  });

  const passengerCount = parseInt(searchParams.get("passengers") || "1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingNumber, setBookingNumber] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const totalAmount = total * passengerCount;

  const fireConfetti = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    const colors = ['hsl(231, 64%, 30%)', 'hsl(0, 100%, 69%)', 'hsl(45, 100%, 51%)', '#ffffff'];

    // Initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6, x: 0.5 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
    });

    // Continuous rain
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 50);
  }, []);

  const handleSubmit = async (formData: PassengerFormData) => {
    if (!user) return;

    // Duplicate booking detection by passport number
    const passports = (formData.passengers || [])
      .map((p: any) => p.passportNumber || p.passport_number)
      .filter(Boolean);

    if (passports.length > 0) {
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("booking_number, passenger_details, status")
        .eq("flight_id", outboundFlightId)
        .neq("status", "canceled");

      const duplicates: string[] = [];
      (existingBookings || []).forEach((b: any) => {
        const existing = Array.isArray(b.passenger_details) ? b.passenger_details : [];
        existing.forEach((ep: any) => {
          const epPass = ep.passportNumber || ep.passport_number;
          if (epPass && passports.includes(epPass)) {
            duplicates.push(`${ep.firstName || ''} ${ep.lastName || ''} (${epPass}) — ${b.booking_number}`);
          }
        });
      });

      if (duplicates.length > 0) {
        const proceed = window.confirm(
          `⚠️ Duplicate passengers detected:\n\n${duplicates.join("\n")}\n\nThese passengers already have bookings on this flight. Proceed anyway?`
        );
        if (!proceed) return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await createBooking.mutateAsync({
        booking_type: "custom_group",
        flight_id: outboundFlightId,
        hotel_id: hotelId || null,
        total_amount: totalAmount,
        passengers: passengerCount,
        passenger_details: formData.passengers as any,
        status: "draft",
        notes: `Custom group: ${departureDate} to ${returnDate}, ${nights} nights`,
        metadata: {
          outbound_flight_id: outboundFlightId,
          return_flight_id: returnFlightId,
          hotel_id: hotelId,
          transfer_id: transferId || null,
          departure_date: departureDate,
          return_date: returnDate,
          nights,
          price_per_person: total,
          transfer_name: transfer?.name || null,
          transfer_vehicle_type: transfer?.vehicle_type || null,
          transfer_route_from: transfer?.route_from || null,
          transfer_route_to: transfer?.route_to || null,
        } as any,
      });
      setBookingNumber(result?.booking_number || "");
      setBookingId(result?.id || "");
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tripItems = [
    {
      icon: Plane,
      label: "Outbound Flight",
      detail: outboundFlight ? `${outboundFlight.airline} ${outboundFlight.flight_number || ""}` : "Loading...",
      sub: departureDate,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/15",
    },
    {
      icon: Plane,
      label: "Return Flight",
      detail: returnFlight ? `${returnFlight.airline} ${returnFlight.flight_number || ""}` : "Loading...",
      sub: returnDate,
      color: "text-accent",
      bg: "bg-accent/10 border-accent/15",
      rotate: true,
    },
    {
      icon: Building,
      label: "Hotel",
      detail: hotel?.name || "Loading...",
      sub: `${nights} night${nights > 1 ? "s" : ""}`,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/15",
    },
    ...(transfer ? [{
      icon: ArrowLeftRight,
      label: "Transfer",
      detail: transfer.name,
      sub: `${transfer.route_from} → ${transfer.route_to}`,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/15",
    }] : []),
  ];

  return (
    <>
    {/* ═══ Success Celebration Overlay ═══ */}
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay: 0.15 }}
            className="max-w-lg w-full mx-4"
          >
            <div className="rounded-3xl border border-border/40 bg-card shadow-2xl overflow-hidden">
              {/* Success header */}
              <div className="bg-gradient-navy px-8 py-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent/20 blur-[60px]" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-[40px]" />
                </div>
                <div className="absolute inset-0 opacity-[0.04]" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }} />
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                    className="h-20 w-20 rounded-full bg-[hsl(var(--success))] mx-auto mb-5 flex items-center justify-center shadow-xl shadow-[hsl(var(--success)/0.3)]"
                  >
                    <Check className="h-10 w-10 text-white" strokeWidth={3} />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold text-primary-foreground font-heading tracking-tight"
                  >
                    Booking Confirmed!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                    className="text-primary-foreground/50 text-sm mt-2 font-light"
                  >
                    Your custom group trip has been successfully created
                  </motion.p>
                </div>
              </div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-8 space-y-5"
              >
                {bookingNumber && (
                  <div className="text-center py-3 px-4 rounded-2xl bg-primary/[0.04] border border-primary/10">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] font-bold">Booking Reference</p>
                    <p className="text-xl font-extrabold text-primary font-heading tracking-wide mt-1">{bookingNumber}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <Plane className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Route</p>
                      <p className="text-xs font-semibold text-foreground">{outboundFlight?.departure_city} → {outboundFlight?.arrival_city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Passengers</p>
                      <p className="text-xs font-semibold text-foreground">{passengerCount} traveler{passengerCount > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <Building className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hotel</p>
                      <p className="text-xs font-semibold text-foreground truncate">{hotel?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</p>
                      <p className="text-xs font-extrabold text-primary">${totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/bookings")}
                    className="flex-1 rounded-2xl h-12 border-border/50 font-semibold gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Bookings
                  </Button>
                  <Button
                    onClick={() => navigate("/packages")}
                    className="flex-1 rounded-2xl h-12 shadow-lg shadow-primary/20 font-semibold gap-2"
                  >
                    <Package2 className="h-4 w-4" />
                    Browse Packages
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="max-w-5xl mx-auto space-y-0">
      {/* ═══ Hero Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-t-3xl bg-gradient-navy px-8 py-9"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent/20 blur-[80px]" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-primary-foreground/10 blur-[60px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-2xl h-14 w-14 bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground flex-shrink-0"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary-foreground font-heading">Custom Group Booking</h1>
            <p className="text-primary-foreground/50 text-sm mt-1 font-light">Complete your custom trip details and confirm</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/10 text-[9px] font-bold rounded-lg tracking-wider uppercase px-3 py-1.5">
              <Shield className="h-3 w-3 mr-1.5" />
              Secure
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* ═══ Trip Summary Strip ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-card/80 backdrop-blur-sm border-x border-b border-border/40 px-8 py-5"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tripItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                custom={idx}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="flex items-center gap-3.5 p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-border/50 transition-all duration-300 hover:shadow-sm"
              >
                <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center border flex-shrink-0", item.bg)}>
                  <Icon className={cn("h-5 w-5", item.color, item.rotate && "rotate-180")} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-bold">{item.label}</p>
                  <p className="text-sm font-bold text-foreground truncate tracking-tight">{item.detail}</p>
                  <p className="text-[11px] text-muted-foreground font-light mt-0.5">{item.sub}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ Main Content ═══ */}
      <Card className="rounded-t-none rounded-b-3xl border-t-0 shadow-card">
        <CardContent className="px-8 py-8">
          {showPayment && bookingId ? (
            <div className="max-w-xl mx-auto">
              <BookingPaymentStep
                bookingId={bookingId}
                totalAmount={totalAmount}
                bookingNumber={bookingNumber}
                onPaymentComplete={() => {
                  fireConfetti();
                  setShowSuccess(true);
                }}
                onBack={() => setShowPayment(false)}
              />
            </div>
          ) : (
          <div className="flex gap-8">
            {/* Left: Passenger Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight font-heading">Passenger Details</h3>
                  <p className="text-sm text-muted-foreground font-light">Enter traveler information for your group</p>
                </div>
              </div>

              <PassengerDetailsForm
                passengerCount={passengerCount}
                onPassengerCountChange={() => {}}
                onSubmit={handleSubmit}
                isLoading={isSubmitting}
                submitLabel="Continue to Payment"
                pricePerGuest={total}
                showPassengerCounter={false}
              />
            </motion.div>

            {/* Right: Sticky Price Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="hidden lg:block w-80 flex-shrink-0"
            >
              <div className="sticky top-6 space-y-4">
                {/* Price Breakdown */}
                <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg">
                  <div className="bg-gradient-navy px-5 py-3.5">
                    <div className="flex items-center gap-2.5 text-primary-foreground">
                      <div className="h-6 w-6 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                        <Receipt className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-bold tracking-tight">Price Breakdown</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Line items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center">
                            <CreditCard className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">Price per person</span>
                        </div>
                        <span className="text-sm font-extrabold text-primary font-heading">${total}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-muted/50 border border-border/20 flex items-center justify-center">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">Passengers</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">× {passengerCount}</span>
                      </div>
                    </div>

                    {/* Trip details mini */}
                    <div className="space-y-2 pt-3 border-t border-border/20">
                      {outboundFlight && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Plane className="h-3 w-3 text-primary/60" />
                          <span className="font-light">{outboundFlight.departure_city} → {outboundFlight.arrival_city}</span>
                        </div>
                      )}
                      {hotel && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building className="h-3 w-3 text-primary/60" />
                          <span className="font-light">{hotel.name} • {nights}N</span>
                        </div>
                      )}
                      {transfer && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowLeftRight className="h-3 w-3 text-primary/60" />
                          <span className="font-light">{transfer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="border-t border-border/30 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] px-5 py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground tracking-tight">Total Amount</span>
                      </div>
                      <span className="text-2xl font-extrabold text-primary font-heading">${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="rounded-2xl border border-border/30 bg-muted/10 p-4">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary/50 flex-shrink-0" />
                    <p className="font-light">Your booking is secured and protected. Payment details are encrypted.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default BookCustomGroup;
