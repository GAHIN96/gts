import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Clock,
  CircleCheckBig,
  CircleX,
  CircleAlert,
  Compass,
  ShieldCheck,
  ReceiptText,
  MapPin,
  ArrowDownToLine,
  Sheet,
  Layers3,
  PlaneTakeoff,
  Hotel,
  RotateCcw,
  Banknote,
  UsersRound,
  ChevronRight,
  Sparkles,
  TrendingUp,
  CalendarRange,
  Filter,
  Eye,
} from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { exportToExcel as generateExcel } from "@/utils/excelExport";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; dotColor: string; bgGlow: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: Clock, dotColor: "bg-muted-foreground", bgGlow: "" },
  pending_payment: { label: "Pending", color: "bg-gold/15 text-gold border border-gold/25", icon: CircleAlert, dotColor: "bg-gold", bgGlow: "shadow-gold/5" },
  payment_under_review: { label: "Review", color: "bg-primary/15 text-primary border border-primary/25", icon: Clock, dotColor: "bg-primary", bgGlow: "shadow-primary/5" },
  confirmed: { label: "Confirmed", color: "bg-success/15 text-success border border-success/25", icon: CircleCheckBig, dotColor: "bg-success", bgGlow: "shadow-success/5" },
  canceled: { label: "Canceled", color: "bg-destructive/15 text-destructive border border-destructive/25", icon: CircleX, dotColor: "bg-destructive", bgGlow: "" },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground", icon: RotateCcw, dotColor: "bg-muted-foreground", bgGlow: "" },
};

const bookingTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; gradient: string }> = {
  package: { label: "Package", icon: Layers3, color: "text-primary", bg: "bg-primary/10", gradient: "from-primary/20 to-primary/5" },
  flight: { label: "Flight", icon: PlaneTakeoff, color: "text-coral", bg: "bg-coral/10", gradient: "from-coral/20 to-coral/5" },
  hotel: { label: "Hotel", icon: Hotel, color: "text-gold", bg: "bg-gold/10", gradient: "from-gold/20 to-gold/5" },
  tour: { label: "Tour", icon: Compass, color: "text-success", bg: "bg-success/10", gradient: "from-success/20 to-success/5" },
  visa: { label: "Visa", icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10", gradient: "from-purple-500/20 to-purple-500/5" },
  transfer: { label: "Transfer", icon: CalendarRange, color: "text-cyan-500", bg: "bg-cyan-500/10", gradient: "from-cyan-500/20 to-cyan-500/5" },
};

const BookingHistory = () => {
  const navigate = useNavigate();
  const { data: bookings, isLoading } = useBookings();
  const { settings: companySettings } = useCompanySettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch =
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesType = typeFilter === "all" || booking.booking_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: bookings?.length || 0,
    confirmed: bookings?.filter((b) => b.status === "confirmed").length || 0,
    pending: bookings?.filter((b) =>
      b.status === "pending_payment" || b.status === "payment_under_review" || b.status === "draft"
    ).length || 0,
    totalRevenue: bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0,
  };

  const exportToExcel = () => {
    if (!filteredBookings || filteredBookings.length === 0) {
      toast.error("No bookings to export");
      return;
    }
    const exportData = filteredBookings.map((booking) => {
      const passengers = Array.isArray(booking.passenger_details) ? booking.passenger_details : [];
      const passengerNames = (passengers as any[])
        .map((p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim())
        .filter(Boolean).join(', ');
      return {
        'Booking Number': booking.booking_number,
        'Type': booking.booking_type,
        'Status': statusConfig[booking.status || 'draft'].label,
        'Travelers': booking.passengers || 1,
        'Names': passengerNames || 'N/A',
        'Amount (USD)': booking.total_amount,
        'Date': booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
      };
    });
    const filename = `Booking_History_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    generateExcel(exportData, "Bookings", filename);
    toast.success("Exported!");
  };

  const getServiceName = (booking: Booking) => {
    let notesData: any = null;
    try { if (booking.notes) notesData = JSON.parse(booking.notes); } catch {}
    return notesData?.packageName
      || notesData?.serviceName
      || booking.package_departures?.group_packages?.name
      || booking.flights?.airline
      || booking.hotels?.name
      || booking.tours?.name
      || booking.visas?.country
      || "—";
  };

  const getDestination = (booking: Booking) => {
    let notesData: any = null;
    try { if (booking.notes) notesData = JSON.parse(booking.notes); } catch {}
    return notesData?.destination
      || notesData?.arrivalCity
      || booking.package_departures?.group_packages?.cities?.name
      || booking.hotels?.cities?.name
      || booking.tours?.cities?.name
      || booking.visas?.country
      || "";
  };

  const getPassengerPreview = (booking: Booking) => {
    if (!booking.passenger_details || !Array.isArray(booking.passenger_details)) return "—";
    const passengers = booking.passenger_details as any[];
    if (passengers.length === 0) return "—";
    const first = `${passengers[0].firstName || ''} ${passengers[0].lastName || ''}`.trim();
    if (passengers.length === 1) return first;
    return `${first} +${passengers.length - 1}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-coral/[0.03]" />
        <div className="relative px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <ReceiptText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Booking History</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Track and manage all your reservations</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-xl border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <ArrowDownToLine className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover rounded-xl">
              <DropdownMenuItem onClick={exportToExcel} className="gap-2 rounded-lg">
                <Sheet className="h-4 w-4" /> Excel Spreadsheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: stats.total, icon: ReceiptText, color: "primary", gradient: "from-primary/15 to-primary/5" },
          { label: "Confirmed", value: stats.confirmed, icon: CircleCheckBig, color: "success", gradient: "from-success/15 to-success/5" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "gold", gradient: "from-gold/15 to-gold/5" },
          { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "primary", gradient: "from-primary/15 to-primary/5" },
        ].map((stat, i) => (
          <Card key={i} className="group relative overflow-hidden rounded-2xl border-border/60 hover:border-border transition-all duration-300 hover:shadow-md">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300", stat.gradient)} />
            <CardContent className="relative p-5 flex items-center gap-4">
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                `bg-${stat.color}/10`
              )}>
                <stat.icon className={cn("h-5 w-5", `text-${stat.color}`)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className={cn("text-2xl font-bold mt-0.5", typeof stat.value === "number" && stat.color !== "primary" && `text-${stat.color}`)}>{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Bar */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking number or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors h-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40 rounded-xl border-border/60 h-10">
                  <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(bookingTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 rounded-xl border-border/60 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover rounded-xl">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                Showing {filteredBookings?.length || 0} of {bookings?.length || 0} bookings
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearchTerm(""); setStatusFilter("all"); setTypeFilter("all"); }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 pl-5">Booking</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Service</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Destination</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Travelers</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Amount</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">Date</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 pr-5"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!filteredBookings || filteredBookings.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">No bookings found</p>
                          <p className="text-sm mt-1">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((booking, index) => {
                    const status = statusConfig[booking.status || "draft"];
                    const typeConf = bookingTypeConfig[booking.booking_type] || bookingTypeConfig.package;
                    const TypeIcon = typeConf.icon;
                    const serviceName = getServiceName(booking);
                    const destination = getDestination(booking);
                    const passengerPreview = getPassengerPreview(booking);

                    // Status timeline
                    const timelineSteps = ["draft", "pending_payment", "payment_under_review", "confirmed"];
                    const currentStepIdx = timelineSteps.indexOf(booking.status || "draft");
                    const isCanceled = booking.status === "canceled" || booking.status === "refunded";

                    return (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-muted/20 transition-all duration-200 group border-b border-border/40"
                        onClick={() => navigate(`/booking-history/${booking.id}`)}
                        style={{ animationDelay: `${index * 0.02}s` }}
                      >
                        <TableCell className="pl-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                              typeConf.gradient
                            )}>
                              <TypeIcon className={cn("h-4.5 w-4.5", typeConf.color)} />
                            </div>
                            <div>
                              <p className="font-sans font-medium text-[11px] text-muted-foreground/70 leading-none">{booking.booking_number}</p>
                              <p className="text-sm font-semibold capitalize mt-1">{booking.booking_type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm truncate max-w-[200px]">{serviceName}</p>
                        </TableCell>
                        <TableCell>
                          {destination ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span className="truncate max-w-[130px]">{destination}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <UsersRound className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-sm">{passengerPreview}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-sm">${booking.total_amount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {/* Visual Status Timeline */}
                          <div className="flex items-center gap-0.5">
                            {timelineSteps.map((step, stepIdx) => {
                              const isPast = !isCanceled && currentStepIdx > stepIdx;
                              const isActive = !isCanceled && currentStepIdx === stepIdx;
                              return (
                                <div key={step} className="flex items-center">
                                  <div
                                    className={cn(
                                      "h-2.5 w-2.5 rounded-full transition-all duration-300",
                                      isCanceled ? "bg-destructive/40"
                                        : isActive ? "bg-primary ring-2 ring-primary/30 scale-125"
                                        : isPast ? "bg-success"
                                        : "bg-muted-foreground/20"
                                    )}
                                    title={statusConfig[step]?.label || step}
                                  />
                                  {stepIdx < timelineSteps.length - 1 && (
                                    <div className={cn(
                                      "w-3 h-[2px] mx-0.5",
                                      isPast ? "bg-success" : "bg-muted-foreground/15"
                                    )} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span className={cn("text-[10px] mt-1 block font-medium", isCanceled ? "text-destructive" : status.dotColor ? "" : "text-muted-foreground")}>
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(booking.created_at || ""), "dd/MM/yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/booking-history/${booking.id}`);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          {filteredBookings && filteredBookings.length > pageSize && (
            <div className="border-t border-border/30 px-4">
              <TablePagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredBookings.length / pageSize)}
                pageSize={pageSize}
                totalItems={filteredBookings.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingHistory;
