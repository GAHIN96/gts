import { useState, useMemo } from "react";
import { usePnrBookings, useDeletePnrBooking, useCreatePnrBooking, useUpdatePnrBooking, type PnrBooking } from "@/hooks/usePnrBookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel } from "@/utils/excelExport";
import { Plus, Search, Download, ChevronDown, ChevronRight, Users, Plane, History, Trash2, Edit, User } from "lucide-react";

const PnrBookings = () => {
  const { data: bookings = [], isLoading } = usePnrBookings();
  const deleteMutation = useDeletePnrBooking();
  const createMutation = useCreatePnrBooking();
  const updateMutation = useUpdatePnrBooking();

  const [search, setSearch] = useState("");
  const [filterAirline, setFilterAirline] = useState("all");
  const [filterTicketType, setFilterTicketType] = useState("all");
  const [filterModified, setFilterModified] = useState("all");
  const [expandedPnrs, setExpandedPnrs] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editBooking, setEditBooking] = useState<PnrBooking | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [detailBooking, setDetailBooking] = useState<PnrBooking | null>(null);

  // Form state
  const [formPnr, setFormPnr] = useState("");
  const [formRoute, setFormRoute] = useState("");
  const [formFlightDate, setFormFlightDate] = useState("");
  const [formAirline, setFormAirline] = useState("");
  const [formTicketType, setFormTicketType] = useState("one_way");
  const [formHotel, setFormHotel] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formPassengers, setFormPassengers] = useState<{ title: string; first_name: string; last_name: string; ticket_number: string }[]>([
    { title: "MR", first_name: "", last_name: "", ticket_number: "" },
  ]);

  const airlines = useMemo(() => [...new Set(bookings.map((b) => b.airline))].sort(), [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch =
        !search ||
        b.pnr.toLowerCase().includes(search.toLowerCase()) ||
        b.route.toLowerCase().includes(search.toLowerCase()) ||
        b.airline.toLowerCase().includes(search.toLowerCase()) ||
        b.pnr_passengers?.some((p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
        );
      const matchAirline = filterAirline === "all" || b.airline === filterAirline;
      const matchTicket = filterTicketType === "all" || b.ticket_type === filterTicketType;
      const matchModified = filterModified === "all" || (filterModified === "yes" ? b.is_modified : !b.is_modified);
      return matchSearch && matchAirline && matchTicket && matchModified;
    });
  }, [bookings, search, filterAirline, filterTicketType, filterModified]);

  const toggleExpand = (id: string) => {
    setExpandedPnrs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setFormPnr("");
    setFormRoute("");
    setFormFlightDate("");
    setFormAirline("");
    setFormTicketType("one_way");
    setFormHotel("");
    setFormNotes("");
    setFormPassengers([{ title: "MR", first_name: "", last_name: "", ticket_number: "" }]);
  };

  const handleCreate = async () => {
    if (!formPnr || !formRoute || !formFlightDate || !formAirline) {
      toast.error("Please fill in all required fields");
      return;
    }
    const validPassengers = formPassengers.filter((p) => p.first_name && p.last_name);
    if (validPassengers.length === 0) {
      toast.error("Add at least one passenger");
      return;
    }
    try {
      await createMutation.mutateAsync({
        pnr: formPnr.toUpperCase(),
        route: formRoute.toUpperCase(),
        flight_date: formFlightDate,
        airline: formAirline,
        ticket_type: formTicketType,
        hotel: formHotel || undefined,
        notes: formNotes || undefined,
        passengers: validPassengers,
      });
      toast.success("PNR booking created successfully");
      setShowCreateDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleEdit = (booking: PnrBooking) => {
    setEditBooking(booking);
    setFormPnr(booking.pnr);
    setFormRoute(booking.route);
    setFormFlightDate(booking.flight_date);
    setFormAirline(booking.airline);
    setFormTicketType(booking.ticket_type);
    setFormHotel(booking.hotel || "");
    setFormNotes(booking.notes || "");
  };

  const handleUpdate = async () => {
    if (!editBooking) return;
    const changes: { change_type: string; field_name: string; before_value: string; after_value: string; description: string }[] = [];
    if (editBooking.route !== formRoute) changes.push({ change_type: "Flight Change", field_name: "route", before_value: editBooking.route, after_value: formRoute, description: `Route changed from ${editBooking.route} to ${formRoute}` });
    if (editBooking.airline !== formAirline) changes.push({ change_type: "Flight Change", field_name: "airline", before_value: editBooking.airline, after_value: formAirline, description: `Airline changed from ${editBooking.airline} to ${formAirline}` });
    if (editBooking.flight_date !== formFlightDate) changes.push({ change_type: "Flight Change", field_name: "flight_date", before_value: editBooking.flight_date, after_value: formFlightDate, description: `Flight date changed` });
    if (editBooking.ticket_type !== formTicketType) changes.push({ change_type: "Ticket Type Change", field_name: "ticket_type", before_value: editBooking.ticket_type, after_value: formTicketType, description: `Ticket type changed from ${editBooking.ticket_type} to ${formTicketType}` });
    if ((editBooking.hotel || "") !== formHotel) changes.push({ change_type: "Hotel Change", field_name: "hotel", before_value: editBooking.hotel || "None", after_value: formHotel || "None", description: `Hotel changed` });

    try {
      await updateMutation.mutateAsync({
        id: editBooking.id,
        route: formRoute.toUpperCase(),
        flight_date: formFlightDate,
        airline: formAirline,
        ticket_type: formTicketType,
        hotel: formHotel || null,
        notes: formNotes || null,
        changes,
      });
      toast.success("Booking updated successfully");
      setEditBooking(null);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportAll = () => {
    const rows = filtered.flatMap((b) =>
      (b.pnr_passengers || []).map((p) => ({
        PNR: b.pnr,
        "Passenger Name": `${p.title} ${p.first_name} ${p.last_name}`,
        Title: p.title,
        "Ticket Number": p.ticket_number || "",
        "Ticket Type": b.ticket_type === "round_trip" ? "Round Trip" : "One Way",
        Route: b.route,
        "Flight Date": b.flight_date,
        Airline: b.airline,
        Hotel: b.hotel || "",
        Modified: b.is_modified ? "Yes" : "No",
      }))
    );
    if (rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportToExcel(rows, "PNR Bookings", `PNR_Bookings_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const exportSelected = () => {
    const selected = filtered.filter((b) => selectedBookings.has(b.id));
    const rows = selected.flatMap((b) =>
      (b.pnr_passengers || []).map((p) => ({
        PNR: b.pnr,
        "Passenger Name": `${p.title} ${p.first_name} ${p.last_name}`,
        Title: p.title,
        "Ticket Number": p.ticket_number || "",
        "Ticket Type": b.ticket_type === "round_trip" ? "Round Trip" : "One Way",
        Route: b.route,
        "Flight Date": b.flight_date,
        Airline: b.airline,
        Hotel: b.hotel || "",
      }))
    );
    if (rows.length === 0) {
      toast.error("Select bookings to export");
      return;
    }
    exportToExcel(rows, "Selected Bookings", `Selected_Bookings_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exported successfully");
  };

  const totalPassengers = filtered.reduce((sum, b) => sum + (b.pnr_passengers?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Plane className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{totalPassengers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Edit className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Modified</p>
                <p className="text-2xl font-bold">{filtered.filter((b) => b.is_modified).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><User className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. per Booking</p>
                <p className="text-2xl font-bold">{filtered.length ? (totalPassengers / filtered.length).toFixed(1) : "0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search PNR, passenger, route..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterAirline} onValueChange={setFilterAirline}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Airline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Airlines</SelectItem>
            {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTicketType} onValueChange={setFilterTicketType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Ticket Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="one_way">One Way</SelectItem>
            <SelectItem value="round_trip">Round Trip</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterModified} onValueChange={setFilterModified}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Modified" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Modified Only</SelectItem>
            <SelectItem value="no">Unmodified</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}><Plus className="h-4 w-4 mr-1" /> New Booking</Button>
        <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4 mr-1" /> Export All</Button>
        {selectedBookings.size > 0 && (
          <Button variant="outline" onClick={exportSelected}><Download className="h-4 w-4 mr-1" /> Export Selected ({selectedBookings.size})</Button>
        )}
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedBookings.size === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBookings(new Set(filtered.map((b) => b.id)));
                      else setSelectedBookings(new Set());
                    }}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>PNR</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Airline</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Passengers</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No bookings found</TableCell></TableRow>
              ) : (
                filtered.map((booking) => {
                  const isExpanded = expandedPnrs.has(booking.id);
                  const paxCount = booking.pnr_passengers?.length || 0;
                  return (
                    <Collapsible key={booking.id} asChild open={isExpanded} onOpenChange={() => toggleExpand(booking.id)}>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <button className="p-1">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <input type="checkbox" checked={selectedBookings.has(booking.id)} onChange={() => toggleSelect(booking.id)} className="rounded" />
                          </TableCell>
                          <TableCell className="font-mono font-bold">{booking.pnr}</TableCell>
                          <TableCell>{booking.route}</TableCell>
                          <TableCell>{format(new Date(booking.flight_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{booking.airline}</TableCell>
                          <TableCell>
                            <Badge variant={booking.ticket_type === "round_trip" ? "default" : "secondary"}>
                              {booking.ticket_type === "round_trip" ? "Round Trip" : "One Way"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{paxCount}</Badge>
                          </TableCell>
                          <TableCell>{booking.hotel || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant={booking.status === "active" ? "default" : "secondary"}>{booking.status}</Badge>
                              {booking.is_modified && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Modified</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDetailBooking(booking); }}>
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(booking); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete booking {booking.pnr}?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this booking and all its passengers.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => { deleteMutation.mutate(booking.id); toast.success("Booking deleted"); }}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={11} className="p-0">
                              <div className="p-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                  <Users className="h-4 w-4" /> Passengers ({paxCount})
                                </h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Title</TableHead>
                                      <TableHead>First Name</TableHead>
                                      <TableHead>Last Name</TableHead>
                                      <TableHead>Ticket Number</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(booking.pnr_passengers || []).map((p) => (
                                      <TableRow key={p.id}>
                                        <TableCell>{p.title}</TableCell>
                                        <TableCell>{p.first_name}</TableCell>
                                        <TableCell>{p.last_name}</TableCell>
                                        <TableCell>{p.ticket_number || "—"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {booking.notes && (
                                  <p className="text-sm text-muted-foreground mt-2"><strong>Notes:</strong> {booking.notes}</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New PNR Booking</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>PNR *</Label><Input value={formPnr} onChange={(e) => setFormPnr(e.target.value)} placeholder="e.g. ABC123" /></div>
            <div><Label>Route *</Label><Input value={formRoute} onChange={(e) => setFormRoute(e.target.value)} placeholder="e.g. EBL → IST → EBL" /></div>
            <div><Label>Flight Date *</Label><DateInput value={formFlightDate} onValueChange={setFormFlightDate} /></div>
            <div><Label>Airline *</Label><Input value={formAirline} onChange={(e) => setFormAirline(e.target.value)} placeholder="e.g. Turkish Airlines" /></div>
            <div>
              <Label>Ticket Type</Label>
              <Select value={formTicketType} onValueChange={setFormTicketType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="round_trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Hotel (optional)</Label><Input value={formHotel} onChange={(e) => setFormHotel(e.target.value)} placeholder="Hotel name" /></div>
            <div className="col-span-2"><Label>Notes</Label><Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Any notes..." /></div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Passengers</Label>
              <Button variant="outline" size="sm" onClick={() => setFormPassengers([...formPassengers, { title: "MR", first_name: "", last_name: "", ticket_number: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {formPassengers.map((p, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_40px] gap-2 mb-2">
                <Select value={p.title} onValueChange={(v) => { const n = [...formPassengers]; n[i].title = v; setFormPassengers(n); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MR">MR</SelectItem>
                    <SelectItem value="MRS">MRS</SelectItem>
                    <SelectItem value="MS">MS</SelectItem>
                    <SelectItem value="MISS">MISS</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="First name" value={p.first_name} onChange={(e) => { const n = [...formPassengers]; n[i].first_name = e.target.value; setFormPassengers(n); }} />
                <Input placeholder="Last name" value={p.last_name} onChange={(e) => { const n = [...formPassengers]; n[i].last_name = e.target.value; setFormPassengers(n); }} />
                <Input placeholder="Ticket #" value={p.ticket_number} onChange={(e) => { const n = [...formPassengers]; n[i].ticket_number = e.target.value; setFormPassengers(n); }} />
                {formPassengers.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setFormPassengers(formPassengers.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editBooking} onOpenChange={(open) => { if (!open) { setEditBooking(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Booking — {editBooking?.pnr}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Route</Label><Input value={formRoute} onChange={(e) => setFormRoute(e.target.value)} /></div>
            <div><Label>Flight Date</Label><DateInput value={formFlightDate} onValueChange={setFormFlightDate} /></div>
            <div><Label>Airline</Label><Input value={formAirline} onChange={(e) => setFormAirline(e.target.value)} /></div>
            <div>
              <Label>Ticket Type</Label>
              <Select value={formTicketType} onValueChange={setFormTicketType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="round_trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Hotel</Label><Input value={formHotel} onChange={(e) => setFormHotel(e.target.value)} /></div>
            <div><Label>Notes</Label><Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditBooking(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Changes Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={(open) => { if (!open) setDetailBooking(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Booking Details — {detailBooking?.pnr}</DialogTitle></DialogHeader>
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="passengers">Passengers</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">PNR:</span> <strong>{detailBooking?.pnr}</strong></div>
                <div><span className="text-muted-foreground">Route:</span> <strong>{detailBooking?.route}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{detailBooking?.flight_date && format(new Date(detailBooking.flight_date), "dd MMM yyyy")}</strong></div>
                <div><span className="text-muted-foreground">Airline:</span> <strong>{detailBooking?.airline}</strong></div>
                <div><span className="text-muted-foreground">Ticket Type:</span> <strong>{detailBooking?.ticket_type === "round_trip" ? "Round Trip" : "One Way"}</strong></div>
                <div><span className="text-muted-foreground">Hotel:</span> <strong>{detailBooking?.hotel || "None"}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{detailBooking?.status}</Badge></div>
                <div><span className="text-muted-foreground">Modified:</span> {detailBooking?.is_modified ? <Badge variant="outline" className="text-amber-600">Yes</Badge> : "No"}</div>
              </div>
            </TabsContent>
            <TabsContent value="passengers" className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Ticket #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailBooking?.pnr_passengers || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.title}</TableCell>
                      <TableCell>{p.first_name}</TableCell>
                      <TableCell>{p.last_name}</TableCell>
                      <TableCell>{p.ticket_number || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="changes" className="mt-3">
              {(detailBooking?.pnr_booking_changes || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No changes recorded</p>
              ) : (
                <div className="space-y-3">
                  {[...(detailBooking?.pnr_booking_changes || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((c) => (
                    <div key={c.id} className="border-l-2 border-primary pl-4 py-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(c.created_at), "dd MMM yyyy | hh:mm a")}</span>
                        <span>•</span>
                        <span>User: {c.user_email || "System"}</span>
                      </div>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">{c.change_type}</Badge>
                        {c.description && <p className="text-sm mt-1">{c.description}</p>}
                        {c.before_value && c.after_value && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            From: <span className="line-through">{c.before_value}</span> → To: <strong>{c.after_value}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PnrBookings;
