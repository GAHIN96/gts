import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Compass,
  CalendarIcon,
  Minus,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { PassengerDetailsForm, PassengerFormData } from "./PassengerDetailsForm";
import { BookingPaymentStep } from "./BookingPaymentStep";
import type { Tour } from "@/hooks/useTours";
import { BookingCelebration } from "./BookingCelebration";

const bookingSchema = z.object({
  tour_date: z.date({ required_error: "Tour date is required" }),
  passengers: z.coerce.number().min(1, "At least 1 passenger"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface TourBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: Tour | null;
}

export function TourBookingModal({ open, onOpenChange, tour }: TourBookingModalProps) {
  const [step, setStep] = useState<"details" | "passengers" | "payment" | "voucher">("details");
  const [showCelebration, setShowCelebration] = useState(false);
  const [passengerCount, setPassengerCount] = useState(1);
  const [bookingData, setBookingData] = useState<BookingFormValues | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    passengerData: PassengerFormData;
  } | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const createBooking = useCreateBooking();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      passengers: 1,
    },
  });

  const handleDetailsSubmit = (data: BookingFormValues) => {
    setPassengerCount(data.passengers);
    setBookingData(data);
    setStep("passengers");
  };

  const handlePassengerSubmit = async (passengerData: PassengerFormData) => {
    if (!tour || !bookingData) return;

    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "tour",
        tour_id: tour.id,
        total_amount: tour.price * passengerCount,
        passengers: passengerCount,
        passenger_details: passengerData.passengers.map((p, index) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passportNumber: p.passportNumber,
          documents: p.documents || [],
          isLead: index === 0,
        })),
        special_requests: passengerData.specialRequests,
        notes: JSON.stringify({
          tour_date: bookingData.tour_date.toISOString(),
          contactEmail: passengerData.contactEmail,
          contactPhone: passengerData.contactPhone,
        }),
        status: "pending_payment",
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        passengerData,
      });
      setStep("payment");
      toast.success(`Booking created! Please complete payment.`);
    } catch (error) {
      toast.error("Failed to submit booking");
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

  if (!tour) return null;

  const watchedDate = form.watch("tour_date");
  const watchedPassengers = form.watch("passengers") || 1;
  const livePrice = watchedPassengers * tour.price;
  const totalPrice = passengerCount * tour.price;
  const coverImage = tour.images?.[0];

  const adjustPassengers = (delta: number) => {
    const max = tour.max_participants || 20;
    const next = Math.min(max, Math.max(1, watchedPassengers + delta));
    form.setValue("passengers", next, { shouldValidate: true });
  };

  // Right sidebar — booking summary
  const SummarySidebar = ({
    date,
    passengers,
    total,
  }: {
    date?: Date;
    passengers: number;
    total: number;
  }) => (
    <aside className="hidden lg:flex flex-col bg-muted/20 border-l border-border h-screen sticky top-0 overflow-y-auto">
      <div className="relative h-32 bg-muted overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt={tour.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-bold text-base text-foreground line-clamp-1">{tour.name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {tour.cities?.name}, {tour.cities?.country}
            </span>
          </div>
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
                <CalendarIcon className="h-4 w-4" /> Date
              </span>
              <span className="font-medium">
                {date ? format(date, "dd/MM/yyyy") : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> Duration
              </span>
              <span className="font-medium">{tour.duration_hours}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> Participants
              </span>
              <span className="font-medium">{passengers}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Per person</span>
            <span>${tour.price}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>× Participants</span>
            <span>{passengers}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-border">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-2xl font-bold text-primary">${total}</span>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <BookingCelebration
        show={showCelebration}
        bookingNumber={bookingResult?.number || ""}
        title={tour.name}
        totalAmount={totalPrice}
        type="tour"
        summaryItems={[
          { label: "Tour", value: tour.name },
          { label: "Location", value: `${tour.cities?.name}, ${tour.cities?.country}` },
          { label: "Duration", value: `${tour.duration_hours} hours` },
          { label: "Participants", value: `${passengerCount}` },
        ]}
        onClose={() => { setShowCelebration(false); handleClose(); }}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-0 overflow-hidden">
          {step === "details" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-screen">
              {/* LEFT: Form */}
              <div className="flex flex-col h-screen overflow-hidden">
                <DialogHeader className="px-8 pt-6 pb-4 border-b border-border">
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    Book Tour
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  {/* Hero summary card */}
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                        {coverImage ? (
                          <img src={coverImage} alt={tour.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight truncate">{tour.name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {tour.cities?.name}, {tour.cities?.country}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {tour.duration_hours} hours
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            Max {tour.max_participants}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-primary leading-none">
                          ${tour.price}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">
                          per person
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <Form {...form}>
                    <form
                      id="tour-details-form"
                      onSubmit={form.handleSubmit(handleDetailsSubmit)}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <h4 className="text-sm font-semibold uppercase tracking-wide">
                          Trip Details
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Tour Date */}
                        <FormField
                          control={form.control}
                          name="tour_date"
                          render={({ field }) => (
                            <FormItem>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Tour Date
                              </label>
                              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                      "w-full h-12 justify-start text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                    {field.value
                                      ? format(field.value, "dd/MM/yyyy")
                                      : "Select date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(d) => {
                                      field.onChange(d);
                                      setDateOpen(false);
                                    }}
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

                        {/* Participants stepper */}
                        <FormField
                          control={form.control}
                          name="passengers"
                          render={({ field }) => (
                            <FormItem>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                Number of Participants
                              </label>
                              <div className="flex items-center h-12 rounded-md border border-input bg-background overflow-hidden">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => adjustPassengers(-1)}
                                  disabled={watchedPassengers <= 1}
                                  className="h-full w-12 rounded-none hover:bg-muted"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="flex-1 text-center">
                                  <div className="text-base font-semibold">{field.value}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    of max {tour.max_participants || 20}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => adjustPassengers(1)}
                                  disabled={watchedPassengers >= (tour.max_participants || 20)}
                                  className="h-full w-12 rounded-none hover:bg-muted"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Live total chip */}
                      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Estimated total</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (${tour.price} × {watchedPassengers})
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-primary">${livePrice}</div>
                      </div>
                    </form>
                  </Form>
                </div>

                {/* Sticky footer */}
                <div className="border-t border-border bg-background/95 backdrop-blur px-8 py-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="tour-details-form"
                    variant="navy"
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    Continue to Participant Details
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* RIGHT: Summary */}
              <SummarySidebar
                date={watchedDate}
                passengers={watchedPassengers}
                total={livePrice}
              />
            </div>
          )}

          {step === "passengers" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-screen">
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
                    <DialogTitle className="text-xl">Participant Details</DialogTitle>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <PassengerDetailsForm
                    passengerCount={passengerCount}
                    onPassengerCountChange={setPassengerCount}
                    onSubmit={handlePassengerSubmit}
                    isLoading={createBooking.isPending}
                    maxPassengers={tour.max_participants || 20}
                    showPassengerCounter={false}
                  />
                </div>
              </div>

              <SummarySidebar
                date={bookingData?.tour_date}
                passengers={passengerCount}
                total={totalPrice}
              />
            </div>
          )}

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
                onBack={() => {}}
              />
            </div>
          )}

          {step === "voucher" && bookingResult && bookingData && (
            <div className="px-8 py-6 overflow-y-auto h-screen">
              <UniversalVoucher
                details={{
                  type: "tour",
                  bookingId: bookingResult.id,
                  bookingNumber: bookingResult.number,
                  serviceName: tour.name,
                  totalAmount: totalPrice,
                  passengerCount: passengerCount,
                  passengerNames: bookingResult.passengerData.passengers.map(
                    (p) => `${p.firstName} ${p.lastName}`
                  ),
                  contactEmail: bookingResult.passengerData.contactEmail,
                  contactPhone: bookingResult.passengerData.contactPhone,
                  destination: `${tour.cities?.name}, ${tour.cities?.country}`,
                  departureDate: bookingData.tour_date,
                  tourDuration: `${tour.duration_hours} hours`,
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
