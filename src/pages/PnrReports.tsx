import { useState, useMemo } from "react";
import { usePnrBookings } from "@/hooks/usePnrBookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Search, Plane, Users, TrendingUp, BarChart3, Calendar, MapPin } from "lucide-react";

const PnrReports = () => {
  const { data: bookings = [], isLoading } = usePnrBookings();

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterAirline, setFilterAirline] = useState("all");
  const [filterRoute, setFilterRoute] = useState("all");
  const [filterTicketType, setFilterTicketType] = useState("all");
  const [filterGroupSize, setFilterGroupSize] = useState("all");
  const [filterModified, setFilterModified] = useState("all");

  const airlines = useMemo(() => [...new Set(bookings.map((b) => b.airline))].sort(), [bookings]);
  const routes = useMemo(() => [...new Set(bookings.map((b) => b.route))].sort(), [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch = !search ||
        b.pnr.toLowerCase().includes(search.toLowerCase()) ||
        b.pnr_passengers?.some((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()));
      const matchDateFrom = !dateFrom || b.flight_date >= dateFrom;
      const matchDateTo = !dateTo || b.flight_date <= dateTo;
      const matchAirline = filterAirline === "all" || b.airline === filterAirline;
      const matchRoute = filterRoute === "all" || b.route === filterRoute;
      const matchTicket = filterTicketType === "all" || b.ticket_type === filterTicketType;
      const paxCount = b.pnr_passengers?.length || 0;
      const matchGroupSize = filterGroupSize === "all" ||
        (filterGroupSize === "1" && paxCount === 1) ||
        (filterGroupSize === "2" && paxCount === 2) ||
        (filterGroupSize === "3+" && paxCount >= 3);
      const matchModified = filterModified === "all" || (filterModified === "yes" ? b.is_modified : !b.is_modified);
      return matchSearch && matchDateFrom && matchDateTo && matchAirline && matchRoute && matchTicket && matchGroupSize && matchModified;
    });
  }, [bookings, search, dateFrom, dateTo, filterAirline, filterRoute, filterTicketType, filterGroupSize, filterModified]);

  // KPIs
  const totalBookings = filtered.length;
  const totalPassengers = filtered.reduce((s, b) => s + (b.pnr_passengers?.length || 0), 0);
  const avgPerBooking = totalBookings ? (totalPassengers / totalBookings).toFixed(1) : "0";

  const topRoutes = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((b) => { counts[b.route] = (counts[b.route] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const topAirlines = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((b) => { counts[b.airline] = (counts[b.airline] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const flightsPerDay = useMemo(() => {
    const days = new Set(filtered.map((b) => b.flight_date));
    return days.size ? (totalBookings / days.size).toFixed(1) : "0";
  }, [filtered, totalBookings]);

  const exportBookingReport = () => {
    const rows = filtered.map((b) => ({
      PNR: b.pnr,
      "Passenger Count": b.pnr_passengers?.length || 0,
      Airline: b.airline,
      Route: b.route,
      Date: b.flight_date,
      "Ticket Type": b.ticket_type === "round_trip" ? "Round Trip" : "One Way",
      "Has Hotel": b.hotel ? "Yes" : "No",
      Modified: b.is_modified ? "Yes" : "No",
    }));
    if (rows.length === 0) { toast.error("No data to export"); return; }
    exportToExcel(rows, "Booking Report", `Booking_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Booking report exported");
  };

  const exportPassengerReport = () => {
    const rows = filtered.flatMap((b) =>
      (b.pnr_passengers || []).map((p) => ({
        PNR: b.pnr,
        Title: p.title,
        "First Name": p.first_name,
        "Last Name": p.last_name,
        "Ticket Number": p.ticket_number || "",
        "Ticket Type": b.ticket_type === "round_trip" ? "Round Trip" : "One Way",
        Route: b.route,
        "Flight Date": b.flight_date,
        Airline: b.airline,
        Hotel: b.hotel || "",
        "Passenger Count": b.pnr_passengers?.length || 0,
        Modified: b.is_modified ? "Yes" : "No",
      }))
    );
    if (rows.length === 0) { toast.error("No data to export"); return; }
    exportToExcel(rows, "Passenger Report", `Passenger_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Passenger report exported");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">PNR Reports & Analytics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Plane className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Bookings</p><p className="text-2xl font-bold">{totalBookings}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div><div><p className="text-sm text-muted-foreground">Total Passengers</p><p className="text-2xl font-bold">{totalPassengers}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div><div><p className="text-sm text-muted-foreground">Avg/Booking</p><p className="text-2xl font-bold">{avgPerBooking}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Calendar className="h-5 w-5 text-amber-500" /></div><div><p className="text-sm text-muted-foreground">Flights/Day</p><p className="text-2xl font-bold">{flightsPerDay}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><BarChart3 className="h-5 w-5 text-purple-500" /></div><div><p className="text-sm text-muted-foreground">Modified</p><p className="text-2xl font-bold">{filtered.filter((b) => b.is_modified).length}</p></div></div></CardContent></Card>
      </div>

      {/* Top Routes & Airlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Top Routes</CardTitle></CardHeader>
          <CardContent>
            {topRoutes.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> :
              topRoutes.map(([route, count]) => (
                <div key={route} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm font-medium">{route}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4" /> Top Airlines</CardTitle></CardHeader>
          <CardContent>
            {topAirlines.length === 0 ? <p className="text-sm text-muted-foreground">No data</p> :
              topAirlines.map(([airline, count]) => (
                <div key={airline} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm font-medium">{airline}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search PNR, passenger..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <DateInput value={dateFrom} onValueChange={setDateFrom} className="w-[150px]" placeholder="From DD/MM/YYYY" />
            <DateInput value={dateTo} onValueChange={setDateTo} className="w-[150px]" placeholder="To DD/MM/YYYY" />
            <Select value={filterAirline} onValueChange={setFilterAirline}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Airline" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Airlines</SelectItem>
                {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRoute} onValueChange={setFilterRoute}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Route" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTicketType} onValueChange={setFilterTicketType}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="one_way">One Way</SelectItem>
                <SelectItem value="round_trip">Round Trip</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGroupSize} onValueChange={setFilterGroupSize}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="1">1 pax</SelectItem>
                <SelectItem value="2">2 pax</SelectItem>
                <SelectItem value="3+">3+ pax</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModified} onValueChange={setFilterModified}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Modified" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Modified</SelectItem>
                <SelectItem value="no">Unmodified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="booking-report">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="booking-report">Booking Report</TabsTrigger>
            <TabsTrigger value="passenger-report">Passenger Report</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportBookingReport}><Download className="h-4 w-4 mr-1" /> Export Bookings</Button>
            <Button variant="outline" size="sm" onClick={exportPassengerReport}><Download className="h-4 w-4 mr-1" /> Export Passengers</Button>
          </div>
        </div>

        <TabsContent value="booking-report">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PNR</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No bookings match filters</TableCell></TableRow>
                  ) : (
                    filtered.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-sans font-medium font-bold">{b.pnr}</TableCell>
                        <TableCell><Badge variant="outline">{b.pnr_passengers?.length || 0}</Badge></TableCell>
                        <TableCell>{b.airline}</TableCell>
                        <TableCell>{b.route}</TableCell>
                        <TableCell>{format(new Date(b.flight_date), "dd MMM yyyy")}</TableCell>
                        <TableCell><Badge variant={b.ticket_type === "round_trip" ? "default" : "secondary"}>{b.ticket_type === "round_trip" ? "Round Trip" : "One Way"}</Badge></TableCell>
                        <TableCell>{b.hotel ? <Badge variant="outline" className="text-green-600">Yes</Badge> : "No"}</TableCell>
                        <TableCell>{b.is_modified ? <Badge variant="outline" className="text-amber-600 border-amber-300">Yes</Badge> : "No"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passenger-report">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PNR</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Airline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.flatMap((b) => b.pnr_passengers || []).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No passengers found</TableCell></TableRow>
                  ) : (
                    filtered.flatMap((b) =>
                      (b.pnr_passengers || []).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-sans font-medium font-bold">{b.pnr}</TableCell>
                          <TableCell>{p.title}</TableCell>
                          <TableCell>{p.first_name}</TableCell>
                          <TableCell>{p.last_name}</TableCell>
                          <TableCell>{p.ticket_number || "—"}</TableCell>
                          <TableCell>{b.route}</TableCell>
                          <TableCell>{format(new Date(b.flight_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{b.airline}</TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PnrReports;
