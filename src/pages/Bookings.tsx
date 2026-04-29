import { useState, useMemo, useEffect } from "react";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Users,
  DollarSign,
  Eye,
  Search,
  Filter,
  Package,
  Clock,
  Clock3,
  CheckCircle,
  CheckSquare,
  Layers,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Mail,
  PlaneTakeoff,
  Building2,
  User,
  MapPin,
  FileSpreadsheet,
  Download,
  Car,
  Navigation,
  TrendingUp,
  Box,
  Send,
  Globe,
  Fingerprint,
  StickyNote,
  CalendarRange,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings, useUpdateBooking, type Booking } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VoucherPreviewDialog } from "@/components/booking/VoucherPreviewDialog";

import { exportToExcel as generateExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";
import { BookingsExcelTable } from "@/components/bookings/BookingsExcelTable";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string; border: string; glow: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground", icon: Clock, bg: "bg-muted/60", border: "border-muted", glow: "" },
  pending_payment: { label: "Pending Payment", color: "text-gold", icon: AlertCircle, bg: "bg-gold/10", border: "border-gold/25", glow: "shadow-gold/10" },
  payment_under_review: { label: "Under Review", color: "text-primary", icon: Clock, bg: "bg-primary/10", border: "border-primary/25", glow: "shadow-primary/10" },
  confirmed: { label: "Confirmed", color: "text-success", icon: CheckCircle, bg: "bg-success/10", border: "border-success/25", glow: "shadow-success/10" },
  canceled: { label: "Canceled", color: "text-destructive", icon: XCircle, bg: "bg-destructive/10", border: "border-destructive/25", glow: "" },
  refunded: { label: "Refunded", color: "text-muted-foreground", icon: DollarSign, bg: "bg-muted/60", border: "border-muted", glow: "" },
};

const bookingTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; gradient: string; barColor: string }> = {
  package: { label: "Group Packages", icon: Box, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-primary" },
  custom_group: { label: "Custom Groups", icon: Layers, color: "text-primary", gradient: "from-primary to-coral/70", barColor: "bg-coral" },
  flight: { label: "Flights", icon: Send, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-sky-500" },
  hotel: { label: "Hotels", icon: Building2, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-gold" },
  tour: { label: "Tours", icon: Globe, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-success" },
  visa: { label: "Visas", icon: Fingerprint, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-purple-500" },
  transfer: { label: "Transfers", icon: Navigation, color: "text-primary", gradient: "from-primary to-primary/70", barColor: "bg-cyan-500" },
};

const Bookings = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: bookings, isLoading } = useBookings();
  const updateBooking = useUpdateBooking();

  const isAdmin = role === "admin";
  const isFinance = role === "finance";
  const canManage = isAdmin || isFinance;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("type") || "all");
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSendingVoucher, setIsSendingVoucher] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPageSize, setBookingPageSize] = useState(25);

  // Date range filter
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Advanced filters (admin-only) — persisted
  type AdvFilters = {
    typeFilters: string[];
    agencyFilter: string;
    amountMin: string;
    amountMax: string;
    dateField: "created" | "travel";
  };
  const [advFilters, setAdvFilters] = useState<AdvFilters>(() => {
    try {
      const saved = localStorage.getItem("bookings-filters");
      if (saved) return { typeFilters: [], agencyFilter: "", amountMin: "", amountMax: "", dateField: "created", ...JSON.parse(saved) };
    } catch {}
    return { typeFilters: [], agencyFilter: "", amountMin: "", amountMax: "", dateField: "created" };
  });
  useEffect(() => {
    localStorage.setItem("bookings-filters", JSON.stringify(advFilters));
  }, [advFilters]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline notes
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteBooking, setNoteBooking] = useState<Booking | null>(null);
  const [noteText, setNoteText] = useState("");

  // Column visibility (admin Excel grid)
  const allColumns = [
    { key: "booking_date", label: "Booking Date" },
    { key: "pnr", label: "PNR" },
    { key: "departure", label: "Departure" },
    { key: "status", label: "Status" },
    { key: "agent", label: "Agent" },
    { key: "group", label: "Group" },
    { key: "hotel", label: "Hotel" },
    { key: "room_type", label: "Room Type" },
    { key: "room_qty", label: "Room Qty" },
    { key: "amount", label: "Amount" },
    { key: "commission", label: "Comm." },
    { key: "net_amount", label: "Net Amount" },
    { key: "penalty", label: "Penalty" },
  ];
  const bookingsGridStorageKey = "bookings-visible-columns-v7";
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const validKeys = new Set(allColumns.map(c => c.key));
    try {
      // Purge legacy keys from older versions to prevent stale column sets
      ["bookings-visible-columns", "bookings-visible-columns-v2", "bookings-visible-columns-v3", "bookings-visible-columns-v4", "bookings-visible-columns-v5", "bookings-visible-columns-v6"].forEach(k => localStorage.removeItem(k));
      const saved = localStorage.getItem(bookingsGridStorageKey);
      if (saved) {
        const parsed = (JSON.parse(saved) as string[]).filter((key) => validKeys.has(key));
        // If sanitized set has fewer keys than saved, it was stale — reset to defaults
        if (parsed.length === (JSON.parse(saved) as string[]).length && parsed.length > 0) {
          return new Set(parsed);
        }
      }
    } catch {}
    return new Set(allColumns.map(c => c.key));
  });
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(bookingsGridStorageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const getBookingsByType = (type: string) => {
    return bookings?.filter((b) => b.booking_type === type) || [];
  };

  // Helpers for date presets
  const applyDatePreset = (preset: "today" | "7d" | "month" | "lastMonth" | "year") => {
    const now = new Date();
    switch (preset) {
      case "today": setDateFrom(startOfDay(now)); setDateTo(endOfDay(now)); break;
      case "7d": setDateFrom(startOfDay(subDays(now, 6))); setDateTo(endOfDay(now)); break;
      case "month": setDateFrom(startOfMonth(now)); setDateTo(endOfMonth(now)); break;
      case "lastMonth": {
        const lm = subMonths(now, 1);
        setDateFrom(startOfMonth(lm)); setDateTo(endOfMonth(lm));
        break;
      }
      case "year": setDateFrom(startOfYear(now)); setDateTo(endOfYear(now)); break;
    }
  };

  // Get date for a booking based on dateField setting
  const getFilterDate = (booking: Booking): Date | null => {
    if (advFilters.dateField === "travel") {
      const travel =
        booking.package_departures?.departure_date ||
        booking.flights?.departure_date ||
        booking.created_at;
      return travel ? new Date(travel) : null;
    }
    return booking.created_at ? new Date(booking.created_at) : null;
  };

  // Unique agency list (admin-only)
  const agencyOptions = useMemo(() => {
    const map = new Map<string, string>();
    (bookings || []).forEach(b => {
      if (b.agencies?.id && b.agencies?.agency_name) map.set(b.agencies.id, b.agencies.agency_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch =
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.package_departures?.group_packages?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.agencies?.agency_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesType = activeTab === "all" || booking.booking_type === activeTab;

    // Date range filter
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const bookingDate = getFilterDate(booking);
      if (bookingDate) {
        if (dateFrom && isBefore(bookingDate, startOfDay(dateFrom))) matchesDate = false;
        if (dateTo && isAfter(bookingDate, endOfDay(dateTo))) matchesDate = false;
      } else {
        matchesDate = false;
      }
    }

    // Admin-only advanced filters
    let matchesAdv = true;
    if (isAdmin) {
      if (advFilters.typeFilters.length > 0 && !advFilters.typeFilters.includes(booking.booking_type)) matchesAdv = false;
      if (advFilters.agencyFilter && booking.agencies?.id !== advFilters.agencyFilter) matchesAdv = false;
      const amt = Number(booking.total_amount) || 0;
      if (advFilters.amountMin && amt < Number(advFilters.amountMin)) matchesAdv = false;
      if (advFilters.amountMax && amt > Number(advFilters.amountMax)) matchesAdv = false;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate && matchesAdv;
  });

  // Active filter count (admin-only)
  const activeFilterCount = useMemo(() => {
    if (!isAdmin) return 0;
    let n = 0;
    if (advFilters.typeFilters.length > 0) n++;
    if (advFilters.agencyFilter) n++;
    if (advFilters.amountMin || advFilters.amountMax) n++;
    if (advFilters.dateField === "travel") n++;
    return n;
  }, [advFilters, isAdmin]);


  const sendStatusNotification = async (booking: Booking, newStatus: string) => {
    try {
      const email = booking.profiles?.email;
      if (email) {
        await supabase.functions.invoke("booking-status-notification", {
          body: {
            bookingId: booking.id,
            newStatus,
            bookingNumber: booking.booking_number,
            bookingType: booking.booking_type,
            userEmail: email,
            totalAmount: booking.total_amount,
          },
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const sendVoucherEmail = async (booking: Booking) => {
    try {
      const email = booking.profiles?.email;
      const fullName = booking.profiles?.full_name;
      if (!email) { toast.error("No email found for this booking"); return; }
      const packageName = getBookingTitle(booking);
      const destination = getBookingDestination(booking);
      await supabase.functions.invoke("payment-notification", {
        body: {
          userEmail: email, userName: fullName || "Valued Customer", status: "approved",
          bookingNumber: booking.booking_number, bookingType: booking.booking_type,
          serviceName: packageName, destination, passengers: booking.passengers, totalAmount: booking.total_amount,
        },
      });
      toast.success("Voucher sent to " + email);
    } catch (error) {
      console.error("Failed to send voucher:", error);
      toast.error("Failed to send voucher email");
    }
  };

  const handleApproveAndSendVoucher = async (booking: Booking) => {
    setIsSendingVoucher(true);
    try {
      await updateBooking.mutateAsync({ id: booking.id, status: "confirmed" as any });
      await sendVoucherEmail(booking);
      toast.success("Booking confirmed and voucher sent!");
      setPreviewOpen(false);
      setPreviewBooking(null);
    } catch { toast.error("Failed to approve booking"); }
    finally { setIsSendingVoucher(false); }
  };

  const openVoucherPreview = (booking: Booking) => {
    setPreviewBooking(booking);
    setPreviewOpen(true);
  };

  const handleStatusChange = async (booking: Booking, newStatus: string) => {
    try {
      await updateBooking.mutateAsync({ id: booking.id, status: newStatus as any });
      await sendStatusNotification(booking, newStatus);
      toast.success("Booking status updated");
    } catch { toast.error("Failed to update status"); }
  };

  const viewDetails = (booking: Booking) => {
    navigate(`/bookings/${booking.id}`);
  };

  const getBookingTitle = (booking: Booking): string => {
    switch (booking.booking_type) {
      case "package": return booking.package_departures?.group_packages?.name || "Group Package";
      case "custom_group": {
        const meta = booking.metadata as any;
        if (meta?.destinationCityName) return `Custom Group - ${meta.destinationCityName}`;
        return "Custom Group";
      }
      case "flight": return booking.flights ? `${booking.flights.airline} - ${booking.flights.departure_city} → ${booking.flights.arrival_city}` : "Flight Booking";
      case "hotel": return booking.hotels?.name || "Hotel Booking";
      case "tour": return booking.tours?.name || "Tour Booking";
      case "visa": return booking.visas ? `${booking.visas.country} - ${booking.visas.visa_type}` : "Visa Application";
      case "transfer":
        try { const notes = booking.notes ? JSON.parse(booking.notes) : {}; return notes.transfer_name || "Transfer Booking"; }
        catch { return "Transfer Booking"; }
      default: return booking.booking_type;
    }
  };

  const getBookingDestination = (booking: Booking): string => {
    switch (booking.booking_type) {
      case "package": return booking.package_departures?.group_packages?.cities?.name || "";
      case "custom_group": {
        const meta = booking.metadata as any;
        return meta?.destinationCityName || "";
      }
      case "flight": return booking.flights?.arrival_city || "";
      case "hotel": return booking.hotels?.cities?.name || "";
      case "tour": return booking.tours?.cities?.name || "";
      case "visa": return booking.visas?.country || "";
      default: return "";
    }
  };

  const getBookingDate = (booking: Booking): string => {
    switch (booking.booking_type) {
      case "package": return booking.package_departures?.departure_date ? format(new Date(booking.package_departures.departure_date), "dd/MM/yyyy") : "-";
      case "flight": return booking.flights?.departure_date ? format(new Date(booking.flights.departure_date), "dd/MM/yyyy") : "-";
      default: return booking.created_at ? format(new Date(booking.created_at), "dd/MM/yyyy") : "-";
    }
  };

  const getLeadPassengerName = (booking: Booking): string => {
    if (booking.passenger_details && Array.isArray(booking.passenger_details) && booking.passenger_details.length > 0) {
      const lead = booking.passenger_details[0] as any;
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "N/A";
    }
    return "N/A";
  };

  const getPackageOriginCity = (booking: Booking): string | null => {
    try { const notes = booking.notes ? JSON.parse(booking.notes) : {}; if (notes.departureCity) return notes.departureCity; } catch {}
    const depFlights = booking.package_departures?.package_departure_flights;
    if (depFlights && depFlights.length > 0) {
      const outbound = depFlights.find((f: any) => f.flight_type === "outbound");
      if (outbound?.flights?.departure_city) return outbound.flights.departure_city;
      if (depFlights[0]?.flights?.departure_city) return depFlights[0].flights.departure_city;
    }
    try { const notes = booking.notes ? JSON.parse(booking.notes) : {}; if (notes.flightRoute) { const match = notes.flightRoute.match(/^(.+?)\s*↔/); if (match) return match[1].trim(); } } catch {}
    return null;
  };

  const getBookingHotelInfo = (booking: Booking) => {
    try {
      const notes = booking.notes ? JSON.parse(booking.notes) : {};
      const hotelName = notes.hotelName || booking.hotels?.name;
      if (!hotelName) return null;
      return {
        hotelName, tier: notes.hotelTier || null,
        isUpgrade: notes.hotelIsDefault === false || (!notes.hotelIsDefault && notes.hotelPriceAdjustment > 0),
        priceAdjustment: notes.hotelPriceAdjustment || 0,
        starRating: notes.hotelStarRating || booking.hotels?.star_rating || null,
      };
    } catch {
      if (booking.hotels?.name) return { hotelName: booking.hotels.name, tier: null, isUpgrade: false, priceAdjustment: 0, starRating: booking.hotels.star_rating || null };
      return null;
    }
  };

  const stats = {
    total: bookings?.length || 0,
    confirmed: bookings?.filter((b) => b.status === "confirmed").length || 0,
    pending: bookings?.filter((b) => b.status === "pending_payment" || b.status === "payment_under_review").length || 0,
    revenue: bookings?.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.total_amount, 0) || 0,
    packages: getBookingsByType("package").length,
    custom_group: getBookingsByType("custom_group").length,
    flights: getBookingsByType("flight").length,
    hotels: getBookingsByType("hotel").length,
    tours: getBookingsByType("tour").length,
    visas: getBookingsByType("visa").length,
    transfers: getBookingsByType("transfer").length,
  };

  // ---- Helpers mirroring BookingsExcelTable columns ----
  const parseBookingNotes = (b: Booking): Record<string, any> => {
    if (!b.notes) return {};
    try { return JSON.parse(b.notes); } catch { return {}; }
  };
  const getPnr = (b: Booking) => {
    const num = b.booking_number || "";
    const tail = num.split("-").pop() || num;
    return tail.slice(-4).toUpperCase();
  };
  const getGroupLabelExp = (b: Booking) => {
    if (b.package_departures?.group_packages?.name) {
      const name = b.package_departures.group_packages.name;
      const city = b.package_departures.group_packages.cities?.name;
      return `${name}${city ? ` (${city})` : ""}`;
    }
    return "—";
  };
  const getAgentLabelExp = (b: Booking) => b.agencies?.agency_name || b.profiles?.full_name || "—";
  const getHotelLabelExp = (b: Booking) => b.hotels?.name || "—";
  const getRoomTypeExp = (b: Booking) => {
    const meta = (b.metadata as any) || {};
    const notes = parseBookingNotes(b);
    return (notes.roomType || meta.roomType || meta.room_type || "—").toString();
  };
  const getRoomQtyExp = (b: Booking) => {
    const meta = (b.metadata as any) || {};
    if (Array.isArray(meta.roomAssignments)) return meta.roomAssignments.length;
    if (typeof meta.roomCount === "number") return meta.roomCount;
    if (typeof meta.rooms === "number") return meta.rooms;
    return Math.max(1, Math.ceil((b.passengers || 1) / 2));
  };
  const getCommissionExp = (b: Booking) => {
    const meta = (b.metadata as any) || {};
    if (typeof meta.totalCommission === "number") return meta.totalCommission;
    if (typeof meta.commission === "number") return meta.commission;
    const rate = Number(b.agencies?.commission_rate) || 0;
    return (Number(b.total_amount) || 0) * (rate / 100);
  };
  const getNetAmountExp = (b: Booking) => (Number(b.total_amount) || 0) - getCommissionExp(b);
  const getPenaltyExp = (b: Booking) => {
    const meta = (b.metadata as any) || {};
    if (typeof meta.penalty === "number") return meta.penalty;
    if (typeof meta.penaltyAmount === "number") return meta.penaltyAmount;
    return 0;
  };
  const getDepartureDateExp = (b: Booking) => {
    const d = b.package_departures?.departure_date || b.flights?.departure_date;
    return d ? format(new Date(d), 'dd/MM/yyyy') : '—';
  };

  const exportToExcel = () => {
    const rows: Record<string, any>[] = [];
    (filteredBookings || []).forEach((booking) => {
      const passengers = Array.isArray(booking.passenger_details) ? booking.passenger_details : [];
      const agency = booking.agencies;
      const profile = booking.profiles;
      const baseCols = {
        'Booking Date': booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
        'Booking Number': booking.booking_number,
        'PNR': getPnr(booking),
        'Departure': getDepartureDateExp(booking),
        'Status': booking.status || 'draft',
        'Type': booking.booking_type,
        'Service': getBookingTitle(booking),
        'Destination': getBookingDestination(booking),
        'Agent': getAgentLabelExp(booking),
        'Agency': agency?.agency_name || 'N/A',
        'Agency Contact': agency?.contact_person_name || 'N/A',
        'Agency Email': agency?.contact_email || 'N/A',
        'Agency Phone': agency?.contact_phone || 'N/A',
        'Booked By': profile?.full_name || 'N/A',
        'Booked By Email': profile?.email || 'N/A',
        'Group': getGroupLabelExp(booking),
        'Hotel': getHotelLabelExp(booking),
        'Room Type': getRoomTypeExp(booking),
        'Room Qty': getRoomQtyExp(booking),
        'Travel Date': getBookingDate(booking),
        'Pax Count': booking.passengers || 1,
        'Amount': Number(booking.total_amount) || 0,
        'Commission': Number(getCommissionExp(booking).toFixed(2)),
        'Net Amount': Number(getNetAmountExp(booking).toFixed(2)),
        'Penalty': Number(getPenaltyExp(booking).toFixed(2)),
        'Notes': booking.notes || '',
        'Special Requests': booking.special_requests || '',
      };
      if (passengers.length === 0) {
        rows.push({
          ...baseCols,
          'Passenger #': '-', 'First Name': '-', 'Last Name': '-',
          'Passport': '-', 'Passport Expiry': '-', 'Date of Birth': '-', 'Guest Type': '-',
        });
      } else {
        passengers.forEach((p: any, idx: number) => {
          rows.push({
            ...baseCols,
            'Passenger #': idx + 1,
            'First Name': p.firstName || p.first_name || '',
            'Last Name': p.lastName || p.last_name || '',
            'Passport': p.passportNumber || p.passport_number || '',
            'Passport Expiry': p.passportExpiry || p.passport_expiry || '',
            'Date of Birth': p.dateOfBirth || p.date_of_birth || p.dob || '',
            'Guest Type': p.type || p.guestType || p.guest_type || 'ADT',
          });
        });
      }
    });
    const filename = `Bookings_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    generateExcel(rows, "Bookings", filename);
    toast.success("Exported to Excel", { description: filename });
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageItems = (filteredBookings || []).slice((bookingPage - 1) * bookingPageSize, bookingPage * bookingPageSize);
    if (pageItems.every((b) => selectedIds.has(b.id))) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageItems.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const handleBulkStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await updateBooking.mutateAsync({ id, status: status as any });
      }
      toast.success(`${ids.length} booking(s) updated to ${status}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to update some bookings");
    }
  };

  const handleSaveNote = async () => {
    if (!noteBooking) return;
    try {
      await updateBooking.mutateAsync({ id: noteBooking.id, notes: noteText });
      toast.success("Note saved");
      setNoteDialogOpen(false);
      setNoteBooking(null);
      setNoteText("");
    } catch {
      toast.error("Failed to save note");
    }
  };

  const exportToPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a3');
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    
    // Header
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 35, 126);
    pdf.text('Bookings Report', 14, 18);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 25);
    
    // Summary
    pdf.setFontSize(10); pdf.setTextColor(0, 0, 0);
    pdf.text(`Total: ${stats.total} | Confirmed: ${stats.confirmed} | Pending: ${stats.pending} | Revenue: $${stats.revenue.toLocaleString()}`, 14, 33);
    
    const headers = ['Date', 'PNR', 'Status', 'Agent', 'Group', 'Hotel', 'Room Type', 'Qty', 'Type', 'Service', 'Travel', 'Pax', 'Passenger', 'Passport', 'DOB', 'Amount', 'Comm.', 'Net', 'Penalty'];
    const colWidths = [22, 18, 22, 30, 32, 30, 22, 12, 18, 32, 20, 12, 30, 24, 18, 20, 18, 20, 18];
    let y = 42;
    
    const drawHeaders = () => {
      pdf.setFillColor(26, 35, 126); pdf.rect(14, y - 5, pw - 28, 8, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      let x = 14;
      headers.forEach((h, i) => { pdf.text(h, x + 1, y); x += colWidths[i]; });
      y += 6; pdf.setTextColor(0, 0, 0); pdf.setFont('helvetica', 'normal');
    };
    drawHeaders();
    
    (filteredBookings || []).forEach((booking) => {
      const passengers = Array.isArray(booking.passenger_details) ? booking.passenger_details : [];
      const paxList = passengers.length > 0 ? passengers : [null];
      
      paxList.forEach((p: any, pIdx: number) => {
        if (y > ph - 15) { pdf.addPage(); y = 20; drawHeaders(); }
        if (pIdx === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(14, y - 4, pw - 28, 7, 'F'); }
        
        const pName = p ? `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.trim() : '-';
        const passport = p ? (p.passportNumber || p.passport_number || '-') : '-';
        const dob = p ? (p.dateOfBirth || p.date_of_birth || p.dob || '-') : '-';
        
        const row = [
          pIdx === 0 ? (booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yy') : '-') : '',
          pIdx === 0 ? getPnr(booking) : '',
          pIdx === 0 ? (booking.status || 'draft') : '',
          pIdx === 0 ? getAgentLabelExp(booking).substring(0, 18) : '',
          pIdx === 0 ? getGroupLabelExp(booking).substring(0, 20) : '',
          pIdx === 0 ? getHotelLabelExp(booking).substring(0, 18) : '',
          pIdx === 0 ? getRoomTypeExp(booking).substring(0, 12) : '',
          pIdx === 0 ? String(getRoomQtyExp(booking)) : '',
          pIdx === 0 ? booking.booking_type : '',
          pIdx === 0 ? getBookingTitle(booking).substring(0, 20) : '',
          pIdx === 0 ? getDepartureDateExp(booking) : '',
          pIdx === 0 ? String(booking.passengers || 1) : '',
          pName.substring(0, 18),
          passport.substring(0, 14),
          dob.substring(0, 10),
          pIdx === 0 ? `$${(Number(booking.total_amount) || 0).toLocaleString()}` : '',
          pIdx === 0 ? `$${getCommissionExp(booking).toFixed(0)}` : '',
          pIdx === 0 ? `$${getNetAmountExp(booking).toFixed(0)}` : '',
          pIdx === 0 ? `$${getPenaltyExp(booking).toFixed(0)}` : '',
        ];
        let x = 14; pdf.setFontSize(7);
        row.forEach((c, i) => { pdf.text(c, x + 1, y); x += colWidths[i]; });
        y += 6;
      });
    });
    
    // Footer with page numbers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${i} of ${totalPages}`, pw - 30, ph - 8);
    }
    
    const filename = `Bookings_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(filename);
    toast.success("Exported to PDF", { description: filename });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in">
        <Skeleton className="h-12 w-72 rounded-2xl" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[500px] rounded-2xl" />
      </div>
    );
  }

  const pendingBookings = bookings?.filter(
    (b) => b.status === "pending_payment" || b.status === "payment_under_review"
  ) || [];

  const renderBookingList = (bookingsToShow: Booking[]) => (
    <div className="divide-y divide-border/40">
      {bookingsToShow?.map((booking, idx) => {
        const status = statusConfig[booking.status || "draft"];
        const StatusIcon = status.icon;
        const typeConfig = bookingTypeConfig[booking.booking_type] || bookingTypeConfig.package;
        const TypeIcon = typeConfig.icon;
        const isPending = booking.status === "pending_payment" || booking.status === "payment_under_review";
        const isSelected = selectedIds.has(booking.id);

        return (
          <div
            key={booking.id}
            className={cn(
              "group flex items-center gap-4 px-5 py-4 hover:bg-muted/30 cursor-pointer transition-all duration-200",
              isSelected && "bg-primary/5"
            )}
            style={{ animationDelay: `${idx * 0.02}s` }}
            onClick={() => viewDetails(booking)}
          >
            {/* Checkbox for bulk select */}
            {canManage && (
              <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(booking.id)}
                  className="h-4.5 w-4.5"
                />
              </div>
            )}
            {/* Type Icon */}
            {visibleColumns.has("type") && (
            <div className={cn(
              "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-105",
              typeConfig.gradient
            )}>
              <TypeIcon className="h-5 w-5 text-white" />
            </div>
            )}

            {/* Main Info */}
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1">
              <div className="min-w-0">
                {visibleColumns.has("title") && (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{getBookingTitle(booking)}</p>
                  <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md shrink-0">
                    {booking.booking_number}
                  </span>
                </div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {visibleColumns.has("destination") && getBookingDestination(booking) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {getBookingDestination(booking)}
                    </span>
                  )}
                  {visibleColumns.has("date") && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {getBookingDate(booking)}
                  </span>
                  )}
                  {visibleColumns.has("pax") && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    {booking.passengers} pax
                  </span>
                  )}
                  {visibleColumns.has("agency") && canManage && booking.agencies?.agency_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{booking.agencies.agency_name}</span>
                    </span>
                  )}
                  {booking.booking_type === "package" && (() => {
                    const originCity = getPackageOriginCity(booking);
                    return originCity ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <PlaneTakeoff className="h-3 w-3 shrink-0" />
                        From {originCity}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Lead Passenger - hidden on mobile */}
              {visibleColumns.has("lead") && (
              <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                <User className="h-3 w-3 mr-1 shrink-0" />
                <span className="truncate max-w-[100px]">{getLeadPassengerName(booking)}</span>
              </div>
              )}
            </div>

            {/* Amount */}
            {visibleColumns.has("amount") && (
            <div className="text-right shrink-0 min-w-[80px]">
              <p className="font-bold text-sm">${booking.total_amount.toLocaleString()}</p>
            </div>
            )}

            {/* Status Badge */}
            {visibleColumns.has("status") && (
            <Badge className={cn(
              "gap-1.5 text-[10px] font-semibold rounded-lg border shadow-sm px-2.5 py-1 shrink-0 min-w-[100px] justify-center",
              status.bg, status.color, status.border, status.glow
            )}>
              {(booking.status === "pending_payment" || booking.status === "payment_under_review") && (
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", booking.status === "pending_payment" ? "bg-gold" : "bg-primary")} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", booking.status === "pending_payment" ? "bg-gold" : "bg-primary")} />
                </span>
              )}
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            )}
            {/* Draft Expiry Badge */}
            {booking.status === "draft" && booking.created_at && (() => {
              const minsLeft = Math.max(0, (24 * 60) - differenceInMinutes(new Date(), new Date(booking.created_at)));
              const hLeft = Math.floor(minsLeft / 60);
              if (minsLeft <= 0) return <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 rounded-md px-1.5 py-0 h-4 shrink-0">Expired</Badge>;
              return <Badge className={cn("text-[9px] rounded-md px-1.5 py-0 h-4 shrink-0", hLeft <= 6 ? "bg-gold/10 text-gold border-gold/20" : "bg-muted text-muted-foreground")}>{hLeft}h left</Badge>;
            })()}


            {canManage && isPending && (
              <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  className="h-7 px-2.5 rounded-lg bg-success hover:bg-success/90 text-white text-[10px] font-bold gap-1"
                  onClick={() => handleStatusChange(booking, "confirmed")}
                >
                  <CheckCircle className="h-3 w-3" /> Confirm
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2.5 rounded-lg text-[10px] font-bold gap-1"
                  onClick={() => handleStatusChange(booking, "canceled")}
                >
                  <XCircle className="h-3 w-3" /> Cancel
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <DropdownMenuItem onClick={() => viewDetails(booking)} className="gap-2 rounded-lg">
                    <Eye className="h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {canManage && isPending && (
                    <DropdownMenuItem onClick={() => openVoucherPreview(booking)} className="gap-2 rounded-lg text-success">
                      <Eye className="h-4 w-4" /> Preview & Send Voucher
                    </DropdownMenuItem>
                  )}
                  {canManage && booking.status === "confirmed" && (
                    <DropdownMenuItem onClick={() => sendVoucherEmail(booking)} className="gap-2 rounded-lg text-primary">
                      <Mail className="h-4 w-4" /> Resend Voucher Email
                    </DropdownMenuItem>
                  )}
                  {canManage && (
                    <DropdownMenuItem onClick={() => {
                      setNoteBooking(booking);
                      setNoteText(booking.notes || "");
                      setNoteDialogOpen(true);
                    }} className="gap-2 rounded-lg">
                      <StickyNote className="h-4 w-4" /> Quick Note
                    </DropdownMenuItem>
                  )}
                  {canManage && booking.status !== "canceled" && booking.status !== "refunded" && !isPending && (
                    <DropdownMenuItem onClick={() => handleStatusChange(booking, "canceled")} className="gap-2 rounded-lg text-destructive">
                      <XCircle className="h-4 w-4" /> Cancel Booking
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto animate-fade-in">
      {/* ═══════ COMPACT UNIFIED HEADER ═══════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-coral/[0.03] pointer-events-none" />

        {/* Top row: title + stats + actions */}
        <div className="relative px-5 py-3.5 flex items-center justify-between gap-4 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground tracking-tight leading-tight">
                {canManage ? "Bookings Management" : "My Bookings"}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {canManage ? "Review, approve, and manage all bookings" : "View your booking history"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Inline stats pills */}
            <div className="hidden lg:flex items-center gap-1.5">
              {[
                { label: "Total", value: stats.total, icon: Layers, tone: "text-primary bg-primary/10" },
                { label: "Confirmed", value: stats.confirmed, icon: CheckSquare, tone: "text-success bg-success/10" },
                { label: "Pending", value: stats.pending, icon: Clock3, tone: "text-gold bg-gold/10" },
                { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: TrendingUp, tone: "text-primary bg-primary/10" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg bg-muted/40">
                  <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", s.tone)}>
                    <s.icon className="h-3 w-3" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
                  <span className="text-xs font-bold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>

            {canManage && (
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!filteredBookings?.length} className="rounded-lg gap-1.5 h-9 border-border/60 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!filteredBookings?.length} className="rounded-lg gap-1.5 h-9 border-border/60 text-xs">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile stats (visible below lg) */}
        <div className="lg:hidden relative px-5 py-2.5 flex flex-wrap gap-1.5 border-b border-border/40">
          {[
            { label: "Total", value: stats.total, icon: Layers, tone: "text-primary bg-primary/10" },
            { label: "Confirmed", value: stats.confirmed, icon: CheckSquare, tone: "text-success bg-success/10" },
            { label: "Pending", value: stats.pending, icon: Clock3, tone: "text-gold bg-gold/10" },
            { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: TrendingUp, tone: "text-primary bg-primary/10" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg bg-muted/40">
              <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", s.tone)}>
                <s.icon className="h-3 w-3" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
              <span className="text-xs font-bold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Bottom row: distribution bar + pending alert */}
        {canManage && stats.total > 0 && (
          <div className="relative px-5 py-2.5 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[260px] flex items-center gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">Mix</span>
              <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/40">
                {Object.entries(bookingTypeConfig).map(([key, config]) => {
                  const count = key === "package" ? stats.packages : key === "custom_group" ? stats.custom_group : key === "flight" ? stats.flights : key === "hotel" ? stats.hotels : key === "tour" ? stats.tours : key === "visa" ? stats.visas : stats.transfers;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={key}
                      className={cn("h-full transition-all duration-500", config.barColor)}
                      style={{ width: `${pct}%` }}
                      title={`${config.label}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
              <div className="hidden md:flex items-center gap-2.5 shrink-0">
                {Object.entries(bookingTypeConfig).map(([key, config]) => {
                  const count = key === "package" ? stats.packages : key === "custom_group" ? stats.custom_group : key === "flight" ? stats.flights : key === "hotel" ? stats.hotels : key === "tour" ? stats.tours : key === "visa" ? stats.visas : stats.transfers;
                  if (count === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <div className={cn("h-1.5 w-1.5 rounded-full", config.barColor)} />
                      <span className="font-medium">{config.label}</span>
                      <span className="font-bold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {pendingBookings.length > 0 && (
              <button
                onClick={() => setStatusFilter("pending")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gold/30 bg-gold/5 hover:bg-gold/10 transition-colors shrink-0"
              >
                <div className="h-2 w-2 rounded-full bg-gold animate-pulse" />
                <span className="text-xs font-semibold text-foreground">
                  {pendingBookings.length} awaiting review
                </span>
                <Badge className="bg-gold/15 text-gold border-gold/25 rounded-md text-[10px] font-bold h-5 px-1.5">{pendingBookings.length}</Badge>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════ SEARCH & FILTERS ═══════ */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by booking #, service, agency, or passenger..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl border-border/60 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52 h-11 rounded-xl border-border/60 bg-card">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Admin-only filter cluster */}
        {isAdmin && (
          <>
            {/* Date range filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                  "w-full sm:w-auto h-11 rounded-xl border-border/60 gap-2 font-normal",
                  (dateFrom || dateTo) && "border-primary/40 text-primary"
                )}>
                  <CalendarRange className="h-4 w-4" />
                  {dateFrom && dateTo
                    ? `${format(dateFrom, "dd/MM/yyyy")} – ${format(dateTo, "dd/MM/yyyy")}`
                    : dateFrom
                      ? `From ${format(dateFrom, "dd/MM/yyyy")}`
                      : dateTo
                        ? `To ${format(dateTo, "dd/MM/yyyy")}`
                        : "Date Range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 rounded-xl" align="end">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter by date</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "today", label: "Today" },
                      { key: "7d", label: "Last 7 days" },
                      { key: "month", label: "This Month" },
                      { key: "lastMonth", label: "Last Month" },
                      { key: "year", label: "This Year" },
                    ].map(p => (
                      <Button
                        key={p.key}
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-lg text-[11px] px-2.5"
                        onClick={() => applyDatePreset(p.key as any)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">From</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        className="p-2 pointer-events-auto rounded-lg border border-border/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">To</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        className="p-2 pointer-events-auto rounded-lg border border-border/40"
                      />
                    </div>
                  </div>
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                      Clear dates
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Advanced Filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                  "w-full sm:w-auto h-11 rounded-xl border-border/60 gap-2 font-normal",
                  activeFilterCount > 0 && "border-primary/40 text-primary"
                )}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold ml-0.5">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-4 rounded-xl space-y-4" align="end">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advanced Filters</div>

                {/* Booking type chips */}
                <div className="space-y-2">
                  <div className="text-xs font-medium">Booking Type</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(bookingTypeConfig).map(([key, cfg]) => {
                      const active = advFilters.typeFilters.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAdvFilters(f => ({
                            ...f,
                            typeFilters: active ? f.typeFilters.filter(k => k !== key) : [...f.typeFilters, key],
                          }))}
                          className={cn(
                            "px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors",
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/60 text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Agency dropdown */}
                <div className="space-y-2">
                  <div className="text-xs font-medium">Agency</div>
                  <Select
                    value={advFilters.agencyFilter || "all"}
                    onValueChange={(v) => setAdvFilters(f => ({ ...f, agencyFilter: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger className="h-9 rounded-lg text-xs">
                      <SelectValue placeholder="All agencies" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-64">
                      <SelectItem value="all">All agencies</SelectItem>
                      {agencyOptions.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount range */}
                <div className="space-y-2">
                  <div className="text-xs font-medium">Amount Range ($)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={advFilters.amountMin}
                      onChange={(e) => setAdvFilters(f => ({ ...f, amountMin: e.target.value }))}
                      className="h-9 rounded-lg text-xs"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={advFilters.amountMax}
                      onChange={(e) => setAdvFilters(f => ({ ...f, amountMax: e.target.value }))}
                      className="h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Date field toggle */}
                <div className="space-y-2">
                  <div className="text-xs font-medium">Date Range Applies To</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "created", label: "Booked Date" },
                      { key: "travel", label: "Travel Date" },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setAdvFilters(f => ({ ...f, dateField: opt.key as "created" | "travel" }))}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                          advFilters.dateField === opt.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border/60 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-lg text-xs"
                    onClick={() => setAdvFilters({ typeFilters: [], agencyFilter: "", amountMin: "", amountMax: "", dateField: "created" })}
                  >
                    Clear all
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Column Visibility Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto h-11 rounded-xl gap-2 border-border/60 font-normal">
                  <Eye className="h-4 w-4" />
                  Columns
                  <Badge className="h-5 px-1.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold">
                    {visibleColumns.size}/{allColumns.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-2">
                {allColumns.map(col => (
                  <label key={col.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="h-4 w-4"
                    />
                    {col.label}
                  </label>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* Active Filter Chips (admin-only) */}
      {isAdmin && (advFilters.typeFilters.length > 0 || advFilters.agencyFilter || advFilters.amountMin || advFilters.amountMax || advFilters.dateField === "travel" || dateFrom || dateTo) && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {advFilters.typeFilters.map(t => (
            <button
              key={t}
              onClick={() => setAdvFilters(f => ({ ...f, typeFilters: f.typeFilters.filter(k => k !== t) }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
            >
              Type: {bookingTypeConfig[t]?.label || t}
              <X className="h-3 w-3" />
            </button>
          ))}
          {advFilters.agencyFilter && (
            <button
              onClick={() => setAdvFilters(f => ({ ...f, agencyFilter: "" }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
            >
              Agency: {agencyOptions.find(a => a.id === advFilters.agencyFilter)?.name || advFilters.agencyFilter}
              <X className="h-3 w-3" />
            </button>
          )}
          {(advFilters.amountMin || advFilters.amountMax) && (
            <button
              onClick={() => setAdvFilters(f => ({ ...f, amountMin: "", amountMax: "" }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
            >
              ${advFilters.amountMin || "0"} – ${advFilters.amountMax || "∞"}
              <X className="h-3 w-3" />
            </button>
          )}
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
            >
              {dateFrom ? format(dateFrom, "dd/MM") : "…"} – {dateTo ? format(dateTo, "dd/MM") : "…"}
              <X className="h-3 w-3" />
            </button>
          )}
          {advFilters.dateField === "travel" && (
            <button
              onClick={() => setAdvFilters(f => ({ ...f, dateField: "created" }))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
            >
              Travel Date
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => {
              setAdvFilters({ typeFilters: [], agencyFilter: "", amountMin: "", amountMax: "", dateField: "created" });
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ═══════ BULK ACTION BAR ═══════ */}
      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 animate-fade-in">
          <Checkbox checked={true} className="h-4 w-4" />
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="rounded-lg gap-1.5 h-8 text-xs font-semibold" onClick={() => handleBulkStatus("confirmed")}>
              <CheckCircle className="h-3.5 w-3.5 text-success" /> Confirm
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg gap-1.5 h-8 text-xs font-semibold text-destructive" onClick={() => handleBulkStatus("canceled")}>
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" variant="ghost" className="rounded-lg h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* ═══════ TABBED TABLE ═══════ */}
      {canManage ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "All", icon: Layers, color: "text-primary", count: stats.total },
              ...Object.entries(bookingTypeConfig).map(([key, config]) => ({
                key,
                label: config.label,
                icon: config.icon,
                color: config.color,
                count: key === "package" ? stats.packages : key === "custom_group" ? stats.custom_group : key === "flight" ? stats.flights : key === "hotel" ? stats.hotels : key === "tour" ? stats.tours : key === "visa" ? stats.visas : stats.transfers,
              })),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                      : "bg-card text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : tab.color)} />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[22px] text-center leading-none",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          <BookingsExcelTable
            key={`bookings-excel-grid-v7-${activeTab}`}
            bookings={filteredBookings || []}
            page={bookingPage}
            pageSize={bookingPageSize}
            onPageChange={setBookingPage}
            onPageSizeChange={(size) => { setBookingPageSize(size); setBookingPage(1); }}
            isLoading={isLoading}
            visibleColumns={visibleColumns}
          />
        </Tabs>
      ) : (
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-0">
            {filteredBookings?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="font-medium">No bookings found</p>
              </div>
            ) : (
              <>
                {renderBookingList((filteredBookings || []).slice((bookingPage - 1) * bookingPageSize, bookingPage * bookingPageSize))}
                {(filteredBookings?.length || 0) > bookingPageSize && (
                  <div className="border-t border-border/30 px-4">
                    <TablePagination
                      currentPage={bookingPage}
                      totalPages={Math.ceil((filteredBookings?.length || 0) / bookingPageSize)}
                      pageSize={bookingPageSize}
                      totalItems={filteredBookings?.length || 0}
                      onPageChange={setBookingPage}
                      onPageSizeChange={(size) => { setBookingPageSize(size); setBookingPage(1); }}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}


      {/* Voucher Preview Dialog */}
      <VoucherPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        booking={previewBooking}
        onConfirmSend={() => previewBooking && handleApproveAndSendVoucher(previewBooking)}
        isSending={isSendingVoucher}
      />

      {/* Inline Quick Notes Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) { setNoteBooking(null); setNoteText(""); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <StickyNote className="h-5 w-5 text-primary" />
              Quick Note
              {noteBooking && (
                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md ml-2">{noteBooking.booking_number}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add an internal note for this booking..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="rounded-xl min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
              <Button className="rounded-lg gap-1.5 font-semibold" onClick={handleSaveNote} disabled={updateBooking.isPending}>
                <CheckCircle className="h-4 w-4" /> Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;
