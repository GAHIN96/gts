import { 
  Compass, Plus, Search, Clock, Users, Star, Edit, Eye, MapPin, ShoppingCart, 
  Loader2, CheckCircle, ChevronDown, ChevronUp, Calendar, ArrowUpDown, Trash2,
  Heart, Globe, Camera, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/contexts/AuthContext";
import { useTours, useTourStats, useDeleteTour, type Tour } from "@/hooks/useTours";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { TourForm } from "@/components/admin/TourForm";
import { TourBookingModal } from "@/components/booking/TourBookingModal";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ModulePageHeader } from "@/components/ui/module-page-header";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { toast } from "sonner";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import toursHero from "@/assets/tours-hero.jpg";

interface DayProgram {
  day: number;
  title: string;
  description: string;
  activities: string[];
  images: string[];
}

const Tours = () => {
  const [searchParamsUrl] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManageView = searchParamsUrl.get("view") === "manage" && isAdmin;
  const { banners } = useBannerSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [expandedTourId, setExpandedTourId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("default");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");

  const { data: tours, isLoading } = useTours();
  const { data: stats } = useTourStats();
  const deleteTour = useDeleteTour();

  // Get unique countries for filter
  const countries = useMemo(() => {
    if (!tours) return [];
    const set = new Set<string>();
    tours.forEach(t => {
      if (t.cities?.country) set.add(t.cities.country);
    });
    return Array.from(set).sort();
  }, [tours]);

  const filteredTours = (tours?.filter(tour => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      tour.name.toLowerCase().includes(query) ||
      tour.cities?.name?.toLowerCase().includes(query) ||
      tour.cities?.country?.toLowerCase().includes(query)
    );
    const matchesCountry = selectedCountry === "all" || tour.cities?.country === selectedCountry;
    return matchesSearch && matchesCountry;
  }) || []).sort((a, b) => {
    switch (sortBy) {
      case "price-low": return (a.price || 0) - (b.price || 0);
      case "price-high": return (b.price || 0) - (a.price || 0);
      case "duration": return (a.duration_hours || 0) - (b.duration_hours || 0);
      case "name": return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const handleBook = (tour: Tour) => {
    setSelectedTour(tour);
    setBookingModalOpen(true);
  };

  const handleEdit = (tour: Tour) => {
    setEditingTour(tour);
    setFormOpen(true);
  };

  const handleDeleteTour = async (id: string) => {
    try {
      await deleteTour.mutateAsync(id);
      toast.success("Tour deleted successfully");
    } catch (error) {
      toast.error("Failed to delete tour");
    }
  };

  const toggleTourExpansion = (tourId: string) => {
    setExpandedTourId(expandedTourId === tourId ? null : tourId);
  };

  const getDayProgram = (tour: Tour): DayProgram[] => {
    if (!tour.day_program) return [];
    if (Array.isArray(tour.day_program)) {
      return tour.day_program as unknown as DayProgram[];
    }
    return [];
  };

  return (
    <div className="space-y-0">
      <TourForm 
        open={formOpen} 
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTour(null);
        }}
        tour={editingTour}
      />

      <TourBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        tour={selectedTour}
      />

      {/* Admin header for manage view */}
      {isManageView && (
        <ModulePageHeader
          icon={Compass}
          title="Tours"
          count={tours?.length ?? 0}
          subtitle="Manage tour packages and experiences"
          iconBg="bg-success/10"
          iconColor="text-success"
          actions={
            <Button variant="navy" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tour
            </Button>
          }
          stats={stats ? [
            { icon: Compass, label: "Total", value: stats.total ?? 0, color: "text-primary" },
            { icon: CheckCircle, label: "Active", value: stats.active ?? 0, color: "text-success" },
          ] : undefined}
        />
      )}

      {/* Hero Section - non-manage */}
      {!isManageView && (
        <>
          {/* Cinematic Hero */}
          <div className="relative rounded-2xl overflow-hidden mx-4 sm:mx-6 mb-6">
            <div className="relative h-[180px] sm:h-[220px]">
              <img 
                src={banners.tours || toursHero} 
                alt="Tours" 
                className="w-full h-full object-cover"
                width={1920}
                height={640}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-6">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-0.5 drop-shadow-lg">
                  Unforgettable Experiences
                </h1>
                <p className="text-xs text-white/70 mb-4 font-medium drop-shadow">
                  Discover curated tours and activities across the world
                </p>
              </div>
            </div>

            {/* Search Card - floating over hero */}
            <div className="relative -mt-10 mx-4 sm:mx-8 mb-4 z-10">
              <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Search Tours</h3>
                    <p className="text-[11px] text-muted-foreground">Find the perfect experience</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by tour name, city, or country..." 
                      className="pl-10 rounded-xl h-10 bg-muted/30 border-border/60" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full sm:w-[180px] rounded-xl h-10 bg-muted/30 border-border/60">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map(c => (
                        <SelectItem key={c} value={c}>
                          <span className="flex items-center gap-2">
                            {getCountryFlagUrl(c) && <img src={getCountryFlagUrl(c)!} alt="" className="h-3 w-auto rounded-sm" />}
                            {c}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-[170px] rounded-xl h-10 bg-muted/30 border-border/60">
                      <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="duration">Duration: Shortest</SelectItem>
                      <SelectItem value="name">Name: A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Pills */}
          {isAdmin && (
            <div className="flex flex-wrap gap-3 px-4 sm:px-6 mb-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
                <Compass className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{stats?.total ?? 0}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold">{stats?.active ?? 0}</span>
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              {isAdmin && (
                <Button variant="navy" size="sm" onClick={() => setFormOpen(true)} className="rounded-xl ml-auto">
                  <Plus className="h-4 w-4 mr-1.5" />Add Tour
                </Button>
              )}
            </div>
          )}

          {/* Results Header */}
          <div className="px-4 sm:px-6 mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredTours.length}</span> tour{filteredTours.length !== 1 ? 's' : ''} found
              {selectedCountry !== "all" && <span> in <span className="font-medium text-foreground">{selectedCountry}</span></span>}
              {searchQuery && <span> matching "<span className="font-medium text-foreground">{searchQuery}</span>"</span>}
            </p>
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
                <Input placeholder="Search tours..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 h-9" />
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredTours.length === 0 ? (
              <EmptyState icon={Compass} title="No tours found" description="Add your first tour." actionLabel="Add Tour" onAction={() => setFormOpen(true)} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Tour Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Max Pax</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTours.slice((page - 1) * pageSize, page * pageSize).map((tour, idx) => (
                      <TableRow key={tour.id}>
                        <TableCell className="text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell><span className="font-medium">{tour.name}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {tour.cities?.country && getCountryFlagUrl(tour.cities.country) && <img src={getCountryFlagUrl(tour.cities.country)!} alt="" className="h-3.5 w-auto rounded-sm" />}
                            <MapPin className="h-3.5 w-3.5" />
                            {tour.cities?.name || "—"}{tour.cities?.country ? `, ${tour.cities.country}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{tour.duration_hours || 0}h</TableCell>
                        <TableCell>{tour.max_participants || 20}</TableCell>
                        <TableCell><span className="font-semibold text-primary">${tour.price}</span></TableCell>
                        <TableCell><Badge variant={tour.is_active ? "default" : "secondary"}>{tour.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(tour)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tour</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{tour.name}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTour(tour.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination currentPage={page} totalPages={Math.ceil(filteredTours.length / pageSize)} pageSize={pageSize} totalItems={filteredTours.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="px-4 sm:px-6">
          {/* Tours Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-border overflow-hidden bg-card">
                  <Skeleton className="h-56 w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTours.length === 0 ? (
            <EmptyState icon={Compass} title="No tours found" description={isAdmin ? "Get started by adding your first tour experience." : "No tours match your search criteria."} actionLabel={isAdmin ? "Add New Tour" : undefined} onAction={isAdmin ? () => setFormOpen(true) : undefined} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTours.map((tour, index) => {
                const isExpanded = expandedTourId === tour.id;
                const dayProgram = getDayProgram(tour);
                return (
                  <Card 
                    key={tour.id} 
                    className={`overflow-hidden border-0 transition-all duration-400 group animate-fade-in flex flex-col rounded-xl bg-card ${
                      isExpanded 
                        ? 'shadow-2xl ring-2 ring-primary/20 sm:col-span-2 md:col-span-2' 
                        : 'shadow-sm hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Image Section */}
                    <div className={`relative overflow-hidden ${isExpanded ? 'h-52' : 'h-40'}`}>
                      {tour.images && tour.images.length > 1 ? (
                        <ImageCarousel images={tour.images} autoPlay={false} showDots showArrows className="h-full" />
                      ) : tour.images && tour.images[0] ? (
                        <img src={tour.images[0]} alt={tour.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Compass className="h-12 w-12 text-primary/20" />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                      
                      {/* Top badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {tour.cities?.country && getCountryFlagUrl(tour.cities.country) && (
                          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10">
                            <img src={getCountryFlagUrl(tour.cities.country)!} alt="" className="h-3 w-auto rounded-sm" />
                            <span className="text-[10px] font-semibold text-white">{tour.cities?.country}</span>
                          </div>
                        )}
                        {isAdmin && (
                          <Badge className={`text-[9px] rounded-full border border-white/10 px-1.5 py-0 h-5 ${tour.is_active ? 'bg-emerald-500/80 backdrop-blur-sm' : 'bg-muted/80 backdrop-blur-sm'}`}>
                            {tour.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </div>

                      {/* Gallery count */}
                      {tour.images && tour.images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5 flex items-center gap-1 border border-white/10">
                          <Camera className="h-2.5 w-2.5 text-white/80" />
                          <span className="text-[10px] font-semibold text-white/90">{tour.images.length}</span>
                        </div>
                      )}
                      
                      {/* Bottom overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-white/80 mb-0.5">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="text-[10px] font-medium truncate">{tour.cities?.name || 'Unknown'}</span>
                            </div>
                            <h3 className="font-bold text-white text-sm leading-tight line-clamp-1 drop-shadow-lg">
                              {tour.name}
                            </h3>
                          </div>
                          <div className="bg-white/15 backdrop-blur-lg rounded-lg px-2.5 py-1.5 border border-white/20 shrink-0">
                            <span className="text-base font-extrabold text-white">${tour.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-3 flex flex-col flex-1 space-y-2">
                      {/* Meta pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 bg-primary/5 rounded-full px-2 py-0.5 border border-primary/10">
                          <Clock className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">{tour.duration_hours || 4}h</span>
                        </div>
                        <div className="flex items-center gap-1 bg-primary/5 rounded-full px-2 py-0.5 border border-primary/10">
                          <Users className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">Max {tour.max_participants || 20}</span>
                        </div>
                        {dayProgram.length > 0 && (
                          <div className="flex items-center gap-1 bg-primary/5 rounded-full px-2 py-0.5 border border-primary/10">
                            <Calendar className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-semibold text-primary">{dayProgram.length}d</span>
                          </div>
                        )}
                      </div>

                      {/* Includes - compact */}
                      {tour.includes && tour.includes.length > 0 && !isExpanded && (
                        <div className="flex flex-wrap gap-1">
                          {tour.includes.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle className="h-2 w-2" />{item}
                            </span>
                          ))}
                          {tour.includes.length > 3 && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-medium">
                              +{tour.includes.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable Details */}
                      <Collapsible open={isExpanded} onOpenChange={() => toggleTourExpansion(tour.id)}>
                        <CollapsibleContent className="pt-3 space-y-3 animate-fade-in">
                          {tour.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{tour.description}</p>
                          )}

                          {/* Itinerary Timeline */}
                          {dayProgram.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-primary" />
                                <h4 className="text-xs font-bold text-foreground">Itinerary</h4>
                              </div>
                              <div className="relative pl-4 space-y-0">
                                {dayProgram.map((day, dayIndex) => (
                                  <div key={dayIndex} className="relative pb-3 last:pb-0">
                                    {dayIndex < dayProgram.length - 1 && (
                                      <div className="absolute left-0 top-3 bottom-0 w-px bg-gradient-to-b from-primary/40 to-primary/10" />
                                    )}
                                    <div className="absolute -left-1 top-0.5 w-2 h-2 rounded-full bg-primary shadow-[0_0_0_2px] shadow-background ring-1 ring-primary/30" />
                                    
                                    <div className="ml-3 bg-muted/30 rounded-lg p-2.5 border border-border/30">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[9px] font-extrabold text-white bg-primary rounded px-1.5 py-0.5 uppercase tracking-wider">
                                          Day {day.day}
                                        </span>
                                        <span className="text-xs font-semibold text-foreground">{day.title}</span>
                                      </div>
                                      {day.description && (
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">{day.description}</p>
                                      )}
                                      {day.activities && day.activities.length > 0 && (
                                        <div className="space-y-1 mt-1.5">
                                          {day.activities.filter(a => a.trim()).map((activity, actIdx) => (
                                            <div key={actIdx} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                              <CheckCircle className="h-2.5 w-2.5 text-emerald-500 mt-0.5 shrink-0" />
                                              <span>{activity}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* What's Included */}
                          {tour.includes && tour.includes.length > 0 && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                                Included
                              </h4>
                              <div className="grid grid-cols-2 gap-1">
                                {tour.includes.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[10px] bg-emerald-50/50 dark:bg-emerald-500/5 rounded-md px-2 py-1.5 border border-emerald-100 dark:border-emerald-500/10">
                                    <CheckCircle className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                    <span className="text-foreground/80 font-medium truncate">{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      <div className="flex-1" />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/30">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg text-[10px] h-7 px-2 hover:bg-muted/50" 
                          onClick={() => toggleTourExpansion(tour.id)}
                        >
                          {isExpanded ? (
                            <><ChevronUp className="h-3 w-3 mr-0.5" />Less</>
                          ) : (
                            <><Eye className="h-3 w-3 mr-0.5" />Details</>
                          )}
                        </Button>
                        <Button 
                          variant="navy" 
                          size="sm" 
                          onClick={() => handleBook(tour)} 
                          disabled={!tour.is_active} 
                          className="rounded-lg flex-1 text-[10px] h-7 shadow-sm"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />Book Now
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(tour)} className="rounded-lg h-7 px-2">
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tours;
