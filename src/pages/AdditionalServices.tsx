import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgePlus,
  Plus,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  Edit,
  Trash2,
  ShoppingCart,
  Package,
  Car,
  Shield,
  Sparkles,
  UtensilsCrossed,
  Crown,
  CheckCircle2,
  Users,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useAdditionalServices,
  useAdditionalServiceStats,
  useUpdateAdditionalService,
  useDeleteAdditionalService,
  type AdditionalService
} from "@/hooks/useAdditionalServices";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import heroAdditionalServices from "@/assets/hero-special-requests.jpg";
import { AdditionalServiceForm } from "@/components/admin/AdditionalServiceForm";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CategoryMeta = {
  badge: string;
  icon: LucideIcon;
  gradient: string;
  ring: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  transfer: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50",
    icon: Car,
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    ring: "ring-blue-500/20",
  },
  insurance: {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200/50 dark:border-green-800/50",
    icon: Shield,
    gradient: "from-green-500/20 via-green-500/5 to-transparent",
    ring: "ring-green-500/20",
  },
  activity: {
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50",
    icon: Sparkles,
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    ring: "ring-purple-500/20",
  },
  meal: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50",
    icon: UtensilsCrossed,
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
    ring: "ring-orange-500/20",
  },
  upgrade: {
    badge: "bg-gold/20 text-gold border-gold/30",
    icon: Crown,
    gradient: "from-gold/25 via-gold/5 to-transparent",
    ring: "ring-gold/30",
  },
  other: {
    badge: "bg-muted text-muted-foreground border-border",
    icon: Package,
    gradient: "from-primary/15 via-primary/5 to-transparent",
    ring: "ring-primary/20",
  },
};

const getCategoryMeta = (category: string): CategoryMeta =>
  CATEGORY_META[category.toLowerCase()] || CATEGORY_META.other;

const getCategoryColor = (category: string) => getCategoryMeta(category).badge;

