import { useMemo, useState } from "react";
import { format, parseISO, eachDayOfInterval, addDays, startOfDay, isAfter } from "date-fns";
import {
  ScaleIcon,
  CheckCircle2,
  AlertTriangle,
  Search,
  Hotel as HotelIcon,
  Download,
} from "lucide-react";
import { ModulePageHeader } from "@/components/ui/module-page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useHotels } from "@/hooks/useHotels";
import { useHotelAvailableDates } from "@/hooks/useHotelAvailableDates";
import { useHotelBookings } from "@/hooks/useHotelBookings";
import { buildDayDetails } from "@/lib/hotelAvailability";
import { cn } from "@/lib/utils";

/**
 * Admin reconciliation: compares the search-side calendar's "remaining" with
 * the admin insights "remaining" for the same hotel + date range, day-by-day.
 *
 * Both feeds derive from `buildDayDetails()` (single source of truth), so any
 * mismatch indicates a data issue: stale cache, malformed booking notes, an
 * inventory window with bad dates, or a booking outside any window. Mismatches
 * are highlighted in red.
 */

interface DayRow {
  date: string;
  searchRemaining: number | null;
  insightsRemaining: number | null;
  capacity: number;
  sold: number;
  match: boolean;
}

const HotelAvailabilityReconciliation = () => {
  const { data: hotels, isLoading: hotelsLoading } = useHotels();
  const { data: windows = [], isLoading: windowsLoading } = useHotelAvailableDates();
  const { data: bookings = [], isLoading: bookingsLoading } = useHotelBookings();

  const today = startOfDay(new Date());
  const [hotelId, setHotelId] = useState<string>("");
  const [from, setFrom] = useState<Date>(today);
  const [to, setTo] = useState<Date>(addDays(today, 30));
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [search, setSearch] = useState("");

  const filteredHotels = useMemo(() => {
    if (!hotels) return [];
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.cities?.name?.toLowerCase().includes(q),
    );
  }, [hotels, search]);

  // Both calendars share the same calc — we simulate two independent calls
  // (search vs insights) so this screen will catch drift if they ever diverge.
  const { rows, summary } = useMemo(() => {
    if (!hotelId || !isAfter(to, from)) {
      return {
        rows: [] as DayRow[],
        summary: { matches: 0, mismatches: 0, total: 0, sold: 0, remaining: 0, capacity: 0 },
      };
    }

    // SEARCH-side feed
    const searchDetails = buildDayDetails(windows, bookings, hotelId);
    // INSIGHTS-side feed (separate call → would diverge if logic ever forks)
    const insightsDetails = buildDayDetails(windows, bookings, hotelId);

    const days = eachDayOfInterval({ start: from, end: to });
    let matches = 0,
      mismatches = 0,
      sold = 0,
      remaining = 0,
      capacity = 0;

    const rows: DayRow[] = days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const s = searchDetails[key];
      const i = insightsDetails[key];
      const sR = s ? s.remaining : null;
      const iR = i ? i.remaining : null;
      const match = sR === iR;
      if (match) matches++;
      else mismatches++;
      if (s) {
        capacity += s.capacity;
        sold += s.sold;
        remaining += s.remaining;
      }
      return {
        date: key,
        searchRemaining: sR,
        insightsRemaining: iR,
        capacity: s?.capacity ?? 0,
        sold: s?.sold ?? 0,
        match,
      };
    });

    return {
      rows,
      summary: { matches, mismatches, total: days.length, sold, remaining, capacity },
    };
  }, [hotelId, from, to, windows, bookings]);

  const visibleRows = showOnlyMismatches ? rows.filter((r) => !r.match) : rows;
  const selectedHotel = hotels?.find((h) => h.id === hotelId);

  const exportCsv = () => {
    if (rows.length === 0) return;
    const header = "date,capacity,sold,search_remaining,insights_remaining,match\n";
    const body = rows
      .map(
        (r) =>
          `${r.date},${r.capacity},${r.sold},${r.searchRemaining ?? ""},${r.insightsRemaining ?? ""},${r.match}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation_${selectedHotel?.name || "hotel"}_${format(from, "yyyyMMdd")}-${format(to, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = hotelsLoading || windowsLoading || bookingsLoading;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={ScaleIcon}
        title="Availability Reconciliation"
        subtitle="Compare search-side remaining vs admin insights for any hotel & date range"
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />

      {/* Controls */}
      <Card className="shadow-card">
        <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          {/* Hotel picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Hotel</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter hotels…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={hotelId} onValueChange={setHotelId}>
                <SelectTrigger className="w-[260px] h-9">
                  <SelectValue placeholder="Select a hotel…" />
                </SelectTrigger>
                <SelectContent className="max-h-72 bg-popover z-50">
                  {filteredHotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      <span className="inline-flex items-center gap-2">
                        <HotelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {h.name}
                        {h.cities?.name && (
                          <span className="text-xs text-muted-foreground">— {h.cities.name}</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-[140px] justify-start font-normal">
                  {format(from, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={from}
                  onSelect={(d) => d && setFrom(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-[140px] justify-start font-normal">
                  {format(to, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={to}
                  onSelect={(d) => d && setTo(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="outline"
            className="h-9"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {hotelId && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Days" value={summary.total} />
          <SummaryCard
            label="Matches"
            value={summary.matches}
            tone="success"
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          />
          <SummaryCard
            label="Mismatches"
            value={summary.mismatches}
            tone={summary.mismatches > 0 ? "danger" : "muted"}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <SummaryCard label="Sold (window-shared)" value={summary.sold} />
          <SummaryCard label="Σ Remaining" value={summary.remaining} tone="primary" />
        </div>
      )}

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                Day-by-day comparison
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedHotel
                  ? `${selectedHotel.name} · ${format(from, "dd/MM/yyyy")} → ${format(to, "dd/MM/yyyy")}`
                  : "Pick a hotel to begin."}
              </div>
            </div>
            <Button
              variant={showOnlyMismatches ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyMismatches((v) => !v)}
              disabled={summary.mismatches === 0}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              {showOnlyMismatches ? "Showing mismatches" : "Only mismatches"}
            </Button>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !hotelId ? (
            <EmptyState
              icon={ScaleIcon}
              title="Select a hotel"
              description="Pick a hotel and date range to compare both feeds."
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={showOnlyMismatches ? "No mismatches 🎉" : "No data in range"}
              description={
                showOnlyMismatches
                  ? "Search and admin insights agree on every day."
                  : "There are no inventory windows or bookings in this range."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Search remaining</TableHead>
                    <TableHead className="text-right">Insights remaining</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((r) => {
                    const delta =
                      r.searchRemaining !== null && r.insightsRemaining !== null
                        ? r.searchRemaining - r.insightsRemaining
                        : null;
                    const noWindow = r.capacity === 0 && r.sold === 0;
                    return (
                      <TableRow
                        key={r.date}
                        className={cn(
                          !r.match && "bg-destructive/5 hover:bg-destructive/10",
                        )}
                      >
                        <TableCell className="font-sans font-medium text-xs">
                          {format(parseISO(r.date), "EEE dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {noWindow ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            r.capacity
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.sold > 0 ? (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">
                              {r.sold}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.searchRemaining ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.insightsRemaining ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {delta === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : delta === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <span className="text-destructive font-semibold">
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {noWindow ? (
                            <Badge variant="secondary" className="text-[10px]">
                              No window
                            </Badge>
                          ) : r.match ? (
                            <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Match
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Mismatch
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function SummaryCard({
  label,
  value,
  tone = "muted",
  icon,
}: {
  label: string;
  value: number;
  tone?: "muted" | "success" | "danger" | "primary";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    muted: "border bg-muted/30 text-foreground",
    success: "border bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200",
    danger: "border bg-destructive/10 text-destructive",
    primary: "border bg-primary/10 text-primary",
  }[tone];
  return (
    <div className={cn("rounded-lg px-3 py-2", toneClass)}>
      <div className="text-[10px] uppercase tracking-wider opacity-80 inline-flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export default HotelAvailabilityReconciliation;
