import { useState, useEffect } from "react";
import { Settings2, MapPin, Plane, Building, Percent, DollarSign, Save, ToggleLeft, ToggleRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCities } from "@/hooks/useCities";
import { useFlights } from "@/hooks/useFlights";
import { useHotels } from "@/hooks/useHotels";
import { useCustomGroupSettings, type CustomGroupConfig } from "@/hooks/useCustomGroupSettings";

export function CustomGroupSettingsPanel() {
  const { config, isLoading, saveConfig, isSaving } = useCustomGroupSettings();
  const { data: cities } = useCities();
  const { data: flights } = useFlights();
  const { data: hotels } = useHotels();

  const [local, setLocal] = useState<CustomGroupConfig>(config);

  useEffect(() => {
    if (config) setLocal(config);
  }, [config]);

  const toggleCity = (id: string) => {
    setLocal(prev => ({
      ...prev,
      allowed_city_ids: prev.allowed_city_ids.includes(id)
        ? prev.allowed_city_ids.filter(x => x !== id)
        : [...prev.allowed_city_ids, id],
    }));
  };

  const toggleFlight = (id: string) => {
    setLocal(prev => ({
      ...prev,
      allowed_flight_ids: prev.allowed_flight_ids.includes(id)
        ? prev.allowed_flight_ids.filter(x => x !== id)
        : [...prev.allowed_flight_ids, id],
    }));
  };

  const toggleHotel = (id: string) => {
    setLocal(prev => ({
      ...prev,
      allowed_hotel_ids: prev.allowed_hotel_ids.includes(id)
        ? prev.allowed_hotel_ids.filter(x => x !== id)
        : [...prev.allowed_hotel_ids, id],
    }));
  };

  const activeFlights = (flights || []).filter(f => f.is_active);
  const activeHotels = (hotels || []).filter(h => h.is_active);
  const activeCities = (cities || []).filter(c => c.is_active);

  // Get city names for selected flight cities for better grouping
  const selectedCityNames = local.allowed_city_ids.map(id => activeCities.find(c => c.id === id)?.name || "").filter(Boolean);
  
  // Filter flights relevant to selected cities
  const relevantFlights = activeFlights.filter(f => {
    if (local.allowed_city_ids.length === 0) return true;
    return selectedCityNames.some(name =>
      f.departure_city?.toLowerCase().includes(name.toLowerCase()) ||
      f.arrival_city?.toLowerCase().includes(name.toLowerCase())
    );
  });

  // Filter hotels relevant to selected cities
  const relevantHotels = activeHotels.filter(h => {
    if (local.allowed_city_ids.length === 0) return true;
    return local.allowed_city_ids.includes(h.city_id || "");
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Custom Group Builder Settings</h2>
            <p className="text-sm text-muted-foreground">Configure what agencies see in the Build Your Own Group wizard</p>
          </div>
        </div>
        <Button onClick={() => saveConfig(local)} disabled={isSaving} className="gap-2 rounded-xl shadow-md shadow-primary/20">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {/* Enable Toggle */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {local.is_enabled ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="font-semibold text-foreground">Builder Enabled</p>
              <p className="text-xs text-muted-foreground">When disabled, agencies cannot access Build Your Own Group</p>
            </div>
          </div>
          <Switch checked={local.is_enabled} onCheckedChange={(v) => setLocal(prev => ({ ...prev, is_enabled: v }))} />
        </CardContent>
      </Card>

      {/* Destinations */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Allowed Destinations
            {local.allowed_city_ids.length > 0 && (
              <Badge variant="secondary" className="text-xs">{local.allowed_city_ids.length} selected</Badge>
            )}
          </CardTitle>
          <CardDescription>Select which destination cities appear in the wizard. Leave empty to show all.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
            {activeCities.map(c => {
              const selected = local.allowed_city_ids.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCity(c.id)}
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200 flex items-center gap-1.5",
                    selected
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/20 hover:bg-muted/50"
                  )}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {c.name}
                  <span className="text-[10px] opacity-60">{c.country}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Flights */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4 text-primary" />
            Allowed Flights
            {local.allowed_flight_ids.length > 0 && (
              <Badge variant="secondary" className="text-xs">{local.allowed_flight_ids.length} selected</Badge>
            )}
          </CardTitle>
          <CardDescription>Select which flights agencies can choose. Leave empty to show all matching flights.</CardDescription>
        </CardHeader>
        <CardContent>
          {relevantFlights.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {local.allowed_city_ids.length > 0 ? "No flights found for selected destinations" : "No active flights available"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {relevantFlights.map(f => {
                const selected = local.allowed_flight_ids.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFlight(f.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all duration-200",
                      selected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border/40 hover:border-primary/20 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {selected ? <Check className="h-3.5 w-3.5" /> : <Plane className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {f.airline} {f.flight_number && `• ${f.flight_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {f.departure_city} → {f.arrival_city} • {f.departure_date}
                          {f.schedule_type === 'recurring' && ' (Recurring)'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold", selected ? "text-primary" : "text-foreground")}>${f.price}</p>
                      <p className="text-[10px] text-muted-foreground">{f.available_seats} seats</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hotels */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="h-4 w-4 text-primary" />
            Allowed Hotels
            {local.allowed_hotel_ids.length > 0 && (
              <Badge variant="secondary" className="text-xs">{local.allowed_hotel_ids.length} selected</Badge>
            )}
          </CardTitle>
          <CardDescription>Select which hotels agencies can book. Leave empty to show all hotels in the destination.</CardDescription>
        </CardHeader>
        <CardContent>
          {relevantHotels.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {local.allowed_city_ids.length > 0 ? "No hotels found in selected destinations" : "No active hotels available"}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {relevantHotels.map(h => {
                const selected = local.allowed_hotel_ids.includes(h.id);
                const cityName = activeCities.find(c => c.id === h.city_id)?.name;
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHotel(h.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all duration-200",
                      selected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border/40 hover:border-primary/20 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center",
                        selected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {selected ? <Check className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cityName || "—"} • {"★".repeat(h.star_rating || 3)}
                        </p>
                      </div>
                    </div>
                    <p className={cn("font-bold", selected ? "text-primary" : "text-foreground")}>${h.price_per_night}/night</p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discount Settings */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-primary" />
            Discount Settings
          </CardTitle>
          <CardDescription>Set a global discount applied to all custom group bookings. Use either percentage or fixed amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                Discount Percentage
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={local.discount_percent}
                  onChange={(e) => setLocal(prev => ({ ...prev, discount_percent: Number(e.target.value) || 0 }))}
                  className="rounded-xl pr-8"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                Fixed Discount Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  value={local.discount_fixed}
                  onChange={(e) => setLocal(prev => ({ ...prev, discount_fixed: Number(e.target.value) || 0 }))}
                  className="rounded-xl pl-7"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          {(local.discount_percent > 0 || local.discount_fixed > 0) && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-primary font-medium">
                Active discount: {local.discount_percent > 0 ? `${local.discount_percent}% off` : ""}
                {local.discount_percent > 0 && local.discount_fixed > 0 ? " + " : ""}
                {local.discount_fixed > 0 ? `$${local.discount_fixed} off` : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
