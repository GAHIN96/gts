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
import { Separator } from "@/components/ui/separator";
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
            <div className="relative -mt-12 mx-4 sm:mx-12 mb-6 z-10 group/search">
              <div className="bg-card/40 backdrop-blur-3xl rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-white/10 p-5 sm:p-6 transition-all duration-500 group-hover/search:shadow-primary/10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20">
                    <Search className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">Explore Destinations</h3>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Find your next adventure</p>
                  </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1 group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors">
                      <Search className="h-full w-full" />
                    </div>
                    <Input 
                      placeholder="Search by tour name, city, or country..." 
                      className="pl-12 rounded-2xl h-12 bg-background/50 border-border/40 focus:ring-primary/20 text-sm font-medium transition-all" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 lg:w-auto">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="w-full sm:w-[220px] rounded-2xl h-12 bg-background/50 border-border/40 font-bold text-sm">
                        <Globe className="h-4 w-4 mr-2 text-primary" />
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/10 backdrop-blur-xl">
                        <SelectItem value="all">All Countries</SelectItem>
                        {countries.map(c => (
                          <SelectItem key={c} value={c}>
                            <span className="flex items-center gap-3">
                              {getCountryFlagUrl(c) && <img src={getCountryFlagUrl(c)!} alt="" className="h-4 w-auto rounded-sm shadow-sm" />}
                              <span className="font-semibold">{c}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full sm:w-[200px] rounded-2xl h-12 bg-background/50 border-border/40 font-bold text-sm">
                        <ArrowUpDown className="h-4 w-4 mr-2 text-primary" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-white/10 backdrop-blur-xl">
                        <SelectItem value="default">Recommended</SelectItem>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTours.map((tour, index) => {
                const isExpanded = expandedTourId === tour.id;
                const dayProgram = getDayProgram(tour);
                return (
                  <Card 
                    key={tour.id} 
                    className={`group relative overflow-hidden transition-all duration-500 border-0 bg-card/40 backdrop-blur-md animate-fade-in flex flex-col rounded-2xl ${
                      isExpanded 
                        ? 'lg:col-span-2 ring-1 ring-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
                        : 'shadow-sm hover:shadow-2xl hover:-translate-y-1'
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    {/* Background Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Image Container with Floating Badges */}
                    <div className={`relative overflow-hidden ${isExpanded ? 'h-64' : 'h-48'} transition-all duration-500`}>
                      {tour.images && tour.images.length > 1 ? (
                        <ImageCarousel images={tour.images} autoPlay={isExpanded} showDots={isExpanded} showArrows={isExpanded} className="h-full" />
                      ) : tour.images && tour.images[0] ? (
                        <img 
                          src={tour.images[0]} 
                          alt={tour.name} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <Compass className="h-16 w-16 text-primary/20 animate-pulse" />
                        </div>
                      )}
                      
                      {/* Premium Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                      
                      {/* Floating Location & Country */}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {tour.cities?.country && (
                          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-white/10 shadow-lg translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
                            <div className="h-6 w-6 rounded-full overflow-hidden border border-white/20">
                              {getCountryFlagUrl(tour.cities.country) ? (
                                <img src={getCountryFlagUrl(tour.cities.country)!} alt="" className="w-full h-full object-cover scale-150" />
                              ) : (
                                <Globe className="h-full w-full p-1 text-white/50" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-wider uppercase">{tour.cities.country}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-primary/20 backdrop-blur-md rounded-full px-3 py-1 border border-primary/30 text-white shadow-lg translate-y-0 group-hover:-translate-y-1 transition-transform duration-500 delay-75">
                          <MapPin className="h-3 w-3 text-primary-light" />
                          <span className="text-[10px] font-bold tracking-tight">{tour.cities?.name || 'Exploration'}</span>
                        </div>
                      </div>

                      {/* Floating Price Badge */}
                      <div className="absolute top-4 right-4 bg-white dark:bg-navy-dark rounded-2xl p-2 shadow-2xl border border-border/50 translate-y-0 group-hover:-translate-y-1 transition-transform duration-500">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Starting At</span>
                          <span className="text-lg font-bold text-primary leading-none">${tour.price}</span>
                        </div>
                      </div>

                      {/* Status & Gallery Badges */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <div className="flex gap-2">
                          {isAdmin && (
                            <Badge className={`rounded-full px-2 py-0 h-5 text-[9px] font-bold tracking-widest uppercase border border-white/10 ${tour.is_active ? 'bg-success/80' : 'bg-muted/80'}`}>
                              {tour.is_active ? 'Active' : 'Draft'}
                            </Badge>
                          )}
                          {dayProgram.length > 0 && (
                            <Badge className="bg-white/10 backdrop-blur-md rounded-full px-2 py-0 h-5 text-[9px] font-bold text-white border border-white/10">
                              <Calendar className="h-2.5 w-2.5 mr-1" />
                              {dayProgram.length} Days
                            </Badge>
                          )}
                        </div>
                        {tour.images && tour.images.length > 1 && (
                          <div className="bg-black/40 backdrop-blur-md rounded-lg px-2 py-1 flex items-center gap-1.5 border border-white/10">
                            <Camera className="h-3 w-3 text-white/70" />
                            <span className="text-[10px] font-bold text-white/90">{tour.images.length} Photos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section */}
                    <CardContent className="p-5 flex flex-col flex-1 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors duration-300">
                            {tour.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{tour.duration_hours || 4} Hours</span>
                            </div>
                            <Separator orientation="vertical" className="h-3" />
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">Up to {tour.max_participants || 20}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Highlights / Includes */}
                      {!isExpanded && tour.includes && tour.includes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tour.includes.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-primary/5 text-primary-foreground/70 font-bold border border-primary/10">
                              <Sparkles className="h-2.5 w-2.5 text-primary" />
                              {item}
                            </span>
                          ))}
                          {tour.includes.length > 3 && (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-bold">
                              +{tour.includes.length - 3} More
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description Snippet */}
                      {!isExpanded && tour.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-6">
                          {tour.description}
                        </p>
                      )}

                      {/* Expanded Section */}
                      <Collapsible open={isExpanded} onOpenChange={() => toggleTourExpansion(tour.id)}>
                        <CollapsibleContent className="space-y-6 pt-2 pb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                          {tour.description && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Overview</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">{tour.description}</p>
                            </div>
                          )}

                          {/* Interactive Itinerary */}
                          {dayProgram.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Tour Program</h4>
                              <div className="grid grid-cols-1 gap-4">
                                {dayProgram.map((day, dIdx) => (
                                  <div key={dIdx} className="group/day relative flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors duration-300">
                                    <div className="flex flex-col items-center">
                                      <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/20">
                                        {day.day}
                                      </div>
                                      {dIdx < dayProgram.length - 1 && (
                                        <div className="w-0.5 h-full bg-border mt-2" />
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <h5 className="font-bold text-sm">{day.title}</h5>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{day.description}</p>
                                      {day.activities && day.activities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                          {day.activities.map((act, aIdx) => (
                                            <span key={aIdx} className="text-[10px] bg-background/50 rounded-md px-2 py-0.5 border border-border/50 flex items-center gap-1">
                                              <CheckCircle className="h-2 w-2 text-success" />
                                              {act}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full Includes */}
                          {tour.includes && tour.includes.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">What's Included</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {tour.includes.map((inc, iIdx) => (
                                  <div key={iIdx} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    </div>
                                    <span className="text-xs font-medium">{inc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      <div className="flex-1" />

                      {/* Action Command Bar */}
                      <div className="flex items-center gap-3 pt-4 mt-auto border-t border-border/50">
                        <Button 
                          variant="ghost" 
                          className="h-10 px-4 rounded-xl text-xs font-bold gap-2 group/btn" 
                          onClick={() => toggleTourExpansion(tour.id)}
                        >
                          {isExpanded ? (
                            <><ChevronUp className="h-4 w-4" /> Collapse</>
                          ) : (
                            <><Eye className="h-4 w-4 group-hover/btn:text-primary transition-colors" /> Details</>
                          )}
                        </Button>
                        <Button 
                          className="flex-1 h-10 rounded-xl font-bold gap-2 shadow-xl shadow-primary/20 active:scale-95 transition-transform" 
                          variant="navy"
                          onClick={() => handleBook(tour)}
                          disabled={!tour.is_active}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Book Experience
                        </Button>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              className="h-10 w-10 p-0 rounded-xl hover:bg-primary/5 hover:text-primary transition-all"
                              onClick={() => handleEdit(tour)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  className="h-10 w-10 p-0 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tour</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{tour.name}"? This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTour(tour.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
