import { useState, useMemo } from "react";
import { ModulePageHeader } from "@/components/ui/module-page-header";
import { useSearchParams } from "react-router-dom";
import {
  Hotel,
  Plus,
  MapPin,
  Star,
  Wifi,
  UtensilsCrossed,
  Dumbbell,
  Car,
  Edit,
  Eye,
  ShoppingCart,
  Loader2,
  Tag,
  Trash2,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useHotels, useHotelStats, useDeleteHotel, type Hotel as HotelType } from "@/hooks/useHotels";
import { useActiveHotelDeals, useDeleteHotelDeal, type HotelDeal } from "@/hooks/useHotelDeals";
import { HotelForm } from "@/components/admin/HotelForm";
import { HotelDealForm } from "@/components/admin/HotelDealForm";
import { ImageCarousel } from "@/components/ui/image-carousel";
import promoHotels1 from "@/assets/promo-hotels-1.jpg";
import promoHotels2 from "@/assets/promo-hotels-2.jpg";
import promoHotels3 from "@/assets/promo-hotels-3.jpg";

const DEFAULT_HOTELS_PROMOS = [promoHotels1, promoHotels2, promoHotels3];
import { SpecialOffersSection } from "@/components/offers/SpecialOffersSection";
import { HotelBookingModal } from "@/components/booking/HotelBookingModal";
import { useBannerSettings } from "@/hooks/useBannerSettings";
import { HotelSearchSection } from "@/components/search/HotelSearchSection";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

const amenityIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-4 w-4" />,
  restaurant: <UtensilsCrossed className="h-4 w-4" />,
  gym: <Dumbbell className="h-4 w-4" />,
  parking: <Car className="h-4 w-4" />,
};

