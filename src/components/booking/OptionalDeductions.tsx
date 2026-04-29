import { Plane, FileText, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DeductionOption {
  id: string;
  label: string;
  description: string;
  amount: number;
  icon: typeof Plane;
  defaultEnabled: boolean;
}

interface OptionalDeductionsProps {
  visaIncluded: boolean;
  flightIncluded: boolean;
  onVisaChange: (included: boolean) => void;
  onFlightChange: (included: boolean) => void;
  visaPrice?: number;
  flightPrice?: number;
}

export function OptionalDeductions({
  visaIncluded,
  flightIncluded,
  onVisaChange,
  onFlightChange,
  visaPrice = 150,
  flightPrice = 450,
}: OptionalDeductionsProps) {
  const deductions: DeductionOption[] = [
    {
      id: "visa",
      label: "Visa Processing",
      description: "Complete visa application and processing service",
      amount: visaPrice,
      icon: FileText,
      defaultEnabled: visaIncluded,
    },
    {
      id: "flight",
      label: "Return Flight",
      description: "Round-trip economy class flights included",
      amount: flightPrice,
      icon: Plane,
      defaultEnabled: flightIncluded,
    },
  ];

  const handleChange = (id: string, value: boolean) => {
    if (id === "visa") onVisaChange(value);
    if (id === "flight") onFlightChange(value);
  };

  const getValue = (id: string) => {
    if (id === "visa") return visaIncluded;
    if (id === "flight") return flightIncluded;
    return true;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-[hsl(231,70%,15%)] mb-2">Customize Your Package</h3>
      <p className="text-[hsl(231,15%,46%)] text-sm mb-6">Toggle off items you don't need to save money</p>
      
      <div className="space-y-4">
        {deductions.map((option) => {
          const Icon = option.icon;
          const isEnabled = getValue(option.id);
          
          return (
            <div
              key={option.id}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all duration-300",
                isEnabled 
                  ? "bg-[hsl(231,70%,30%)]/5 border-[hsl(231,70%,30%)]/20" 
                  : "bg-[hsl(240,5%,96%)] border-[hsl(240,6%,90%)]"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    isEnabled 
                      ? "bg-[hsl(231,70%,30%)] text-white" 
                      : "bg-[hsl(240,6%,90%)] text-[hsl(231,15%,46%)]"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-[hsl(231,70%,15%)]">{option.label}</h4>
                      {isEnabled ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)] text-xs font-medium">
                          <Check className="h-3 w-3" />
                          Included
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(6,100%,69%)]/10 text-[hsl(6,100%,69%)] text-xs font-medium">
                          <X className="h-3 w-3" />
                          Removed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(231,15%,46%)]">{option.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-bold",
                      isEnabled ? "text-[hsl(231,70%,30%)]" : "text-[hsl(6,100%,69%)]"
                    )}>
                      {isEnabled ? `+$${option.amount}` : `-$${option.amount}`}
                    </p>
                    <p className="text-xs text-[hsl(231,15%,46%)]">
                      {isEnabled ? "included" : "savings"}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleChange(option.id, checked)}
                    className="data-[state=checked]:bg-[hsl(231,70%,30%)]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[hsl(231,70%,30%)]/5 to-[hsl(231,50%,45%)]/5 border border-[hsl(231,70%,30%)]/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[hsl(231,15%,46%)]">Total adjustments</span>
          <span className={cn(
            "font-bold",
            (!visaIncluded || !flightIncluded) ? "text-[hsl(142,76%,36%)]" : "text-[hsl(231,70%,30%)]"
          )}>
            {!visaIncluded || !flightIncluded 
              ? `-$${(!visaIncluded ? visaPrice : 0) + (!flightIncluded ? flightPrice : 0)} savings` 
              : "No changes"
            }
          </span>
        </div>
      </div>
    </div>
  );
}
