import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Plane, Hotel, Car, FileText, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";

interface SummaryItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface BookingCelebrationProps {
  show: boolean;
  bookingNumber: string;
  title: string;
  subtitle?: string;
  totalAmount: number;
  summaryItems: SummaryItem[];
  onClose: () => void;
  type: "flight" | "hotel" | "transfer" | "visa" | "tour" | "package";
}

const typeIcons = {
  flight: <Plane className="h-5 w-5" />,
  hotel: <Hotel className="h-5 w-5" />,
  transfer: <Car className="h-5 w-5" />,
  visa: <FileText className="h-5 w-5" />,
  tour: <Compass className="h-5 w-5" />,
  package: <Compass className="h-5 w-5" />,
};

const typeLabels = {
  flight: "Flight Booking",
  hotel: "Hotel Booking",
  transfer: "Transfer Booking",
  visa: "Visa Application",
  tour: "Tour Booking",
  package: "Package Booking",
};

export function BookingCelebration({
  show,
  bookingNumber,
  title,
  subtitle,
  totalAmount,
  summaryItems,
  onClose,
  type,
}: BookingCelebrationProps) {
  const navigate = useNavigate();

  const fireConfetti = useCallback(() => {
    // Initial burst
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    // Side cannons
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#1B2A4A", "#FF6B6B", "#F4A261"];

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
    }, 150);
  }, []);

  useEffect(() => {
    if (show) fireConfetti();
  }, [show, fireConfetti]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="bg-card border border-border rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6"
          >
            {/* Animated Checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 10, stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center"
            >
              <CheckCircle className="h-12 w-12 text-success" />
            </motion.div>

            {/* Title */}
            <div>
              <Badge className="mb-3 bg-primary/10 text-primary">
                {typeIcons[type]}
                <span className="ml-1.5">{typeLabels[type]}</span>
              </Badge>
              <h2 className="text-2xl font-bold">Your Booking is Under Review</h2>
              <p className="text-muted-foreground mt-1">
                {subtitle || "We've received your request and will confirm shortly"}
              </p>
            </div>

            {/* Booking Reference */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Booking Reference
              </p>
              <p className="text-xl font-mono font-bold text-primary tracking-wider">
                {bookingNumber}
              </p>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              {summaryItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="bg-muted/30 rounded-lg p-3"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </p>
                  <p className="font-semibold text-sm mt-0.5 truncate">{item.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4 border border-primary/20">
              <span className="font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-primary">${totalAmount.toLocaleString()}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onClose();
                  navigate("/bookings");
                }}
              >
                View Bookings
              </Button>
              <Button
                variant="navy"
                className="flex-1"
                onClick={onClose}
              >
                Done
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