const Hotels = () => {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const isManageView = searchParams.get("view") === "manage" && isAdmin;
  const { bannerImages } = useBannerSettings();
  const heroImages = bannerImages.hotels;
  const promoImages = bannerImages.hotelsPromo.length > 0 ? bannerImages.hotelsPromo : DEFAULT_HOTELS_PROMOS;
  const [formOpen, setFormOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelType | null>(null);
  const [editingDeal, setEditingDeal] = useState<HotelDeal | null>(null);
  const [roomsManagerOpen, setRoomsManagerOpen] = useState(false);
  const [selectedHotelForRooms, setSelectedHotelForRooms] = useState<HotelType | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelType | null>(null);
  const [bookingParams, setBookingParams] = useState<{
    checkIn?: Date;
    checkOut?: Date;
    guests: number;
    rooms: number;
    roomConfigs?: import("@/components/booking/HotelRoomConfigurator").RoomConfig[];
  }>({ guests: 2, rooms: 1 });
  const [adminSearch, setAdminSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: hotels, isLoading } = useHotels();
  const { data: stats } = useHotelStats();
  const { data: hotelDeals } = useActiveHotelDeals();
  const deleteDeal = useDeleteHotelDeal();
  const deleteHotel = useDeleteHotel();

  const filteredAdminHotels = useMemo(() => {
    if (!hotels || !adminSearch.trim()) return hotels || [];
    const q = adminSearch.toLowerCase();
    return hotels.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.cities?.name?.toLowerCase().includes(q) ||
      h.cities?.country?.toLowerCase().includes(q)
    );
  }, [hotels, adminSearch]);

  // Transform hotel deals to offer format
  const hotelOffers = (hotelDeals || []).map(deal => ({
    id: deal.id,
    title: deal.title,
    description: deal.description || "",
    originalPrice: deal.original_price,
    discountedPrice: deal.discounted_price,
    discountPercent: deal.discount_percent,
    image: deal.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
    expiresIn: deal.expires_at
      ? `${Math.max(0, differenceInDays(new Date(deal.expires_at), new Date()))} days left`
      : undefined,
    featured: deal.is_featured,
  }));

  const handleBook = (hotel: HotelType, searchParams?: { checkIn?: Date; checkOut?: Date; guests: number; rooms: number; roomConfigs?: import("@/components/booking/HotelRoomConfigurator").RoomConfig[] }) => {
    setSelectedHotel(hotel);
    if (searchParams) {
      setBookingParams(searchParams);
    }
    setBookingModalOpen(true);
  };

  const handleEdit = (hotel: HotelType) => {
    setEditingHotel(hotel);
    setFormOpen(true);
  };


  const handleViewOffer = (offer: any) => {
    const deal = hotelDeals?.find(d => d.id === offer.id);
    if (deal && isAdmin) {
      setEditingDeal(deal);
      setDealFormOpen(true);
    } else {
      toast.info(`Viewing offer: ${offer.title}`);
    }
  };

  const handleDeleteHotel = async (id: string) => {
    try {
      await deleteHotel.mutateAsync(id);
      toast.success("Hotel deleted successfully");
    } catch (error) {
      toast.error("Failed to delete hotel");
    }
  };

  return (
    <div className="space-y-6">
      {isManageView ? (
        <HotelForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingHotel(null);
          }}
          hotel={editingHotel}
          inline
        />
      ) : (
        <HotelForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingHotel(null);
          }}
          hotel={editingHotel}
        />
      )}

      <HotelDealForm
        open={dealFormOpen}
        onOpenChange={(open) => {
          setDealFormOpen(open);
          if (!open) setEditingDeal(null);
        }}
        deal={editingDeal}
      />


      <HotelBookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        hotel={selectedHotel}
        initialCheckIn={bookingParams.checkIn}
        initialCheckOut={bookingParams.checkOut}
        initialGuests={bookingParams.guests}
        initialRooms={bookingParams.rooms}
        initialRoomConfigs={bookingParams.roomConfigs}
      />

      {/* Admin header for manage view */}
      {isManageView && (
        <ModulePageHeader
          icon={Hotel}
          title="Hotels"
          count={hotels?.length ?? 0}
          subtitle="Manage hotel inventory and rooms"
          iconBg="bg-accent/10"
          iconColor="text-accent"
          actions={
            <Button variant="navy" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          }
          stats={[]}
        />
      )}

      {/* Search + Hero - hidden in manage view */}
      {!isManageView && (
        <>
          <HotelSearchSection
            onHotelSelect={(hotel, searchParams) => handleBook(hotel, searchParams)}
          />

          <div className="relative rounded-2xl overflow-hidden h-[200px] md:h-[220px]">
            <ImageCarousel
              images={heroImages}
              autoPlay
              interval={5000}
              aspectRatio="hero"
              className="h-full"
              showDots={heroImages.length > 1}
              showArrows={heroImages.length > 1}
            />
            {isAdmin && (
              <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-navy/30 to-transparent flex items-center">
                <div className="px-6 md:px-10 flex gap-2">
                  <Button size="sm" variant="coral" onClick={() => setFormOpen(true)} className="shadow-lg h-8">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Hotel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDealFormOpen(true)} className="shadow-lg h-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Tag className="h-3.5 w-3.5 mr-1.5" />
                    Add Deal
                  </Button>
                </div>
              </div>
            )}
          </div>



          {/* Hotel Deals carousel - shown below the hero banner */}
          <SpecialOffersSection
            title="Hotel Deals"
            offers={hotelOffers}
            onViewOffer={handleViewOffer}
          />

        </>
      )}

      {/* Admin Manage Table View */}
      {isManageView ? (
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search hotels..."
                  value={adminSearch}
                  onChange={(e) => { setAdminSearch(e.target.value); setPage(1); }}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredAdminHotels.length === 0 ? (
              <EmptyState icon={Hotel} title="No hotels found" description="Add your first hotel to get started." actionLabel="Add Hotel" onAction={() => setFormOpen(true)} />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Stars</TableHead>
                      <TableHead>Default Prices</TableHead>
                      <TableHead>Special Prices</TableHead>

                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminHotels.slice((page - 1) * pageSize, page * pageSize).map((hotel, idx) => (
                      <TableRow key={hotel.id}>
                        <TableCell className="text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell><span className="font-medium">{hotel.name}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {hotel.cities?.name || "—"}, {hotel.cities?.country || ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {[...Array(hotel.star_rating || 0)].map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 text-gold fill-gold" />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(hotel.hotel_rooms?.length || 0) > 0 ? (
                            <Badge variant="default" className="text-[10px]">
                              {hotel.hotel_rooms!.length} type{hotel.hotel_rooms!.length > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">None</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(hotel.hotel_special_prices?.length || 0) > 0 ? (
                            <Badge variant="default" className="text-[10px]">
                              {hotel.hotel_special_prices!.length} rate{hotel.hotel_special_prices!.length > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">None</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant={hotel.is_active ? "default" : "secondary"}>
                            {hotel.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(hotel)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{hotel.name}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteHotel(hotel.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  currentPage={page}
                  totalPages={Math.ceil(filteredAdminHotels.length / pageSize)}
                  pageSize={pageSize}
                  totalItems={filteredAdminHotels.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default Hotels;
