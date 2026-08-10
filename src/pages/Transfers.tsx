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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoneManager } from "@/components/admin/Transfers/ZoneManager";
import { ZonePricingManager } from "@/components/admin/Transfers/ZonePricingManager";
import { useAuth } from "@/contexts/AuthContext";
import { useTransfers, useDeleteTransfer, useUpdateTransfer, type Transfer } from "@/hooks/useTransfers";
import { TransferForm } from "@/components/admin/TransferForm";
import { TransferBookingModal } from "@/components/booking/TransferBookingModal";
import { MapTransferSearch } from "@/components/booking/MapTransferSearch";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransfers = useMemo(() => {
    if (!transfers) return [];
    return transfers.filter((t) => {
      const q = searchQuery.toLowerCase();
      return (
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.route_from?.toLowerCase().includes(q) ||
        t.route_to?.toLowerCase().includes(q) ||
        t.cities?.name.toLowerCase().includes(q) ||
        t.cities?.country.toLowerCase().includes(q)
      );
    });
  }, [transfers, searchQuery]);

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
              <p className="text-white/90 text-lg">Comfortable & reliable transfer services</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add/Edit Dialog (Standalone) */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingTransfer ? "Edit Transfer" : "Add New Transfer"}</DialogTitle></DialogHeader>
            <TransferForm transfer={editingTransfer} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      )}

      {/* Manage Table View */}
      {isManageView ? (
        <Tabs defaultValue="transfers" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="transfers">Manage Transfers</TabsTrigger>
            <TabsTrigger value="zones">Zones & Areas</TabsTrigger>
            <TabsTrigger value="pricing">Zone Pricing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transfers" className="space-y-6">
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
          </TabsContent>
          
          <TabsContent value="zones">
            <ZoneManager />
          </TabsContent>
          
          <TabsContent value="pricing">
            <ZonePricingManager />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Search & Filters */}
          <div className="mb-8">
            <MapTransferSearch onBookTransfer={handleBook} />
          </div>

          {/* Transfers Grid Section */}
          <div className="space-y-6 mt-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Available Transfer Services</h2>
                <p className="text-sm text-muted-foreground">Select from our pre-configured private and shared routes</p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl"
                />
              </div>
            </div>

            {filteredTransfers.filter(t => t.is_active !== false).length === 0 ? (
              <div className="py-16 text-center border rounded-2xl bg-card">
                <Car className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold">No transfers found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTransfers
                  .filter(t => t.is_active !== false)
                  .map((transfer) => {
                    const route = getRouteDisplay(transfer);
                    return (
                      <Card
                        key={transfer.id}
                        className="group relative overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col bg-card"
                      >
                        <div className="relative h-44 overflow-hidden bg-muted">
                          {transfer.image_url ? (
                            <img
                              src={transfer.image_url}
                              alt={transfer.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <Car className="h-16 w-16 text-primary/30" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-background/90 backdrop-blur font-semibold shadow-sm">
                              {transferTypeLabels[transfer.transfer_type] || transfer.transfer_type}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-5 flex flex-col flex-grow space-y-4">
                          <div>
                            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {transfer.name}
                            </h3>
                            {transfer.cities && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                {transfer.cities.name}, {transfer.cities.country}
                              </p>
                            )}
                          </div>

                          <div className="bg-muted/40 rounded-xl p-3 border border-border/50 text-xs flex items-center justify-between">
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">From</p>
                              <p className="font-semibold text-foreground truncate">{route.from}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-primary shrink-0 mx-2" />
                            <div className="text-center flex-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">To</p>
                              <p className="font-semibold text-foreground truncate">{route.to}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Car className="h-3.5 w-3.5" />
                              {vehicleTypeLabels[transfer.vehicle_type] || transfer.vehicle_type}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <Users className="h-3.5 w-3.5" />
                              Max {transfer.capacity} guests
                            </span>
                          </div>

                          <div className="pt-4 border-t border-border flex items-center justify-between mt-auto">
                            <div>
                              <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider block">Price</span>
                              <span className="text-2xl font-black text-primary">${transfer.price}</span>
                            </div>
                            <Button
                              variant="navy"
                              size="sm"
                              className="rounded-xl px-5 font-bold shadow-md"
                              onClick={() => handleBook(transfer)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1.5" />
                              Book Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
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
