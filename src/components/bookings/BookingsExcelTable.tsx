import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, X, Eye, Filter as FilterIcon, Inbox, Rows3, Rows2 } from "lucide-react";
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
const STATUS_ACCENT: Record<string, { stripe: string; pill: string; dot: string }> = {
  pending_payment: { stripe: "before:bg-rose-500",   pill: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",   dot: "bg-rose-500" },
  payment_under_review: { stripe: "before:bg-amber-500", pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", dot: "bg-amber-500" },
  confirmed: { stripe: "before:bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500" },
  canceled: { stripe: "before:bg-rose-700", pill: "bg-rose-200 text-rose-800 dark:bg-rose-700/30 dark:text-rose-200", dot: "bg-rose-700" },
  refunded: { stripe: "before:bg-slate-400", pill: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300", dot: "bg-slate-400" },
  draft: { stripe: "before:bg-muted-foreground/40", pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "PENDING",
  payment_under_review: "IN PROCESS",
  confirmed: "CONFIRMED",
  canceled: "CANCELED",
  refunded: "REFUNDED",
  draft: "DRAFT",
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
  { key: "status", label: "Status", width: "140px" },
  { key: "agent", label: "Agents", width: "170px" },
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
function InlineFilter({ active, label, options, value, onChange }: InlineFilterProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-[11px] font-semibold transition-colors w-full justify-between",
            "border border-transparent hover:border-border hover:bg-background",
            active && "border-primary/50 bg-primary/10 text-primary"
          )}
        >
          <span className="truncate">{value === "all" ? "All" : (options.find(o => o.value === value)?.label || "All")}</span>
          <FilterIcon className={cn("h-3 w-3 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search…"
            className="h-7 text-xs"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          <button
            onClick={() => { onChange("all"); setOpen(false); setQ(""); }}
            className={cn(
              "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors",
              value === "all" && "bg-primary/10 text-primary font-semibold"
            )}
          >
            All
          </button>
          {filtered.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors truncate",
                value === o.value && "bg-primary/10 text-primary font-semibold"
              )}
              title={o.label}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


export function BookingsExcelTable({ bookings, pageSize, page, onPageChange, onPageSizeChange, isLoading, visibleColumns }: Props) {
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
          "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-foreground/70 cursor-pointer select-none whitespace-nowrap",
          "border-r border-border/30 last:border-r-0 hover:text-primary transition-colors",
          active && "text-primary",
          className
        )}
      >
        <div className="inline-flex items-center gap-1.5">
          {label}
          {active === "asc" ? <ChevronUp className="h-3 w-3" /> :
           active === "desc" ? <ChevronDown className="h-3 w-3" /> :
           <ChevronDown className="h-3 w-3 opacity-20" />}
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
          <th className="px-2 py-1.5 border-r border-border/30">
            <Input
              value={filters.pnr}
              onChange={e => setFilters(f => ({ ...f, pnr: e.target.value }))}
              placeholder="PNR…"
              className={cn("h-7 text-[11px] rounded-md font-mono", filters.pnr && "border-primary/50 bg-primary/5")}
            />
          </th>
        );
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
          <td className={cn(cellPad, "text-foreground border-r border-border/30 whitespace-nowrap tabular-nums")}>
            {b.created_at ? format(new Date(b.created_at), "dd/MM/yyyy") : "—"}
          </td>
        );
      case "pnr":
        return (
          <td className={cn(cellPad, "border-r border-border/30")}>
            <span className="inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded-md bg-orange-500 text-white font-mono font-bold text-[11px] tracking-wider shadow-sm shadow-orange-500/30">
              {getPnr(b)}
            </span>
          </td>
        );
      case "departure":
        return (
          <td className={cn(cellPad, "text-foreground border-r border-border/30 whitespace-nowrap tabular-nums")}>
            {dep ? format(dep, "dd/MM/yyyy") : "—"}
          </td>
        );
      case "status":
        return (
          <td className={cn(cellPad, "border-r border-border/30 whitespace-nowrap")}>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
              accent.pill
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", accent.dot)} />
              {STATUS_LABEL[status]}
            </span>
          </td>
        );
      case "agent":
        return <td className={cn(cellPad, "font-semibold text-foreground border-r border-border/30 whitespace-nowrap truncate max-w-[200px]")}>{getAgentLabel(b)}</td>;
      case "group":
        return <td className={cn(cellPad, "text-foreground border-r border-border/30 truncate max-w-[420px]")}>{getGroupLabel(b)}</td>;
      case "hotel":
        return <td className={cn(cellPad, "text-foreground border-r border-border/30 truncate max-w-[200px]")}>{(b.hotels?.name || "—").toUpperCase()}</td>;
      case "room_type": {
        const rt = getRoomType(b);
        return (
          <td className={cn(cellPad, "border-r border-border/30 whitespace-nowrap")}>
            {rt === "—" ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] tracking-wider">
                {rt}
              </span>
            )}
          </td>
        );
      }
      case "room_qty":
        return <td className={cn(cellPad, "text-right font-semibold text-foreground border-r border-border/30 tabular-nums")}>{getRoomQty(b)}</td>;
      case "amount":
        return (
          <td className={cn(cellPad, "text-right font-bold text-foreground border-r border-border/30 tabular-nums whitespace-nowrap")}>
            <span className="text-muted-foreground font-normal mr-0.5">$</span>
            {Number(b.total_amount || 0).toLocaleString()}
          </td>
        );
      case "commission": {
        const c = getCommissionAmount(b);
        return (
          <td className={cn(cellPad, "text-right font-semibold border-r border-border/30 tabular-nums whitespace-nowrap")}>
            {c > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                <span className="opacity-60 font-normal mr-0.5">$</span>
                {c.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            ) : <span className="text-muted-foreground">—</span>}
          </td>
        );
      }
      case "net_amount":
        return (
          <td className={cn(cellPad, "text-right font-bold border-r border-border/30 tabular-nums whitespace-nowrap text-foreground")}>
            <span className="text-muted-foreground font-normal mr-0.5">$</span>
            {getNetAmount(b).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </td>
        );
      case "penalty": {
        const p = getPenalty(b);
        return (
          <td className={cn(cellPad, "text-right font-semibold border-r border-border/30 tabular-nums whitespace-nowrap")}>
            {p > 0 ? (
              <span className="text-rose-600 dark:text-rose-400">
                <span className="opacity-60 font-normal mr-0.5">$</span>
                {p.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            ) : <span className="text-muted-foreground">—</span>}
          </td>
        );
      }
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Top bar: row count + grid filters + density */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gradient-to-r from-muted/40 to-muted/10 border-b border-border/50">
        <div className="flex items-center gap-2 min-h-[24px]">
          {hasActiveFilters ? (
            <>
              <span className="text-[11px] font-semibold text-primary">
                Filters active — {sorted.length} of {bookings.length} rows
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-primary hover:text-primary"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            </>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Grid Filters popover — styled like Date Range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 text-[11px] font-semibold rounded-md",
                  hasActiveFilters && "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <FilterIcon className="h-3.5 w-3.5" />
                Grid Filters
                {hasActiveFilters && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {[
                      filters.pnr ? 1 : 0,
                      filters.status !== "all" ? 1 : 0,
                      filters.agent !== "all" ? 1 : 0,
                      filters.group !== "all" ? 1 : 0,
                      filters.hotel !== "all" ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Grid Filters</div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                  >
                    <X className="h-3 w-3 mr-1" /> Reset
                  </Button>
                )}
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PNR</label>
                  <Input
                    value={filters.pnr}
                    onChange={e => setFilters(f => ({ ...f, pnr: e.target.value }))}
                    placeholder="Search PNR…"
                    className={cn("h-8 text-xs mt-1 font-mono", filters.pnr && "border-primary/50 bg-primary/5")}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <InlineFilter
                      active={filters.status !== "all"}
                      label="Status"
                      value={filters.status}
                      onChange={v => setFilters(f => ({ ...f, status: v }))}
                      options={STATUS_OPTIONS.filter(s => statusValues.includes(s)).map(s => ({ value: s, label: STATUS_LABEL[s] }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agent</label>
                  <div className="mt-1">
                    <InlineFilter
                      active={filters.agent !== "all"}
                      label="Agent"
                      value={filters.agent}
                      onChange={v => setFilters(f => ({ ...f, agent: v }))}
                      options={agentValues.map(a => ({ value: a, label: a }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group</label>
                  <div className="mt-1">
                    <InlineFilter
                      active={filters.group !== "all"}
                      label="Group"
                      value={filters.group}
                      onChange={v => setFilters(f => ({ ...f, group: v }))}
                      options={groupValues.map(g => ({ value: g, label: g }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hotel</label>
                  <div className="mt-1">
                    <InlineFilter
                      active={filters.hotel !== "all"}
                      label="Hotel"
                      value={filters.hotel}
                      onChange={v => setFilters(f => ({ ...f, hotel: v }))}
                      options={hotelValues.map(h => ({ value: h, label: h }))}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 rounded-md bg-background border border-border/60 p-0.5">
          <button
            onClick={() => setDensity("comfortable")}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold transition-colors",
              density === "comfortable" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="Comfortable density"
          >
            <Rows3 className="h-3 w-3" /> Comfortable
          </button>
          <button
            onClick={() => setDensity("compact")}
            className={cn(
              "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold transition-colors",
              density === "compact" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title="Compact density"
          >
            <Rows2 className="h-3 w-3" /> Compact
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
          <thead className="sticky top-0 z-10 bg-gradient-to-b from-muted/80 to-muted/50 backdrop-blur-sm">
            <tr className="border-b border-border/60">
              {visibleOrderedColumns.map((column) => (
                <HeaderCell key={column.key} colKey={column.key} label={column.label} className={column.headerClassName} />
              ))}
              <th className="px-2 border-r border-border/30 last:border-r-0" />
            </tr>

            <tr className="border-b-2 border-border/60 bg-background/60">
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
                      "group relative border-b border-border/30 cursor-pointer transition-all outline-none",
                      "hover:bg-primary/5 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]",
                      "focus-visible:bg-primary/10 focus-visible:shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.4)]",
                      rowIdx % 2 === 1 && "bg-muted/20",
                      "before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
                      accent.stripe
                    )}
                  >
                    {visibleOrderedColumns.map((column) => (
                      <Fragment key={`${b.id}-${column.key}`}>{renderBodyCell(b, column.key)}</Fragment>
                    ))}
                    <td className={cn(density === "compact" ? "px-2 py-1" : "px-2 py-2", "text-center")}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${b.id}`); }}
                        title="View booking"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Sticky footer summary */}
      <div className="border-t border-border/60 bg-gradient-to-r from-muted/40 to-muted/10 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-foreground">
            Showing <span className="text-primary">{paged.length}</span> of <span className="text-primary">{sorted.length}</span> bookings
          </span>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <span className="font-semibold text-foreground tabular-nums">
            Total: <span className="text-emerald-600 dark:text-emerald-400">${stats.total.toLocaleString()}</span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <span className="font-semibold text-foreground">
            Pending: <span className="text-amber-600 dark:text-amber-400">{stats.pending}</span>
          </span>
          <span className="text-muted-foreground hidden sm:inline">·</span>
          <span className="font-semibold text-foreground">
            Confirmed: <span className="text-emerald-600 dark:text-emerald-400">{stats.confirmed}</span>
          </span>
        </div>
      </div>

      {sorted.length > pageSize && (
        <div className="border-t border-border/40 px-4">
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
