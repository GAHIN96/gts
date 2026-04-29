import {
  Calendar,
  Building,
  Bed,
  Plane,
  FileText,
  Users,
  MapPin,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface BookingSummaryProps {
  packageName: string;
  destination: string;
  departureDate: Date;
  returnDate: Date;
  nights: number;
  hotelName: string | null;
  roomType: string | null;
  roomPrice: number;
  basePrice: number;
  groupSize: number;
  flightIncluded: boolean;
  visaIncluded: boolean;
  flightPrice: number;
  visaPrice: number;
  onFlightToggle: (included: boolean) => void;
  onVisaToggle: (included: boolean) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" as const },
  }),
};

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
  trailing,
  index = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trailing?: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="show"
      className="flex items-center gap-3"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 flex items-center justify-center shadow-sm shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="font-semibold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {trailing}
    </motion.div>
  );
}

export function BookingSummary({
  packageName,
  destination,
  departureDate,
  returnDate,
  nights,
  hotelName,
  roomType,
  roomPrice,
  basePrice,
  groupSize,
  flightIncluded,
  visaIncluded,
  flightPrice,
  visaPrice,
  onFlightToggle,
  onVisaToggle,
}: BookingSummaryProps) {
  const accommodationTotal = roomPrice;
  const flightTotal = flightIncluded ? flightPrice * groupSize : 0;
  const visaTotal = visaIncluded ? visaPrice * groupSize : 0;
  const packageTotal = basePrice * groupSize;
  const grandTotal = packageTotal + accommodationTotal + flightTotal + visaTotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-3xl border border-border/40 shadow-card bg-card overflow-hidden sticky top-6 backdrop-blur-xl"
    >
      {/* Header — gradient navy with shimmer */}
      <div className="relative bg-gradient-navy p-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm mb-2">
            <Sparkles className="h-3 w-3 text-white" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white">
              Booking Summary
            </span>
          </div>
          <h3 className="font-heading text-lg font-bold text-white truncate">
            {packageName}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Trip basics */}
        <div className="space-y-3">
          <InfoRow
            icon={MapPin}
            label="Destination"
            value={destination}
            index={0}
          />
          <InfoRow
            icon={Calendar}
            label="Travel Dates"
            value={`${format(departureDate, "dd/MM/yyyy")} — ${format(returnDate, "dd/MM/yyyy")}`}
            sub={`${nights} ${nights === 1 ? "night" : "nights"}`}
            index={1}
          />
        </div>

        {hotelName && roomType && (
          <>
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="space-y-3">
              <InfoRow
                icon={Building}
                label="Hotel"
                value={hotelName}
                index={2}
              />
              <InfoRow
                icon={Bed}
                label="Room Type"
                value={roomType}
                index={3}
                trailing={
                  <span className="font-bold text-primary text-sm shrink-0">
                    ${roomPrice.toLocaleString()}
                  </span>
                }
              />
            </div>
          </>
        )}

        {/* Add-ons */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Optional Add-ons
          </p>

          {/* Flights */}
          <motion.div
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
            className={cn(
              "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
              flightIncluded
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                : "bg-muted/40 border-border/60",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-all",
                  flightIncluded
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600"
                    : "bg-primary/5 border-primary/10 text-primary",
                )}
              >
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Return Flights
                </p>
                <p className="text-xs text-muted-foreground">
                  ${flightPrice}/person
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {flightIncluded && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-sm font-bold text-emerald-600"
                >
                  +${flightTotal.toLocaleString()}
                </motion.span>
              )}
              <Switch checked={flightIncluded} onCheckedChange={onFlightToggle} />
            </div>
          </motion.div>

          {/* Visa */}
          <motion.div
            variants={fadeUp}
            custom={5}
            initial="hidden"
            animate="show"
            className={cn(
              "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
              visaIncluded
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                : "bg-muted/40 border-border/60",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-all",
                  visaIncluded
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600"
                    : "bg-primary/5 border-primary/10 text-primary",
                )}
              >
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  Visa Processing
                </p>
                <p className="text-xs text-muted-foreground">
                  ${visaPrice}/person
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visaIncluded && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-sm font-bold text-emerald-600"
                >
                  +${visaTotal.toLocaleString()}
                </motion.span>
              )}
              <Switch checked={visaIncluded} onCheckedChange={onVisaToggle} />
            </div>
          </motion.div>
        </div>

        {/* Breakdown */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Package ({groupSize} × ${basePrice})
            </span>
            <span className="text-foreground font-medium">
              ${packageTotal.toLocaleString()}
            </span>
          </div>

          {accommodationTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accommodation</span>
              <span className="text-foreground font-medium">
                ${accommodationTotal.toLocaleString()}
              </span>
            </div>
          )}

          {flightIncluded && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Flights ({groupSize} × ${flightPrice})
              </span>
              <span className="text-foreground font-medium">
                ${flightTotal.toLocaleString()}
              </span>
            </div>
          )}

          {visaIncluded && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Visa ({groupSize} × ${visaPrice})
              </span>
              <span className="text-foreground font-medium">
                ${visaTotal.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Grand total — gradient strip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative rounded-2xl overflow-hidden mt-2"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent via-primary to-primary" />
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <div className="relative p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/70">
                Total Amount
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Users className="h-3.5 w-3.5 text-white/80" />
                <span className="text-xs text-white/80">
                  {groupSize} {groupSize === 1 ? "traveler" : "travelers"}
                </span>
              </div>
            </div>
            <p
              className="text-3xl font-extrabold text-white tracking-tight"
              style={{
                textShadow: "0 0 24px hsl(0 0% 100% / 0.3)",
              }}
            >
              ${grandTotal.toLocaleString()}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
