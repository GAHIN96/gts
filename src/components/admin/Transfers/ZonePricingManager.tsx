import { useEffect, useState } from "react";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface TransferZone {
  id: string;
  name: string;
}

interface ZonePrice {
  id: string;
  from_zone_id: string;
  to_zone_id: string;
  vehicle_type: string;
  price: number;
}

const VEHICLE_TYPES = ["Sedan", "SUV", "Van", "Bus"];

export function ZonePricingManager() {
  const { data: cities = [] } = useCities();
  const [cityId, setCityId] = useState<string>("");
  const [zones, setZones] = useState<TransferZone[]>([]);
  const [prices, setPrices] = useState<ZonePrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New price form state
  const [fromZone, setFromZone] = useState("");
  const [toZone, setToZone] = useState("");
  const [vehicle, setVehicle] = useState("Sedan");
  const [priceAmt, setPriceAmt] = useState<number | "">("");

  useEffect(() => {
    if (cityId) {
      loadData(cityId);
    } else {
      setZones([]);
      setPrices([]);
    }
  }, [cityId]);

  const loadData = async (cId: string) => {
    setIsLoading(true);
    const { data: zonesData } = await supabase.from("transfer_zones").select("id, name").eq("city_id", cId);
    if (zonesData) setZones(zonesData);

    if (zonesData && zonesData.length > 0) {
      const zoneIds = zonesData.map(z => z.id);
      const { data: pricesData } = await supabase
        .from("transfer_zone_prices")
        .select("*")
        .in("from_zone_id", zoneIds);
      if (pricesData) setPrices(pricesData);
    } else {
      setPrices([]);
    }
    setIsLoading(false);
  };

  const handleAddPrice = async () => {
    if (!fromZone || !toZone || !vehicle || priceAmt === "") return toast.error("Please fill all fields");
    
    setIsLoading(true);
    const { error } = await supabase.from("transfer_zone_prices").insert({
      from_zone_id: fromZone,
      to_zone_id: toZone,
      vehicle_type: vehicle,
      price: priceAmt,
    });

    if (error) {
      toast.error("Failed to add price");
    } else {
      toast.success("Price added");
      loadData(cityId);
    }
    setIsLoading(false);
  };

  const deletePrice = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    setIsLoading(true);
    const { error } = await supabase.from("transfer_zone_prices").delete().eq("id", id);
    if (error) toast.error("Failed to delete price");
    else loadData(cityId);
    setIsLoading(false);
  };

  const getZoneName = (id: string) => zones.find(z => z.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="space-y-1 w-64">
          <label className="text-sm font-medium">Select City</label>
          <Select value={cityId} onValueChange={setCityId}>
            <SelectTrigger><SelectValue placeholder="Choose a city" /></SelectTrigger>
            <SelectContent>
              {cities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cityId && (
        <div className="space-y-6">
          <div className="p-4 border rounded-lg bg-card space-y-4">
            <h3 className="font-semibold">Add Zone Pricing</h3>
            <div className="grid grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs">From Zone</label>
                <Select value={fromZone} onValueChange={setFromZone}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs">To Zone</label>
                <Select value={toZone} onValueChange={setToZone}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs">Vehicle Type</label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs">Price ($)</label>
                <Input type="number" value={priceAmt} onChange={e => setPriceAmt(Number(e.target.value))} placeholder="0.00" />
              </div>
              <Button onClick={handleAddPrice} disabled={isLoading} className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">From Zone</th>
                  <th className="p-3 text-left">To Zone</th>
                  <th className="p-3 text-left">Vehicle Type</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prices.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No prices defined.</td></tr>
                ) : (
                  prices.map(p => (
                    <tr key={p.id}>
                      <td className="p-3">{getZoneName(p.from_zone_id)}</td>
                      <td className="p-3">{getZoneName(p.to_zone_id)}</td>
                      <td className="p-3">{p.vehicle_type}</td>
                      <td className="p-3 font-medium">${p.price}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => deletePrice(p.id)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
