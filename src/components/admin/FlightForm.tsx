import { useState, useRef, useEffect, useCallback } from "react";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, X, Plus, Trash2, Plane, DollarSign, Calendar, RotateCcw, Copy } from "lucide-react";
import { SectionJumpNav } from "@/components/admin/SectionJumpNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { useFlightDefaultFares, useFlightSpecialFares, useSaveFlightDefaultFares, useSaveFlightSpecialFares } from "@/hooks/useFlightFares";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateFlight, useUpdateFlight, type Flight } from "@/hooks/useFlights";
import { useAirlines } from "@/hooks/useAirlines";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FlightPriceTiersEditor } from "./FlightPriceTiersEditor";

type DefaultFareRow = { person_type: string; seat_from: number; seat_to: number; rate: number; commission: number };
type SpecialFareRow = { from_date: string; to_date: string; person_type: string; seat_from: number; seat_to: number; rate: number; commission: number };

const flightSchema = z.object({
  airline: z.string().min(1, "Required"),
  flight_number: z.string().optional(),
  description: z.string().optional(),
  departure_city: z.string().min(1, "Required"),
  arrival_city: z.string().min(1, "Required"),
  departure_airport_code: z.string().optional(),
  arrival_airport_code: z.string().optional(),
  departure_date: z.string().default(""),
  arrival_date: z.string().default(""),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  available_seats: z.coerce.number().min(0).default(100),
  total_seats: z.coerce.number().min(1).default(100),
  class: z.string().default("economy"),
  is_active: z.boolean().default(true),
  trip_type: z.string().default("one_way"),
  passport_required: z.boolean().default(false),
  photo_required: z.boolean().default(false),
  id_scan_required: z.boolean().default(false),
  id_backside_required: z.boolean().default(false),
  visa_amount: z.coerce.number().default(0),
  currency: z.string().default("USD"),
  is_featured: z.boolean().default(false),
  flight_policy: z.string().optional(),
  ops_email: z.string().optional(),
  order_number: z.string().optional(),
});

type FlightFormValues = z.infer<typeof flightSchema>;

interface FlightFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight?: Flight | null;
  inline?: boolean;
}

