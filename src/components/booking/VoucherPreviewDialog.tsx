import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Send, X, Eye } from "lucide-react";
import { UniversalVoucher, VoucherDetails, VoucherType, CustomGroupVoucherDetails } from "./UniversalVoucher";
import { type GroupPackageVoucherDetails } from "./GroupPackageVoucher";
import { type Booking } from "@/hooks/useBookings";

interface VoucherPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onConfirmSend: () => void;
  isSending?: boolean;
  previewOnly?: boolean;
}

export function VoucherPreviewDialog({
  open,
  onOpenChange,
  booking,
  onConfirmSend,
  isSending = false,
  previewOnly = false,
}: VoucherPreviewDialogProps) {
  if (!booking) return null;

  const getVoucherType = (): VoucherType => {
    const type = booking.booking_type?.toLowerCase();
    if (type === "custom_group") return "custom_group";
    if (type === "flight") return "flight";
    if (type === "hotel") return "hotel";
    if (type === "tour") return "tour";
    if (type === "visa") return "visa";
    if (type === "transfer") return "transfer";
    return "package";
  };

  const getPassengerNames = (): string[] => {
    if (!booking.passenger_details) return [];
    try {
      const details = booking.passenger_details as any[];
      return details.map((p) => `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || p.full_name || "Guest").filter(Boolean);
    } catch {
      return [];
    }
  };

  const getPassengerDetails = (): { name: string; birthDate?: string }[] => {
    if (!booking.passenger_details) return [];
    try {
      const details = booking.passenger_details as any[];
      return details.map((p) => ({
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || "Guest",
        birthDate: p.dateOfBirth || p.birthDate,
      }));
    } catch {
      return [];
    }
  };

  const buildPackageDetails = (): GroupPackageVoucherDetails | undefined => {
    if (booking.booking_type !== "package") return undefined;

    const pkg = booking.package_departures?.group_packages;
    if (!pkg) return undefined;

    return {
      packageName: pkg.name || "Group Package",
      destination: (pkg as any)?.cities?.name || "",
      departureDate: booking.package_departures?.departure_date
        ? format(new Date(booking.package_departures.departure_date), "dd/MM/yyyy")
        : undefined,
      returnDate: booking.package_departures?.return_date
        ? format(new Date(booking.package_departures.return_date), "dd/MM/yyyy")
        : undefined,
      nights: pkg.nights || 0,
      outboundFlight: undefined,
      returnFlight: undefined,
      hotel: undefined,
      itinerary: undefined,
      included: pkg.included_items || [],
      notIncluded: pkg.not_included_items || [],
      passengers: getPassengerDetails(),
    };
  };

  const buildCustomGroupDetails = (): CustomGroupVoucherDetails | undefined => {
    if (booking.booking_type !== "custom_group") return undefined;
    const meta = booking.metadata as any;
    if (!meta) return undefined;

    const outboundFlight = booking.flights ? {
      airline: booking.flights.airline || "",
      flightNumber: booking.flights.flight_number || undefined,
      departureCity: booking.flights.departure_city || "",
      arrivalCity: booking.flights.arrival_city || "",
      departureDate: booking.flights.departure_date ? format(new Date(booking.flights.departure_date), "dd/MM/yyyy") : "",
      departureTime: booking.flights.departure_time,
      arrivalTime: booking.flights.arrival_time,
      airlineLogo: booking.flights.airline_logo,
    } : undefined;

    return {
      outboundFlight,
      returnFlight: undefined,
      hotel: booking.hotels ? {
        name: booking.hotels.name,
        starRating: booking.hotels.star_rating || undefined,
        address: booking.hotels.address || undefined,
      } : undefined,
      transfer: meta.transfer_name ? {
        name: meta.transfer_name,
        vehicleType: meta.transfer_vehicle_type,
        routeFrom: meta.transfer_route_from,
        routeTo: meta.transfer_route_to,
      } : undefined,
      departureDate: meta.departure_date ? format(new Date(meta.departure_date), "dd/MM/yyyy") : undefined,
      returnDate: meta.return_date ? format(new Date(meta.return_date), "dd/MM/yyyy") : undefined,
      nights: meta.nights,
    };
  };

  const voucherDetails: VoucherDetails = {
    type: getVoucherType(),
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
    serviceName: booking.package_departures?.group_packages?.name ||
                 booking.flights?.airline ||
                 booking.hotels?.name ||
                 booking.tours?.name ||
                 booking.visas?.country ||
                 booking.booking_type || "Booking",
    totalAmount: booking.total_amount,
    passengerCount: booking.passengers || 1,
    passengerNames: getPassengerNames(),
    status: "confirmed",
    contactEmail: booking.profiles?.email,
    contactPhone: booking.profiles?.phone,
    agencyName: booking.agencies?.agency_name || undefined,
    agencyLogo: booking.agencies?.logo_url || undefined,
    destination: booking.package_departures?.group_packages?.cities?.name,
    departureDate: booking.package_departures?.departure_date
      ? new Date(booking.package_departures.departure_date)
      : booking.flights?.departure_date
        ? new Date(booking.flights.departure_date)
        : undefined,
    returnDate: booking.package_departures?.return_date
      ? new Date(booking.package_departures.return_date)
      : undefined,
    packageDetails: buildPackageDetails(),
    customGroupDetails: buildCustomGroupDetails(),
    flightNumber: booking.flights?.flight_number,
    airline: booking.flights?.airline,
    departureCity: booking.flights?.departure_city,
    arrivalCity: booking.flights?.arrival_city,
    departureTime: booking.flights?.departure_time,
    arrivalTime: booking.flights?.arrival_time,
    flightClass: booking.flights?.class,
    hotelName: booking.hotels?.name,
    hotelStars: booking.hotels?.star_rating,
    hotelAddress: booking.hotels?.address,
    tourDuration: booking.tours?.duration_hours ? `${booking.tours.duration_hours} hours` : undefined,
    visaCountry: booking.visas?.country,
    visaType: booking.visas?.visa_type,
    processingDays: booking.visas?.processing_days,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            {previewOnly
              ? `Voucher Preview — ${booking.booking_number}`
              : `Voucher Preview — ${booking.booking_type?.charAt(0).toUpperCase()}${booking.booking_type?.slice(1)} Booking`}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <div className="bg-muted/50 rounded-lg px-4 py-2 mb-4">
            <p className="text-sm text-muted-foreground">
              {previewOnly
                ? "Preview the current voucher before downloading or printing it."
                : "Review the voucher below before sending. This is what the customer will receive as a PDF."}
            </p>
          </div>

          <div className="border rounded-xl overflow-hidden bg-white">
            <UniversalVoucher details={voucherDetails} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            <X className="h-4 w-4 mr-2" />
            {previewOnly ? "Close" : "Cancel"}
          </Button>

          {!previewOnly && (
            <Button
              onClick={onConfirmSend}
              disabled={isSending}
              className="bg-success hover:bg-success/90"
            >
              {isSending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Approve & Send Voucher
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
