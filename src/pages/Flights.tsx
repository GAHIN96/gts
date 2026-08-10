import { useState, useMemo, Fragment, Component, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  PlaneTakeoff, 
  Plus, 
  Clock,
  MapPin,
  ArrowRight,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  ArrowLeftRight,
  Link2,
  Tag,
  Lock,
  Search,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useFlights, useFlightStats, useDeleteFlight, type Flight } from "@/hooks/useFlights";
import { useActiveFlightDeals, useFlightDeals, useCreateFlightDeal, useUpdateFlightDeal, useDeleteFlightDeal, FlightDeal } from "@/hooks/useFlightDeals";
import { format, formatDistanceToNow } from "date-fns";
import { FlightForm } from "@/components/admin/FlightForm";
import { FlightDealForm } from "@/components/admin/FlightDealForm";
import { SpecialOffersSection } from "@/components/offers/SpecialOffersSection";
import { ImageCarousel } from "@/components/ui/image-carousel";
import promoFlights1 from "@/assets/promo-flights-1.jpg";
import promoFlights2 from "@/assets/promo-flights-2.jpg";
import promoFlights3 from "@/assets/promo-flights-3.jpg";

const DEFAULT_FLIGHTS_PROMOS = [promoFlights1, promoFlights2, promoFlights3];
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { FlightSearchSection } from "@/components/search/FlightSearchSection";
import { ScheduleBadge } from "@/components/admin/RecurringScheduleSelector";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FlightSeatBlockManager } from "@/components/admin/FlightSeatBlockManager";
import { useAllFlightSeatBlocks } from "@/hooks/useFlightSeatBlocks";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToExcel } from "@/utils/excelExport";
import { ModulePageHeader } from "@/components/ui/module-page-header";
import { isAbortError } from "@/utils/errorUtils";

