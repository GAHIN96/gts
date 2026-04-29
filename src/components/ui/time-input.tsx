import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 24-hour time input. Uses a plain text input with HH:MM pattern
 * to guarantee 24h display across all browsers/locales.
 */
const TimeInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type"> & { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }
>(({ className, value = "", onChange, onBlur, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // Allow only digits and colon
    v = v.replace(/[^\d:]/g, "");

    // Auto-insert colon
    if (v.length === 2 && !v.includes(":") && localValue.length < v.length) {
      v = v + ":";
    }

    // Limit length to HH:MM (5 chars)
    if (v.length > 5) v = v.slice(0, 5);

    setLocalValue(v);

    // Only fire onChange with valid time
    if (/^\d{2}:\d{2}$/.test(v)) {
      const [h, m] = v.split(":").map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const syntheticEvent = { ...e, target: { ...e.target, value: v } } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // On blur, also fire onChange if valid, or revert
    if (/^\d{2}:\d{2}$/.test(localValue)) {
      const [h, m] = localValue.split(":").map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const syntheticEvent = { ...e, target: { ...e.target, value: localValue } } as any;
        onChange?.(syntheticEvent);
      }
    }
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      placeholder="HH:MM"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-input px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:bg-[hsl(var(--input-focus))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
        className
      )}
      {...props}
    />
  );
});
TimeInput.displayName = "TimeInput";

export { TimeInput };
