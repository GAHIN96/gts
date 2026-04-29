import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs, AuditLogFilters } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Calendar, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "booking", label: "Booking" },
  { value: "financial", label: "Financial" },
  { value: "permission", label: "Permission" },
  { value: "user", label: "User" },
  { value: "agency", label: "Agency" },
  { value: "data_change", label: "Data Change" },
];

const ACTIONS = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
];

const TABLE_NAMES = [
  { value: "all", label: "All Tables" },
  { value: "bookings", label: "Bookings" },
  { value: "payments", label: "Payments" },
  { value: "user_roles", label: "User Roles" },
  { value: "profiles", label: "Profiles" },
  { value: "agencies", label: "Agencies" },
  { value: "flights", label: "Flights" },
  { value: "hotels", label: "Hotels" },
  { value: "group_packages", label: "Group Packages" },
];

function getActionBadge(action: string) {
  const styles: Record<string, string> = {
    create: "text-emerald-600 border-emerald-300",
    update: "text-blue-600 border-blue-300",
    delete: "text-red-600 border-red-300",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${styles[action] || "text-muted-foreground"}`}>
      {action}
    </Badge>
  );
}

function getEventBadge(eventType: string) {
  const styles: Record<string, string> = {
    booking: "text-purple-600 border-purple-300",
    financial: "text-amber-600 border-amber-300",
    permission: "text-rose-600 border-rose-300",
    user: "text-sky-600 border-sky-300",
    agency: "text-teal-600 border-teal-300",
    data_change: "text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${styles[eventType] || styles.data_change}`}>
      {eventType.replace("_", " ")}
    </Badge>
  );
}

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const { data, isLoading } = useAuditLogs(filters, page);

  const updateFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Audit Logs
        </h1>
        <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5">
          {data?.totalCount || 0} entries
        </Badge>
        <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5 text-amber-600 border-amber-300">
          Immutable
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email..."
            value={filters.search || ""}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filters.eventType || "all"} onValueChange={(v) => updateFilter("eventType", v)}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.action || "all"} onValueChange={(v) => updateFilter("action", v)}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.tableName || "all"} onValueChange={(v) => updateFilter("tableName", v)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TABLE_NAMES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <DateInput
            value={filters.dateFrom || ""}
            onValueChange={(iso) => updateFilter("dateFrom", iso)}
            className="h-8 w-[130px] text-xs"
          />
          <span className="text-muted-foreground text-[10px]">to</span>
          <DateInput
            value={filters.dateTo || ""}
            onValueChange={(iso) => updateFilter("dateTo", iso)}
            className="h-8 w-[130px] text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs px-2">Clear</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[150px]">Timestamp</TableHead>
                <TableHead className="text-xs w-[90px]">Event</TableHead>
                <TableHead className="text-xs w-[80px]">Action</TableHead>
                <TableHead className="text-xs w-[120px]">Table</TableHead>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[130px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-6 rounded" /></TableCell>
                  </TableRow>
                ))
              ) : !data?.logs.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                    No audit logs found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>{getEventBadge(log.event_type)}</TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <span className="text-[11px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {log.table_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[180px]">
                      {log.entity_name || "—"}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[130px] text-muted-foreground">
                          {log.user_email || "System"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t">
              <p className="text-[11px] text-muted-foreground">
                Page {page} of {data.totalPages} ({data.totalCount} entries)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Timestamp</p>
                    <p className="text-xs font-mono">
                      {format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">User</p>
                    <p className="text-xs">{selectedLog.user_email || "System"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Event Type</p>
                    {getEventBadge(selectedLog.event_type)}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Action</p>
                    {getActionBadge(selectedLog.action)}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Table</p>
                    <p className="text-xs font-mono">{selectedLog.table_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Record ID</p>
                    <p className="text-[10px] font-mono break-all text-muted-foreground">{selectedLog.record_id || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wider">Entity</p>
                    <p className="text-xs">{selectedLog.entity_name || "—"}</p>
                  </div>
                </div>

                {selectedLog.old_data && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Previous Data</p>
                    <pre className="text-[11px] bg-muted p-2.5 rounded-lg overflow-auto max-h-40 font-mono">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">New Data</p>
                    <pre className="text-[11px] bg-muted p-2.5 rounded-lg overflow-auto max-h-40 font-mono">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
