import { useState, useRef, useEffect } from "react";
import { Plane, Car, Users, Calendar, Clock, Search, MapPin, Baby, Plus, Minus, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as turf from "@turf/turf";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

import { Checkbox } from "@/components/ui/checkbox";

// Helper for nominatim search
const searchLocation = async (query: string) => {
  if (!query) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    const data = await res.json();
    return data;
  } catch (err) {
    return [];
  }
};

const timeOptions = (() => {
  const options = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      const hour = i % 12 || 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      const min = j === 0 ? '00' : '30';
      options.push(`${hour.toString().padStart(2, '0')}:${min} ${ampm}`);
    }
  }
  return options;
})();

interface MapTransferSearchProps {
  onBookTransfer?: (transfer: any) => void;
}

export function MapTransferSearch({ onBookTransfer }: MapTransferSearchProps = {}) {

  // Transfer Search State
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [pickupResults, setPickupResults] = useState<any[]>([]);

  const [dropoff, setDropoff] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [dropoffResults, setDropoffResults] = useState<any[]>([]);

  const [passengers, setPassengers] = useState(1);
  const [passengersOpen, setPassengersOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [returnDate, setReturnDate] = useState<Date>();
  const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [returnTime, setReturnTime] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  const [priceResult, setPriceResult] = useState<any>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (pickup.length > 2 && !pickupCoords) {
        const res = await searchLocation(pickup);
        setPickupResults(res);
      } else {
        setPickupResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [pickup, pickupCoords]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (dropoff.length > 2 && !dropoffCoords) {
        const res = await searchLocation(dropoff);
        setDropoffResults(res);
      } else {
        setDropoffResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [dropoff, dropoffCoords]);

  const selectPickup = (item: any) => {
    setPickup(item.display_name);
    setPickupCoords([parseFloat(item.lon), parseFloat(item.lat)]);
    setPickupResults([]);
  };

  const selectDropoff = (item: any) => {
    setDropoff(item.display_name);
    setDropoffCoords([parseFloat(item.lon), parseFloat(item.lat)]);
    setDropoffResults([]);
  };

  const handleSearch = async () => {
    if (!pickupCoords || !dropoffCoords) {
      toast.error("Please select valid pick-up and drop-off locations from the dropdown");
      return;
    }

    setIsSearching(true);
    setPriceResult(null);

    try {
      // 1. Fetch all zones
      const { data: zones } = await supabase.from("transfer_zones").select("*");
      if (!zones) throw new Error("No zones found");

      // 2. Find matching pickup zone
      const ptPickup = turf.point(pickupCoords);
      let pickupZoneId = null;
      for (const zone of zones) {
        if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
          // turf polygon needs first and last point to be the same
          let coords = [...zone.polygon_coordinates];
          // Leaflet coords are [lat, lng], turf needs [lng, lat]
          let turfCoords = coords.map((c: any[]) => [c[1], c[0]]);
          if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] || turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
            turfCoords.push([...turfCoords[0]]);
          }
          const poly = turf.polygon([turfCoords]);
          if (turf.booleanPointInPolygon(ptPickup, poly)) {
            pickupZoneId = zone.id;
            break;
          }
        }
      }

      // 3. Find matching dropoff zone
      const ptDropoff = turf.point(dropoffCoords);
      let dropoffZoneId = null;
      for (const zone of zones) {
        if (zone.polygon_coordinates && zone.polygon_coordinates.length > 0) {
          let coords = [...zone.polygon_coordinates];
          let turfCoords = coords.map((c: any[]) => [c[1], c[0]]);
          if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] || turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
            turfCoords.push([...turfCoords[0]]);
          }
          const poly = turf.polygon([turfCoords]);
          if (turf.booleanPointInPolygon(ptDropoff, poly)) {
            dropoffZoneId = zone.id;
            break;
          }
        }
      }

      if (!pickupZoneId || !dropoffZoneId) {
        toast.error("Sorry, one of your locations is not in our service zones.");
        setIsSearching(false);
        return;
      }

      // 4. Find price
      const { data: prices } = await supabase
        .from("transfer_zone_prices")
        .select("*")
        .eq("from_zone_id", pickupZoneId)
        .eq("to_zone_id", dropoffZoneId);

      if (prices && prices.length > 0) {
        setPriceResult(prices);
      } else {
        toast.error("No pricing available for this route.");
      }

    } catch (err) {
      console.error(err);
      toast.error("Error searching transfers");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-5xl mx-auto -mt-20 relative z-10"
    >
      <Card className="overflow-visible bg-card/80 backdrop-blur-xl border-border/40 ring-1 ring-border/40 shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.35)] rounded-2xl">
        {/* Gradient header strip */}
        <div className="relative bg-gradient-to-r from-primary/[0.08] via-blue-500/[0.05] to-transparent px-6 py-5 border-b border-border/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center ring-2 ring-primary/20 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
            >
              <CarFront className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground leading-tight">Search Transfers</h3>
              <p className="text-sm text-muted-foreground">Find the perfect transfer for your clients</p>
            </div>
          </div>

          {/* Type Toggle */}
          <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-lg border border-border/50">
            <button
              onClick={() => setShowReturn(false)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                !showReturn ? "bg-white dark:bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              One Way
            </button>
            <button
              onClick={() => setShowReturn(true)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                showReturn ? "bg-white dark:bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Round Trip
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6">
          <div className="flex flex-col gap-5">
            
            {/* Row 1: Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              {/* Pick-Up */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Pick-Up</label>
                <div className="relative">
                  <MapPin className="absolute z-10 left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    value={pickup}
                    onChange={(e) => { setPickup(e.target.value); setPickupCoords(null); }}
                    placeholder="Airport, hotel name..."
                    className="pl-12 h-14 bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-base shadow-sm"
                  />
                </div>
                {pickupResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-card rounded-xl shadow-xl border border-border mt-1 overflow-hidden">
                    {pickupResults.map(res => (
                      <div key={res.place_id} className="p-3 hover:bg-muted cursor-pointer text-sm flex items-start gap-3 border-b border-border/50 last:border-0" onClick={() => selectPickup(res)}>
                        <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <span className="text-foreground font-medium line-clamp-2">{res.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drop-Off */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Drop-Off</label>
                <div className="relative">
                  <MapPin className="absolute z-10 left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    value={dropoff}
                    onChange={(e) => { setDropoff(e.target.value); setDropoffCoords(null); }}
                    placeholder="Airport, hotel name..."
                    className="pl-12 h-14 bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium text-base shadow-sm"
                  />
                </div>
                {dropoffResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-card rounded-xl shadow-xl border border-border mt-1 overflow-hidden">
                    {dropoffResults.map(res => (
                      <div key={res.place_id} className="p-3 hover:bg-muted cursor-pointer text-sm flex items-start gap-3 border-b border-border/50 last:border-0" onClick={() => selectDropoff(res)}>
                        <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <span className="text-foreground font-medium line-clamp-2">{res.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Details */}
            <div className={`grid grid-cols-1 gap-4 items-end ${showReturn ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-4'}`}>
              
              {/* Date */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Date</label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-left font-normal bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl hover:bg-slate-100 hover:border-primary transition-all px-4 shadow-sm"
                    >
                      <Calendar className="mr-3 h-4 w-4 text-primary shrink-0" />
                      {date ? (
                        <span className="flex flex-col leading-tight min-w-0">
                          <span className="font-bold text-foreground text-sm truncate">{format(date, "dd MMM yyyy")}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(d) => {
                        setDate(d);
                        setDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Time</label>
                <Select value={time} onValueChange={setTime}>
                  <SelectTrigger className="w-full h-14 justify-start text-left font-normal bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl hover:bg-slate-100 hover:border-primary transition-all px-4 data-[state=open]:border-primary shadow-sm font-medium">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <SelectValue placeholder="Select time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {timeOptions.map((t) => (
                      <SelectItem key={t} value={t} className="cursor-pointer font-medium">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Return Date (Conditional) */}
              {showReturn && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Return Date</label>
                  <Popover open={returnDateOpen} onOpenChange={setReturnDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-14 justify-start text-left font-normal bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl hover:bg-slate-100 hover:border-primary transition-all px-4 shadow-sm"
                      >
                        <Calendar className="mr-3 h-4 w-4 text-primary shrink-0" />
                        {returnDate ? (
                          <span className="flex flex-col leading-tight min-w-0">
                            <span className="font-bold text-foreground text-sm truncate">{format(returnDate, "dd MMM yyyy")}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-medium">Select date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={returnDate}
                        onSelect={(d) => {
                          setReturnDate(d);
                          setReturnDateOpen(false);
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Return Time (Conditional) */}
              {showReturn && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Return Time</label>
                  <Select value={returnTime} onValueChange={setReturnTime}>
                    <SelectTrigger className="w-full h-14 justify-start text-left font-normal bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl hover:bg-slate-100 hover:border-primary transition-all px-4 data-[state=open]:border-primary shadow-sm font-medium">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <SelectValue placeholder="Select time" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t} className="cursor-pointer font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Passengers */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Passengers</label>
                <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-14 justify-start text-left font-normal bg-slate-50 dark:bg-slate-900 border-border/50 rounded-2xl hover:bg-slate-100 hover:border-primary transition-all gap-3 px-4 shadow-sm"
                    >
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground text-sm">{passengers} passenger{passengers !== 1 ? 's' : ''}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-4 bg-card border border-border shadow-lg rounded-2xl" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">Passengers</h4>
                          <p className="text-xs text-muted-foreground">Number of travelers</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-border/50"
                            onClick={() => setPassengers(Math.max(1, passengers - 1))}
                            disabled={passengers <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-4 text-center font-medium">{passengers}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-border/50"
                            onClick={() => setPassengers(passengers + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full mt-4 rounded-xl" onClick={() => setPassengersOpen(false)}>Apply</Button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search Button */}
              <div className="mt-2 md:mt-0 flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-primary hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg group relative overflow-hidden"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <Search className="h-5 w-5 relative z-10 text-white" />
                  <span className="relative z-10 ml-2 tracking-widest text-white font-bold text-sm">SEARCH</span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      </Card>

      {/* Results Area */}
      {priceResult && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-semibold text-lg mb-4 px-2">Available Vehicles for Your Route</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 px-2">
            {priceResult.map((p: any) => (
              <div key={p.id} className="border border-border/50 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all bg-white flex flex-col items-center">
                <div className="bg-primary/5 w-14 h-14 rounded-full flex items-center justify-center mb-3">
                  <Car className="w-7 h-7 text-primary" />
                </div>
                <span className="font-bold text-lg text-slate-800 mb-1">{p.vehicle_type}</span>
                <span className="text-2xl font-black text-primary mb-4">${p.price}</span>
                <Button 
                  className="w-full rounded-lg bg-slate-900 hover:bg-slate-800"
                  onClick={() => {
                    if (onBookTransfer) {
                      onBookTransfer({
                        id: p.id || "zone-transfer",
                        name: `${p.vehicle_type ? p.vehicle_type.toUpperCase() : "Vehicle"} Transfer`,
                        transfer_type: "city",
                        vehicle_type: p.vehicle_type || "sedan",
                        capacity: p.vehicle_type === 'van' ? 8 : p.vehicle_type === 'bus' ? 30 : 4,
                        price: Number(p.price || 0),
                        route_from: pickup,
                        route_to: dropoff,
                        is_active: true,
                      });
                    }
                  }}
                >
                  Book Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
