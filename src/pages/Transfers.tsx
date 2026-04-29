import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Car, Plus, Pencil, Trash2, MapPin, Users, ShoppingCart, ArrowRight, Search, EyeOff, Edit } from "lucide-react";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { useTransfers, useDeleteTransfer, useUpdateTransfer, type Transfer } from "@/hooks/useTransfers";
import { TransferForm } from "@/components/admin/TransferForm";
import { TransferBookingModal } from "@/components/booking/TransferBookingModal";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { toast } from "sonner";
import { ModulePageHeader } from "@/components/ui/module-page-header";

const transferTypeLabels: Record<string, string> = {
  airport: "Airport Transfer",
  city: "City Transfer",
  intercity: "Intercity Transfer",
};

const vehicleTypeLabels: Record<string, string> = {
  sedan: "Sedan",
  suv: "SUV",
  van: "Van",
  bus: "Bus",
};

const Transfers = () => {
  const [searchParamsUrl] = useSearchParams();
  const { role } = useAuth();
  const { data: transfers, isLoading } = useTransfers();
  const deleteTransfer = useDeleteTransfer();
  const updateTransfer = useUpdateTransfer();
  const isAdmin = role === "admin";
  const isManageView = searchParamsUrl.get("view") === "manage" && isAdmin;
  const { bannerImages } = useBannerSettings();
  const heroImages = bannerImages.transfers;

  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingTransfer, setBookingTransfer] = useState<Transfer | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [transferTypeFilter, setTransferTypeFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransfers = useMemo(() => {
    if (!transfers) return [];
    return transfers.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.route_from?.toLowerCase().includes(q) ||
        t.route_to?.toLowerCase().includes(q) ||
        t.cities?.name.toLowerCase().includes(q) ||
        t.cities?.country.toLowerCase().includes(q);
      const matchesType = transferTypeFilter === "all" || t.transfer_type === transferTypeFilter;
      const matchesVehicle = vehicleTypeFilter === "all" || t.vehicle_type === vehicleTypeFilter;
      return matchesSearch && matchesType && matchesVehicle;
    });
  }, [transfers, searchQuery, transferTypeFilter, vehicleTypeFilter]);

  const handleBook = (transfer: Transfer) => {
    setBookingTransfer(transfer);
    setBookingModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransfer.mutateAsync(id);
      toast.success("Transfer deleted successfully");
    } catch (error) {
      toast.error("Failed to delete transfer");
    }
  };

  const handleEdit = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTransfer(null);
  };

  const handleToggleActive = async (transfer: Transfer) => {
    try {
      await updateTransfer.mutateAsync({ id: transfer.id, is_active: !transfer.is_active });
      toast.success(`Transfer ${transfer.is_active ? "deactivated" : "activated"}`);
    } catch (error) {
      toast.error("Failed to update transfer status");
    }
  };

  const getRouteDisplay = (transfer: Transfer) => {
    if (transfer.route_from && transfer.route_to) {
      return { from: transfer.route_from, to: transfer.route_to };
    }
    const defaults: Record<string, { from: string; to: string }> = {
      airport: { from: "Airport", to: "City/Hotel" },
      city: { from: "Location A", to: "Location B" },
      intercity: { from: "City A", to: "City B" },
    };
    return defaults[transfer.transfer_type] || { from: "Pickup", to: "Dropoff" };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[280px] w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <Skeleton className="h-44 w-full" />
              <div className="p-5 space-y-3"><Skeleton className="h-10 w-full rounded-xl" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin header for manage view */}
      {isManageView && (
        <ModulePageHeader
          icon={Car}
          title="Transfers"
          count={transfers?.length ?? 0}
          subtitle="Manage airport and city transfer services"
          iconBg="bg-primary/10"
          iconColor="text-primary"
          actions={
            <Button variant="navy" onClick={() => { setEditingTransfer(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Add Transfer
            </Button>
          }
        />
      )}

      {/* Hero Section - hidden in manage view */}
      {!isManageView && (
        <div className="relative rounded-2xl overflow-hidden h-[200px] md:h-[280px]">
          <ImageCarousel images={heroImages} autoPlay interval={5000} aspectRatio="hero" className="h-full" showDots={heroImages.length > 1} showArrows={heroImages.length > 1} />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/50 to-transparent flex items-center">
            <div className="px-8 md:px-12 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Transfer Services</h1>
              <p className="text-white/90 text-lg">{isAdmin ? "Manage airport and city transfers" : "Comfortable & reliable transfer services"}</p>
              {isAdmin && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="coral" onClick={() => setEditingTransfer(null)} className="mt-4 shadow-lg"><Plus className="h-4 w-4 mr-2" />Add Transfer</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editingTransfer ? "Edit Transfer" : "Add New Transfer"}</DialogTitle></DialogHeader>
                    <TransferForm transfer={editingTransfer} onSuccess={handleDialogClose} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Table View */}
      {isManageView ? (
        <>
          {/* Transfer form dialog for manage view */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingTransfer ? "Edit Transfer" : "Add New Transfer"}</DialogTitle></DialogHeader>
              <TransferForm transfer={editingTransfer} onSuccess={handleDialogClose} />
            </DialogContent>
          </Dialog>

          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search transfers..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-9" />
                </div>
              </div>
              {filteredTransfers.length === 0 ? (
                <EmptyState icon={Car} title="No transfers found" description="Add your first transfer." actionLabel="Add Transfer" onAction={() => { setEditingTransfer(null); setDialogOpen(true); }} />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransfers.slice((page - 1) * pageSize, page * pageSize).map((transfer, idx) => {
                        const route = getRouteDisplay(transfer);
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                            <TableCell><span className="font-medium">{transfer.name}</span></TableCell>
                            <TableCell>
                              <span className="text-sm">{route.from} → {route.to}</span>
                            </TableCell>
                            <TableCell><Badge variant="outline">{transferTypeLabels[transfer.transfer_type] || transfer.transfer_type}</Badge></TableCell>
                            <TableCell>{vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}</TableCell>
                            <TableCell>{transfer.capacity}</TableCell>
                            <TableCell><span className="font-semibold text-primary">${transfer.price}</span></TableCell>
                            <TableCell><Badge variant={transfer.is_active !== false ? "default" : "secondary"}>{transfer.is_active !== false ? "Active" : "Inactive"}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(transfer)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Transfer</AlertDialogTitle>
                                      <AlertDialogDescription>Are you sure you want to delete "{transfer.name}"?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(transfer.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <TablePagination currentPage={page} totalPages={Math.ceil(filteredTransfers.length / pageSize)} pageSize={pageSize} totalItems={filteredTransfers.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, route, or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Transfer Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="airport">Airport</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="intercity">Intercity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Vehicle Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="van">Van</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transfers Grid */}
          {filteredTransfers.length === 0 ? (
            <EmptyState icon={Car} title="No transfers found" description={searchQuery || transferTypeFilter !== "all" || vehicleTypeFilter !== "all" ? "Try adjusting your search or filters." : isAdmin ? "Get started by adding your first transfer service." : "No transfer services are currently available."} actionLabel={isAdmin && !searchQuery && transferTypeFilter === "all" && vehicleTypeFilter === "all" ? "Add Transfer" : undefined} onAction={isAdmin && !searchQuery && transferTypeFilter === "all" && vehicleTypeFilter === "all" ? () => { setEditingTransfer(null); setDialogOpen(true); } : undefined} />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredTransfers.map((transfer, index) => {
                const route = getRouteDisplay(transfer);
                const isInactive = transfer.is_active === false;
                return (
                  <Card key={transfer.id} className={`group overflow-hidden border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 animate-fade-in flex flex-col ${isInactive ? "opacity-60" : ""}`} style={{ animationDelay: `${index * 80}ms` }}>
                    {transfer.image_url ? (
                      <div className="relative h-44 overflow-hidden">
                        <img src={transfer.image_url} alt={transfer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1 shadow-sm"><span className="text-xs font-medium">{vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}</span></div>
                        {isInactive && <div className="absolute top-3 left-3"><Badge variant="destructive" className="text-[10px] gap-1"><EyeOff className="h-2.5 w-2.5" /> Inactive</Badge></div>}
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-lg font-bold text-white drop-shadow-sm">{transfer.name}</h3>
                          {transfer.cities && <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">{transfer.cities.country && getCountryFlagUrl(transfer.cities.country) && <img src={getCountryFlagUrl(transfer.cities.country)!} alt="" className="h-3.5 w-auto rounded-sm" />}<MapPin className="h-3 w-3" />{transfer.cities.name}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Car className="h-7 w-7 text-primary/60" /></div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground leading-tight">{transfer.name}</h3>
                            {transfer.cities && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">{transfer.cities.country && getCountryFlagUrl(transfer.cities.country) && <img src={getCountryFlagUrl(transfer.cities.country)!} alt="" className="h-3.5 w-auto rounded-sm" />}<MapPin className="h-3 w-3" />{transfer.cities.name}, {transfer.cities.country}</p>}
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          {isInactive && <Badge variant="destructive" className="text-[10px] gap-1"><EyeOff className="h-2.5 w-2.5" /> Inactive</Badge>}
                          <Badge variant="secondary" className="font-medium">{vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}</Badge>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-5 flex flex-col flex-1 space-y-4">
                      <div className="bg-muted/40 rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">From</p><p className="font-semibold text-sm text-foreground">{route.from}</p></div>
                          <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/10"><ArrowRight className="h-4 w-4 text-primary" /></div>
                          <div className="flex-1 text-right"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">To</p><p className="font-semibold text-sm text-foreground">{route.to}</p></div>
                        </div>
                      </div>
                      {transfer.description && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{transfer.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 font-normal border-border/60 bg-muted/30">{transferTypeLabels[transfer.transfer_type] || transfer.transfer_type}</Badge>
                        <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 font-normal border-border/60 bg-muted/30"><Users className="h-2.5 w-2.5 mr-1" />Up to {transfer.capacity}</Badge>
                      </div>
                      <div className="flex-1" />
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div><span className="text-xl font-bold text-primary">${transfer.price}</span><span className="text-xs text-muted-foreground ml-1">/ride</span></div>
                          <div className="flex items-center gap-2">
                            <Button variant="navy" onClick={() => handleBook(transfer)} className="rounded-xl gap-1.5"><ShoppingCart className="h-4 w-4" />Book Now</Button>
                            {isAdmin && (
                              <Button variant="navy-outline" size="sm" onClick={() => handleEdit(transfer)} className="rounded-xl"><Pencil className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <TransferBookingModal open={bookingModalOpen} onOpenChange={setBookingModalOpen} transfer={bookingTransfer} />

      {!isManageView && !dialogOpen && editingTransfer && (
        <Dialog open={!!editingTransfer} onOpenChange={(open) => { if (!open) setEditingTransfer(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Transfer</DialogTitle></DialogHeader>
            <TransferForm transfer={editingTransfer} onSuccess={() => setEditingTransfer(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Transfers;
