import { 
  Stamp, 
  Plus, 
  Search, 
  Clock,
  FileCheck,
  CheckCircle,
  Edit,
  Trash2,
  Loader2,
  Globe,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useVisas, useVisaStats, useDeleteVisa, type Visa } from "@/hooks/useVisas";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { VisaForm } from "@/components/admin/VisaForm";
import { VisaBookingModal } from "@/components/booking/VisaBookingModal";
import { VisaSelectionFlow } from "@/components/booking/VisaSelectionFlow";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ModulePageHeader } from "@/components/ui/module-page-header";

const getCountryImage = (country: string): string => {
  const countryImages: Record<string, string> = {
    "Turkey": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&h=400&fit=crop",
    "UAE": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop",
    "Egypt": "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&h=400&fit=crop",
  };
  return countryImages[country] || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600&h=400&fit=crop";
};

const Visas = () => {
  const [searchParamsUrl] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManageView = searchParamsUrl.get("view") === "manage" && isAdmin;
  const { bannerImages } = useBannerSettings();
  const heroImages = bannerImages.visas;
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVisa, setEditingVisa] = useState<Visa | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedVisa, setSelectedVisa] = useState<Visa | null>(null);

  const { data: visas, isLoading } = useVisas();
  const { data: stats } = useVisaStats();
  const deleteVisa = useDeleteVisa();

  const filteredVisas = visas?.filter(visa => {
    const query = searchQuery.toLowerCase();
    return (
      visa.country.toLowerCase().includes(query) ||
      visa.visa_type.toLowerCase().includes(query)
    );
  }) || [];

  const handleApply = (visa: Visa) => {
    setSelectedVisa(visa);
    setBookingModalOpen(true);
  };

  const handleEdit = (visa: Visa) => {
    setEditingVisa(visa);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVisa.mutateAsync(id);
      toast.success("Visa service deleted successfully");
    } catch (error) {
      toast.error("Failed to delete visa service");
    }
  };

  return (
    <div className="space-y-6">
      {formOpen && (
        <VisaForm 
          open={formOpen} 
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingVisa(null);
          }}
          visa={editingVisa}
        />
      )}

      <VisaBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        visa={selectedVisa}
      />

      {/* Admin header for manage view */}
      {isManageView && (
        <ModulePageHeader
          icon={Stamp}
          title="Visa Services"
          count={visas?.length ?? 0}
          subtitle="Manage visa applications and services"
          iconBg="bg-gold/10"
          iconColor="text-gold"
          actions={
            <Button variant="navy" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Visa Service
            </Button>
          }
          stats={stats ? [
            { icon: Stamp, label: "Total", value: stats.total ?? 0, color: "text-primary" },
            { icon: CheckCircle, label: "Active", value: stats.active ?? 0, color: "text-success" },
          ] : undefined}
        />
      )}

      {/* Hero Section - hidden in manage view */}
      {!isManageView && (
        <>
          <div className="relative rounded-2xl overflow-hidden h-[200px] md:h-[260px]">
            <ImageCarousel 
              images={heroImages} 
              autoPlay 
              interval={5000}
              aspectRatio="hero"
              className="h-full"
              showDots={heroImages.length > 1}
              showArrows={heroImages.length > 1}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/50 to-transparent flex items-center">
              <div className="px-8 md:px-12 max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Visa Services
                </h1>
                <p className="text-white/90 text-lg">
                  Fast and reliable visa processing for your clients. Upload documents and track applications.
                </p>
                {isAdmin && (
                  <Button variant="coral" className="mt-4 shadow-lg" onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Visa Service
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Stamp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{stats?.total ?? 0}</span>
              <span className="text-xs text-muted-foreground">Destinations</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold">{stats?.active ?? 0}</span>
              <span className="text-xs text-muted-foreground">Available</span>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by country or visa type..." 
                className="pl-10 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {/* Admin Manage Table */}
      {isManageView ? (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search visas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredVisas.length === 0 ? (
              <EmptyState icon={Stamp} title="No visa services found" description="Add your first visa service." actionLabel="Add Visa Service" onAction={() => setFormOpen(true)} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Visa Type</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVisas.map((visa) => (
                    <TableRow key={visa.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
                            <img src={getCountryImage(visa.country)} alt={visa.country} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-medium">{visa.country}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{visa.visa_type}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{visa.processing_days} days</span></div></TableCell>
                      <TableCell><span className="font-semibold text-primary">${visa.price}</span></TableCell>
                      <TableCell><div className="flex items-center gap-1"><FileCheck className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{visa.documents_required?.length || 0} required</span></div></TableCell>
                      <TableCell><Badge className={visa.is_active ? 'bg-success/10 text-success' : 'bg-muted'}>{visa.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(visa)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Visa Service</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete the {visa.country} - {visa.visa_type} visa service?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(visa.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-lg border border-border overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-2.5">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !visas || visas.length === 0 ? (
            <EmptyState
              icon={Stamp}
              title="No visa services available"
              description="Check back later for available visa processing services."
            />
          ) : (
            <VisaSelectionFlow visas={visas} onSelect={handleApply} />
          )}
        </>
      )}
    </div>
  );
};

export default Visas;
