import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plus, X, Plane, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import {
  usePackageDepartures,
  useCreateDeparture,
  useUpdateDeparture,
  useDeleteDeparture,
  type PackageDeparture,
} from "@/hooks/usePackageDepartures";
import { useSetDepartureFlights, usePackageDepartureFlights } from "@/hooks/usePackageDepartureFlights";
import { useMatchingFlights, type MatchedFlight } from "@/hooks/useMatchingFlights";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

interface PackageDeparturesInlineProps {
  packageId: string;
  destinationCity?: string | null;
}

// Flight selector popover component
function FlightSelector({
  flights,
  selectedFlightId,
  onSelect,
  placeholder,
  isLoading,
}: {
  flights: MatchedFlight[];
  selectedFlightId: string | null;
  onSelect: (flightId: string | null, flight: MatchedFlight | null) => void;
  placeholder: string;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = flights.find(f => f.id === selectedFlightId);
  const filtered = flights.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (f.flight_number || "").toLowerCase().includes(s) ||
      f.airline.toLowerCase().includes(s) ||
      f.departure_city.toLowerCase().includes(s) ||
      f.arrival_city.toLowerCase().includes(s)
    );
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-8 text-xs px-1 justify-between font-normal w-full gap-0.5"
          title={selected ? `${selected.airline} ${selected.flight_number || ""} (${selected.departure_city} → ${selected.arrival_city})` : placeholder}
        >
          <span className="truncate">
            {selected ? `${selected.flight_number || selected.airline}` : placeholder}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 z-[9999] pointer-events-auto" align="start" sideOffset={4}>
        <div className="p-2 border-b">
          <Input
            placeholder="Search flights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto p-1">
          {/* Clear option */}
          <button
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-muted-foreground"
            onClick={() => { onSelect(null, null); setOpen(false); }}
          >
            — None —
          </button>

          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading flights...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No flights found</p>
          ) : (
            filtered.map(f => (
              <button
                key={f.id}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 hover:bg-muted",
                  selectedFlightId === f.id && "bg-primary/10"
                )}
                onClick={() => { onSelect(f.id, f); setOpen(false); }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {selectedFlightId === f.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                    <span className="font-medium">{f.airline} {f.flight_number || ""}</span>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {f.departure_city} → {f.arrival_city} · {format(new Date(f.departure_date), "dd/MM/yyyy")}
                    {f.departure_time && ` · ${f.departure_time.slice(0, 5)}`}
                  </div>
                </div>
                {f.matchScore >= 80 && (
                  <Badge variant="secondary" className="text-[9px] px-1 h-4 shrink-0">
                    {f.matchScore === 100 ? "Best" : "Close"}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Individual row that manages its own flight info
function DepartureRow({
  departure,
  packageId,
  onDelete,
  destinationCity,
}: {
  departure: PackageDeparture;
  packageId: string;
  onDelete: (id: string) => void;
  destinationCity?: string | null;
}) {
  const updateDeparture = useUpdateDeparture();
  const setDepartureFlights = useSetDepartureFlights();
  const { data: linkedFlights = [] } = usePackageDepartureFlights(departure.id);

  const initializedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialNights = departure.departure_date && departure.return_date
    ? differenceInDays(new Date(departure.return_date), new Date(departure.departure_date))
    : 0;

  const [row, setRow] = useState({
    departure_date: departure.departure_date,
    departure_time: (departure as any).departure_time || "",
    dept_arr: (departure as any).dept_arr_time || "",
    return_date: departure.return_date,
    return_time: (departure as any).return_time || "",
    ret_arr: (departure as any).ret_arr_time || "",
    total_seats: departure.total_seats,
    available_seats: departure.available_seats,
    booked: departure.total_seats - departure.available_seats,
    alert_level: (departure as any).alert_level || 0,
    fl_number: (departure as any).fl_number || "",
    ret_fl_number: (departure as any).ret_fl_number || "",
    baggage: (departure as any).baggage || "",
    nights: initialNights,
  });

  // Track selected flight IDs
  const [outboundFlightId, setOutboundFlightId] = useState<string | null>(null);
  const [returnFlightId, setReturnFlightId] = useState<string | null>(null);

  // Fetch matching flights for this row's dates
  const { data: matchedFlights, isLoading: flightsLoading } = useMatchingFlights({
    destinationCity: destinationCity || null,
    departureDate: row.departure_date || null,
    returnDate: row.return_date || null,
  });

  // Initialize from linked flights
  useEffect(() => {
    if (linkedFlights.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      const ob = linkedFlights.find((f) => f.flight_type === "outbound");
      const rt = linkedFlights.find((f) => f.flight_type === "return");
      if (ob) setOutboundFlightId(ob.flight_id);
      if (rt) setReturnFlightId(rt.flight_id);
      setRow((prev) => ({
        ...prev,
        departure_time: (departure as any).departure_time || ob?.flights?.departure_time?.slice(0, 5) || prev.departure_time,
        dept_arr: (departure as any).dept_arr_time || ob?.flights?.arrival_time?.slice(0, 5) || prev.dept_arr,
        return_time: (departure as any).return_time || rt?.flights?.departure_time?.slice(0, 5) || prev.return_time,
        ret_arr: (departure as any).ret_arr_time || rt?.flights?.arrival_time?.slice(0, 5) || prev.ret_arr,
        fl_number: (departure as any).fl_number || ob?.flights?.flight_number || prev.fl_number,
        ret_fl_number: (departure as any).ret_fl_number || rt?.flights?.flight_number || prev.ret_fl_number,
      }));
    }
  }, [linkedFlights]);

  const rowRef = useRef(row);
  rowRef.current = row;

  const saveRow = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const r = rowRef.current;
      try {
        await updateDeparture.mutateAsync({
          id: departure.id,
          departure_date: r.departure_date,
          return_date: r.return_date,
          total_seats: r.total_seats,
          available_seats: r.available_seats,
          alert_level: r.alert_level,
          fl_number: r.fl_number || null,
          ret_fl_number: r.ret_fl_number || null,
          baggage: r.baggage || null,
          departure_time: r.departure_time || null,
          dept_arr_time: r.dept_arr || null,
          return_time: r.return_time || null,
          ret_arr_time: r.ret_arr || null,
        } as any);
      } catch {
        toast.error("Failed to update departure");
      }
    }, 1000);
  }, [departure.id, updateDeparture]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateField = (field: string, value: any) => {
    setRow((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "nights" && updated.departure_date) {
        const dep = new Date(updated.departure_date);
        dep.setDate(dep.getDate() + (value || 0));
        updated.return_date = format(dep, "yyyy-MM-dd");
      }
      if (field === "departure_date" && value) {
        const currentNights = prev.nights || 0;
        if (currentNights > 0) {
          const dep = new Date(value);
          dep.setDate(dep.getDate() + currentNights);
          updated.return_date = format(dep, "yyyy-MM-dd");
        }
      }
      return updated;
    });
  };

  const handleBlur = () => {
    saveRow();
  };

  // Handle flight selection
  const handleOutboundSelect = async (flightId: string | null, flight: MatchedFlight | null) => {
    setOutboundFlightId(flightId);
    if (flight) {
      setRow(prev => ({
        ...prev,
        fl_number: flight.flight_number || prev.fl_number,
        departure_time: flight.departure_time?.slice(0, 5) || prev.departure_time,
        dept_arr: flight.arrival_time?.slice(0, 5) || prev.dept_arr,
      }));
    }
    // Save flight link
    try {
      await setDepartureFlights.mutateAsync({
        departureId: departure.id,
        outboundFlightId: flightId,
        returnFlightId,
      });
    } catch { /* ignore */ }
    saveRow();
  };

  const handleReturnSelect = async (flightId: string | null, flight: MatchedFlight | null) => {
    setReturnFlightId(flightId);
    if (flight) {
      setRow(prev => ({
        ...prev,
        ret_fl_number: flight.flight_number || prev.ret_fl_number,
        return_time: flight.departure_time?.slice(0, 5) || prev.return_time,
        ret_arr: flight.arrival_time?.slice(0, 5) || prev.ret_arr,
      }));
    }
    try {
      await setDepartureFlights.mutateAsync({
        departureId: departure.id,
        outboundFlightId,
        returnFlightId: flightId,
      });
    } catch { /* ignore */ }
    saveRow();
  };

  // Filter flights to only show those on the exact date
  const outboundFlights = useMemo(() => {
    const all = matchedFlights?.outbound || [];
    if (!row.departure_date) return all;
    return all.filter(f => f.departure_date === row.departure_date);
  }, [matchedFlights?.outbound, row.departure_date]);

  const returnFlights = useMemo(() => {
    const all = matchedFlights?.return || [];
    if (!row.return_date) return all;
    return all.filter(f => f.departure_date === row.return_date);
  }, [matchedFlights?.return, row.return_date]);

  // Compute available flight dates for calendars
  const outboundFlightDates = useMemo(() => {
    return (matchedFlights?.outbound || []).map(f => new Date(f.departure_date));
  }, [matchedFlights?.outbound]);

  const returnFlightDates = useMemo(() => {
    return (matchedFlights?.return || []).map(f => new Date(f.departure_date));
  }, [matchedFlights?.return]);

  return (
    <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.5fr_1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_1fr_1fr_0.8fr_auto] gap-1 items-center">
      {/* Departure Date with Calendar */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 text-xs px-1 justify-start font-normal w-full">
            {row.departure_date ? format(new Date(row.departure_date), "dd/MM/yyyy") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <AvailabilityCalendar
            mode="single"
            selected={row.departure_date ? new Date(row.departure_date) : undefined}
            onSelect={(date) => {
              if (date) {
                const iso = format(date, "yyyy-MM-dd");
                updateField("departure_date", iso);
                saveRow();
              }
            }}
            availableDates={outboundFlightDates}
            showLegend={false}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          {outboundFlightDates.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center pb-2">
              Green = flights available
            </p>
          )}
        </PopoverContent>
      </Popover>
      <TimeInput
        value={row.departure_time}
        onChange={(e) => updateField("departure_time", e.target.value)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <TimeInput
        value={row.dept_arr}
        onChange={(e) => updateField("dept_arr", e.target.value)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <Input
        type="number"
        min="1"
        value={row.nights}
        onChange={(e) => updateField("nights", parseInt(e.target.value) || 0)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1 text-center"
      />
      {/* Return Date with Calendar */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 text-xs px-1 justify-start font-normal w-full">
            {row.return_date ? format(new Date(row.return_date), "dd/MM/yyyy") : "Pick date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <AvailabilityCalendar
            mode="single"
            disabled={(date) => row.departure_date ? date < new Date(row.departure_date) : false}
            selected={row.return_date ? new Date(row.return_date) : undefined}
            onSelect={(date) => {
              if (date) {
                const iso = format(date, "yyyy-MM-dd");
                updateField("return_date", iso);
                saveRow();
              }
            }}
            availableDates={returnFlightDates}
            showLegend={false}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          {returnFlightDates.length > 0 && (
            <p className="text-[10px] text-muted-foreground text-center pb-2">
              Green = return flights available
            </p>
          )}
        </PopoverContent>
      </Popover>
      <TimeInput
        value={row.return_time}
        onChange={(e) => updateField("return_time", e.target.value)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <TimeInput
        value={row.ret_arr}
        onChange={(e) => updateField("ret_arr", e.target.value)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <Input
        type="number"
        value={row.total_seats}
        onChange={(e) => {
          const val = parseInt(e.target.value) || 0;
          updateField("total_seats", val);
          if (row.available_seats > val) {
            updateField("available_seats", val);
          }
        }}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <Input
        type="number"
        min={0}
        max={row.total_seats}
        value={row.available_seats}
        onChange={(e) => {
          const val = Math.min(parseInt(e.target.value) || 0, row.total_seats);
          updateField("available_seats", val);
        }}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />
      <Input
        value={row.booked}
        readOnly
        className="h-8 text-xs px-1 bg-muted text-center"
      />
      <Input
        type="number"
        value={row.alert_level}
        onChange={(e) => updateField("alert_level", parseInt(e.target.value) || 0)}
        onBlur={handleBlur}
        className="h-8 text-xs px-1"
      />

      {/* Flight selectors */}
      {destinationCity ? (
        <FlightSelector
          flights={outboundFlights}
          selectedFlightId={outboundFlightId}
          onSelect={handleOutboundSelect}
          placeholder="FL #"
          isLoading={flightsLoading}
        />
      ) : (
        <Input
          value={row.fl_number}
          onChange={(e) => updateField("fl_number", e.target.value)}
          onBlur={handleBlur}
          placeholder="FL #"
          className="h-8 text-xs px-1"
        />
      )}
      {destinationCity ? (
        <FlightSelector
          flights={returnFlights}
          selectedFlightId={returnFlightId}
          onSelect={handleReturnSelect}
          placeholder="RET. FL #"
          isLoading={flightsLoading}
        />
      ) : (
        <Input
          value={row.ret_fl_number}
          onChange={(e) => updateField("ret_fl_number", e.target.value)}
          onBlur={handleBlur}
          placeholder="RET. FL #"
          className="h-8 text-xs px-1"
        />
      )}

      <Input
        value={row.baggage}
        onChange={(e) => updateField("baggage", e.target.value)}
        onBlur={handleBlur}
        placeholder="Baggage"
        className="h-8 text-xs px-1"
      />
      <ConfirmDelete itemName="this departure" onConfirm={() => onDelete(departure.id)}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </ConfirmDelete>
    </div>
  );
}

export function PackageDeparturesInline({ packageId, destinationCity }: PackageDeparturesInlineProps) {
  const { data: departures, isLoading } = usePackageDepartures(packageId);
  const createDeparture = useCreateDeparture();
  const deleteDeparture = useDeleteDeparture();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    try {
      await createDeparture.mutateAsync({
        package_id: packageId,
        departure_date: new Date().toISOString().split("T")[0],
        return_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        price_per_person: 0,
        total_seats: 20,
        available_seats: 20,
        is_active: true,
      });
      toast.success("Departure added");
    } catch {
      toast.error("Failed to add departure");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeparture.mutateAsync({ id: deleteId, packageId });
      toast.success("Departure deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete departure");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-primary uppercase tracking-wide">Departures</h3>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.5fr_1fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_1fr_1fr_0.8fr_auto] gap-1 items-center">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Departure Date</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Time</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Dept Arr.</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Nights</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Return Date</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Time</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Ret. Arr.</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Seats</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Avail. Seats</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Booked</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Alert Lvl</span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <Plane className="h-3 w-3" /> FL #
          </span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
            <Plane className="h-3 w-3 rotate-180" /> Ret. FL #
          </span>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Baggage</span>
          <span className="w-8" />
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-4 text-sm">Loading...</p>
          ) : departures?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No departures yet.
            </p>
          ) : (
            departures?.map((dep) => (
              <DepartureRow
                key={dep.id}
                departure={dep}
                packageId={packageId}
                onDelete={setDeleteId}
                destinationCity={destinationCity}
              />
            ))
          )}
        </div>

        {/* Add button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={createDeparture.isPending}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Departure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this departure date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
