import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, X, Eye, Filter as FilterIcon, Inbox, Rows3, Rows2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Booking } from "@/hooks/useBookings";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";

type SortDir = "asc" | "desc" | null;
type Density = "comfortable" | "compact";

type ColKey =
  | "booking_date"
  | "pnr"
  | "departure"
  | "status"
  | "agent"
  | "group"
  | "hotel"
  | "room_type"
  | "room_qty"
  | "amount"
  | "commission"
  | "net_amount"
  | "penalty";

interface Filters {
  pnr: string;
  status: string;
  agent: string;
  group: string;
  hotel: string;
}

const EMPTY_FILTERS: Filters = {
  pnr: "",
  status: "all",
  agent: "all",
  group: "all",
  hotel: "all",
};

// Status accent colors (left border + pill)
const STATUS_ACCENT: Record<string, { stripe: string; pill: string; dot: string; glow: string }> = {
  pending_payment: { stripe: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", glow: "" },
  payment_under_review: { stripe: "bg-blue-500", pill: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", glow: "" },
  confirmed: { stripe: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", glow: "" },
  canceled: { stripe: "bg-rose-500", pill: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", glow: "" },
  refunded: { stripe: "bg-slate-300", pill: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400", glow: "" },
  draft: { stripe: "bg-slate-200", pill: "bg-slate-50 text-slate-500 border-slate-100", dot: "bg-slate-300", glow: "" },
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  payment_under_review: "Under Review",
  confirmed: "Confirmed",
  canceled: "Canceled",
  refunded: "Refunded",
  draft: "Draft",
};

const STATUS_OPTIONS = [
  "pending_payment",
  "payment_under_review",
  "confirmed",
  "canceled",
  "refunded",
  "draft",
];

function getDeparture(b: Booking): Date | null {
  const d = b.package_departures?.departure_date || b.flights?.departure_date || null;
  return d ? new Date(d) : null;
}

function getGroupLabel(b: Booking): string {
  // GROUP column = only group package name (independent from Hotel column)
  if (b.package_departures?.group_packages?.name) {
    const name = b.package_departures.group_packages.name;
    const city = b.package_departures.group_packages.cities?.name;
    return `${name}${city ? ` (${city})` : ""}`.toUpperCase();
  }
  return "—";
}

function getAgentLabel(b: Booking): string {
  return (b.agencies?.agency_name || b.profiles?.full_name || "—").toUpperCase();
}

function getPnr(b: Booking): string {
  const num = b.booking_number || "";
  const tail = num.split("-").pop() || num;
  return tail.slice(-4).toUpperCase();
}


function parseNotes(b: Booking): Record<string, any> {
  if (!b.notes) return {};
  try { return JSON.parse(b.notes); } catch { return {}; }
}

function getRoomType(b: Booking): string {
  const meta = (b.metadata as any) || {};
  const notes = parseNotes(b);
  return (notes.roomType || meta.roomType || meta.room_type || "—").toString().toUpperCase();
}

function getRoomQty(b: Booking): number {
  const meta = (b.metadata as any) || {};
  if (Array.isArray(meta.roomAssignments)) return meta.roomAssignments.length;
  if (typeof meta.roomCount === "number") return meta.roomCount;
  if (typeof meta.rooms === "number") return meta.rooms;
  // Fallback: estimate 1 room per 2 passengers (min 1)
  const pax = b.passengers || 1;
  return Math.max(1, Math.ceil(pax / 2));
}

function getCommissionRate(b: Booking): number {
  const rate = Number(b.agencies?.commission_rate);
  return isFinite(rate) && rate > 0 ? rate : 0;
}

function getCommissionAmount(b: Booking): number {
  const meta = (b.metadata as any) || {};
  if (typeof meta.totalCommission === "number") return meta.totalCommission;
  if (typeof meta.commission === "number") return meta.commission;
  const rate = getCommissionRate(b);
  return (Number(b.total_amount) || 0) * (rate / 100);
}

function getNetAmount(b: Booking): number {
  return (Number(b.total_amount) || 0) - getCommissionAmount(b);
}

function getPenalty(b: Booking): number {
  const meta = (b.metadata as any) || {};
  if (typeof meta.penalty === "number") return meta.penalty;
  if (typeof meta.penaltyAmount === "number") return meta.penaltyAmount;
  return 0;
}

interface Props {
  bookings: Booking[];
  pageSize: number;
  page: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  isLoading?: boolean;
  visibleColumns?: Set<string>;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

const COLUMN_DEFS: Array<{
  key: ColKey;
  label: string;
  width?: string;
  headerClassName?: string;
}> = [
  { key: "booking_date", label: "Booking Date", width: "130px" },
  { key: "pnr", label: "PNR", width: "100px" },
  { key: "departure", label: "Departure", width: "130px" },
  { key: "status", label: "Status", width: "160px" },
  { key: "agent", label: "Agents", width: "180px" },
  { key: "group", label: "Group" },
  { key: "hotel", label: "Hotel", width: "180px" },
  { key: "room_type", label: "Room Type", width: "110px" },
  { key: "room_qty", label: "Rooms", width: "80px", headerClassName: "text-right" },
  { key: "amount", label: "Amount", width: "120px", headerClassName: "text-right" },
  { key: "commission", label: "Comm.", width: "110px", headerClassName: "text-right" },
  { key: "net_amount", label: "Net Amount", width: "130px", headerClassName: "text-right" },
  { key: "penalty", label: "Penalty", width: "100px", headerClassName: "text-right" },
];

/* ----------------------------- Inline Filter Popover ----------------------------- */
interface InlineFilterProps {
  active: boolean;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

const InlineFilter = ({ active, label, options, value, onChange }: InlineFilterProps) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all w-full justify-between",
            "border border-border/40 bg-slate-50 hover:border-primary/40 hover:bg-slate-100 text-slate-500 hover:text-primary",
            active && "border-primary/50 bg-primary/10 text-primary"
          )}
        >
          <span className="truncate">{value === "all" ? `All ${label}` : (options.find(o => o.value === value)?.label || "All")}</span>
          <FilterIcon className={cn("h-3 w-3 shrink-0", active ? "text-primary" : "text-slate-300")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-white border-border shadow-2xl overflow-hidden" align="start">
        <div className="p-3 border-b border-border bg-slate-50">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">{label} Filter</div>
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search criteria..."
            className="h-8 text-xs bg-white border-border rounded-xl focus-visible:ring-primary/20"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          <button
            onClick={() => { onChange("all"); setOpen(false); setQ(""); }}
            className={cn(
              "w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors",
              value === "all" ? "text-primary bg-primary/5" : "text-slate-600"
            )}
          >
            All Records
          </button>
          {filtered.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
              className={cn(
                "w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors truncate",
                value === o.value ? "text-primary bg-primary/5" : "text-slate-500"
              )}
              title={o.label}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">No matching records</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


export function BookingsExcelTable({ bookings, pageSize, page, onPageChange, onPageSizeChange, isLoading, visibleColumns, isAdmin, onDelete }: Props) {
  const isVisible = (key: ColKey) => !visibleColumns || visibleColumns.has(key);
  const navigate = useNavigate();

  const [density, setDensity] = useState<Density>(() => {
    try { return (localStorage.getItem("bookings-excel-density") as Density) || "comfortable"; }
    catch { return "comfortable"; }
  });
  useEffect(() => { localStorage.setItem("bookings-excel-density", density); }, [density]);

  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const saved = localStorage.getItem("bookings-excel-filters-v2");
      if (saved) return { ...EMPTY_FILTERS, ...JSON.parse(saved) };
    } catch {}
    return EMPTY_FILTERS;
  });
  useEffect(() => {
    localStorage.setItem("bookings-excel-filters-v2", JSON.stringify(filters));
  }, [filters]);

  const [sortKey, setSortKey] = useState<ColKey>("booking_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: ColKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); return; }
    setSortDir(sortDir === "desc" ? "asc" : sortDir === "asc" ? null : "desc");
  };

  const indexed = useMemo(
    () => bookings.map((b, i) => ({ b, idx: i })),
    [bookings]
  );

  const statusValues = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => b.status && s.add(b.status));
    return Array.from(s);
  }, [bookings]);

  const agentValues = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => s.add(getAgentLabel(b)));
    return Array.from(s).sort();
  }, [bookings]);

  const groupValues = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => s.add(getGroupLabel(b)));
    return Array.from(s).sort();
  }, [bookings]);

  const hotelValues = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => b.hotels?.name && s.add(b.hotels.name.toUpperCase()));
    return Array.from(s).sort();
  }, [bookings]);

  const filtered = useMemo(() => {
    return indexed.filter(({ b }) => {
      if (filters.pnr && !getPnr(b).toLowerCase().includes(filters.pnr.toLowerCase())) return false;
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.agent !== "all" && getAgentLabel(b) !== filters.agent) return false;
      if (filters.group !== "all" && getGroupLabel(b) !== filters.group) return false;
      if (filters.hotel !== "all" && (b.hotels?.name || "").toUpperCase() !== filters.hotel) return false;
      return true;
    });
  }, [indexed, filters]);

  const sorted = useMemo(() => {
    if (!sortDir) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any = "", bv: any = "";
      switch (sortKey) {
        case "booking_date": av = a.b.created_at || ""; bv = b.b.created_at || ""; break;
        case "pnr": av = getPnr(a.b); bv = getPnr(b.b); break;
        case "departure": av = getDeparture(a.b)?.getTime() || 0; bv = getDeparture(b.b)?.getTime() || 0; break;
        case "status": av = a.b.status || ""; bv = b.b.status || ""; break;
        case "agent": av = getAgentLabel(a.b); bv = getAgentLabel(b.b); break;
        case "group": av = getGroupLabel(a.b); bv = getGroupLabel(b.b); break;
        case "hotel": av = a.b.hotels?.name || ""; bv = b.b.hotels?.name || ""; break;
        case "room_type": av = getRoomType(a.b); bv = getRoomType(b.b); break;
        case "room_qty": av = getRoomQty(a.b); bv = getRoomQty(b.b); break;
        case "amount": av = a.b.total_amount || 0; bv = b.b.total_amount || 0; break;
        case "commission": av = getCommissionAmount(a.b); bv = getCommissionAmount(b.b); break;
        case "net_amount": av = getNetAmount(a.b); bv = getNetAmount(b.b); break;
        case "penalty": av = getPenalty(a.b); bv = getPenalty(b.b); break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  // Footer summary stats
  const stats = useMemo(() => {
    let total = 0, pending = 0, confirmed = 0;
    sorted.forEach(({ b }) => {
      total += Number(b.total_amount) || 0;
      if (b.status === "pending_payment" || b.status === "payment_under_review") pending++;
      if (b.status === "confirmed") confirmed++;
    });
    return { total, pending, confirmed };
  }, [sorted]);

  const hasActiveFilters =
    !!filters.pnr ||
    filters.status !== "all" || filters.agent !== "all" ||
    filters.group !== "all" || filters.hotel !== "all";

  const activeFilterCount =
    (filters.pnr ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.agent !== "all" ? 1 : 0) +
    (filters.group !== "all" ? 1 : 0) +
    (filters.hotel !== "all" ? 1 : 0);

  // Keyboard navigation
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const handleRowKey = (e: React.KeyboardEvent<HTMLTableRowElement>, bookingId: string) => {
    if (e.key === "Enter") { e.preventDefault(); navigate(`/bookings/${bookingId}`); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const rows = tbodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row]");
      if (!rows) return;
      const idx = Array.from(rows).findIndex(r => r === e.currentTarget);
      const next = e.key === "ArrowDown" ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx - 1);
      rows[next]?.focus();
    }
  };

  const HeaderCell = ({
    colKey, label, className,
  }: { colKey: ColKey; label: string; className?: string }) => {
    const active = sortKey === colKey && sortDir;
    return (
      <th
        onClick={() => toggleSort(colKey)}
        className={cn(
          "px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 cursor-pointer select-none whitespace-nowrap",
          "border-r border-border/40 last:border-r-0 hover:text-primary transition-all group/hcell",
          active && "text-primary bg-primary/5",
          className
        )}
      >
        <div className="inline-flex items-center gap-2">
          {label}
          <div className="flex flex-col gap-0.5">
            <ChevronUp className={cn("h-2.5 w-2.5 transition-all", active === "asc" ? "text-primary" : "text-slate-300 group-hover/hcell:text-slate-500")} />
            <ChevronDown className={cn("h-2.5 w-2.5 transition-all", active === "desc" ? "text-primary" : "text-slate-300 group-hover/hcell:text-slate-500")} />
          </div>
        </div>
      </th>
    );
  };

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-3 py-2.5";
  const visibleOrderedColumns = COLUMN_DEFS.filter(({ key }) => isVisible(key));

  const renderFilterCell = (key: ColKey) => {
    switch (key) {
      case "pnr":
        return (
          <th className="px-2 py-2 border-r border-border/40">
            <Input
              value={filters.pnr}
              onChange={e => setFilters(f => ({ ...f, pnr: e.target.value }))}
              placeholder="Search..."
              className={cn("h-7 text-[10px] rounded-lg font-bold uppercase tracking-widest bg-slate-50 border-border focus-visible:ring-primary/20", filters.pnr && "border-primary/50 bg-primary/10 text-primary")}
            />
          </th>
        );
      case "departure":
        return <th className="px-2 py-1.5 border-r border-border/30" />;
      case "booking_date":
        return <th className="px-2 py-1.5 border-r border-border/30" />;
      case "status":
        return (
          <th className="px-2 py-1.5 border-r border-border/30">
            <InlineFilter
              active={filters.status !== "all"}
              label="Status"
              value={filters.status}
              onChange={v => setFilters(f => ({ ...f, status: v }))}
              options={STATUS_OPTIONS.filter(s => statusValues.includes(s)).map(s => ({ value: s, label: STATUS_LABEL[s] }))}
            />
          </th>
        );
      case "agent":
        return (
          <th className="px-2 py-1.5 border-r border-border/30">
            <InlineFilter
              active={filters.agent !== "all"}
              label="Agent"
              value={filters.agent}
              onChange={v => setFilters(f => ({ ...f, agent: v }))}
              options={agentValues.map(a => ({ value: a, label: a }))}
            />
          </th>
        );
      case "group":
        return (
          <th className="px-2 py-1.5 border-r border-border/30">
            <InlineFilter
              active={filters.group !== "all"}
              label="Group"
              value={filters.group}
              onChange={v => setFilters(f => ({ ...f, group: v }))}
              options={groupValues.map(g => ({ value: g, label: g }))}
            />
          </th>
        );
      case "hotel":
        return (
          <th className="px-2 py-1.5 border-r border-border/30">
            <InlineFilter
              active={filters.hotel !== "all"}
              label="Hotel"
              value={filters.hotel}
              onChange={v => setFilters(f => ({ ...f, hotel: v }))}
              options={hotelValues.map(h => ({ value: h, label: h }))}
            />
          </th>
        );
      default:
        return <th className="px-2 py-1.5 border-r border-border/30" />;
    }
  };

  const renderBodyCell = (b: Booking, key: ColKey) => {
    const dep = getDeparture(b);
    const status = b.status || "draft";
    const accent = STATUS_ACCENT[status] || STATUS_ACCENT.draft;

    switch (key) {
      case "booking_date":
        return (
          <td className={cn(cellPad, "text-slate-500 border-r border-border/40 whitespace-nowrap text-[11px] font-medium tabular-nums relative")}>
            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", accent.stripe)} />
            {b.created_at ? format(new Date(b.created_at), "dd/MM/yyyy") : "---"}
          </td>
        );
      case "pnr":
        return (
          <td className={cn(cellPad, "border-r border-border/40")}>
            <span className="inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded-lg bg-primary/5 border border-primary/20 text-primary font-semibold text-[10px] tracking-wide shadow-sm">
              {getPnr(b)}
            </span>
          </td>
        );
      case "departure":
        return (
          <td className={cn(cellPad, "text-slate-500 border-r border-border/40 whitespace-nowrap text-[11px] font-medium tabular-nums")}>
            {dep ? format(dep, "dd/MM/yyyy") : "---"}
          </td>
        );
      case "status":
        return (
          <td className={cn(cellPad, "border-r border-border/40 whitespace-nowrap")}>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider border",
              accent.pill
            )}>
              <span className={cn("h-1 w-1 rounded-full", accent.dot)} />
              {STATUS_LABEL[status]}
            </span>
          </td>
        );
      case "agent":
        return <td className={cn(cellPad, "font-semibold text-slate-800 border-r border-border/40 whitespace-nowrap truncate max-w-[200px]")}>{getAgentLabel(b)}</td>;
      case "group":
        return <td className={cn(cellPad, "text-slate-500 font-medium border-r border-border/40 truncate max-w-[420px]")}>{getGroupLabel(b)}</td>;
      case "hotel":
        return <td className={cn(cellPad, "text-slate-600 font-medium border-r border-border/40 truncate max-w-[200px]")}>{b.hotels?.name || "---"}</td>;
      case "room_type": {
        const rt = getRoomType(b);
        return (
          <td className={cn(cellPad, "border-r border-border/40 whitespace-nowrap")}>
            {rt === "—" ? (
              <span className="text-slate-300 font-bold">---</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-50 border border-border text-slate-600 font-medium text-[9px] tracking-wide">
                {rt}
              </span>
            )}
          </td>
        );
      }
      case "room_qty":
        return <td className={cn(cellPad, "text-right font-bold text-slate-400 border-r border-border/40 tabular-nums")}>{getRoomQty(b)}</td>;
      case "amount":
        return (
          <td className={cn(cellPad, "text-right font-bold text-slate-800 border-r border-border/40 tabular-nums whitespace-nowrap")}>
            <span className="text-slate-300 font-normal mr-0.5">$</span>
            {Number(b.total_amount || 0).toLocaleString()}
          </td>
        );
      case "commission": {
        const c = getCommissionAmount(b);
        return (
          <td className={cn(cellPad, "text-right font-bold border-r border-border/40 tabular-nums whitespace-nowrap")}>
            {c > 0 ? (
              <span className="text-emerald-600">
                <span className="opacity-40 font-normal mr-0.5">$</span>
                {c.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            ) : <span className="text-slate-200 font-bold">---</span>}
          </td>
        );
      }
      case "net_amount":
        return (
          <td className={cn(cellPad, "text-right font-bold border-r border-border/40 tabular-nums whitespace-nowrap text-slate-700")}>
            <span className="text-slate-300 font-normal mr-0.5">$</span>
            {getNetAmount(b).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </td>
        );
      case "penalty": {
        const p = getPenalty(b);
        return (
          <td className={cn(cellPad, "text-right font-bold border-r border-border/40 tabular-nums whitespace-nowrap")}>
            {p > 0 ? (
              <span className="text-rose-600">
                <span className="opacity-40 font-normal mr-0.5">$</span>
                {p.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            ) : <span className="text-slate-200 font-bold">---</span>}
          </td>
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Top bar: row count + grid filters + density */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-slate-50 border-b border-border/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 min-h-[24px] relative z-10">
          {hasActiveFilters ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.1em]">
                ACTIVE_FILTERS: {sorted.length}/{bookings.length} Bookings
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white hover:bg-primary/20 rounded-md"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                <X className="h-3 w-3 mr-1" /> Reset Grid
              </Button>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {bookings.length} Registered Bookings
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {/* Grid Filters popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl border-border bg-white hover:bg-slate-50 text-slate-600 transition-all",
                  hasActiveFilters && "border-primary/40 bg-primary/10 text-primary"
                )}
              >
                <FilterIcon className="h-3.5 w-3.5" />
                Filter Records
                {hasActiveFilters && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-md bg-primary text-white text-[9px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-white border-border rounded-2xl shadow-2xl overflow-hidden" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Grid Configuration</div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                  >
                    <X className="h-3 w-3 mr-1" /> RESET
                  </Button>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Booking PNR</label>
                  <Input
                    value={filters.pnr}
                    onChange={e => setFilters(f => ({ ...f, pnr: e.target.value }))}
                    placeholder="Enter PNR..."
                    className={cn("h-8 text-xs bg-slate-50 border-border rounded-xl  focus-visible:ring-primary/20", filters.pnr && "border-primary/50 bg-primary/10 text-primary")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Booking Status</label>
                  <InlineFilter
                    active={filters.status !== "all"}
                    label="Status"
                    value={filters.status}
                    onChange={v => setFilters(f => ({ ...f, status: v }))}
                    options={STATUS_OPTIONS.filter(s => statusValues.includes(s)).map(s => ({ value: s, label: STATUS_LABEL[s] }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Travel Agent</label>
                  <InlineFilter
                    active={filters.agent !== "all"}
                    label="Agent"
                    value={filters.agent}
                    onChange={v => setFilters(f => ({ ...f, agent: v }))}
                    options={agentValues.map(a => ({ value: a, label: a }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Package Group</label>
                  <InlineFilter
                    active={filters.group !== "all"}
                    label="Group"
                    value={filters.group}
                    onChange={v => setFilters(f => ({ ...f, group: v }))}
                    options={groupValues.map(g => ({ value: g, label: g }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hotel Name</label>
                  <InlineFilter
                    active={filters.hotel !== "all"}
                    label="Hotel"
                    value={filters.hotel}
                    onChange={v => setFilters(f => ({ ...f, hotel: v }))}
                    options={hotelValues.map(h => ({ value: h, label: h }))}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 border border-border p-1 shadow-inner">
            <button
              onClick={() => setDensity("comfortable")}
              className={cn(
                "inline-flex items-center gap-2 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                density === "comfortable" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
              title="Comfortable density"
            >
              <Rows3 className="h-3 w-3" /> COMFORT
            </button>
            <button
              onClick={() => setDensity("compact")}
              className={cn(
                "inline-flex items-center gap-2 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                density === "compact" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
              title="Compact density"
            >
              <Rows2 className="h-3 w-3" /> COMPACT
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1800px] text-xs border-collapse table-fixed">
          <colgroup>
            {visibleOrderedColumns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
            <col style={{ width: "48px" }} />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-md">
            <tr className="border-b border-border/60 bg-slate-50/50">
              {visibleOrderedColumns.map((column) => (
                <HeaderCell key={column.key} colKey={column.key} label={column.label} className={column.headerClassName} />
              ))}
              <th className="px-2 border-r border-border/30 last:border-r-0" />
            </tr>

            <tr className="border-b-2 border-border/60 bg-white/50">
              {visibleOrderedColumns.map((column) => (
                <Fragment key={`filter-${column.key}`}>{renderFilterCell(column.key)}</Fragment>
              ))}
              <th />
            </tr>
          </thead>

          <tbody ref={tbodyRef}>
            {(() => {
              const visCount = visibleOrderedColumns.length + 1;
              if (isLoading) {
                return Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-border/30">
                    {Array.from({ length: visCount }).map((__, j) => (
                      <td key={j} className={cellPad}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ));
              }
              if (paged.length === 0) {
                return (
                  <tr>
                    <td colSpan={visCount} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                          <Inbox className="h-7 w-7 opacity-60" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">No bookings match your filters</p>
                        <p className="text-xs">Try adjusting or clearing the filters.</p>
                        {hasActiveFilters && (
                          <Button size="sm" variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                            <X className="h-3 w-3 mr-1" /> Clear filters
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }
              return paged.map(({ b }, rowIdx) => {
                const status = b.status || "draft";
                const accent = STATUS_ACCENT[status] || STATUS_ACCENT.draft;
                return (
                  <tr
                    key={b.id}
                    data-row
                    tabIndex={0}
                    onKeyDown={(e) => handleRowKey(e, b.id)}
                    onClick={() => navigate(`/bookings/${b.id}`)}
                    className={cn(
                      "group border-b border-slate-200 hover:bg-slate-50 transition-all cursor-pointer relative",
                      rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}
                  >
                    {visibleOrderedColumns.map((column) => (
                      <Fragment key={`${b.id}-${column.key}`}>{renderBodyCell(b, column.key)}</Fragment>
                    ))}
                    <td className={cn(density === "compact" ? "px-2 py-1" : "px-2 py-2", "text-center whitespace-nowrap")}>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${b.id}`); }}
                          title="View booking"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                            title="Delete booking"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Sticky footer summary - Professional BI Style */}
      <div className="border-t border-border/60 bg-slate-50 px-4 py-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-success/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4 text-[10px] relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Visible BOOKINGS</span>
              <span className="text-slate-600 font-bold"><span className="text-primary">{paged.length}</span> / {sorted.length}</span>
            </div>
            <div className="h-6 w-px bg-border/40" />
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Asset Valuation</span>
              <span className="text-emerald-600 font-bold tabular-nums tracking-tighter">${stats.total.toLocaleString()}</span>
            </div>
            <div className="h-6 w-px bg-border/40" />
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Active review</span>
              <span className="text-amber-600 font-bold">{stats.pending} BOOKINGS</span>
            </div>
            <div className="h-6 w-px bg-border/40" />
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold uppercase tracking-widest mb-0.5">Confirmed</span>
              <span className="text-primary font-bold">{stats.confirmed} BOOKINGS</span>
            </div>
          </div>
        </div>
      </div>

      {sorted.length > pageSize && (
        <div className="bg-white border-t border-border/60">
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sorted.length}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
