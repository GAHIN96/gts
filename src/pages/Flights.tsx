import { useState, useMemo, Fragment } from "react";
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
import { exportToExcel } from "@/utils/excelExport";
import { ModulePageHeader } from "@/components/ui/module-page-header";


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
  // Group linked flights together
  const groupedFlights = useMemo(() => {
    const processed = new Set<string>();
    const groups: { outbound: Flight; return?: Flight }[] = [];
    
    flights.forEach((flight) => {
      if (processed.has(flight.id)) return;
      
      // Check if this flight has a linked return flight
      const linkedFlight = flight.linked_flight_id 
        ? flights.find(f => f.id === flight.linked_flight_id)
        : flights.find(f => f.linked_flight_id === flight.id);
      
      if (linkedFlight && !processed.has(linkedFlight.id)) {
        // Determine which is outbound and which is return
        const isOutbound = !flight.linked_flight_id;
        groups.push({
          outbound: isOutbound ? flight : linkedFlight,
          return: isOutbound ? linkedFlight : flight,
        });
        processed.add(flight.id);
        processed.add(linkedFlight.id);
      } else {
        groups.push({ outbound: flight });
        processed.add(flight.id);
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
                    <p className="font-medium">{group.outbound.flight_number || group.outbound.airline}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{group.outbound.departure_city}</span>
                      {group.outbound.departure_airport_code && <span className="text-[10px] font-mono font-bold">({group.outbound.departure_airport_code})</span>}
                      <ArrowRight className="h-3 w-3" />
                      <span>{group.outbound.arrival_city}</span>
                      {group.outbound.arrival_airport_code && <span className="text-[10px] font-mono font-bold">({group.outbound.arrival_airport_code})</span>}
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
                    {group.outbound.schedule_type === "recurring" ? (
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
                      <p className="font-medium text-sm">{group.return.flight_number || group.return.airline}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{group.return.departure_city}</span>
                        {group.return.departure_airport_code && <span className="text-[10px] font-mono font-bold">({group.return.departure_airport_code})</span>}
                        <ArrowRight className="h-3 w-3" />
                        <span>{group.return.arrival_city}</span>
                        {group.return.arrival_airport_code && <span className="text-[10px] font-mono font-bold">({group.return.arrival_airport_code})</span>}
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

  const { data: flights, isLoading } = useFlights();
  const { data: stats } = useFlightStats();
  const deleteFlight = useDeleteFlight();
  const { data: blockedSeatsMap = {} } = useAllFlightSeatBlocks();


  // Flight deals hooks
  const { data: allFlightDeals, isLoading: dealsLoading } = useFlightDeals();
  const { data: activeFlightDeals } = useActiveFlightDeals();
  const createDeal = useCreateFlightDeal();
  const updateDeal = useUpdateFlightDeal();
  const deleteDeal = useDeleteFlightDeal();

  // Transform deals for SpecialOffersSection
  const formattedDeals = useMemo(() => {
    if (!activeFlightDeals) return [];
    return activeFlightDeals.map(deal => ({
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
    }));
  }, [activeFlightDeals]);

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
    } catch (error) {
      toast.error("Failed to delete flight");
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
          f.airline.toLowerCase().includes(s) ||
          f.departure_city.toLowerCase().includes(s) ||
          f.arrival_city.toLowerCase().includes(s) ||
          (f.flight_number || '').toLowerCase().includes(s)
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
          stats={[
            { icon: PlaneTakeoff, label: "Available", value: stats?.available ?? 0, color: "text-success" },
            { icon: PlaneTakeoff, label: "Limited", value: stats?.limited ?? 0, color: "text-gold" },
            { icon: PlaneTakeoff, label: "Sold Out", value: stats?.soldOut ?? 0, color: "text-destructive" },
          ]}
        />
      )}

      {/* Flight Search Section - visible in normal view, on top */}
      {!isManageView && (
        <FlightSearchSection 
          onFlightSelect={(flight, passengerCount, returnFlight, paxBreakdown) => handleBook(flight, passengerCount, returnFlight, paxBreakdown)}
        />
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

      {/* Promo Slideshow - airline reklam, auto-rotating */}
      {!isManageView && promoImages.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden h-[160px] md:h-[200px] shadow-card">
          <ImageCarousel
            images={promoImages}
            autoPlay
            interval={4000}
            aspectRatio="hero"
            className="h-full"
            showDots={promoImages.length > 1}
            showArrows={promoImages.length > 1}
            overlay={false}
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
