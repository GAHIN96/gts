import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface CustomGroupPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSaved: () => void;
}

export function CustomGroupPricingDialog({ open, onOpenChange, booking, onSaved }: CustomGroupPricingDialogProps) {
  const metadata = booking?.metadata || {};
  const [discountPercent, setDiscountPercent] = useState<number>(metadata.discount_percent || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(metadata.discount_amount || 0);
  const [priceOverride, setPriceOverride] = useState<number>(metadata.price_override || 0);
  const [saving, setSaving] = useState(false);

  const originalTotal = metadata.original_total || booking?.total_amount || 0;
  const flightPrice = metadata.outbound_flight?.price || 0;
  const returnFlightPrice = metadata.return_flight?.price || 0;
  const hotelPrice = metadata.hotel?.total_price || metadata.hotel?.price_per_night || 0;
  const transferPrice = metadata.transfer?.price || 0;

  useEffect(() => {
    if (booking) {
      const m = booking.metadata || {};
      setDiscountPercent(m.discount_percent || 0);
      setDiscountAmount(m.discount_amount || 0);
      setPriceOverride(m.price_override || 0);
    }
  }, [booking]);

  const calculatedTotal = (() => {
    if (priceOverride > 0) return priceOverride;
    let total = originalTotal;
    if (discountPercent > 0) total = total * (1 - discountPercent / 100);
    if (discountAmount > 0) total = total - discountAmount;
    return Math.max(0, total);
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedMetadata = {
        ...metadata,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        price_override: priceOverride,
        original_total: originalTotal,
      };

      const { error } = await supabase
        .from("bookings")
        .update({
          metadata: updatedMetadata,
          total_amount: calculatedTotal,
        })
        .eq("id", booking.id);

      if (error) throw error;
      toast.success("Pricing updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to update pricing: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Pricing — {booking?.booking_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Component Breakdown</p>
            <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
              <span>Outbound Flight:</span><span className="text-right font-medium text-foreground">${flightPrice}</span>
              <span>Return Flight:</span><span className="text-right font-medium text-foreground">${returnFlightPrice}</span>
              <span>Hotel:</span><span className="text-right font-medium text-foreground">${hotelPrice}</span>
              <span>Transfer:</span><span className="text-right font-medium text-foreground">${transferPrice}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="font-semibold text-foreground">Original Total:</span>
              <span className="text-right font-bold text-foreground">${originalTotal}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Price Override (0 = no override)</Label>
              <Input
                type="number"
                min={0}
                value={priceOverride}
                onChange={(e) => setPriceOverride(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                disabled={priceOverride > 0}
              />
            </div>
            <div>
              <Label>Discount Amount ($)</Label>
              <Input
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                disabled={priceOverride > 0}
              />
            </div>
          </div>

          <div className="rounded-lg border-2 border-primary/30 p-3 bg-primary/5">
            <div className="grid grid-cols-2 text-sm">
              <span className="font-semibold text-foreground">Final Total:</span>
              <span className="text-right font-bold text-primary text-lg">${calculatedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
