import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plane, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useCreateDeparture,
  useUpdateDeparture,
  type PackageDeparture,
} from "@/hooks/usePackageDepartures";
import { useMatchingFlights } from "@/hooks/useMatchingFlights";
import { useSetDepartureFlights, usePackageDepartureFlights } from "@/hooks/usePackageDepartureFlights";
import { FlightLinkingCard, NoFlightsCard } from "@/components/admin/FlightLinkingCard";
import { toast } from "sonner";
import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const departureSchema = z.object({
  departure_date: z.string().min(1, "Departure date is required"),
  return_date: z.string().min(1, "Return date is required"),
  price_per_person: z.coerce.number().min(0, "Price must be positive"),
  total_seats: z.coerce.number().min(1, "At least 1 seat required"),
  available_seats: z.coerce.number().min(0, "Available seats must be 0 or more"),
  is_active: z.boolean().default(true),
});

type DepartureFormValues = z.infer<typeof departureSchema>;

interface PackageDepartureFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  departure?: PackageDeparture | null;
  destinationCity?: string | null;
}

export function PackageDepartureForm({
  open,
  onOpenChange,
  packageId,
  departure,
  destinationCity,
}: PackageDepartureFormProps) {
  const createDeparture = useCreateDeparture();
  const updateDeparture = useUpdateDeparture();
  const setDepartureFlights = useSetDepartureFlights();
  const isEditing = !!departure;

  // Flight selection states
  const [outboundFlightId, setOutboundFlightId] = useState<string | null>(null);
  const [returnFlightId, setReturnFlightId] = useState<string | null>(null);
  const [activeFlightTab, setActiveFlightTab] = useState<"outbound" | "return">("outbound");

  // Watch form values for smart matching
  const [watchDepartureDate, setWatchDepartureDate] = useState<string>("");
  const [watchReturnDate, setWatchReturnDate] = useState<string>("");

  // Fetch matching flights with smart suggestions
  const { data: matchedFlights, isLoading: flightsLoading, refetch: refetchFlights } = useMatchingFlights({
    destinationCity: destinationCity || null,
    departureDate: watchDepartureDate || null,
    returnDate: watchReturnDate || null,
  });

  // Fetch existing flight selections when editing
  const { data: existingFlights = [] } = usePackageDepartureFlights(departure?.id || null);

  const form = useForm<DepartureFormValues>({
    resolver: zodResolver(departureSchema),
    defaultValues: {
      departure_date: "",
      return_date: "",
      price_per_person: 0,
      total_seats: 20,
      available_seats: 20,
      is_active: true,
    },
  });

  // Watch departure and return dates for smart matching
  const departureDate = form.watch("departure_date");
  const returnDate = form.watch("return_date");

  useEffect(() => {
    setWatchDepartureDate(departureDate);
    setWatchReturnDate(returnDate);
  }, [departureDate, returnDate]);

  useEffect(() => {
    if (departure) {
      form.reset({
        departure_date: departure.departure_date,
        return_date: departure.return_date,
        price_per_person: departure.price_per_person,
        total_seats: departure.total_seats,
        available_seats: departure.available_seats,
        is_active: departure.is_active ?? true,
      });
    } else {
      form.reset({
        departure_date: "",
        return_date: "",
        price_per_person: 0,
        total_seats: 20,
        available_seats: 20,
        is_active: true,
      });
      setOutboundFlightId(null);
      setReturnFlightId(null);
    }
  }, [departure, form]);

  // Load existing flight selections when editing
  useEffect(() => {
    if (existingFlights.length > 0) {
      const outbound = existingFlights.find(f => f.flight_type === "outbound");
      const returnFlight = existingFlights.find(f => f.flight_type === "return");
      if (outbound) setOutboundFlightId(outbound.flight_id);
      if (returnFlight) setReturnFlightId(returnFlight.flight_id);
    }
  }, [existingFlights]);

  // Auto-suggest best matching flights when dates change
  useEffect(() => {
    if (!isEditing && matchedFlights) {
      // Only auto-suggest if no selection yet
      if (!outboundFlightId && matchedFlights.outbound.length > 0) {
        const bestOutbound = matchedFlights.outbound[0];
        if (bestOutbound.matchScore >= 100) {
          setOutboundFlightId(bestOutbound.id);
        }
      }
      if (!returnFlightId && matchedFlights.return.length > 0) {
        const bestReturn = matchedFlights.return[0];
        if (bestReturn.matchScore >= 100) {
          setReturnFlightId(bestReturn.id);
        }
      }
    }
  }, [matchedFlights, isEditing, outboundFlightId, returnFlightId]);

  const onSubmit = async (data: DepartureFormValues) => {
    try {
      let departureId = departure?.id;

      if (isEditing && departure) {
        await updateDeparture.mutateAsync({
          id: departure.id,
          departure_date: data.departure_date,
          return_date: data.return_date,
          price_per_person: data.price_per_person,
          total_seats: data.total_seats,
          available_seats: data.available_seats,
          is_active: data.is_active,
        });
        toast.success("Departure updated successfully");
      } else {
        const result = await createDeparture.mutateAsync({
          package_id: packageId,
          departure_date: data.departure_date,
          return_date: data.return_date,
          price_per_person: data.price_per_person,
          total_seats: data.total_seats,
          available_seats: data.available_seats,
          is_active: data.is_active,
        });
        departureId = result.id;
        toast.success("Departure created successfully");
      }

      // Save flight selections
      if (departureId) {
        await setDepartureFlights.mutateAsync({
          departureId,
          outboundFlightId,
          returnFlightId,
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save departure");
    }
  };

  const isLoading = createDeparture.isPending || updateDeparture.isPending || setDepartureFlights.isPending;

  // Get selected flights info
  const selectedOutbound = useMemo(() => 
    matchedFlights?.outbound.find(f => f.id === outboundFlightId),
    [matchedFlights, outboundFlightId]
  );
  const selectedReturn = useMemo(() => 
    matchedFlights?.return.find(f => f.id === returnFlightId),
    [matchedFlights, returnFlightId]
  );

  const outboundCount = matchedFlights?.outbound.length || 0;
  const returnCount = matchedFlights?.return.length || 0;

  const requiredSeats = form.watch("total_seats");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? "Edit Departure" : "Add Departure"}
            {destinationCity && (
              <Badge variant="secondary" className="font-normal">
                {destinationCity}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dates and Pricing Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="departure_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departure Date</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onValueChange={field.onChange} onBlurValue={field.onBlur} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="return_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Date</FormLabel>
                        <FormControl>
                          <DateInput value={field.value} onValueChange={field.onChange} onBlurValue={field.onBlur} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="price_per_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Person ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Seats</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="available_seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Seats</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Flight Linking Section */}
              {destinationCity && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-primary" />
                      <span className="font-medium">Link Flights</span>
                      {(watchDepartureDate || watchReturnDate) && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Sparkles className="h-3 w-3" />
                          Auto-matched
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchFlights()}
                      disabled={flightsLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${flightsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {/* Selected flights summary */}
                  {(selectedOutbound || selectedReturn) && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex-1">
                        {selectedOutbound ? (
                          <span className="font-medium">
                            {selectedOutbound.airline} {selectedOutbound.flight_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No outbound</span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 text-right">
                        {selectedReturn ? (
                          <span className="font-medium">
                            {selectedReturn.airline} {selectedReturn.flight_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No return</span>
                        )}
                      </div>
                    </div>
                  )}

                  <Tabs value={activeFlightTab} onValueChange={(v) => setActiveFlightTab(v as "outbound" | "return")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="outbound" className="gap-2">
                        <Plane className="h-4 w-4" />
                        Outbound ({outboundCount})
                        {outboundFlightId && <Badge className="h-5 w-5 p-0 justify-center">✓</Badge>}
                      </TabsTrigger>
                      <TabsTrigger value="return" className="gap-2">
                        <Plane className="h-4 w-4 rotate-180" />
                        Return ({returnCount})
                        {returnFlightId && <Badge className="h-5 w-5 p-0 justify-center">✓</Badge>}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="outbound" className="mt-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Flights arriving at {destinationCity}
                      </p>
                      {flightsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : matchedFlights?.outbound.length === 0 ? (
                        <NoFlightsCard type="outbound" city={destinationCity} />
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => setOutboundFlightId(null)}
                          >
                            Clear selection
                          </Button>
                          {matchedFlights?.outbound.map((flight) => (
                            <FlightLinkingCard
                              key={flight.id}
                              flight={flight}
                              isSelected={outboundFlightId === flight.id}
                              onSelect={() => setOutboundFlightId(flight.id)}
                              type="outbound"
                              requiredSeats={requiredSeats}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="return" className="mt-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Flights departing from {destinationCity}
                      </p>
                      {flightsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : matchedFlights?.return.length === 0 ? (
                        <NoFlightsCard type="return" city={destinationCity} />
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                            onClick={() => setReturnFlightId(null)}
                          >
                            Clear selection
                          </Button>
                          {matchedFlights?.return.map((flight) => (
                            <FlightLinkingCard
                              key={flight.id}
                              flight={flight}
                              isSelected={returnFlightId === flight.id}
                              onSelect={() => setReturnFlightId(flight.id)}
                              type="return"
                              requiredSeats={requiredSeats}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Available for booking
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-background pb-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="navy" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update Departure" : "Create Departure"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