// Error boundary to prevent blank white page when FlightSearchSection crashes
class SearchErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMsg: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || "An unexpected error occurred" };
  }
  componentDidCatch(error: Error) {
    console.error("FlightSearchSection crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 p-8 rounded-2xl border border-destructive/20 bg-destructive/5">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Flight Search Error</h3>
            <p className="text-muted-foreground text-sm mt-1">Something went wrong while loading the flight search. Please refresh to try again.</p>
            {this.state.errorMsg && (
              <p className="text-xs text-destructive mt-2 max-w-md mx-auto font-mono">{this.state.errorMsg}</p>
            )}
          </div>
          <button
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
            onClick={() => { this.setState({ hasError: false, errorMsg: "" }); window.location.reload(); }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type ColumnKey = 'schedule' | 'date' | 'price' | 'seats';

const OPTIONAL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'date', label: 'Date / Validity' },
  { key: 'price', label: 'Price' },
  { key: 'seats', label: 'Seats' },
];

interface FlightTableProps {
  flights: Flight[];
  onEdit: (flight: Flight) => void;
  onDelete: (id: string) => void;
  onBlockSeats?: (flight: Flight) => void;
  blockedSeatsMap?: Record<string, number>;
  visibleColumns: Set<ColumnKey>;
}

function FlightTable({ flights, onEdit, onDelete, onBlockSeats, blockedSeatsMap = {}, visibleColumns }: FlightTableProps) {
  // Group linked flights and identical routes together
  const groupedFlights = useMemo(() => {
    const processed = new Set<string>();
    
    // First, map all flights by their routeKey to combine multiple dates
    const routeGroups = new Map<string, Flight[]>();
    flights.forEach(f => {
      // If flight has no flight_number, it gets its own group
      const key = f.flight_number ? `${f.airline}-${f.flight_number}-${f.departure_city}-${f.arrival_city}` : f.id;
      if (!routeGroups.has(key)) routeGroups.set(key, []);
      routeGroups.get(key)!.push(f);
    });

    const groups: { outbound: Flight; return?: Flight; departuresCount?: number }[] = [];
    
    // Process each route group
    Array.from(routeGroups.values()).forEach(groupFlights => {
      // We take the first flight as the representative outbound for this route package
      const representative = groupFlights[0];
      if (processed.has(representative.id)) return;
      
      // Check if this representative has a linked return flight
      const linkedFlight = representative.linked_flight_id 
        ? flights.find(f => f.id === representative.linked_flight_id)
        : flights.find(f => f.linked_flight_id === representative.id);
      
      if (linkedFlight && !processed.has(linkedFlight.id)) {
        // Determine which is outbound and which is return
        const isOutbound = !representative.linked_flight_id;
        groups.push({
          outbound: isOutbound ? representative : linkedFlight,
          return: isOutbound ? linkedFlight : representative,
          departuresCount: groupFlights.length,
        });
        processed.add(representative.id);
        processed.add(linkedFlight.id);
        // mark all other departures in this group as processed
        groupFlights.forEach(f => {
          processed.add(f.id);
          if (f.linked_flight_id) processed.add(f.linked_flight_id);
          else {
            const ret = flights.find(rf => rf.linked_flight_id === f.id);
            if (ret) processed.add(ret.id);
          }
        });
      } else {
        groups.push({ 
          outbound: representative,
          departuresCount: groupFlights.length
        });
        groupFlights.forEach(f => processed.add(f.id));
      }
    });
    
    return groups;
  }, [flights]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flight / Route</TableHead>
          <TableHead>Airline</TableHead>
          <TableHead>Type</TableHead>
          {visibleColumns.has('schedule') && <TableHead>Schedule</TableHead>}
          {visibleColumns.has('date') && <TableHead>Date / Validity</TableHead>}
          {visibleColumns.has('price') && <TableHead>Price</TableHead>}
          {visibleColumns.has('seats') && <TableHead>Seats</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedFlights.map((group) => (
            <Fragment key={group.outbound.id}>
            {/* Outbound Flight Row */}
            <TableRow key={group.outbound.id} className={group.return ? "border-b-0" : ""}>
              {/* Flight / Route */}
              <TableCell>
                <div className="flex items-center gap-3">
                  {group.outbound.airline_logo ? (
                    <div className="h-9 w-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                      <img src={group.outbound.airline_logo} alt={group.outbound.airline} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <span>{group.outbound.flight_number || group.outbound.airline}</span>
                      {group.outbound.departure_flight_number && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {group.outbound.departure_flight_number}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{group.outbound.departure_city}</span>
                      {group.outbound.departure_airport_code && <span className="text-[10px] font-sans font-medium font-bold">({group.outbound.departure_airport_code})</span>}
                      <ArrowRight className="h-3 w-3" />
                      <span>{group.outbound.arrival_city}</span>
                      {group.outbound.arrival_airport_code && <span className="text-[10px] font-sans font-medium font-bold">({group.outbound.arrival_airport_code})</span>}
                    </div>
                  </div>
                </div>
              </TableCell>
              {/* Airline */}
              <TableCell>
                <span className="text-sm">{group.outbound.airline}</span>
              </TableCell>
              {/* Type */}
              <TableCell>
                {(group.return || group.outbound.trip_type === 'round_trip') ? (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    Round Trip
                  </Badge>
                ) : group.outbound.trip_type === 'multi_city' ? (
                  <Badge variant="outline" className="bg-accent/50">Multi-City</Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted">One-Way</Badge>
                )}
              </TableCell>
              {/* Optional: Schedule */}
              {visibleColumns.has('schedule') && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{(group.outbound.departure_time || '-').substring(0, 5)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span>{(group.outbound.arrival_time || '-').substring(0, 5)}</span>
                  </div>
                </TableCell>
              )}
              {/* Optional: Date / Validity */}
              {visibleColumns.has('date') && (
                <TableCell>
                  <div className="space-y-1">
                    {group.departuresCount && group.departuresCount > 1 ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">{group.departuresCount} Departures</span>
                      </div>
                    ) : group.outbound.schedule_type === "recurring" ? (
                      <>
                        <ScheduleBadge scheduleType="recurring" recurringDays={group.outbound.recurring_days || []} validUntil={group.outbound.valid_until} />
                        {group.outbound.valid_until && (
                          <p className="text-xs text-muted-foreground">
                            until {format(new Date(group.outbound.valid_until), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(group.outbound.departure_date), 'dd/MM/yyyy')}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
              )}
              {/* Optional: Price */}
              {visibleColumns.has('price') && (
                <TableCell>
                  <span className="font-semibold text-primary">${group.outbound.price}</span>
                </TableCell>
              )}
              {/* Optional: Seats */}
              {visibleColumns.has('seats') && (
                <TableCell>
                  <div className="space-y-1">
                    <Badge className={
                      (group.outbound.available_seats ?? 0) === 0 
                        ? "bg-destructive/10 text-destructive" 
                        : (group.outbound.available_seats ?? 0) <= 10 
                          ? "bg-gold/10 text-gold" 
                          : "bg-success/10 text-success"
                    }>
                      {group.outbound.available_seats ?? 0}/{group.outbound.total_seats ?? 100} seats
                    </Badge>
                    {(blockedSeatsMap[group.outbound.id] ?? 0) > 0 && (
                      <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{blockedSeatsMap[group.outbound.id]} blocked</span>
                      </div>
                    )}
                  </div>
                </TableCell>
              )}
              {/* Status */}
              <TableCell>
                <Badge variant={group.outbound.is_active ? "default" : "secondary"}>
                  {group.outbound.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              {/* Actions */}
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(group.outbound)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onBlockSeats && (
                    <Button size="icon" variant="ghost" onClick={() => onBlockSeats(group.outbound)} title="Block Seats">
                      <Lock className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Flight</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this flight? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(group.outbound.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
            
            {/* Return Flight Row */}
            {group.return && (
              <TableRow key={group.return.id} className="bg-muted/30">
                
                <TableCell>
                  <div className="flex items-center gap-3 pl-4 opacity-80">
                    <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <span>{group.return.flight_number || group.return.airline}</span>
                        {(group.return.return_flight_number || group.outbound.return_flight_number || group.return.departure_flight_number) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {group.return.return_flight_number || group.outbound.return_flight_number || group.return.departure_flight_number}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{group.return.departure_city}</span>
                        {group.return.departure_airport_code && <span className="text-[10px] font-sans font-medium font-bold">({group.return.departure_airport_code})</span>}
                        <ArrowRight className="h-3 w-3" />
                        <span>{group.return.arrival_city}</span>
                        {group.return.arrival_airport_code && <span className="text-[10px] font-sans font-medium font-bold">({group.return.arrival_airport_code})</span>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><span className="text-sm opacity-80">{group.return.airline}</span></TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-muted text-xs">Return</Badge>
                </TableCell>
                {visibleColumns.has('schedule') && (
                  <TableCell>
                    <div className="flex items-center gap-2 opacity-80">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{(group.return.departure_time || '-').substring(0, 5)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{(group.return.arrival_time || '-').substring(0, 5)}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.has('date') && (
                  <TableCell>
                    <div className="flex items-center gap-2 opacity-80">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(group.return.departure_date), 'dd/MM/yyyy')}</span>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.has('price') && (
                  <TableCell>
                    <span className="font-semibold text-primary opacity-80">${group.return.price}</span>
                  </TableCell>
                )}
                {visibleColumns.has('seats') && (
                  <TableCell>
                    <Badge className={
                      (group.return.available_seats ?? 0) === 0 
                        ? "bg-destructive/10 text-destructive" 
                        : (group.return.available_seats ?? 0) <= 10 
                          ? "bg-gold/10 text-gold" 
                          : "bg-success/10 text-success"
                    }>
                      {group.return.available_seats ?? 0}/{group.return.total_seats ?? 100}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={group.return.is_active ? "default" : "secondary"} className="text-xs">
                    {group.return.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(group.return!)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Return Flight</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this return flight? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(group.return!.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            )}
            </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

const Flights = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManageView = searchParams.get("view") === "manage" && isAdmin;
  const { bannerImages } = useBannerSettings();
  const heroImages = bannerImages.flights;
  const promoImages = bannerImages.flightsPromo.length > 0 ? bannerImages.flightsPromo : DEFAULT_FLIGHTS_PROMOS;
  const [formOpen, setFormOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FlightDeal | null>(null);
  const [flightPage, setFlightPage] = useState(1);
  const [flightPageSize, setFlightPageSize] = useState(10);
  const [blockSeatsFlight, setBlockSeatsFlight] = useState<Flight | null>(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [tripTypeFilter, setTripTypeFilter] = useState<string>("all");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set());
  const [columnFilterOpen, setColumnFilterOpen] = useState(false);

  const { data: flights, isLoading, error: flightsError } = useFlights();
  const { data: stats } = useFlightStats();
  const deleteFlight = useDeleteFlight();
  const { data: blockedSeatsMap = {} } = useAllFlightSeatBlocks();


  // Flight deals hooks
  const { data: allFlightDeals, isLoading: dealsLoading, error: dealsError } = useFlightDeals();
  const { data: activeFlightDeals } = useActiveFlightDeals();
  const createDeal = useCreateFlightDeal();
  const updateDeal = useUpdateFlightDeal();
  const deleteDeal = useDeleteFlightDeal();

  // Transform deals for SpecialOffersSection
  const formattedDeals = useMemo(() => {
    const deals = activeFlightDeals ? activeFlightDeals.map(deal => {
      const f = deal.flight;
      return {
        id: deal.id,
        title: deal.title,
        description: deal.description || '',
        originalPrice: deal.original_price,
        discountedPrice: deal.discounted_price,
        discountPercent: deal.discount_percent,
        image: deal.image_url || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
        expiresIn: deal.expires_at 
          ? `${formatDistanceToNow(new Date(deal.expires_at))} left` 
          : undefined,
        featured: deal.is_featured || false,
        onClick: f ? () => handleBook(f as any) : undefined,
        
        // Flight details
        flightNumber: f?.flight_number || undefined,
        airline: f?.airline || undefined,
        airlineLogo: f?.airline_logo || undefined,
        departureCity: f?.departure_city || undefined,
        arrivalCity: f?.arrival_city || undefined,
        departureAirportCode: f?.departure_airport_code || undefined,
        arrivalAirportCode: f?.arrival_airport_code || undefined,
        departureDate: f?.departure_date || undefined,
        departureTime: f?.departure_time || undefined,
        arrivalTime: f?.arrival_time || undefined,
        flightClass: f?.class || undefined,
        availableSeats: f?.available_seats ?? undefined,
      };
    }) : [];

    const featuredFlights = flights ? flights.filter(f => f.is_featured && f.is_active).map(flight => {
      const defaultFares = (flight as any).flight_default_fares || [];
      const lowestDefaultPrice = defaultFares.length > 0 ? Math.min(...defaultFares.map((f: any) => f.rate || 0)) : undefined;
      const displayPrice = flight.price && flight.price > 0 ? flight.price : lowestDefaultPrice;
      const isAirlineLogo = !flight.cover_photo && flight.airline_logo;

      return {
        id: flight.id,
        title: `${flight.airline} ${flight.flight_number || ''}`,
        description: `${flight.departure_city} to ${flight.arrival_city}`,
        originalPrice: undefined,
        discountedPrice: displayPrice,
        discountPercent: undefined,
        image: flight.cover_photo || flight.airline_logo || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop',
        isLogo: !!isAirlineLogo,
        expiresIn: undefined,
        featured: true,
        onClick: () => handleBook(flight),

        // Flight details
        flightNumber: flight.flight_number || undefined,
        airline: flight.airline || undefined,
        airlineLogo: flight.airline_logo || undefined,
        departureCity: flight.departure_city || undefined,
        arrivalCity: flight.arrival_city || undefined,
        departureAirportCode: (flight as any).departure_airport_code || undefined,
        arrivalAirportCode: (flight as any).arrival_airport_code || undefined,
        departureDate: flight.departure_date || undefined,
        departureTime: flight.departure_time || undefined,
        arrivalTime: flight.arrival_time || undefined,
        flightClass: flight.class || undefined,
        availableSeats: flight.available_seats ?? undefined,
      };
    }) : [];

    return [...deals, ...featuredFlights];
  }, [activeFlightDeals, flights]);

  const handleBook = (flight: Flight, passengerCount?: number, returnFlight?: Flight | null, paxBreakdown?: { adults: number; children: number; infants: number }) => {
    const params = new URLSearchParams({ passengers: String(passengerCount || 1) });
    if (returnFlight) params.set("returnFlightId", returnFlight.id);
    if (paxBreakdown) {
      params.set("adults", String(paxBreakdown.adults));
      params.set("children", String(paxBreakdown.children));
      params.set("infants", String(paxBreakdown.infants));
    }
    navigate(`/flights/${flight.id}/book?${params.toString()}`);
  };

  const handleEdit = (flight: Flight) => {
    setEditingFlight(flight);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFlight.mutateAsync(id);
      toast.success("Flight deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete flight:", error);
      toast.error("Failed to delete flight: " + (error?.message || "Unknown error"));
    }
  };

  const handleDealSubmit = async (data: any) => {
    try {
      if (editingDeal) {
        await updateDeal.mutateAsync({ id: editingDeal.id, ...data });
        toast.success("Deal updated successfully");
      } else {
        await createDeal.mutateAsync(data);
        toast.success("Deal created successfully");
      }
      setDealFormOpen(false);
      setEditingDeal(null);
    } catch (error) {
      toast.error("Failed to save deal");
    }
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      await deleteDeal.mutateAsync(id);
      toast.success("Deal deleted successfully");
    } catch (error) {
      toast.error("Failed to delete deal");
    }
  };

  // Filtered flights for admin table
  const filteredAdminFlights = useMemo(() => {
    if (!flights) return [];
    return flights.filter(f => {
      if (tripTypeFilter !== "all") {
        if ((f.trip_type || 'one_way') !== tripTypeFilter) return false;
      }
      if (adminSearch) {
        const s = adminSearch.toLowerCase();
        return (
          (f.airline || "").toLowerCase().includes(s) ||
          (f.departure_city || "").toLowerCase().includes(s) ||
          (f.arrival_city || "").toLowerCase().includes(s) ||
          (f.flight_number || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [flights, adminSearch, tripTypeFilter]);



  const handleExportFlights = () => {
    if (!filteredAdminFlights.length) return;
    const rows = filteredAdminFlights.map(f => ({
      Airline: f.airline,
      "Flight Number": f.flight_number || "",
      "From": f.departure_city,
      "To": f.arrival_city,
      "Date": f.departure_date,
      "Time": f.departure_time || "",
      "Price": f.price,
      "Available Seats": f.available_seats,
      "Class": f.class || "",
      "Status": f.is_active ? "Active" : "Inactive",
    }));
    exportToExcel(rows, "Flights", "flights-export");
  };

  if (flightsError && !isAbortError(flightsError)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Connection Error</h3>
          <p className="text-muted-foreground">We couldn't reach the server or load flights. Please check your connection or try again.</p>
          {flightsError && (
            <p className="text-xs text-destructive mt-2 max-w-md mx-auto">
              Error details: {flightsError instanceof Error ? flightsError.message : JSON.stringify(flightsError)}
            </p>
          )}
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isManageView ? (
        <FlightForm 
          open={formOpen} 
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingFlight(null);
          }}
          flight={editingFlight}
          inline
        />
      ) : (
        <FlightForm 
          open={formOpen} 
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingFlight(null);
          }}
          flight={editingFlight}
          inline
        />
      )}

      {blockSeatsFlight && (
        <FlightSeatBlockManager
          open={!!blockSeatsFlight}
          onOpenChange={(open) => { if (!open) setBlockSeatsFlight(null); }}
          flight={blockSeatsFlight}
        />
      )}


      {isManageView && (
        <ModulePageHeader
          icon={PlaneTakeoff}
          title="Flights"
          count={stats?.total ?? 0}
          subtitle="Manage flight inventory and deals"
          iconBg="bg-primary/10"
          iconColor="text-primary"
          actions={
            <Button variant="navy" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Flight
            </Button>
          }
          stats={[]}
        />
      )}

      {/* Flight Search Section - visible in normal view, on top */}
      {!isManageView && (
        <SearchErrorBoundary>
          <FlightSearchSection 
            onFlightSelect={(flight, passengerCount, returnFlight, paxBreakdown) => handleBook(flight, passengerCount, returnFlight, paxBreakdown)}
          />
        </SearchErrorBoundary>
      )}

      {/* Hero Carousel - hidden in manage view */}
      {!isManageView && (
        <div className="relative rounded-2xl overflow-hidden h-[200px] md:h-[220px]">
          <ImageCarousel 
            images={heroImages} 
            autoPlay 
            interval={5000}
            aspectRatio="hero"
            className="h-full"
            showDots={heroImages.length > 1}
            showArrows={heroImages.length > 1}
          />
        </div>
      )}


      {!isManageView && formattedDeals.length > 0 && (
        <SpecialOffersSection 
          title="Special Flight Deals" 
          offers={formattedDeals}
          onViewOffer={(offer) => toast.info(`Viewing offer: ${offer.title}`)}
        />
      )}

      {/* Deal Form Dialog */}
      <Dialog open={dealFormOpen} onOpenChange={(open) => {
        setDealFormOpen(open);
        if (!open) setEditingDeal(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? 'Edit Flight Deal' : 'Create Flight Deal'}</DialogTitle>
          </DialogHeader>
          <FlightDealForm
            deal={editingDeal}
            onSubmit={handleDealSubmit}
            onCancel={() => {
              setDealFormOpen(false);
              setEditingDeal(null);
            }}
            isLoading={createDeal.isPending || updateDeal.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Flight Deals Management - Admin Only, in manage view */}
      {isManageView && (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Flight Deals</h3>
              </div>
              <Button onClick={() => setDealFormOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </div>

            {dealsLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !allFlightDeals || allFlightDeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No flight deals created yet. Click "Add Deal" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {allFlightDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{deal.title}</div>
                      <div className="text-xs text-muted-foreground">{(deal as any).subtitle ?? (deal as any).description ?? ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingDeal(deal); setDealFormOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDeal.mutate(deal.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Flights Table */}
      {isManageView && (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by route, airline, or flight number..."
                    value={adminSearch}
                    onChange={(e) => {
                      setAdminSearch(e.target.value);
                      setFlightPage(1);
                    }}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={tripTypeFilter} onValueChange={(v) => { setTripTypeFilter(v); setFlightPage(1); }}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Trip Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trips</SelectItem>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                    <SelectItem value="multi_city">Multi-City</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportFlights}
                  className="h-9"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {isLoading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : filteredAdminFlights.length === 0 ? (
              <EmptyState
                icon={PlaneTakeoff}
                title={adminSearch ? "No flights match your search" : "No flights found"}
                description={adminSearch ? "Try a different search term." : "Add your first flight to get started."}
                actionLabel={adminSearch ? undefined : "Add Flight"}
                onAction={adminSearch ? undefined : () => setFormOpen(true)}
              />
            ) : (
              <>
                <FlightTable 
                  flights={filteredAdminFlights.slice((flightPage - 1) * flightPageSize, flightPage * flightPageSize)} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete}
                  onBlockSeats={setBlockSeatsFlight}
                  blockedSeatsMap={blockedSeatsMap}
                  visibleColumns={visibleColumns}
                />
                {filteredAdminFlights.length > flightPageSize && (
                  <TablePagination
                    currentPage={flightPage}
                    totalPages={Math.ceil(filteredAdminFlights.length / flightPageSize)}
                    pageSize={flightPageSize}
                    totalItems={filteredAdminFlights.length}
                    onPageChange={setFlightPage}
                    onPageSizeChange={(size) => { setFlightPageSize(size); setFlightPage(1); }}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Flights;
