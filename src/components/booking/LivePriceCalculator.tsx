import { Calculator, Users, Building, FileText, Plane, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceBreakdown {
  basePrice: number;
  hotelModifier: number;
  hotelTierName: string;
  visaIncluded: boolean;
  visaPrice: number;
  flightIncluded: boolean;
  flightPrice: number;
  passengerCount: number;
}

interface LivePriceCalculatorProps extends PriceBreakdown {
  className?: string;
}

export function LivePriceCalculator({
  basePrice,
  hotelModifier,
  hotelTierName,
  visaIncluded,
  visaPrice,
  flightIncluded,
  flightPrice,
  passengerCount,
  className,
}: LivePriceCalculatorProps) {
  // Calculate per-person price
  const perPersonBase = basePrice + hotelModifier;
  const visaDeduction = visaIncluded ? 0 : visaPrice;
  const flightDeduction = flightIncluded ? 0 : flightPrice;
  const perPersonTotal = perPersonBase - visaDeduction - flightDeduction;
  
  // Calculate final total
  const grandTotal = perPersonTotal * passengerCount;

  return (
    <div className={cn("bg-white rounded-2xl p-6 shadow-lg sticky top-6", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[hsl(231,70%,30%)] flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-[hsl(231,70%,15%)]">Live Total</h3>
          <p className="text-xs text-[hsl(231,15%,46%)]">Updates instantly</p>
        </div>
      </div>

      {/* Formula display */}
      <div className="p-4 rounded-xl bg-[hsl(240,5%,96%)] mb-6">
        <p className="text-xs font-mono text-[hsl(231,15%,46%)] text-center">
          ((Base + Hotel) − Deductions) × Passengers
        </p>
      </div>

      {/* Price breakdown */}
      <div className="space-y-3">
        {/* Base price */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[hsl(231,50%,45%)]" />
            <span className="text-sm text-[hsl(231,70%,15%)]">Base Package Price</span>
          </div>
          <span className="font-semibold text-[hsl(231,70%,15%)]">${basePrice}</span>
        </div>

        {/* Hotel tier */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-[hsl(231,50%,45%)]" />
            <span className="text-sm text-[hsl(231,70%,15%)]">{hotelTierName}</span>
          </div>
          <span className={cn(
            "font-semibold",
            hotelModifier > 0 ? "text-[hsl(231,70%,30%)]" : "text-[hsl(231,15%,46%)]"
          )}>
            {hotelModifier > 0 ? `+$${hotelModifier}` : "Included"}
          </span>
        </div>

        {/* Visa */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[hsl(231,50%,45%)]" />
            <span className="text-sm text-[hsl(231,70%,15%)]">Visa Processing</span>
          </div>
          <span className={cn(
            "font-semibold",
            !visaIncluded ? "text-[hsl(142,76%,36%)]" : "text-[hsl(231,15%,46%)]"
          )}>
            {!visaIncluded ? `-$${visaPrice}` : "Included"}
          </span>
        </div>

        {/* Flight */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-[hsl(231,50%,45%)]" />
            <span className="text-sm text-[hsl(231,70%,15%)]">Return Flight</span>
          </div>
          <span className={cn(
            "font-semibold",
            !flightIncluded ? "text-[hsl(142,76%,36%)]" : "text-[hsl(231,15%,46%)]"
          )}>
            {!flightIncluded ? `-$${flightPrice}` : "Included"}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-[hsl(240,6%,90%)] my-2" />

        {/* Per person total */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-[hsl(231,70%,15%)]">Price per person</span>
          <span className="font-bold text-lg text-[hsl(231,70%,30%)]">${perPersonTotal}</span>
        </div>

        {/* Passenger count */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(231,50%,45%)]" />
            <span className="text-sm text-[hsl(231,70%,15%)]">Passengers</span>
          </div>
          <span className="font-semibold text-[hsl(231,70%,15%)]">×{passengerCount}</span>
        </div>
      </div>

      {/* Grand total */}
      <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-[hsl(231,70%,30%)] to-[hsl(231,50%,45%)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Grand Total</p>
            <p className="text-3xl font-bold text-white">${grandTotal.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">For {passengerCount} passenger{passengerCount > 1 ? 's' : ''}</p>
            <p className="text-sm text-white/80">${perPersonTotal}/person</p>
          </div>
        </div>
      </div>
    </div>
  );
}
