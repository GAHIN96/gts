import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GroupPackageForm } from "@/components/admin/GroupPackageForm";
import { isAbortError } from "@/utils/errorUtils";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  Users,
  BadgeCheck,
  Plane,
  Building,
  Car,
  Map,
  Edit,
  ArrowRight,
  ArrowLeftRight,
  FileText,
  PlaneTakeoff,
  Trash2,
  Package2,
  Globe,
  Clock,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { usePackages, useDeletePackage, type GroupPackage } from "@/hooks/usePackages";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { CityGrid } from "@/components/booking/CityGrid";

import { openStorageFile } from "@/utils/openStorageFile";
import { getCountryFlagUrl } from "@/utils/countryFlags";
import { cn } from "@/lib/utils";

import packageTurkey from "@/assets/package-turkey.jpg";
import destinationDubai from "@/assets/destination-dubai.jpg";
import destinationMalaysia from "@/assets/destination-malaysia.jpg";
import destinationThailand from "@/assets/destination-thailand.jpg";
import destinationEgypt from "@/assets/destination-egypt.jpg";
import heroIstanbul from "@/assets/hero-istanbul.jpg";

const cityImages: Record<string, string> = {
  Istanbul: packageTurkey,
  Dubai: destinationDubai,
  "Kuala Lumpur": destinationMalaysia,
  Bangkok: destinationThailand,
  Cairo: destinationEgypt,
  Turkey: packageTurkey,
  UAE: destinationDubai,
  Malaysia: destinationMalaysia,
  Thailand: destinationThailand,
  Egypt: destinationEgypt,
};

const heroSlides = [
  { src: heroIstanbul, alt: "Istanbul", title: "Explore Istanbul", subtitle: "Where East meets West - Experience the magic" },
  { src: destinationDubai, alt: "Dubai", title: "Discover Dubai", subtitle: "Luxury meets adventure in the desert" },
  { src: destinationMalaysia, alt: "Malaysia", title: "Visit Malaysia", subtitle: "Truly Asia - Diverse cultures await" },
  { src: destinationThailand, alt: "Thailand", title: "Amazing Thailand", subtitle: "Land of smiles and endless beauty" },
];

/* ── Section Header component ── */
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      <p className="text-muted-foreground pl-[1.75rem]">{subtitle}</p>
    </div>
  );
}

