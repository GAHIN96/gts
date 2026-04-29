import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MapPin, Car, Users, ChevronLeft, ChevronRight, ArrowRight, Sparkles, Clock, Plane } from "lucide-react";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { PassengerDetailsForm, PassengerFormData } from "./PassengerDetailsForm";
import { BookingPaymentStep } from "./BookingPaymentStep";
import type { Transfer } from "@/hooks/useTransfers";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { BookingCelebration } from "./BookingCelebration";

const bookingSchema = z.object({
  transfer_date: z.date({ required_error: "Transfer date is required" }),
  pickup_time: z.string().min(1, "Pickup time is required"),
  pickup_location: z.string().min(1, "Pickup location is required"),
  dropoff_location: z.string().min(1, "Dropoff location is required"),
  passengers: z.coerce.number().min(1, "At least 1 passenger"),
  flight_number: z.string().optional(),
  is_round_trip: z.boolean().default(false),
  return_date: z.date().optional(),
  return_time: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface TransferBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: Transfer | null;
}

const pickupTimeOptions = [
  "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30",
  "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30",
];

const vehicleTypeLabels: Record<string, string> = {
  sedan: "Sedan",
  suv: "SUV",
  van: "Van",
  bus: "Bus",
};

const transferTypeLabels: Record<string, string> = {
  airport: "Airport Transfer",
  city: "City Transfer",
  intercity: "Intercity Transfer",
};

const vehicleTypeIcons: Record<string, string> = {
  sedan: "🚗",
  suv: "🚙",
  van: "🚐",
  bus: "🚌",
};

export function TransferBookingModal({ open, onOpenChange, transfer }: TransferBookingModalProps) {
  const [step, setStep] = useState<"details" | "passengers" | "payment" | "voucher">("details");
  const [showCelebration, setShowCelebration] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);
  const [bookingData, setBookingData] = useState<BookingFormValues | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      passengers: 1,
      pickup_location: transfer?.route_from || "",
      dropoff_location: transfer?.route_to || "",
      pickup_time: "",
      flight_number: "",
      is_round_trip: false,
    },
  });

  const isRoundTrip = form.watch("is_round_trip");

  // Calculate fixed price - double for round trip
  const calculateTotalPrice = () => {
    if (!transfer) return 0;
    return isRoundTrip ? transfer.price * 2 : transfer.price;
  };

  const handleDetailsSubmit = (data: BookingFormValues) => {
    setPassengerCount(data.passengers);
    setBookingData(data);
    setStep("passengers");
  };

  const handlePassengerSubmit = async (passengerData: PassengerFormData) => {
    if (!transfer || !bookingData) return;
    
    const totalPrice = calculateTotalPrice();
    
    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "transfer",
        total_amount: totalPrice,
        passengers: passengerCount,
        passenger_details: passengerData.passengers.map((p, index) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          documents: p.documents || [],
          isLead: index === 0,
        })),
        notes: JSON.stringify({
          transfer_id: transfer.id,
          transfer_name: transfer.name,
          transfer_date: bookingData.transfer_date.toISOString(),
          pickup_time: bookingData.pickup_time,
          pickup_location: bookingData.pickup_location,
          dropoff_location: bookingData.dropoff_location,
          route_from: transfer.route_from,
          route_to: transfer.route_to,
          flight_number: bookingData.flight_number,
          vehicle_type: transfer.vehicle_type,
          transfer_type: transfer.transfer_type,
          is_round_trip: bookingData.is_round_trip,
          return_date: bookingData.return_date?.toISOString(),
          return_time: bookingData.return_time,
          image_url: transfer.image_url,
          contactEmail: passengerData.contactEmail,
          contactPhone: passengerData.contactPhone,
        }),
        special_requests: passengerData.specialRequests,
        status: "pending_payment",
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        passengerData,
      });
      setStep("payment");
      toast.success("Booking created! Please complete payment.");
    } catch (error) {
      toast.error("Failed to book transfer");
    }
  };

  const handleClose = () => {
    setStep("details");
    setPassengerCount(1);
    setBookingData(null);
    setBookingResult(null);
    setShowCelebration(false);
    form.reset();
    onOpenChange(false);
  };

  if (!transfer) return null;

  const totalPrice = calculateTotalPrice();

  const getRouteDisplay = () => {
    if (transfer.route_from && transfer.route_to) {
      return { from: transfer.route_from, to: transfer.route_to };
    }
    const defaults: Record<string, { from: string; to: string }> = {
      airport: { from: "Airport", to: "City/Hotel" },
      city: { from: "Location A", to: "Location B" },
      intercity: { from: "City A", to: "City B" },
    };
    return defaults[transfer.transfer_type] || { from: "Pickup", to: "Dropoff" };
  };

  const route = getRouteDisplay();

  return (
    <>
    <BookingCelebration
      show={showCelebration}
      bookingNumber={bookingResult?.number || ""}
      title={transfer.name}
      totalAmount={totalPrice}
      type="transfer"
      summaryItems={[
        { label: "Route", value: `${route.from} → ${route.to}` },
        { label: "Vehicle", value: vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type },
        { label: "Type", value: isRoundTrip ? "Round Trip" : "One Way" },
        { label: "Passengers", value: `${passengerCount}` },
      ]}
      onClose={() => { setShowCelebration(false); handleClose(); }}
    />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-0 overflow-hidden">
        {(() => {
          const flagUrl = transfer.cities?.country ? getCountryFlagUrl(transfer.cities.country, 160) : null;

          const SummarySidebar = () => (
            <aside className="hidden lg:flex flex-col bg-muted/20 border-l border-border h-screen sticky top-0 overflow-y-auto">
              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt={transfer.cities?.country}
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-base text-foreground line-clamp-1">{transfer.name}</h3>
                  {transfer.cities && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{transfer.cities.name}, {transfer.cities.country}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Booking Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Car className="h-4 w-4" /> Vehicle
                      </span>
                      <span className="font-medium">{vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" /> Capacity
                      </span>
                      <span className="font-medium">Max {transfer.capacity}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ArrowRight className="h-4 w-4" /> Type
                      </span>
                      <span className="font-medium">{isRoundTrip ? "Round Trip" : "One Way"}</span>
                    </div>
                    {bookingData?.transfer_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" /> Date
                        </span>
                        <span className="font-medium">{format(bookingData.transfer_date, "dd/MM/yyyy")}</span>
                      </div>
                    )}
                    {bookingData?.pickup_time && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" /> Pickup
                        </span>
                        <span className="font-medium">{bookingData.pickup_time}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>One-way fare</span>
                    <span>${transfer.price}</span>
                  </div>
                  {isRoundTrip && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Return trip</span>
                      <span>+${transfer.price}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-border">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                  </div>
                </div>
              </div>
            </aside>
          );

          return (
            <>
              {step === "details" && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] h-screen">
                  <div className="flex flex-col h-screen overflow-hidden">
                    <DialogHeader className="px-8 pt-6 pb-4 border-b border-border">
                      <DialogTitle className="text-xl flex items-center gap-2">
                        <Car className="h-5 w-5 text-primary" />
                        Book Transfer
                      </DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                      <form
                        id="transfer-details-form"
                        onSubmit={form.handleSubmit(handleDetailsSubmit)}
                        className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
                      >
                        {/* Hero card */}
                        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                              {flagUrl ? (
                                <img src={flagUrl} alt={transfer.cities?.country} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-2xl">{vehicleTypeIcons[transfer.vehicle_type] || "🚗"}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg leading-tight truncate">{transfer.name}</h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                {transfer.cities && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {transfer.cities.name}, {transfer.cities.country}
                                  </span>
                                )}
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  <Users className="h-3 w-3 mr-1" />
                                  Max {transfer.capacity}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-2xl font-bold text-primary leading-none">${transfer.price}</div>
                              <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">per ride</div>
                            </div>
                          </div>

                          {/* Route */}
                          <div className="bg-card/70 border border-border rounded-xl p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">From</p>
                                <p className="font-semibold text-sm">{route.from}</p>
                              </div>
                              <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                                <ArrowRight className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">To</p>
                                <p className="font-semibold text-sm">{route.to}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Round Trip Toggle */}
                        <FormField
                          control={form.control}
                          name="is_round_trip"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-4 bg-muted/30">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-semibold">Round Trip</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Book return transfer for {isRoundTrip ? "double the price" : `+$${transfer.price}`}
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Trip Details Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <h4 className="text-sm font-semibold uppercase tracking-wide">Trip Details</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="transfer_date"
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel>Transfer Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full h-11 justify-start text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                          {field.value ? format(field.value, "dd/MM/yyyy") : "Select date"}
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                        className={cn("p-3 pointer-events-auto")}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="pickup_time"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pickup Time</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-11">
                                        <Clock className="h-4 w-4 text-primary mr-1" />
                                        <SelectValue placeholder="Select time" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {pickupTimeOptions.map((time) => (
                                        <SelectItem key={time} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="pickup_location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pickup Location</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      <Input className="pl-9 h-11" placeholder="Hotel name, airport terminal..." {...field} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="dropoff_location"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dropoff Location</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      <Input className="pl-9 h-11" placeholder="Destination address..." {...field} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="passengers"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Number of Passengers</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      <Input className="pl-9 h-11" type="number" min="1" max={transfer.capacity} {...field} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="flight_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Flight Number (Optional)</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                      <Input className="pl-9 h-11" placeholder="e.g. TK123" {...field} />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Return Trip */}
                        {isRoundTrip && (
                          <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <h4 className="font-semibold flex items-center gap-2 text-primary text-sm uppercase tracking-wide">
                              <ArrowRight className="h-4 w-4 rotate-180" />
                              Return Trip Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="return_date"
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Return Date</FormLabel>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full h-11 justify-start text-left font-normal",
                                              !field.value && "text-muted-foreground"
                                            )}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                            {field.value ? format(field.value, "dd/MM/yyyy") : "Select date"}
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={field.value}
                                          onSelect={field.onChange}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                          className={cn("p-3 pointer-events-auto")}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="return_time"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Return Pickup Time</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-11">
                                          <Clock className="h-4 w-4 text-primary mr-1" />
                                          <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {pickupTimeOptions.map((time) => (
                                          <SelectItem key={time} value={time}>
                                            {time}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </form>
                    </Form>

                    {/* Sticky footer */}
                    <div className="border-t border-border bg-background/95 backdrop-blur px-8 py-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        form="transfer-details-form"
                        variant="navy"
                        className="bg-gradient-to-r from-primary to-primary/80"
                      >
                        Continue to Passenger Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <SummarySidebar />
                </div>
              )}

              {step === "passengers" && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] h-screen">
                  <div className="flex flex-col h-screen overflow-hidden">
                    <DialogHeader className="px-8 pt-6 pb-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setStep("details")}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <DialogTitle className="text-xl">Passenger Details</DialogTitle>
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-8 py-6">
                      <PassengerDetailsForm
                        passengerCount={passengerCount}
                        onPassengerCountChange={setPassengerCount}
                        onSubmit={handlePassengerSubmit}
                        isLoading={createBooking.isPending}
                        maxPassengers={transfer.capacity}
                        showPassengerCounter={false}
                      />
                    </div>
                  </div>

                  <SummarySidebar />
                </div>
              )}
            </>
          );
        })()}

        {step === "payment" && bookingResult && (
          <div className="px-8 py-6 overflow-y-auto h-screen">
            <BookingPaymentStep
              bookingId={bookingResult.id}
              totalAmount={totalPrice}
              bookingNumber={bookingResult.number}
              onPaymentComplete={() => {
                setShowCelebration(true);
                setStep("voucher");
              }}
            />
          </div>
        )}

        {step === "voucher" && bookingResult && bookingData && (
          <div className="px-8 py-6 overflow-y-auto h-screen">
            <UniversalVoucher
              details={{
                type: "transfer",
                bookingId: bookingResult.id,
                bookingNumber: bookingResult.number,
                serviceName: transfer.name + (bookingData.is_round_trip ? " (Round Trip)" : ""),
                totalAmount: calculateTotalPrice(),
                passengerCount: passengerCount,
                passengerNames: bookingResult.passengerData.passengers.map(
                  p => `${p.firstName} ${p.lastName}`
                ),
                contactEmail: bookingResult.passengerData.contactEmail,
                contactPhone: bookingResult.passengerData.contactPhone,
                pickupTime: bookingData.pickup_time,
                pickupLocation: bookingData.pickup_location,
                dropoffLocation: bookingData.dropoff_location,
                departureDate: bookingData.transfer_date,
                returnDate: bookingData.is_round_trip ? bookingData.return_date : undefined,
                vehicleType: transfer.vehicle_type,
                transferType: transfer.transfer_type,
                destination: transfer.cities?.name,
                status: "pending",
              }}
              onClose={handleClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