const AdditionalServices = () => {
  const [searchParamsUrl] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManageView = searchParamsUrl.get("view") === "manage" && isAdmin;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdditionalService | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { bannerImages } = useBannerSettings();
  const heroImages = bannerImages.additionalServices?.length > 0
    ? bannerImages.additionalServices
    : [heroAdditionalServices];

  const { data: services, isLoading } = useAdditionalServices();
  const { data: stats } = useAdditionalServiceStats();
  const updateService = useUpdateAdditionalService();
  const deleteService = useDeleteAdditionalService();

  const filteredServices = services?.filter(service => {
    if (!isAdmin && !service.is_active) return false;
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      service.name.toLowerCase().includes(query) ||
      service.category.toLowerCase().includes(query)
    );
    const matchesCategory = categoryFilter === "all" || service.category.toLowerCase() === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleAddToBooking = (service: AdditionalService) => {
    toast.success(`${service.name} added to booking`);
  };

  const handleToggleStatus = async (service: AdditionalService) => {
    try {
      await updateService.mutateAsync({ id: service.id, is_active: !service.is_active });
      toast.success(`${service.name} ${service.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error("Failed to update service status");
    }
  };

  const handleEdit = (service: AdditionalService) => {
    setEditingService(service);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast.success("Service deleted successfully");
    } catch (error) {
      toast.error("Failed to delete service");
    }
  };

  return (
    <div className="space-y-6">
      <AdditionalServiceForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingService(null);
        }}
        service={editingService}
      />

      {/* Admin header for manage view */}
      {isManageView && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Additional Services</h1>
          <Button variant="navy" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Service
          </Button>
        </div>
      )}

      {/* Hero Section - hidden in manage view */}
      {!isManageView && (
        <>
          <div className="relative rounded-2xl overflow-hidden h-[200px] md:h-[280px]">
            <ImageCarousel images={heroImages} autoPlay interval={5000} aspectRatio="hero" className="h-full" showDots={heroImages.length > 1} showArrows={heroImages.length > 1} />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/50 to-transparent flex items-center">
              <div className="px-8 md:px-12 max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Additional Services</h1>
                <p className="text-white/90 text-lg">{isAdmin ? "Manage add-on services for packages" : "Enhance your travel with extra services"}</p>
                {isAdmin && (
                  <Button variant="coral" className="mt-4 shadow-lg" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Service</Button>
                )}
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <BadgePlus className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{stats?.total ?? 0}</span><span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <Package className="h-4 w-4 text-success" /><span className="text-sm font-semibold">{stats?.active ?? 0}</span><span className="text-xs text-muted-foreground">Active</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin Manage Table */}
      {isManageView ? (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search services..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-9" />
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredServices.length === 0 ? (
              <EmptyState icon={BadgePlus} title="No services found" description="Add your first service." actionLabel="Add Service" onAction={() => setFormOpen(true)} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Pricing</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.slice((page - 1) * pageSize, page * pageSize).map((service, idx) => (
                      <TableRow key={service.id}>
                        <TableCell className="text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell><span className="font-medium">{service.name}</span></TableCell>
                        <TableCell><Badge className={`text-[11px] ${getCategoryColor(service.category)}`}>{service.category}</Badge></TableCell>
                        <TableCell><span className="font-semibold text-primary">${service.price}</span></TableCell>
                        <TableCell>{service.per_person ? "Per person" : "Per booking"}</TableCell>
                        <TableCell><Badge variant={service.is_active ? "default" : "secondary"}>{service.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Service</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{service.name}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(service.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination currentPage={page} totalPages={Math.ceil(filteredServices.length / pageSize)} pageSize={pageSize} totalItems={filteredServices.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search services..." className="pl-10 rounded-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] rounded-xl">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="meal">Meal</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Services Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-xl border border-border p-5 space-y-3">
                  <div className="flex items-start gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/3" /></div></div>
                  <Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <EmptyState icon={BadgePlus} title="No services found" description={isAdmin ? "Get started by adding your first add-on service." : "No additional services match your search."} actionLabel={isAdmin ? "Add Service" : undefined} onAction={isAdmin ? () => setFormOpen(true) : undefined} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredServices.map((service, index) => {
                const meta = getCategoryMeta(service.category);
                const Icon = meta.icon;
                const isInactive = !service.is_active;
                return (
                  <Card
                    key={service.id}
                    className={`group relative overflow-hidden border border-border/60 hover:border-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 animate-fade-in flex flex-col rounded-2xl ${isInactive ? "opacity-70" : ""}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    {/* Decorative gradient backdrop */}
                    <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${meta.gradient} pointer-events-none opacity-80`} />

                    <CardContent className="relative p-5 flex flex-col flex-1">
                      {/* Top: icon + toggle */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-12 w-12 rounded-xl bg-card border border-border/60 ring-1 ${meta.ring} flex items-center justify-center shadow-sm shrink-0`}>
                          <Icon className="h-6 w-6 text-foreground/80" />
                        </div>
                        <div className="flex items-center gap-2">
                          {isInactive && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-destructive/30 text-destructive bg-destructive/5">
                              Inactive
                            </Badge>
                          )}
                          {isAdmin && (
                            <Switch
                              checked={service.is_active ?? false}
                              onCheckedChange={() => handleToggleStatus(service)}
                              className="shrink-0"
                            />
                          )}
                        </div>
                      </div>

                      {/* Category badge */}
                      <Badge className={`self-start text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wide border mb-2 ${meta.badge}`}>
                        {service.category}
                      </Badge>

                      {/* Title */}
                      <h3 className="font-bold text-foreground text-base leading-snug mb-1.5 line-clamp-1">
                        {service.name}
                      </h3>

                      {/* Description */}
                      {service.description ? (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/50 italic mb-4">No description</p>
                      )}

                      {/* Pricing meta chip */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/50 rounded-full px-2 py-0.5">
                          {service.per_person ? <Users className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                          {service.per_person ? "Per person" : "Per booking"}
                        </span>
                        {!isInactive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Available
                          </span>
                        )}
                      </div>

                      <div className="flex-1" />

                      {/* Footer: price + actions */}
                      <div className="pt-4 mt-auto border-t border-dashed border-border/60 flex items-end justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            From
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary leading-none">
                              ${service.price}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              /{service.per_person ? "person" : "booking"}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="navy"
                            onClick={() => handleAddToBooking(service)}
                            disabled={isInactive}
                            className="rounded-lg shadow-sm"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1.5" />
                            Add
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="navy-outline"
                              onClick={() => handleEdit(service)}
                              className="rounded-lg h-9 w-9 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
    </div>
  );
};

export default AdditionalServices;
