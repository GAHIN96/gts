import { useState, useEffect } from "react";
import { Plus, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFlightPriceTiers, useSaveFlightPriceTiers } from "@/hooks/useFlightPriceTiers";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface TierRow {
  min_passengers: number;
  max_passengers: number;
  price_per_seat: number;
}

interface FlightPriceTiersEditorProps {
  flightId: string;
  basePrice: number;
}

export function FlightPriceTiersEditor({ flightId, basePrice }: FlightPriceTiersEditorProps) {
  const { data: savedTiers, isLoading } = useFlightPriceTiers(flightId);
  const saveTiers = useSaveFlightPriceTiers();
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedTiers && savedTiers.length > 0) {
      setTiers(
        savedTiers.map((t) => ({
          min_passengers: t.min_passengers,
          max_passengers: t.max_passengers,
          price_per_seat: t.price_per_seat,
        }))
      );
    }
  }, [savedTiers]);

  const addTier = () => {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].max_passengers : 0;
    setTiers([
      ...tiers,
      {
        min_passengers: lastMax + 1,
        max_passengers: lastMax + 10,
        price_per_seat: basePrice,
      },
    ]);
    setDirty(true);
  };

  const updateTier = (index: number, field: keyof TierRow, value: number) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
    setDirty(true);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].min_passengers > tiers[i].max_passengers) {
        toast.error(`Tier ${i + 1}: Min must be ≤ Max`);
        return;
      }
      if (tiers[i].price_per_seat <= 0) {
        toast.error(`Tier ${i + 1}: Price must be positive`);
        return;
      }
    }

    try {
      await saveTiers.mutateAsync({ flightId, tiers });
      toast.success("Price tiers saved successfully");
      setDirty(false);
    } catch {
      toast.error("Failed to save price tiers");
    }
  };

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Quantity-Based Pricing Tiers
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Set different prices based on how many passengers are booked. Base price: <strong>${basePrice}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tiers.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No tiers set — all bookings use the base price (${basePrice}/seat).
          </p>
        )}

        {tiers.map((tier, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Min Pax</Label>
              <Input
                type="number"
                min={1}
                value={tier.min_passengers}
                onChange={(e) => updateTier(index, "min_passengers", parseInt(e.target.value) || 1)}
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Max Pax</Label>
              <Input
                type="number"
                min={tier.min_passengers}
                value={tier.max_passengers}
                onChange={(e) => updateTier(index, "max_passengers", parseInt(e.target.value) || 1)}
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Price/Seat ($)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={tier.price_per_seat}
                onChange={(e) => updateTier(index, "price_per_seat", parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeTier(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Tier
          </Button>
          {dirty && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saveTiers.isPending}
              className="gap-1"
            >
              {saveTiers.isPending ? "Saving..." : "Save Tiers"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
