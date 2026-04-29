import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Converts YYYY-MM-DD → DD/MM/YYYY */
function toDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Converts DD/MM/YYYY → YYYY-MM-DD */
function toIso(display: string): string {
  if (!display) return "";
  const parts = display.split("/");
  if (parts.length !== 3) return display;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

interface DateInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "onBlur" | "type"> {
  value: string;
  onValueChange?: (iso: string) => void;
  onBlurValue?: (iso: string) => void;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onValueChange, onBlurValue, className, placeholder, disabled, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => toDisplay(value));
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
      setDisplay(toDisplay(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value.replace(/[^0-9/]/g, "");
      const digits = v.replace(/\//g, "");
      if (digits.length >= 2 && !v.includes("/")) {
        v = digits.slice(0, 2) + "/" + digits.slice(2);
      }
      if (digits.length >= 4 && v.split("/").length < 3) {
        const parts = v.split("/");
        v = parts[0] + "/" + (parts[1] || "").slice(0, 2) + "/" + (parts[1] || "").slice(2);
      }
      if (v.length > 10) v = v.slice(0, 10);
      setDisplay(v);
      if (v.length === 10) onValueChange?.(toIso(v));
    };

    const handleBlur = () => {
      if (display.length === 10) onBlurValue?.(toIso(display));
    };

    const selectedDate = React.useMemo(() => {
      if (!value) return undefined;
      const d = parse(value, "yyyy-MM-dd", new Date());
      return isValid(d) ? d : undefined;
    }, [value]);

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={ref}
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder || "DD/MM/YYYY"}
          disabled={disabled}
          className="pr-8"
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[60]" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  const iso = format(d, "yyyy-MM-dd");
                  setDisplay(toDisplay(iso));
                  onValueChange?.(iso);
                  onBlurValue?.(iso);
                }
                setOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
