import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Plane, Calendar, Users, MapPin, Download, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DigitalVoucherProps {
  bookingId: string;
  bookingNumber: string;
  packageName: string;
  destination: string;
  departureDate: Date;
  returnDate: Date;
  passengerCount: number;
  passengerNames: string[];
  totalAmount: number;
  contactEmail: string;
}

export function DigitalVoucher({
  bookingId,
  bookingNumber,
  packageName,
  destination,
  departureDate,
  returnDate,
  passengerCount,
  passengerNames,
  totalAmount,
  contactEmail,
}: DigitalVoucherProps) {
  const voucherRef = useRef<HTMLDivElement>(null);

  const handleSendEmail = () => {
    // Simulate sending email
    toast.success(`Voucher sent to ${contactEmail}`, {
      description: "Check your inbox for the booking confirmation",
      icon: <Mail className="h-5 w-5" />,
    });
  };

  const qrValue = JSON.stringify({
    id: bookingId,
    number: bookingNumber,
    package: packageName,
    date: departureDate.toISOString(),
  });

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[hsl(142,76%,36%)]/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-[hsl(142,76%,36%)]" />
        </div>
        <h2 className="text-2xl font-bold text-[hsl(231,70%,15%)] mb-2">Booking Confirmed!</h2>
        <p className="text-[hsl(231,15%,46%)]">Your adventure awaits. Here's your digital voucher.</p>
      </div>

      {/* Boarding Pass Style Voucher */}
      <div 
        ref={voucherRef}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-[hsl(240,6%,90%)]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(231,70%,30%)] to-[hsl(231,50%,45%)] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium">GTS Travel</p>
              <p className="text-2xl font-bold">Boarding Pass</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-xs">Booking Reference</p>
              <p className="text-xl font-mono font-bold tracking-wider">{bookingNumber}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="flex gap-6">
            {/* Left side - Details */}
            <div className="flex-1 space-y-6">
              {/* Route */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-[hsl(231,15%,46%)] mb-1">From</p>
                  <p className="text-2xl font-bold text-[hsl(231,70%,15%)]">HOME</p>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-0.5 bg-[hsl(240,6%,90%)]" />
                  <Plane className="h-6 w-6 text-[hsl(231,70%,30%)] rotate-90" />
                  <div className="flex-1 h-0.5 bg-[hsl(240,6%,90%)]" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-[hsl(231,15%,46%)] mb-1">To</p>
                  <p className="text-2xl font-bold text-[hsl(231,70%,30%)]">{destination.toUpperCase()}</p>
                </div>
              </div>

              {/* Package name */}
              <div className="p-4 rounded-xl bg-[hsl(240,5%,96%)]">
                <p className="text-xs text-[hsl(231,15%,46%)] mb-1">Package</p>
                <p className="font-bold text-[hsl(231,70%,15%)]">{packageName}</p>
              </div>

              {/* Dates and passengers */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[hsl(231,15%,46%)] mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">Departure</span>
                  </div>
                  <p className="font-semibold text-[hsl(231,70%,15%)]">
                    {format(departureDate, "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[hsl(231,15%,46%)] mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs">Return</span>
                  </div>
                  <p className="font-semibold text-[hsl(231,70%,15%)]">
                    {format(returnDate, "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[hsl(231,15%,46%)] mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-xs">Passengers</span>
                  </div>
                  <p className="font-semibold text-[hsl(231,70%,15%)]">{passengerCount}</p>
                </div>
              </div>

              {/* Passenger names */}
              <div>
                <p className="text-xs text-[hsl(231,15%,46%)] mb-2">Travelers</p>
                <div className="flex flex-wrap gap-2">
                  {passengerNames.map((name, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 rounded-full bg-[hsl(231,70%,30%)]/10 text-[hsl(231,70%,30%)] text-sm font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-[hsl(240,6%,90%)] relative">
              <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-[hsl(240,5%,96%)]" />
              <div className="absolute -left-3 -bottom-3 w-6 h-6 rounded-full bg-[hsl(240,5%,96%)]" />
            </div>

            {/* Right side - QR Code */}
            <div className="w-48 flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-inner border border-[hsl(240,6%,90%)]">
                <QRCodeSVG 
                  value={qrValue} 
                  size={140}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-[hsl(231,15%,46%)] mt-3 text-center">
                Scan for verification
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="mt-6 pt-6 border-t border-dashed border-[hsl(240,6%,90%)] flex items-center justify-between">
            <div>
              <p className="text-sm text-[hsl(231,15%,46%)]">Total Paid</p>
              <p className="text-3xl font-bold text-[hsl(231,70%,30%)]">${totalAmount.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(142,76%,36%)]/10">
              <CheckCircle2 className="h-5 w-5 text-[hsl(142,76%,36%)]" />
              <span className="font-semibold text-[hsl(142,76%,36%)]">CONFIRMED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={handleSendEmail}
          className="flex-1 h-14 rounded-2xl bg-[hsl(231,70%,30%)] hover:bg-[hsl(231,75%,20%)] text-lg font-semibold"
        >
          <Mail className="h-5 w-5 mr-2" />
          Send to Email
        </Button>
        <Button
          variant="outline"
          className="h-14 px-6 rounded-2xl border-2 border-[hsl(231,70%,30%)] text-[hsl(231,70%,30%)] hover:bg-[hsl(231,70%,30%)]/5"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