const Packages = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const { data: packages, isLoading, error } = usePackages();
  const [searchQuery, setSearchQuery] = useState("");
  const [manageSearch, setManageSearch] = useState("");
  const selectedCity = searchParams.get("city") || null;
  const viewMode = searchParams.get("view");
  const isAdmin = role === "admin";
  const isManageView = viewMode === "manage" && isAdmin;
  const [formOpen, setFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<GroupPackage | null>(null);

  const deletePackage = useDeletePackage();
  const [packageToDelete, setPackageToDelete] = useState<GroupPackage | null>(null);

  const handleDeletePackage = async () => {
    if (!packageToDelete) return;
    try {
      await deletePackage.mutateAsync(packageToDelete.id);
      toast.success("Package deleted successfully");
    } catch (error) {
      toast.error("Failed to delete package");
    }
    setPackageToDelete(null);
  };

  const handleEditPackage = (pkg: GroupPackage) => {
    setEditingPackage(pkg);
    setFormOpen(true);
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    setFormOpen(true);
  };

  // Build cities data for CityGrid
  const citiesData = useMemo(() => {
    if (!packages) return [];

    const cityMap = packages.reduce((acc, pkg) => {
      const cityId = pkg.city_id;
      const cityName = pkg.cities?.name || "Unknown";
      const cityCountry = pkg.cities?.country || "";

      if (!acc[cityId]) {
        acc[cityId] = {
          id: cityId,
          name: cityName,
          country: cityCountry,
          image_url: pkg.cities?.image_url || cityImages[cityName] || cityImages[cityCountry],
          startingPrice: pkg.starting_price,
          packageCount: 0,
        };
      }
      acc[cityId].packageCount++;
      acc[cityId].startingPrice = Math.min(acc[cityId].startingPrice, pkg.starting_price);
      return acc;
    }, {} as Record<string, { id: string; name: string; country: string; image_url?: string | null; startingPrice: number; packageCount: number }>);

    return Object.values(cityMap);
  }, [packages]);

  // Filter packages by search and selected city
  const filteredPackages = useMemo(() => {
    return packages?.filter((pkg) => {
      const matchesSearch = !searchQuery ||
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.cities?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.cities?.country?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCity = !selectedCity || pkg.city_id === selectedCity;

      return matchesSearch && matchesCity;
    });
  }, [packages, searchQuery, selectedCity]);

  // Filter for manage view
  const managedPackages = useMemo(() => {
    if (!packages) return [];
    if (!manageSearch) return packages;
    const q = manageSearch.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.cities?.name?.toLowerCase().includes(q) ||
        pkg.cities?.country?.toLowerCase().includes(q)
    );
  }, [packages, manageSearch]);

  // Get next departure for a package
  const getNextDeparture = (departures: typeof packages extends (infer T)[] ? T extends { package_departures: infer D } ? D : never : never) => {
    if (!departures || departures.length === 0) return null;
    const upcoming = departures
      .filter((d) => d.is_active && new Date(d.departure_date) > new Date())
      .sort((a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());
    return upcoming[0] || null;
  };

  // Get total available seats
  const getTotalAvailableSeats = (departures: typeof packages extends (infer T)[] ? T extends { package_departures: infer D } ? D : never : never) => {
    if (!departures || departures.length === 0) return 0;
    return departures
      .filter((d) => d.is_active)
      .reduce((sum, d) => sum + (d.available_seats || 0), 0);
  };

  // Get departure airport/city from departure_city field or linked flights
  const getDepartureOrigin = (pkg: GroupPackage) => {
    if (pkg.departure_city) {
      return pkg.departure_city.name;
    }
    for (const dep of (pkg.package_departures || [])) {
      const outbound = (dep as any).package_departure_flights?.find(
        (f: any) => f.flight_type === 'outbound' && f.flights
      );
      if (outbound?.flights) {
        const code = outbound.flights.departure_airport_code;
        const city = outbound.flights.departure_city;
        return code ? `${city} (${code})` : city;
      }
    }
    return null;
  };

  const handleCitySelect = (cityId: string) => {
    setSearchParams({ city: cityId });
    setSearchQuery("");
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery("");
  };

  const selectedCityName = citiesData.find(c => c.id === selectedCity)?.name;

  // Stats for hero
  const totalDestinations = citiesData.length;
  const totalPackages = packages?.length || 0;

  if (error && !isAbortError(error)) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold text-foreground mb-2">Error loading packages</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (isManageView) {
    return (
      <div className="space-y-6">
        <GroupPackageForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingPackage(null);
          }}
          pkg={editingPackage}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Groups</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                className="pl-9 w-64 rounded-lg"
                value={manageSearch}
                onChange={(e) => setManageSearch(e.target.value)}
              />
            </div>
            <Button onClick={handleAddPackage} className="gap-2 rounded-lg">
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-center">Nights</TableHead>
                  <TableHead className="text-center">Departures</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managedPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No groups found
                    </TableCell>
                  </TableRow>
                ) : (
                  managedPackages.map((pkg, idx) => {
                    const activeDepartures = pkg.package_departures?.filter((d) => d.is_active)?.length || 0;
                    return (
                      <TableRow key={pkg.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{pkg.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {pkg.cities?.name}, {pkg.cities?.country}
                        </TableCell>
                        <TableCell className="text-center">{pkg.nights}</TableCell>
                        <TableCell className="text-center">{activeDepartures}</TableCell>
                        <TableCell>
                          <Badge
                            variant={pkg.is_active ? "default" : "secondary"}
                            className={pkg.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                          >
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-block font-extrabold text-primary animate-price-glow">${pkg.starting_price}</span>
                          <span className="block mx-auto mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-primary/60 to-transparent bg-[length:200%_100%] animate-price-shimmer" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 rounded-lg text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => handleEditPackage(pkg)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setPackageToDelete(pkg)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={!!packageToDelete} onOpenChange={(open) => !open && setPackageToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{packageToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePackage}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Skyscanner & Booking.com style travel module tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 bg-muted/40 rounded-xl border border-border/40">
        {[
          { label: "Flights", icon: Plane, path: "/flights", active: false },
          { label: "Hotels", icon: Building, path: "/hotels", active: false },
          { label: "Packages", icon: Package2, path: "/packages", active: true },
          { label: "Visas", icon: FileText, path: "/visas", active: false },
          { label: "Transfers", icon: Car, path: "/transfers", active: false },
          { label: "Tours", icon: Map, path: "/tours", active: false },
        ].map(tab => (
          <button
            key={tab.label}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              tab.active
                ? "bg-primary text-white shadow-md shadow-primary/30 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Package Form Dialog */}
      <GroupPackageForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPackage(null);
        }}
        pkg={editingPackage}
      />

      {/* ═══ City Grid ═══ */}
      {!selectedCity && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <SectionHeader title="Popular Destinations" subtitle="Select a destination to view available packages" />
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-3xl" />
              ))}
            </div>
          ) : (
            <CityGrid cities={citiesData} onCitySelect={handleCitySelect} />
          )}
        </div>
      )}

      {/* ═══ Hero Section ═══ */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl h-[200px] md:h-[220px]">
        <ImageCarousel
          images={heroSlides}
          autoPlay={true}
          interval={5000}
          aspectRatio="hero"
          showDots={true}
          showArrows={true}
          className="h-full"
        />
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {/* Title removed per request */}
          <div className="mt-auto" />

          {/* Stats pills row */}
          {!isLoading && (
            <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2 pointer-events-auto justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow">
                <span className="text-xs font-bold text-white">{totalDestinations}</span>
                <span className="text-[10px] text-white/70">Destinations</span>
                <Globe className="h-3 w-3 text-white/60" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow">
                <span className="text-xs font-bold text-white">{totalPackages}</span>
                <span className="text-[10px] text-white/70">Packages</span>
                <Package2 className="h-3 w-3 text-white/60" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow">
                <span className="text-[10px] text-white/70 font-medium">Curated by experts</span>
                <BadgeCheck className="h-3 w-3 text-accent fill-accent" />
              </div>
            </div>
          )}
        </div>

        {/* Glassmorphic search overlay */}
        {!selectedCity && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pointer-events-auto hidden md:block">
            {/* This overlaps the stats, so we shift stats up with mb */}
          </div>
        )}
      </div>

      {/* ═══ Packages Section ═══ */}
      {(selectedCity || searchQuery) && (
        <div>
          {/* Breadcrumb & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              {selectedCity && (
                <>
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-primary rounded-xl"
                  >
                    All Destinations
                  </Button>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{selectedCityName}</span>
                  <Badge className="ml-2 bg-primary/10 text-primary border-0">
                    {filteredPackages?.length || 0} packages
                  </Badge>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  className="pl-11 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Packages Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-3xl border-0">
                  <Skeleton className="h-56" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPackages?.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-3xl shadow-card">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No packages found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPackages?.map((pkg, cardIndex) => {
                const nextDeparture = getNextDeparture(pkg.package_departures);
                const availableSeats = getTotalAvailableSeats(pkg.package_departures);
                const cityName = pkg.cities?.name || "Unknown";
                const image = pkg.images?.[0] || cityImages[cityName] || packageTurkey;
                const departureOrigin = getDepartureOrigin(pkg);
                const daysUntilDeparture = nextDeparture
                  ? differenceInDays(new Date(nextDeparture.departure_date), new Date())
                  : null;

                return (
                  <Card
                    key={pkg.id}
                    className="group/card overflow-hidden rounded-xl bg-card border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08),0_24px_48px_-20px_rgba(15,23,42,0.25)] transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1 animate-fade-in"
                    style={{ animationDelay: `${cardIndex * 80}ms` }}
                    onClick={() => navigate(`/packages/${pkg.id}/book`)}
                  >
                    {/* Image */}
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={image}
                        alt={pkg.name}
                        className="w-full h-full object-cover group-hover/card:scale-[1.04] transition-transform duration-[900ms] ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                      {/* Top left badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/35 backdrop-blur-md text-[11px] font-medium text-white">
                          <Moon className="h-2.5 w-2.5" /> {pkg.nights} Nights
                        </span>
                        {departureOrigin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/35 backdrop-blur-md text-[11px] font-medium text-white">
                            <PlaneTakeoff className="h-2.5 w-2.5" /> From {departureOrigin}
                          </span>
                        )}
                        {daysUntilDeparture !== null && daysUntilDeparture > 0 && daysUntilDeparture <= 30 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-400 text-[11px] font-semibold text-amber-950">
                            {daysUntilDeparture === 1 ? 'Tomorrow' : `In ${daysUntilDeparture} days`}
                          </span>
                        )}
                      </div>

                      {/* Top right — admin actions */}
                      {isAdmin && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 bg-black/40 hover:bg-black/60 rounded-md"
                            onClick={(e) => { e.stopPropagation(); handleEditPackage(pkg); }}
                          >
                            <Edit className="h-3 w-3 text-white" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 bg-black/40 hover:bg-destructive/70 rounded-md"
                            onClick={(e) => { e.stopPropagation(); setPackageToDelete(pkg); }}
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </Button>
                        </div>
                      )}

                      {/* Bottom overlay — title */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                        <h3 className="font-heading font-semibold text-white text-[22px] leading-[1.15] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
                          {pkg.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {pkg.cities?.country && getCountryFlagUrl(pkg.cities.country) ? (
                            <img src={getCountryFlagUrl(pkg.cities.country, 40)!} alt={pkg.cities.country} className="h-3.5 w-5 object-cover rounded-[1px]" />
                          ) : (
                            <MapPin className="h-3 w-3 text-white/70" />
                          )}
                          <span className="text-[12px] text-white/75">{cityName}, {pkg.cities?.country}</span>
                        </div>
                      </div>
                    </div>

                    {/* Includes row — inline icons, dot separated */}
                    <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {[
                          { show: pkg.includes_flight, icon: Plane },
                          { show: pkg.includes_hotel, icon: Building },
                          { show: pkg.includes_transfer, icon: ArrowLeftRight },
                          { show: pkg.includes_tours, icon: Map },
                        ].filter(i => i.show).map((item, i, arr) => {
                          const Icon = item.icon;
                          return (
                            <span key={i} className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {i < arr.length - 1 && <span className="text-border">·</span>}
                            </span>
                          );
                        })}
                      </div>
                      <span className={cn(
                        "text-[11px]",
                        availableSeats === 0
                          ? "text-destructive font-medium"
                          : availableSeats < 10
                            ? "text-amber-600 font-medium"
                            : "text-muted-foreground"
                      )}>
                        {availableSeats} seats left
                      </span>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {/* Barcode or Program */}
                      {(pkg as any).barcode_image_url ? (
                        <a
                          href={(pkg as any).barcode_link_url || "#"}
                          target={(pkg as any).barcode_link_url ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1.5 py-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors border border-border/40 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); if (!(pkg as any).barcode_link_url) e.preventDefault(); }}
                        >
                          <img src={(pkg as any).barcode_image_url} alt="Scan" className="h-10 w-auto object-contain opacity-80" />
                          <span className="text-[10px] text-muted-foreground">Scan or tap to open</span>
                        </a>
                      ) : (pkg as any).program_pdf_url ? (
                        <button
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-muted/40 hover:bg-muted/70 text-foreground/80 text-xs font-medium transition-colors"
                          onClick={(e) => { e.stopPropagation(); openStorageFile((pkg as any).program_pdf_url); }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Program
                        </button>
                      ) : null}

                      {/* Price row — clean, typographic */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">From</p>
                          <p className="text-[28px] font-bold text-foreground tracking-tight leading-none">
                            <span className="text-[18px] font-semibold text-muted-foreground mr-0.5">$</span>{pkg.starting_price}
                          </p>
                        </div>
                        {nextDeparture && (
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Next departure</p>
                            <p className="text-[13px] font-semibold text-foreground">
                              {format(new Date(nextDeparture.departure_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* CTA — solid */}
                      <Button
                        className={cn(
                          "w-full h-11 rounded-md font-semibold text-[13px] tracking-wide group/btn shadow-none",
                          isAdmin
                            ? "bg-foreground text-background hover:bg-foreground/90"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={(e) => { e.stopPropagation(); navigate(`/packages/${pkg.id}/book`); }}
                      >
                        {isAdmin ? "Manage Package" : "Book Now"}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Build Your Own Group CTA ═══ */}
      {!isAdmin && (
        <div
          className="relative rounded-3xl overflow-hidden cursor-pointer group"
          onClick={() => navigate("/packages/custom-group/build")}
        >
          {/* Animated gradient border */}
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] group-hover:animate-[shimmer_3s_linear_infinite] opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-0" />

          <div className="relative z-10 bg-gradient-to-r from-[hsl(var(--navy))] to-[hsl(var(--navy-light))] rounded-3xl px-8 py-7 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                <Package2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Build Your Own Group</h3>
                <p className="text-white/60 text-sm mt-0.5">Create a custom group trip — pick dates, flights, hotel & transfers</p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="rounded-xl gap-2 font-semibold group-hover:bg-white group-hover:text-primary transition-colors h-11 px-6 shadow-lg"
            >
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Featured Packages ═══ */}
      {!selectedCity && !searchQuery && packages && packages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <SectionHeader title="Featured Packages" subtitle="Our most popular travel experiences" />
            <Button
              variant="outline"
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setSearchParams({ city: citiesData[0]?.id })}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.slice(0, 6).map((pkg, cardIndex) => {
              const nextDeparture = getNextDeparture(pkg.package_departures);
              const cityName = pkg.cities?.name || "Unknown";
              const image = pkg.images?.[0] || cityImages[cityName] || packageTurkey;
              const departureOrigin = getDepartureOrigin(pkg);

              return (
                <Card
                  key={pkg.id}
                  className="group overflow-hidden rounded-3xl bg-card border-0 shadow-card hover:shadow-card-hover transition-all duration-700 ease-out cursor-pointer hover:-translate-y-2 animate-fade-in relative"
                  style={{ animationDelay: `${cardIndex * 80}ms` }}
                  onClick={() => navigate(`/packages/${pkg.id}/book`)}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-out" />
                  </div>

                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={image}
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(231,70%,6%)]/85 via-[hsl(231,70%,8%)]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                    {departureOrigin && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(45,100%,60%)] text-white rounded-full shadow-lg">
                        <PlaneTakeoff className="h-3 w-3" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">From {departureOrigin}</span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-bold text-lg text-white mb-1 group-hover:translate-x-1 transition-transform duration-500">{pkg.name}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-sm">
                        {pkg.cities?.country && getCountryFlagUrl(pkg.cities.country) ? (
                          <img src={getCountryFlagUrl(pkg.cities.country, 40)!} alt={pkg.cities.country} className="h-4 w-6 object-cover rounded-[2px] shadow-sm" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        <span>{cityName}</span>
                        <span className="text-white/40">•</span>
                        <span>{pkg.nights} nights</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="group/price">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">From</p>
                      <p className="text-xl font-extrabold text-primary animate-price-glow">
                        <span className="text-xs font-semibold text-primary/60 mr-0.5">$</span>{pkg.starting_price}
                      </p>
                      <span className="block mt-0.5 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-accent/70 to-transparent bg-[length:200%_100%] animate-price-shimmer" />
                    </div>
                    <Button className="rounded-2xl bg-primary hover:bg-primary/90 shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.5)] transition-all duration-500 group/btn">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!packageToDelete} onOpenChange={(open) => !open && setPackageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{packageToDelete?.name}"? This action cannot be undone and will remove all associated departures, rates, and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePackage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Packages;