export function FlightForm({ open, onOpenChange, flight, inline = false }: FlightFormProps) {
  const sidebarOffset = useSidebarOffset();
  const createFlight = useCreateFlight();
  const updateFlight = useUpdateFlight();
  const isEditing = !!flight;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { airlines } = useAirlines();
  const { data: cities = [] } = useCities();

  // Fares state
  const { data: savedDefaultFares } = useFlightDefaultFares(flight?.id || null);
  const { data: savedSpecialFares } = useFlightSpecialFares(flight?.id || null);
  const saveDefaultFares = useSaveFlightDefaultFares();
  const saveSpecialFares = useSaveFlightSpecialFares();
  const [defaultFares, setDefaultFares] = useState<DefaultFareRow[]>([]);
  const [specialFares, setSpecialFares] = useState<SpecialFareRow[]>([]);
  const [faresDirty, setFaresDirty] = useState(false);
  const [specialDirty, setSpecialDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; index: number } | null>(null);

  const [departures, setDepartures] = useState<Array<{
    departure_date: string; departure_time: string; dept_arr_time: string;
    return_date: string; ret_dep_time: string; ret_arr_time: string;
    total_seats: number; available_seats: number; booked: number; alert_level: number;
    flight_number: string; ret_flight_number: string;
    duration: string; baggage: string; is_active: boolean;
  }>>([]);

  const form = useForm<FlightFormValues>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      airline: "", flight_number: "", description: "",
      departure_city: "", arrival_city: "",
      departure_airport_code: "", arrival_airport_code: "",
      departure_date: "", arrival_date: "",
      departure_time: "", arrival_time: "",
      price: 0, available_seats: 100, total_seats: 100,
      class: "economy", is_active: true, trip_type: "one_way",
      passport_required: false, photo_required: false,
      id_scan_required: false, id_backside_required: false,
      visa_amount: 0, currency: "USD", is_featured: false,
      flight_policy: "", ops_email: "", order_number: "",
    },
  });

  useEffect(() => {
    const fa = flight as any;
    if (flight) {
      form.reset({
        airline: flight.airline || "", flight_number: flight.flight_number || "",
        description: fa?.description || "",
        departure_city: flight.departure_city || "", arrival_city: flight.arrival_city || "",
        departure_airport_code: fa?.departure_airport_code || "",
        arrival_airport_code: fa?.arrival_airport_code || "",
        departure_date: flight.departure_date || "", arrival_date: flight.arrival_date || "",
        departure_time: flight.departure_time || "", arrival_time: flight.arrival_time || "",
        price: flight.price || 0, available_seats: flight.available_seats ?? 100,
        total_seats: fa?.total_seats ?? 100, class: flight.class || "economy",
        is_active: flight.is_active ?? true, trip_type: fa?.trip_type || "one_way",
        passport_required: fa?.passport_required ?? false, photo_required: fa?.photo_required ?? false,
        id_scan_required: fa?.id_scan_required ?? false, id_backside_required: fa?.id_backside_required ?? false,
        visa_amount: fa?.visa_amount ?? 0, currency: fa?.currency || "USD",
        is_featured: fa?.is_featured ?? false, flight_policy: fa?.flight_policy || "",
        ops_email: fa?.ops_email || "", order_number: fa?.order_number || "",
      });
      setCoverPhoto(fa?.cover_photo_url || null);

      // Fetch real booked count from bookings table
      const fetchBooked = async () => {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("passengers")
          .eq("flight_id", flight.id)
          .in("status", ["confirmed", "pending_payment", "payment_under_review"]);
        const bookedCount = (bookings || []).reduce((sum, b) => sum + (b.passengers || 0), 0);
        const totalSeats = fa?.total_seats ?? 100;
        const availSeats = Math.max(0, totalSeats - bookedCount);
        setDepartures([{
          departure_date: flight.departure_date || "", departure_time: flight.departure_time || "",
          dept_arr_time: flight.arrival_time || "", return_date: flight.arrival_date || "",
          ret_dep_time: "", ret_arr_time: "", total_seats: totalSeats,
          available_seats: availSeats,
          booked: bookedCount, alert_level: 0, flight_number: "",
          ret_flight_number: "", duration: "", baggage: "", is_active: flight.is_active ?? true,
        }]);
      };
      fetchBooked();
    } else {
      form.reset(); setCoverPhoto(null); setDepartures([]);
    }
    setActiveTab("general");
  }, [flight, form]);

  useEffect(() => {
    if (savedDefaultFares && savedDefaultFares.length > 0) {
      setDefaultFares(savedDefaultFares.map(f => ({ person_type: f.person_type, seat_from: f.seat_from, seat_to: f.seat_to, rate: f.rate, commission: f.commission })));
    } else { setDefaultFares([]); }
    setFaresDirty(false);
  }, [savedDefaultFares]);
  useEffect(() => {
    if (savedSpecialFares && savedSpecialFares.length > 0) {
      setSpecialFares(savedSpecialFares.map(f => ({ from_date: f.from_date, to_date: f.to_date, person_type: f.person_type, seat_from: f.seat_from, seat_to: f.seat_to, rate: f.rate, commission: f.commission })));
    } else { setSpecialFares([]); }
    setSpecialDirty(false);
  }, [savedSpecialFares]);
  const addDefaultFare = () => { setDefaultFares(p => {
    if (p.length === 0) {
      return [
        { person_type: "Adult", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
        { person_type: "Child", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
        { person_type: "Infant", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
      ];
    }
    return [...p, { person_type: "", seat_from: 1, seat_to: 20, rate: 0, commission: 0 }];
  }); setFaresDirty(true); };
  const updateDefaultFare = (i: number, field: string, value: any) => { setDefaultFares(p => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r)); setFaresDirty(true); };
  const removeDefaultFare = (i: number) => { setDefaultFares(p => p.filter((_, idx) => idx !== i)); setFaresDirty(true); };
  const duplicateDefaultFare = (i: number) => { setDefaultFares(p => { const src = p[i]; const range = src.seat_to - src.seat_from + 1; const maxTo = Math.max(...p.map(f => f.seat_to)); return [...p, { ...src, seat_from: maxTo + 1, seat_to: maxTo + range }]; }); setFaresDirty(true); };
  const addSpecialFare = () => { setSpecialFares(p => {
    if (p.length === 0) {
      return [
        { from_date: "", to_date: "", person_type: "Adult", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
        { from_date: "", to_date: "", person_type: "Child", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
        { from_date: "", to_date: "", person_type: "Infant", seat_from: 1, seat_to: 20, rate: 0, commission: 0 },
      ];
    }
    return [...p, { from_date: "", to_date: "", person_type: "", seat_from: 1, seat_to: 20, rate: 0, commission: 0 }];
  }); setSpecialDirty(true); };
  const updateSpecialFare = (i: number, field: string, value: any) => { setSpecialFares(p => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r)); setSpecialDirty(true); };
  const removeSpecialFare = (i: number) => { setSpecialFares(p => p.filter((_, idx) => idx !== i)); setSpecialDirty(true); };
  const duplicateSpecialFare = (i: number) => { setSpecialFares(p => { const src = p[i]; const range = src.seat_to - src.seat_from + 1; const maxTo = Math.max(...p.map(f => f.seat_to)); return [...p, { ...src, seat_from: maxTo + 1, seat_to: maxTo + range }]; }); setSpecialDirty(true); };
  const handleSaveDefaultFares = async () => {
    if (!flight?.id) return;
    try { await saveDefaultFares.mutateAsync({ flightId: flight.id, fares: defaultFares }); setFaresDirty(false); toast.success("Default fares saved"); } catch { toast.error("Failed to save"); }
  };
  const handleSaveSpecialFares = async () => {
    if (!flight?.id) return;
    try { await saveSpecialFares.mutateAsync({ flightId: flight.id, fares: specialFares }); setSpecialDirty(false); toast.success("Special fares saved"); } catch (err: any) { toast.error(err?.message || "Failed to save special fares"); }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `covers/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("airline-logos").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("airline-logos").getPublicUrl(fileName);
      setCoverPhoto(publicUrl);
    } catch { toast.error("Upload failed"); }
    finally { setIsUploading(false); }
  };

  const addDeparture = () => {
    setDepartures(prev => [...prev, {
      departure_date: "", departure_time: "", dept_arr_time: "",
      return_date: "", ret_dep_time: "", ret_arr_time: "",
      total_seats: 20, available_seats: 20, booked: 0, alert_level: 0,
      flight_number: "", ret_flight_number: "",
      duration: "", baggage: "", is_active: true,
    }]);
  };

  const updateDeparture = (idx: number, field: string, value: any) => {
    setDepartures(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));

    if (idx !== 0) return;

    if (field === "departure_date") {
      form.setValue("departure_date", value || "", { shouldDirty: true });
    }
    if (field === "return_date") {
      form.setValue("arrival_date", value || "", { shouldDirty: true });
    }
    if (field === "departure_time") {
      form.setValue("departure_time", value || "", { shouldDirty: true });
    }
    if (field === "dept_arr_time") {
      form.setValue("arrival_time", value || "", { shouldDirty: true });
    }
    if (field === "total_seats") {
      form.setValue("total_seats", Number(value) || 0, { shouldDirty: true });
    }
    if (field === "available_seats") {
      form.setValue("available_seats", Number(value) || 0, { shouldDirty: true });
    }
  };

  const removeDeparture = (idx: number) => {
    setDepartures(prev => prev.filter((_, i) => i !== idx));
  };

  const duplicateDeparture = (idx: number) => {
    setDepartures(prev => [...prev, { ...prev[idx], departure_date: "", return_date: "" }]);
  };

  const onInvalid = () => {
    setActiveTab("general");
    toast.error("Please fill all required flight fields before saving");
  };

  const onSubmit = async (data: FlightFormValues) => {
    try {
      const dep = departures[0];
      const departureDate = dep?.departure_date || data.departure_date;
      const arrivalDate = dep?.return_date || data.arrival_date;

      if (!departureDate || !arrivalDate) {
        setActiveTab("departures");
        toast.error("Please complete the dates in the Departures tab before saving");
        return;
      }

      const flightData: any = {
        airline: data.airline,
        flight_number: data.flight_number || dep?.flight_number || null,
        description: data.description || null,
        departure_city: data.departure_city,
        arrival_city: data.arrival_city,
        departure_airport_code: data.departure_airport_code || null,
        arrival_airport_code: data.arrival_airport_code || null,
        departure_date: departureDate,
        arrival_date: arrivalDate,
        departure_time: dep?.departure_time || data.departure_time || null,
        arrival_time: dep?.dept_arr_time || data.arrival_time || null,
        price: data.price,
        available_seats: dep?.available_seats ?? data.available_seats,
        total_seats: dep?.total_seats ?? data.total_seats,
        class: data.class,
        is_active: dep?.is_active ?? data.is_active,
        airline_logo: null,
        trip_type: data.trip_type,
        cover_photo_url: coverPhoto,
        passport_required: data.passport_required,
        photo_required: data.photo_required,
        id_scan_required: data.id_scan_required,
        id_backside_required: data.id_backside_required,
        visa_amount: data.visa_amount,
        currency: data.currency,
        is_featured: data.is_featured,
        flight_policy: data.flight_policy || null,
        ops_email: data.ops_email || null,
        order_number: data.order_number || null,
      };

      const selectedAirline = airlines.find(a => a.name === data.airline);
      if (selectedAirline?.logo_url) flightData.airline_logo = selectedAirline.logo_url;

      if (isEditing && flight) {
        await updateFlight.mutateAsync({ id: flight.id, ...flightData });

        if (faresDirty) {
          await saveDefaultFares.mutateAsync({ flightId: flight.id, fares: defaultFares });
          setFaresDirty(false);
        }
        if (specialDirty) {
          await saveSpecialFares.mutateAsync({ flightId: flight.id, fares: specialFares });
          setSpecialDirty(false);
        }

        toast.success(faresDirty || specialDirty ? "Flight and fares saved" : "Flight updated");
      } else {
        const newFlight = await createFlight.mutateAsync(flightData);
        const newId = (newFlight as any)?.id;

        if (newId) {
          if (defaultFares.length > 0) {
            await saveDefaultFares.mutateAsync({ flightId: newId, fares: defaultFares });
            setFaresDirty(false);
          }
          if (specialFares.length > 0) {
            await saveSpecialFares.mutateAsync({ flightId: newId, fares: specialFares });
            setSpecialDirty(false);
          }
        }

        toast.success("Flight created" + (defaultFares.length > 0 || specialFares.length > 0 ? " with fares" : ""));
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save flight");
    }
  };

  const isLoading = createFlight.isPending || updateFlight.isPending;
  const tabClass = "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3";
  const watchActive = form.watch("is_active");
  const flightName = form.watch("flight_number") || form.watch("description");

  const formContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? flightName || "Edit Flight" : "New Flight"}
          </h2>
          {isEditing && (
            <Badge variant={watchActive ? "default" : "secondary"} className="ml-2 text-[10px]">
              {watchActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-muted">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="bg-transparent h-12 gap-6 p-0">
            <TabsTrigger value="general" className={tabClass}>General</TabsTrigger>
            <TabsTrigger value="departures" className={tabClass}>
              Departures {departures.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{departures.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="default-fares" className={tabClass}>Default Fares</TabsTrigger>
            <TabsTrigger value="special-fares" className={tabClass}>Special Fares</TabsTrigger>
          </TabsList>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex gap-0 items-start">
            <div className="flex-1 min-w-0">
          {/* ===== GENERAL TAB ===== */}
          <TabsContent value="general" className="mt-0 space-y-6">
            {/* Flight Info Section */}
            <div id="flight-info" data-jump-section="Flight Info" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Flight Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Flight Name</Label>
                  <Input {...form.register("flight_number")} placeholder="EBL TBS EBL" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Description</Label>
                  <Input {...form.register("description")} placeholder="Charter Flight" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Airline</Label>
                  <Select value={form.watch("airline")} onValueChange={v => form.setValue("airline", v)}>
                    <SelectTrigger><SelectValue placeholder="Select airline" /></SelectTrigger>
                    <SelectContent>
                      {airlines.map(a => (
                        <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">From</Label>
                  <Select value={form.watch("departure_city")} onValueChange={v => form.setValue("departure_city", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">To</Label>
                  <Select value={form.watch("arrival_city")} onValueChange={v => form.setValue("arrival_city", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Flight Type</Label>
                  <Select value={form.watch("trip_type")} onValueChange={v => form.setValue("trip_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">One Way</SelectItem>
                      <SelectItem value="round_trip">Round Trip</SelectItem>
                      <SelectItem value="multi_city">Multi City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Operations Section */}
            <div id="flight-operations" data-jump-section="Operations" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Operations</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Ops Email</Label>
                  <Input {...form.register("ops_email")} placeholder="ops@company.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Order #</Label>
                  <Input {...form.register("order_number")} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Visa Amount</Label>
                  <Input type="number" {...form.register("visa_amount", { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Document Requirements Section */}
            <div id="flight-docs" data-jump-section="Documents" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Document Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">Passport Scan</Label>
                    <p className="text-xs text-muted-foreground">Require passport scan upload</p>
                  </div>
                  <Switch checked={form.watch("passport_required")} onCheckedChange={v => form.setValue("passport_required", v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">Photo Scan</Label>
                    <p className="text-xs text-muted-foreground">Require photo upload</p>
                  </div>
                  <Switch checked={form.watch("photo_required")} onCheckedChange={v => form.setValue("photo_required", v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">ID Scan</Label>
                    <p className="text-xs text-muted-foreground">Require ID front scan</p>
                  </div>
                  <Switch checked={form.watch("id_scan_required")} onCheckedChange={v => form.setValue("id_scan_required", v)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                  <div>
                    <Label className="font-semibold text-sm">ID Backside</Label>
                    <p className="text-xs text-muted-foreground">Require ID back scan</p>
                  </div>
                  <Switch checked={form.watch("id_backside_required")} onCheckedChange={v => form.setValue("id_backside_required", v)} />
                </div>
              </div>
            </div>

            {/* Classification Section */}
            <div id="flight-classification" data-jump-section="Classification" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Classification & Settings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Flight Class</Label>
                  <Select value={form.watch("class")} onValueChange={v => form.setValue("class", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">Economy</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="first">First Class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Currency</Label>
                  <Select value={form.watch("currency")} onValueChange={v => form.setValue("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="IQD">Dinar</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="TRY">TRY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">Cover Photo</Label>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Choose File"}
                    </Button>
                    {coverPhoto ? (
                      <div className="flex items-center gap-2">
                        <img src={coverPhoto} alt="" className="h-8 w-8 rounded object-cover" />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCoverPhoto(null)} className="text-destructive h-8 px-2">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No file</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-sm">Status</Label>
                    <p className="text-xs text-muted-foreground">Flight is {watchActive ? "visible" : "hidden"}</p>
                  </div>
                  <Switch checked={watchActive} onCheckedChange={v => form.setValue("is_active", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-sm">Featured</Label>
                    <p className="text-xs text-muted-foreground">Show in featured section</p>
                  </div>
                  <Switch checked={form.watch("is_featured")} onCheckedChange={v => form.setValue("is_featured", v)} />
                </div>
              </div>
            </div>

            {/* Policy */}
            <div id="flight-policy" data-jump-section="Policy" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Policy</h3>
              <Textarea {...form.register("flight_policy")} placeholder="Non-refundable & Non-changeable" className="min-h-[80px]" />
            </div>
          </TabsContent>

          {/* ===== DEPARTURES TAB ===== */}
          <TabsContent value="departures" className="mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-primary font-medium text-sm">Departures</h3>
              <Button type="button" variant="outline" size="sm" onClick={addDeparture} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Departure
              </Button>
            </div>

            {departures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No departures configured</p>
                <p className="text-xs text-muted-foreground">Click "Add Departure" above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <div className="min-w-[1500px]">
                  <div className="grid grid-cols-[120px_80px_80px_120px_80px_80px_80px_100px_70px_80px_100px_100px_80px_80px_60px_32px_32px] gap-2 p-2 bg-muted/50">
                    {["Departure Date", "Dept. Time", "Dept Arr.", "Return Date", "Ret. Dep.", "Ret. Arr.", "Total Seats", "Avail. Seats", "Booked", "Alert", "Flight #", "Ret. FL #", "Duration", "Baggage", "Active", "", ""].map((h, i) => (
                      <Label key={`${h}-${i}`} className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wide">{h}</Label>
                    ))}
                  </div>
                  {departures.map((dep, idx) => (
                    <div key={idx} className={`grid grid-cols-[120px_80px_80px_120px_80px_80px_80px_100px_70px_80px_100px_100px_80px_80px_60px_32px_32px] gap-2 p-2 items-center border-t ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                      <DateInput value={dep.departure_date} onValueChange={v => updateDeparture(idx, "departure_date", v)} className="h-9 text-sm" />
                      <Input value={dep.departure_time} onChange={e => updateDeparture(idx, "departure_time", e.target.value)} placeholder="21:00" className="h-9 text-sm" />
                      <Input value={dep.dept_arr_time} onChange={e => updateDeparture(idx, "dept_arr_time", e.target.value)} placeholder="23:40" className="h-9 text-sm" />
                      <DateInput value={dep.return_date} onValueChange={v => updateDeparture(idx, "return_date", v)} className="h-9 text-sm" />
                      <Input value={dep.ret_dep_time} onChange={e => updateDeparture(idx, "ret_dep_time", e.target.value)} placeholder="00:40" className="h-9 text-sm" />
                      <Input value={dep.ret_arr_time} onChange={e => updateDeparture(idx, "ret_arr_time", e.target.value)} placeholder="01:15" className="h-9 text-sm" />
                      <Input type="number" value={dep.total_seats} onChange={e => { const v = parseInt(e.target.value) || 0; updateDeparture(idx, "total_seats", v); if (dep.available_seats > v) updateDeparture(idx, "available_seats", v); }} className="h-9 text-sm" />
                      <Input type="number" value={dep.available_seats} onChange={e => updateDeparture(idx, "available_seats", Math.min(parseInt(e.target.value) || 0, dep.total_seats))} className="h-9 text-sm" />
                      <span className="text-sm text-muted-foreground text-center">{dep.booked}</span>
                      <Input type="number" value={dep.alert_level} onChange={e => updateDeparture(idx, "alert_level", parseInt(e.target.value) || 0)} className="h-9 text-sm" />
                      <Input value={dep.flight_number} onChange={e => updateDeparture(idx, "flight_number", e.target.value)} placeholder="Flight No." className="h-9 text-sm" />
                      <Input value={dep.ret_flight_number} onChange={e => updateDeparture(idx, "ret_flight_number", e.target.value)} placeholder="Return FL" className="h-9 text-sm" />
                      <Input value={dep.duration} onChange={e => updateDeparture(idx, "duration", e.target.value)} placeholder="2:00" className="h-9 text-sm" />
                      <Input value={dep.baggage} onChange={e => updateDeparture(idx, "baggage", e.target.value)} placeholder="20 Kg" className="h-9 text-sm" />
                      <div className="flex justify-center">
                        <Switch checked={dep.is_active} onCheckedChange={v => updateDeparture(idx, "is_active", v)} />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => duplicateDeparture(idx)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm({ type: "departure", index: idx })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== DEFAULT FARES TAB ===== */}
          <TabsContent value="default-fares" className="mt-0 space-y-4">
            <h3 className="text-primary font-medium text-sm">Default Rates</h3>
            <div className="space-y-3">
                {defaultFares.map((fare, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={fare.person_type} onValueChange={v => updateDefaultFare(idx, "person_type", v)}>
                      <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {["Adult", "Child", "Infant"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={fare.seat_from} onChange={e => updateDefaultFare(idx, "seat_from", parseInt(e.target.value) || 0)} placeholder="Seat From" className="h-9 w-[120px]" />
                    <Input type="number" value={fare.seat_to} onChange={e => updateDefaultFare(idx, "seat_to", parseInt(e.target.value) || 0)} placeholder="Seat To" className="h-9 w-[120px]" />
                    <Input type="number" step="0.01" value={fare.rate} onChange={e => updateDefaultFare(idx, "rate", parseFloat(e.target.value) || 0)} placeholder="Rate" className="h-9 flex-1" />
                    <Input type="number" step="0.01" value={fare.commission} onChange={e => updateDefaultFare(idx, "commission", parseFloat(e.target.value) || 0)} placeholder="Commission" className="h-9 flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => setDeleteConfirm({ type: "default_fare", index: idx })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addDefaultFare} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                  {defaultFares.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setDefaultFares(p => { const maxTo = Math.max(...p.map(f => f.seat_to)); const lastGroup = p.filter(f => f.seat_to === maxTo); const range = lastGroup[0].seat_to - lastGroup[0].seat_from + 1; return [...p, ...lastGroup.map(f => ({ ...f, seat_from: maxTo + 1, seat_to: maxTo + range }))]; }); setFaresDirty(true); }} className="gap-1">
                      <Copy className="h-3.5 w-3.5" /> Duplicate All
                    </Button>
                  )}
                  {faresDirty && isEditing && (
                    <Button type="button" size="sm" onClick={handleSaveDefaultFares} disabled={saveDefaultFares.isPending}>
                      {saveDefaultFares.isPending ? "Saving..." : "Save Fares"}
                    </Button>
                  )}
                </div>
                {!isEditing && defaultFares.length === 0 && (
                  <p className="text-sm text-muted-foreground">Click "Add" to configure default fares. They will be saved when you save the flight.</p>
                )}
              </div>
          </TabsContent>

          {/* ===== SPECIAL FARES TAB ===== */}
          <TabsContent value="special-fares" className="mt-0 space-y-4">
            <h3 className="text-primary font-medium text-sm">Special Fares</h3>
            <div className="space-y-3">
                {specialFares.map((fare, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <DateInput value={fare.from_date} onValueChange={v => updateSpecialFare(idx, "from_date", v)} className="h-9 w-[140px]" />
                    <DateInput value={fare.to_date} onValueChange={v => updateSpecialFare(idx, "to_date", v)} className="h-9 w-[140px]" />
                    <Select value={fare.person_type} onValueChange={v => updateSpecialFare(idx, "person_type", v)}>
                      <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {["Adult", "Child", "Infant"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" value={fare.seat_from} onChange={e => updateSpecialFare(idx, "seat_from", parseInt(e.target.value) || 0)} placeholder="Seat From" className="h-9 w-[100px]" />
                    <Input type="number" value={fare.seat_to} onChange={e => updateSpecialFare(idx, "seat_to", parseInt(e.target.value) || 0)} placeholder="Seat To" className="h-9 w-[100px]" />
                    <Input type="number" step="0.01" value={fare.rate} onChange={e => updateSpecialFare(idx, "rate", parseFloat(e.target.value) || 0)} placeholder="Rate" className="h-9 flex-1" />
                    <Input type="number" step="0.01" value={fare.commission} onChange={e => updateSpecialFare(idx, "commission", parseFloat(e.target.value) || 0)} placeholder="Commission" className="h-9 flex-1" />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => setDeleteConfirm({ type: "special_fare", index: idx })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addSpecialFare} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                  {specialFares.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSpecialFares(p => { const maxTo = Math.max(...p.map(f => f.seat_to)); const lastGroup = p.filter(f => f.seat_to === maxTo); const range = lastGroup[0].seat_to - lastGroup[0].seat_from + 1; return [...p, ...lastGroup.map(f => ({ ...f, seat_from: maxTo + 1, seat_to: maxTo + range }))]; }); setSpecialDirty(true); }} className="gap-1">
                      <Copy className="h-3.5 w-3.5" /> Duplicate All
                    </Button>
                  )}
                  {specialDirty && isEditing && (
                    <Button type="button" size="sm" onClick={handleSaveSpecialFares} disabled={saveSpecialFares.isPending}>
                      {saveSpecialFares.isPending ? "Saving..." : "Save Fares"}
                    </Button>
                  )}
                </div>
                {!isEditing && specialFares.length === 0 && (
                  <p className="text-sm text-muted-foreground">Click "Add" to configure special fares. They will be saved when you save the flight.</p>
                )}
              </div>
          </TabsContent>
            </div>
            <SectionJumpNav scrollContainerRef={scrollContainerRef} rescanKey={activeTab} />
          </div>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="flex-shrink-0 flex justify-between gap-3 px-4 py-4 border-t bg-muted/30">
        <div>
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { form.reset(); setDepartures([]); setCoverPhoto(null); }} className="gap-1 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading} onClick={form.handleSubmit(onSubmit, onInvalid)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );

  const deleteLabel = deleteConfirm?.type === "departure" ? "departure" : deleteConfirm?.type === "default_fare" ? "default fare" : "special fare";

  const confirmDeleteDialog = (
    <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Do you want to delete this {deleteLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>No</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteConfirm) {
                if (deleteConfirm.type === "departure") removeDeparture(deleteConfirm.index);
                else if (deleteConfirm.type === "default_fare") removeDefaultFare(deleteConfirm.index);
                else if (deleteConfirm.type === "special_fare") removeSpecialFare(deleteConfirm.index);
              }
              setDeleteConfirm(null);
            }}
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden border-l-4 border-primary shadow-[-8px_0_30px_-10px_hsl(var(--primary)/0.35)]" style={{ left: sidebarOffset, top: 0 }}>
      {formContent}
      {confirmDeleteDialog}
    </div>
  );
}
