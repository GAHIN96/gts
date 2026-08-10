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
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { format, addMonths } from "date-fns";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  const navigate = useNavigate();
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
  const [searchDate, setSearchDate] = useState<Date>();
  const [dateOpen, setDateOpen] = useState(false);
  const [searchGuests, setSearchGuests] = useState<string>("2");

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
    let matchesCountry = true;
    if (selectedCountry === "top_deal") {
      matchesCountry = (tour as any).is_featured === true;
    } else if (selectedCountry !== "all") {
      matchesCountry = tour.cities?.country === selectedCountry;
    }
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

            {/* Search Bar - Premium Pill Design */}
            <div className="relative -mt-10 mx-auto max-w-5xl z-10 px-4">
              <div className="bg-white dark:bg-card rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/40 p-2 flex items-center justify-between transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)]">
                <div className="flex-1 flex items-center h-14">
                  
                  {/* Location */}
                  <div className="flex-1 flex items-center px-6 gap-3 h-full border-r border-border hover:bg-muted/30 rounded-l-full cursor-pointer transition-colors relative group">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Location</span>
                      <Select value={searchQuery} onValueChange={(val) => setSearchQuery(val === "all" ? "" : val)}>
                        <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-0 shadow-none h-5 w-full font-bold text-[15px] p-0 m-0 !bg-transparent hover:bg-transparent [&>span]:line-clamp-1 text-foreground">
                          <SelectValue placeholder="Where to?" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="all" className="font-medium">Anywhere</SelectItem>
                          {countries.map(c => (
                            <SelectItem key={c} value={c} className="font-medium">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Dates */}
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger className="flex-1 flex items-center px-6 gap-3 h-full border-r border-border hover:bg-muted/30 cursor-pointer transition-colors text-left outline-none group">
                      <Calendar className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                         <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Date</span>
                         <span className={`font-bold text-[15px] h-5 flex items-center truncate ${searchDate ? 'text-foreground' : 'text-muted-foreground'}`}>
                           {searchDate ? format(searchDate, "dd MMM yyyy") : "Any day"}
                         </span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-border/50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={searchDate}
                        onSelect={(d) => {
                          setSearchDate(d);
                          setDateOpen(false);
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Guests */}
                  <div className="flex-1 flex items-center px-6 gap-3 h-full hover:bg-muted/30 cursor-pointer transition-colors rounded-r-full mr-2 relative group">
                    <Users className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Guests</span>
                      <Select value={searchGuests} onValueChange={setSearchGuests}>
                        <SelectTrigger className="border-0 bg-transparent focus:ring-0 focus:ring-offset-0 px-0 shadow-none h-5 w-full font-bold text-[15px] p-0 m-0 !bg-transparent hover:bg-transparent [&>span]:line-clamp-1 text-foreground">
                          <SelectValue placeholder="Add guests" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="1" className="font-medium">1 Adult</SelectItem>
                          <SelectItem value="2" className="font-medium">2 Adults</SelectItem>
                          <SelectItem value="3" className="font-medium">3 Adults</SelectItem>
                          <SelectItem value="4" className="font-medium">4 Adults</SelectItem>
                          <SelectItem value="5" className="font-medium">5+ Adults</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                </div>
                <Button className="rounded-full px-8 h-14 font-bold shadow-md bg-gradient-to-r from-blue-600 to-primary hover:opacity-90 transition-opacity flex-shrink-0 text-base text-white relative overflow-hidden group">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <Search className="h-5 w-5 mr-2 relative z-10" /> 
                  <span className="relative z-10">Search</span>
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8 mb-6 px-4">
              <Button 
                variant={selectedCountry === "all" ? "navy" : "outline"} 
                className={`rounded-full px-6 ${selectedCountry === "all" ? "shadow-md" : "bg-white dark:bg-card"}`}
                onClick={() => setSelectedCountry("all")}
              >
                All Tours
              </Button>
              <Button 
                variant={selectedCountry === "top_deal" ? "navy" : "outline"} 
                className={`rounded-full px-6 ${selectedCountry === "top_deal" ? "shadow-md" : "bg-white dark:bg-card"}`}
                onClick={() => setSelectedCountry("top_deal")}
              >
                Top deal
              </Button>
              {countries.slice(0, 5).map(country => (
                <Button 
                  key={country}
                  variant={selectedCountry === country ? "navy" : "outline"} 
                  className={`rounded-full px-6 ${selectedCountry === country ? "shadow-md" : "bg-white dark:bg-card"}`}
                  onClick={() => setSelectedCountry(country)}
                >
                  {country} deals
                </Button>
              ))}
            </div>
          </div>



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
            <div className="py-24 text-center">
              <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-bold">No tours found</h3>
              <p className="text-muted-foreground">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTours.map((tour, index) => {
                // Remove hardcoded fields to match back-office capabilities

                return (
                  <Card 
                    key={tour.id} 
                    className="group relative overflow-hidden transition-all duration-300 border-border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col rounded-2xl"
                    style={{ animationDelay: `${index * 40}ms` }}
                    onClick={() => {
                      if (!isAdmin) {
                        navigate(`/tours/${tour.id}`);
                      }
                    }}
                  >
                    {/* Image Container */}
                    <div className="relative h-48 overflow-hidden">
                      {tour.images && tour.images[0] ? (
                        <img 
                          src={tour.images[0]} 
                          alt={tour.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Compass className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex justify-end items-start z-10">
                        <button className="h-8 w-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md text-muted-foreground hover:text-coral transition-colors">
                          <Heart className="h-4 w-4" />
                        </button>
                      </div>

                      {isAdmin && (
                        <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                           <Button 
                              variant="secondary" 
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full bg-white/90 shadow-md"
                              onClick={(e) => { e.stopPropagation(); handleEdit(tour); }}
                            >
                              <Edit className="h-4 w-4 text-foreground" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  className="h-8 w-8 p-0 rounded-full shadow-md"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Tour</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{tour.name}"? This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTour(tour.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <CardContent className="p-4 flex flex-col flex-grow">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{tour.cities?.name || "Multiple"} {tour.cities?.country ? `, ${tour.cities.country}` : ""}</span>
                      </div>
                      
                      <h3 className="font-bold text-foreground text-base leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {tour.name}
                      </h3>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-auto mb-4">
                        <span className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-md"><Calendar className="h-3.5 w-3.5"/> {tour.duration_hours ? Math.ceil(tour.duration_hours/24) : 1} days</span>
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-0.5">From</p>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-foreground">${tour.price}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="navy"
                          className="rounded-xl px-4 font-semibold text-xs shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBook(tour);
                          }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                          Book
                        </Button>
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
