import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { Loader2, Upload, X, Plus, Trash2, ImageIcon, Star, Search, DollarSign, RotateCcw, Copy, icons } from "lucide-react";
import { SectionJumpNav } from "@/components/admin/SectionJumpNav";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useHotels, useCreateHotel, useUpdateHotel, type Hotel, type HotelInsert } from "@/hooks/useHotels";
import { useHotelRooms, useCreateHotelRoom, useUpdateHotelRoom, useDeleteHotelRoom } from "@/hooks/useHotelRooms";
import { useCities } from "@/hooks/useCities";
import { useAmenities } from "@/hooks/useAmenities";
import { usePackages } from "@/hooks/usePackages";
import { toast } from "sonner";
import { AvailabilityCalendar } from "@/components/ui/availability-calendar";
import { HotelAvailabilityInsightsCalendar } from "@/components/admin/HotelAvailabilityInsightsCalendar";
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

interface HotelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel?: Hotel | null;
  inline?: boolean;
}

export function HotelForm({ open, onOpenChange, hotel, inline = false }: HotelFormProps) {
  const sidebarOffset = useSidebarOffset();
  const createHotel = useCreateHotel();
  const updateHotel = useUpdateHotel();
  const createRoom = useCreateHotelRoom();
  const updateRoom = useUpdateHotelRoom();
  const deleteRoom = useDeleteHotelRoom();
  
  const { data: cities = [] } = useCities();
  const { amenities: allAmenities } = useAmenities();
  const { data: packages = [] } = usePackages();
  const { data: allHotelsList = [] } = useHotels();

  const isEditing = !!hotel;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("home");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [amenitySearch, setAmenitySearch] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [starRating, setStarRating] = useState(3);
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [website, setWebsite] = useState("");
  const [remarks, setRemarks] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerNight, setPricePerNight] = useState(0);

  // Gallery
  const [hotelImages, setHotelImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Extra tab
  const [opsEmail, setOpsEmail] = useState("");
  const [numRooms, setNumRooms] = useState(0);
  const [addChild, setAddChild] = useState(false);
  const [addInfant, setAddInfant] = useState(false);
  const [hotelPolicy, setHotelPolicy] = useState("");

  // Available Dates
  const [availableDates, setAvailableDates] = useState<Array<{ from_date: string; to_date: string; available_rooms: number }>>([]);

  // Special Prices
  const [specialPrices, setSpecialPrices] = useState<Array<{
    from_date: string; to_date: string; room_id: string; room_rate: number; commission: number;
    price_adult: number; price_child_6_12: number; price_child_2_6: number; price_infant: number;
  }>>([]);

  // Rooms (for Default Prices tab)
  const { data: dbRooms = [] } = useHotelRooms(hotel?.id || null);
  const [addedRooms, setAddedRooms] = useState<any[]>([]);
  const hotelRooms = useMemo(() => {
    const combined = [...dbRooms];
    addedRooms.forEach(ar => {
      if (!combined.some(r => r.id === ar.id)) combined.push(ar);
    });
    return combined;
  }, [dbRooms, addedRooms]);

  useEffect(() => {
    if (hotel) {
      const h = hotel as any;
      setName(hotel.name || "");
      setCityId(hotel.city_id || "");
      setStarRating(hotel.star_rating ?? 3);
      setOrderNumber(h.order_number || "");
      setIsActive(hotel.is_active ?? true);
      setWebsite(h.website || "");
      setRemarks(h.remarks || "");
      setAddress(hotel.address || "");
      setDescription(hotel.description || "");
      setPricePerNight(hotel.price_per_night ?? 0);
      setHotelImages((hotel.images as string[]) || []);
      setSelectedAmenities(hotel.amenities || []);
      setOpsEmail(h.ops_email || "");
      setNumRooms(h.num_rooms ?? 0);
      setAddChild(h.add_child ?? false);
      setAddInfant(h.add_infant ?? false);
      setHotelPolicy(h.hotel_policy || "");
      loadAvailableDates(hotel.id);
      loadSpecialPrices(hotel.id);
      loadLinkedGroups(hotel.id);
    } else {
      resetForm();
    }
    setActiveTab("home");
  }, [hotel]);

  const loadLinkedGroups = async (hotelId: string) => {
    const { data } = await (supabase as any)
      .from("package_hotels")
      .select("package_id")
      .eq("hotel_id", hotelId);
    if (data) setSelectedGroups(data.map((d: any) => d.package_id));
  };

  const resetForm = () => {
    setName(""); setCityId(""); setStarRating(3); setOrderNumber("");
    setIsActive(true); setWebsite(""); setRemarks(""); setAddress("");
    setDescription(""); setPricePerNight(0); setHotelImages([]);
    setSelectedAmenities([]); setOpsEmail(""); setNumRooms(0);
    setAddChild(false); setAddInfant(false); setHotelPolicy("");
    setAvailableDates([]); setSpecialPrices([]); setSelectedGroups([]);
  };

  const loadAvailableDates = async (hotelId: string) => {
    const { data } = await (supabase as any).from("hotel_available_dates").select("*").eq("hotel_id", hotelId).order("from_date");
    if (data) setAvailableDates(data.map((d: any) => ({ from_date: d.from_date, to_date: d.to_date, available_rooms: d.available_rooms ?? 0 })));
  };

  const loadSpecialPrices = async (hotelId: string) => {
    const { data } = await (supabase as any).from("hotel_special_prices").select("*").eq("hotel_id", hotelId).order("from_date");
    if (data) {
      setSpecialPrices(data.map((d: any) => ({
        from_date: d.from_date, to_date: d.to_date, room_id: d.room_id || "", room_rate: d.room_rate, commission: d.commission,
        price_adult: d.price_adult ?? 0, price_child_6_12: d.price_child_6_12 ?? 0, price_child_2_6: d.price_child_2_6 ?? 0, price_infant: d.price_infant ?? 0,
      })));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${hotel?.id || "new"}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from("hotel-images").upload(fileName, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("hotel-images").getPublicUrl(fileName);
        setHotelImages(prev => [...prev, urlData.publicUrl]);
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const removeImage = (url: string) => {
    setHotelImages(prev => prev.filter(img => img !== url));
  };

  const setCoverImage = (idx: number) => {
    if (idx === 0) return;
    setHotelImages(prev => {
      const updated = [...prev];
      const [img] = updated.splice(idx, 1);
      updated.unshift(img);
      return updated;
    });
    toast.success("Cover photo updated");
  };

  const toggleAmenity = (name: string) => {
    setSelectedAmenities(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const onSubmit = async () => {
    if (!name.trim()) { toast.error("Hotel name is required"); return; }
    if (!cityId) { toast.error("City is required"); return; }

    try {
      const hotelData: any = {
        name, city_id: cityId, star_rating: starRating,
        address: address || null, description: description || null,
        price_per_night: pricePerNight || null,
        amenities: selectedAmenities, images: hotelImages,
        is_active: isActive,
        ops_email: opsEmail || null, order_number: orderNumber || null,
        num_rooms: numRooms, add_child: addChild, add_infant: addInfant,
        hotel_policy: hotelPolicy || null, website: website || null,
        remarks: remarks || null,
      };

      let hotelId = hotel?.id;
      if (isEditing && hotel) {
        await updateHotel.mutateAsync({ id: hotel.id, ...hotelData });
      } else {
        const result = await createHotel.mutateAsync(hotelData);
        hotelId = result.id;
      }

      if (hotelId) {
        // Clear and update available dates
        await supabase.from("hotel_available_dates").delete().eq("hotel_id", hotelId);
        if (availableDates.length > 0) {
          const datesToInsert = availableDates
            .filter(d => d.from_date && d.to_date)
            .map(d => ({ 
              hotel_id: hotelId, 
              from_date: d.from_date, 
              to_date: d.to_date, 
              available_rooms: d.available_rooms || 0 
            }));
          if (datesToInsert.length > 0) {
            await supabase.from("hotel_available_dates").insert(datesToInsert);
          }
        }

        // Clear and update special prices
        await supabase.from("hotel_special_prices").delete().eq("hotel_id", hotelId);
        if (specialPrices.length > 0) {
          const toInsert = specialPrices
            .filter(s => s.from_date && s.to_date)
            .map(s => ({
              hotel_id: hotelId, 
              room_id: s.room_id || null,
              from_date: s.from_date, 
              to_date: s.to_date,
              room_rate: s.room_rate, 
              commission: s.commission,
              price_adult: s.price_adult || 0,
              price_child_6_12: s.price_child_6_12 || 0,
              price_child_2_6: s.price_child_2_6 || 0,
              price_infant: s.price_infant || 0,
            }));
          if (toInsert.length > 0) {
            await supabase.from("hotel_special_prices").insert(toInsert);
          }
        }

        // Sync package_hotels: add new links, remove unselected
        const { data: existingLinks } = await (supabase as any)
          .from("package_hotels")
          .select("id, package_id")
          .eq("hotel_id", hotelId);
        const existingIds = new Set((existingLinks || []).map((l: any) => l.package_id));
        const selectedSet = new Set(selectedGroups);

        const toRemove = (existingLinks || []).filter((l: any) => !selectedSet.has(l.package_id));
        const toAdd = selectedGroups.filter(pid => !existingIds.has(pid));

        if (toRemove.length > 0) {
          await (supabase as any)
            .from("package_hotels")
            .delete()
            .in("id", toRemove.map((l: any) => l.id));
        }
        if (toAdd.length > 0) {
          await (supabase as any)
            .from("package_hotels")
            .insert(toAdd.map(pid => ({
              hotel_id: hotelId,
              package_id: pid,
              tier: "standard",
              is_default: false,
              price_adjustment: 0,
            })));
        }
      }

      toast.success(isEditing ? "Hotel updated" : "Hotel created");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save hotel");
    }
  };

  const isLoading = createHotel.isPending || updateHotel.isPending;

  const tabClass = "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3";

  // Star rating component
  const StarRating = () => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => setStarRating(s)} className="focus:outline-none transition-transform hover:scale-110">
          <Star className={`h-5 w-5 transition-colors ${s <= starRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
      <span className="text-xs text-muted-foreground ml-2">{starRating} star{starRating !== 1 ? "s" : ""}</span>
    </div>
  );

  // Header star display
  const headerStars = isEditing && name ? (
    <div className="flex items-center gap-1 ml-2">
      {Array.from({ length: starRating }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>
  ) : null;

  const totalRoomsCount = hotelRooms.reduce((sum, r) => sum + (r.total_rooms ?? 0), 0);

  const formContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? name || "Edit Hotel" : "New Hotel"}
          </h2>
          {headerStars}
          {isEditing && (
            <Badge variant={isActive ? "default" : "secondary"} className="ml-2 text-[10px]">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-muted">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-4">
          <TabsList className="bg-transparent h-12 gap-6 p-0">
            <TabsTrigger value="home" className={tabClass}>Home</TabsTrigger>
            <TabsTrigger value="gallery" className={tabClass}>
              Gallery {hotelImages.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{hotelImages.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="amenities" className={tabClass}>
              Amenities {selectedAmenities.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{selectedAmenities.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="default-prices" className={tabClass}>
              Default Prices {hotelRooms.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{hotelRooms.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="special-prices" className={tabClass}>
              Special Prices {specialPrices.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{specialPrices.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="extra" className={tabClass}>Extra</TabsTrigger>
            <TabsTrigger value="available-dates" className={tabClass}>
              Available Dates {availableDates.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{availableDates.length}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex gap-0 items-start">
            <div className="flex-1 min-w-0">
          {/* ===== HOME TAB ===== */}
          <TabsContent value="home" className="mt-0 space-y-6">
            {/* Hotel Info Section */}
            <div id="hotel-info" data-jump-section="Hotel Info" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Hotel Information</h3>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Name:</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Hotel Name" />
              </div>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Description:</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Hotel description..." className="min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">City</Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-semibold text-sm">Address:</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Hotel address" />
                </div>
              </div>
            </div>

            {/* Classification Section */}
            <div id="hotel-classification" data-jump-section="Classification" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Classification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Star Rating:</Label>
                  <StarRating />
                </div>
                {(!hotel || hotelRooms.length === 0) && (
                  <div className="space-y-1">
                    <Label className="font-semibold text-sm">Fallback Rate / Night:</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" className="pl-8" value={pricePerNight} onChange={e => setPricePerNight(parseFloat(e.target.value) || 0)} placeholder="0.00" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Used only when no room types are defined. Once you add rooms in the Rooms tab, prices come from there.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-semibold text-sm">Order No:</Label>
                  <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-semibold text-sm">Website:</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Settings Section */}
            <div id="hotel-settings" data-jump-section="Settings" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-sm">Status</Label>
                  <p className="text-xs text-muted-foreground">Hotel is {isActive ? "visible" : "hidden"} to agencies</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-sm">Groups:</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[42px] bg-muted/20">
                  {selectedGroups.map(gId => {
                    const pkg = packages.find(p => p.id === gId);
                    return pkg ? (
                      <Badge key={gId} variant="secondary" className="gap-1">
                        {pkg.name}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedGroups(prev => prev.filter(id => id !== gId))} />
                      </Badge>
                    ) : null;
                  })}
                  <Select onValueChange={v => { if (!selectedGroups.includes(v)) setSelectedGroups(prev => [...prev, v]); }}>
                    <SelectTrigger className="w-auto border-0 h-7 px-2 shadow-none bg-transparent">
                      <SelectValue placeholder="+ Add Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.filter(p => !selectedGroups.includes(p.id)).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-sm">Remarks:</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Internal remarks..." className="min-h-[60px]" />
              </div>
            </div>
          </TabsContent>

          {/* ===== GALLERY TAB ===== */}
          <TabsContent value="gallery" className="mt-0 space-y-4">
            <h3 className="text-primary font-medium text-sm">Hotel Photos</h3>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            {hotelImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-lg text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-2">No photos yet</p>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Photos
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {hotelImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-muted group">
                      <img src={img} alt={`Hotel ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      {/* Delete */}
                      <ConfirmDelete itemName="this photo" onConfirm={() => removeImage(img)}>
                        <Button type="button" variant="destructive" size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}>
                          <X className="h-3 w-3" />
                        </Button>
                      </ConfirmDelete>
                      {/* Set as Cover button (always visible on non-cover) */}
                      {idx !== 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="absolute top-1 left-1/2 -translate-x-1/2 h-7 px-2 text-[11px] gap-1 shadow-md opacity-90 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setCoverImage(idx); }}
                        >
                          <Star className="h-3 w-3" />
                          Set as Cover
                        </Button>
                      )}
                      {/* Number overlay */}
                      <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">{idx + 1}</span>
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> Cover
                        </span>
                      )}
                    </div>
                  ))}
                  {hotelImages.length < 20 && (
                    <div onClick={() => fileInputRef.current?.click()}
                      className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      {uploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add Photo</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{hotelImages.length}/20 photos • Click "Set as Cover" on any image to make it the profile picture</p>
              </>
            )}
          </TabsContent>

          {/* ===== AMENITIES TAB ===== */}
          <TabsContent value="amenities" className="mt-0 space-y-4">
            <h3 className="text-primary font-medium text-sm">Hotel Amenities</h3>
            {/* Selected amenities as tags */}
            <div className="flex flex-wrap gap-2 min-h-[36px] p-3 border rounded-md bg-muted/20">
              {selectedAmenities.length === 0 && (
                <span className="text-sm text-muted-foreground">No amenities selected</span>
              )}
              {selectedAmenities.map(a => {
                const amenityData = allAmenities.find(am => am.name === a);
                const IconComp = amenityData?.icon ? (icons as any)[amenityData.icon.split('-').map((s: string, i: number) => i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s.charAt(0).toUpperCase() + s.slice(1)).join('')] : null;
                return (
                  <Badge key={a} variant="secondary" className="gap-1.5 text-sm py-1">
                    {IconComp && <IconComp className="h-3.5 w-3.5" />}
                    {a}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleAmenity(a)} />
                  </Badge>
                );
              })}
            </div>
            {/* Search + Add amenity */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search amenities..."
                    className="pl-8"
                    value={amenitySearch}
                    onChange={e => setAmenitySearch(e.target.value)}
                  />
                </div>
                <Input
                  placeholder="Or type custom & press Enter..."
                  className="w-64"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !selectedAmenities.includes(val)) {
                        toggleAmenity(val);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }
                  }}
                />
              </div>
              {/* Inline grouped picker — click to add, no popup */}
              <div className="border rounded-md p-3 max-h-[420px] overflow-y-auto space-y-3 bg-muted/10">
                {Object.entries(
                  allAmenities.reduce((acc, a) => {
                    if (!acc[a.category]) acc[a.category] = [];
                    acc[a.category].push(a);
                    return acc;
                  }, {} as Record<string, typeof allAmenities>)
                ).map(([category, items]) => {
                  const filtered = items.filter(a =>
                    !amenitySearch || a.name.toLowerCase().includes(amenitySearch.toLowerCase())
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{category}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {filtered.map(amenity => {
                          const isSelected = selectedAmenities.includes(amenity.name);
                          const I = amenity.icon ? (icons as any)[amenity.icon.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')] : null;
                          return (
                            <button
                              key={amenity.id}
                              type="button"
                              onClick={() => toggleAmenity(amenity.name)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-accent border-border"
                              )}
                            >
                              {I && <I className="h-3.5 w-3.5" />}
                              {amenity.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ===== DEFAULT PRICES TAB ===== */}
          <TabsContent value="default-prices" className="mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-primary font-medium text-sm">Default Room Prices</h3>
            </div>
            {!isEditing ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Save the hotel first to manage room pricing.</p>
              </div>
            ) : hotelRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center gap-3">
                <DollarSign className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No rooms configured yet.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                    if (!hotel?.id) return;
                    const totalAvail = Math.max(availableDates.reduce((s, d) => s + (d.available_rooms || 0), 0), 4);
                    createRoom.mutate({
                      hotel_id: hotel.id, room_type: "Single", capacity: 1, price_per_night: 0,
                      price_adult: 0, price_child: 0, price_child_6: 0, price_infant: 0,
                      total_rooms: totalAvail, available_rooms: totalAvail,
                      room_from: 4, room_to: 1,
                    } as any, { onSuccess: () => toast.success("Room added"), onError: () => toast.error("Failed to add room") });
                  }}>
                    <Plus className="h-3.5 w-3.5" /> Add Room
                  </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="blue" size="sm" className="gap-1" onClick={() => {
                        if (!hotel?.id) return;
                        const totalAvail = Math.max(availableDates.reduce((s, d) => s + (d.available_rooms || 0), 0), 4);
                        const standardTypes = [
                          { room_type: "Single", capacity: 1 },
                          { room_type: "Double", capacity: 2 },
                          { room_type: "Double + Extra Bed", capacity: 3 },
                          { room_type: "Triple", capacity: 3 },
                        ];

                        standardTypes.forEach(t => {
                          const sameTypeRooms = hotelRooms.filter(r => r.room_type === t.room_type);
                          const hasInitial = sameTypeRooms.some(r => ((r as any).room_to ?? 0) === 20 || ((r as any).room_from ?? 0) === 30);
                          const hasLastTier = sameTypeRooms.some(r => ((r as any).room_to ?? 0) === 1);
                          
                          if (hasInitial && hasLastTier) return; // Both tiers already exist

                          createRoom.mutate({
                            hotel_id: hotel.id, room_type: t.room_type, capacity: t.capacity, price_per_night: 0,
                            price_adult: 0, price_child: 0, price_child_6: 0, price_infant: 0,
                            total_rooms: totalAvail, available_rooms: totalAvail,
                            room_from: hasInitial ? 19 : 30, 
                            room_to: hasInitial ? 1 : 20,
                          } as any);
                        });
                        toast.success("Processed standard 4 types with tiers (30-20, 19-1)");
                      }}>
                        <Plus className="h-3.5 w-3.5" /> Add All Types
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => {
                        if (window.confirm("Are you sure you want to delete ALL rooms? This will clear the current list and fix duplicates.")) {
                          hotelRooms.forEach(r => deleteRoom.mutate(r.id));
                          toast.success("Cleared all rooms. You can now use 'Add All Types' to start fresh.");
                        }
                      }}>
                        Delete All
                      </Button>
                    </div>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">Room Type</th>
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">Rooms From</th>
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">Rooms To</th>
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">$/Adult</th>
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">$/Child (6-12)</th>
                        <th className="text-left py-2.5 px-2 text-xs uppercase text-muted-foreground font-semibold">$/Child (2-6)</th>
                        <th className="py-2.5 px-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotelRooms
                        .filter(r => r.room_type !== "Quadruple" && r.room_type !== "Without-Bed" && r.room_type !== "Infant")
                        .map((room, idx) => (
                        <tr key={room.id} className={`border-t hover:bg-muted/30 transition-colors ${idx % 2 === 1 ? "bg-muted/10" : ""}`}>
                          <td className="py-1.5 px-2">
                            <Select value={room.room_type} onValueChange={v => { if (v !== room.room_type) updateRoom.mutate({ id: room.id, room_type: v }); }}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Single", "Double", "Double + Extra Bed", "Triple"].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 px-2">
                            <Input type="number" min={1} className="h-8 text-sm w-20" defaultValue={(room as any).room_from ?? 1}
                              onBlur={e => { const v = parseInt(e.target.value) || 1; if (v !== (room as any).room_from) updateRoom.mutate({ id: room.id, room_from: v } as any); }} />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input type="number" min={1} className="h-8 text-sm w-20" defaultValue={(room as any).room_to ?? 20}
                              onBlur={e => { const v = parseInt(e.target.value) || 1; if (v !== (room as any).room_to) updateRoom.mutate({ id: room.id, room_to: v } as any); }} />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input type="number" className="h-8 text-sm" defaultValue={room.price_adult ?? 0}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; updateRoom.mutate({ id: room.id, price_adult: v }); }} />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input type="number" className="h-8 text-sm" defaultValue={room.price_child_6 ?? 0}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; updateRoom.mutate({ id: room.id, price_child_6: v }); }} />
                          </td>
                          <td className="py-1.5 px-2">
                            <Input type="number" className="h-8 text-sm" defaultValue={room.price_child ?? 0}
                              onBlur={e => { const v = parseFloat(e.target.value) || 0; updateRoom.mutate({ id: room.id, price_child: v }); }} />
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="flex gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                                title="Duplicate"
                                onClick={() => {
                                  if (!hotel?.id) return;
                                  createRoom.mutate({
                                    hotel_id: hotel.id, room_type: room.room_type, capacity: room.capacity,
                                    price_per_night: 0,
                                    price_adult: room.price_adult ?? 0,
                                    price_child: room.price_child ?? 0,
                                    price_child_6: room.price_child_6 ?? 0,
                                    total_rooms: room.total_rooms ?? 10, available_rooms: room.available_rooms ?? 10,
                                    room_from: (room as any).room_from ?? 20, room_to: (room as any).room_to ?? 1,
                                  } as any, { onSuccess: () => toast.success("Room duplicated"), onError: () => toast.error("Failed to duplicate room") });
                                }}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <ConfirmDelete
                                itemName={`the "${room.room_type}" room`}
                                onConfirm={() => {
                                  if (!hotel?.id) return;
                                  deleteRoom.mutate({ id: room.id, hotelId: hotel.id }, {
                                    onSuccess: () => toast.success("Room deleted"),
                                    onError: (err: any) => toast.error(err?.message || "Failed to delete room"),
                                  });
                                }}
                              >
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ConfirmDelete>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                      if (!hotel?.id) return;
                      createRoom.mutate({
                        hotel_id: hotel.id, room_type: "Double", capacity: 2,
                        price_per_night: 0,
                        price_adult: 0, price_child: 0,
                        total_rooms: 10, available_rooms: 10,
                        room_from: 10, room_to: 1,
                      } as any, { onSuccess: () => toast.success("Room added"), onError: () => toast.error("Failed to add room") });
                    }}>
                      <Plus className="h-3.5 w-3.5" /> Add Room
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="blue" size="sm" className="gap-1" onClick={() => {
                        if (!hotel?.id) return;
                        const standardTypes = [
                          { room_type: "Single", capacity: 1 },
                          { room_type: "Double", capacity: 2 },
                          { room_type: "Double + Extra Bed", capacity: 3 },
                          { room_type: "Triple", capacity: 3 },
                        ];

                        const addAll = async () => {
                          for (const t of standardTypes) {
                            await createRoom.mutateAsync({
                              hotel_id: hotel.id, room_type: t.room_type, capacity: t.capacity,
                              price_per_night: 0,
                              price_adult: 0, price_child: 0,
                              total_rooms: 10, available_rooms: 10,
                              room_from: 10, room_to: 1,
                            } as any);
                          }
                          toast.success("Added all 4 room types");
                        };
                        addAll();
                      }}>
                        <Plus className="h-3.5 w-3.5" /> Add All Types
                      </Button>
                      <Select onValueChange={async (sourceId) => {
                        const sourceHotel = allHotelsList.find(h => h.id === sourceId);
                        if (!sourceHotel || !sourceHotel.hotel_rooms || sourceHotel.hotel_rooms.length === 0) {
                          toast.error("Source hotel has no rooms to copy");
                          return;
                        }
                        
                        if (window.confirm(`Are you sure you want to copy all ${sourceHotel.hotel_rooms.length} rooms from "${sourceHotel.name}"? This will DELETE all current rooms for this hotel.`)) {
                          toast.loading("Copying rooms...", { id: "copying-rooms" });
                          try {
                            // 1. Delete current rooms
                            for (const r of hotelRooms) {
                              await deleteRoom.mutateAsync(r.id);
                            }
                            
                            // 2. Create new rooms
                            for (const r of sourceHotel.hotel_rooms) {
                              const { id, created_at, hotel_id, ...roomData } = r;
                              await createRoom.mutateAsync({
                                ...roomData,
                                hotel_id: hotel?.id
                              } as any);
                            }
                            toast.success(`Successfully copied ${sourceHotel.hotel_rooms.length} rooms from ${sourceHotel.name}`, { id: "copying-rooms" });
                          } catch (err) {
                            console.error("Failed to copy rooms", err);
                            toast.error("Failed to copy rooms", { id: "copying-rooms" });
                          }
                        }
                      }}>
                        <SelectTrigger className="h-8 w-auto text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5">
                          <Copy className="h-3.5 w-3.5" />
                          <SelectValue placeholder="Copy from..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allHotelsList
                            .filter(h => h.id !== hotel?.id)
                            .map(h => (
                              <SelectItem key={h.id} value={h.id} className="text-xs">
                                {h.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="destructive" size="sm" onClick={() => {
                        if (window.confirm("Are you sure you want to delete ALL rooms?")) {
                          hotelRooms.forEach(r => deleteRoom.mutate(r.id));
                          toast.success("Cleared all rooms.");
                        }
                      }}>
                        Delete All
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hotelRooms.length} room type{hotelRooms.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== SPECIAL PRICES TAB ===== */}
          <TabsContent value="special-prices" className="mt-0 space-y-4">
            <h3 className="text-primary font-medium text-sm">Special Rooms Fares</h3>

            {specialPrices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
                <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No special prices configured</p>
                <p className="text-xs text-muted-foreground">Add seasonal or promotional pricing below.</p>
              </div>
            )}

            {specialPrices.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">From Date</th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">To Date</th>
                      <th className="text-left py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Room Type</th>
                      <th className="text-center py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Rooms From</th>
                      <th className="text-center py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Rooms To</th>
                      <th className="text-center py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">$/Adult</th>
                      <th className="text-center py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">$/Child (6-12)</th>
                      <th className="text-center py-3 px-3 text-[10px] uppercase text-muted-foreground font-bold tracking-wider">$/Child (2-6)</th>
                      <th className="py-3 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialPrices.map((sp, idx) => {
                      const selectedRoom = hotelRooms.find(r => r.id === sp.room_id);
                      return (
                        <tr key={idx} className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 1 ? "bg-muted/5" : ""}`}>
                          <td className="py-2 px-3">
                            <DateInput value={sp.from_date} onValueChange={(iso) => {
                              const updated = [...specialPrices]; updated[idx].from_date = iso; setSpecialPrices(updated);
                            }} className="h-9 text-xs border-slate-200" />
                          </td>
                          <td className="py-2 px-3">
                            <DateInput value={sp.to_date} onValueChange={(iso) => {
                              const updated = [...specialPrices]; updated[idx].to_date = iso; setSpecialPrices(updated);
                            }} className="h-9 text-xs border-slate-200" />
                          </td>
                          <td className="py-2 px-3">
                            <Select 
                              value={sp.room_id || ""} 
                              onValueChange={newRoomId => {
                                const updated = [...specialPrices];
                                const newRoom = hotelRooms.find(r => r.id === newRoomId);
                                if (newRoom) {
                                  updated[idx].room_id = newRoom.id;
                                  updated[idx].price_adult = newRoom.price_adult || 0;
                                  updated[idx].price_child_6_12 = newRoom.price_child_6 || 0;
                                  updated[idx].price_child_2_6 = newRoom.price_child || 0;
                                  setSpecialPrices(updated);
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs font-medium bg-white border-slate-200 w-[200px]">
                                <SelectValue placeholder="Room Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set(hotelRooms.map(r => r.room_type)))
                                  .filter(t => t && t !== "Quadruple" && t !== "Without-Bed" && t !== "Infant")
                                  .map(typeName => {
                                    const firstRoom = hotelRooms.find(r => r.room_type === typeName);
                                    return (
                                      <SelectItem key={typeName} value={firstRoom?.id || typeName}>
                                        {typeName}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-3">
                            <Input 
                              type="number" 
                              className="h-9 text-xs px-2 w-16 mx-auto text-center border-slate-200 bg-white" 
                              defaultValue={selectedRoom?.room_from ?? 0}
                              onBlur={e => {
                                const v = parseInt(e.target.value) || 0;
                                if (selectedRoom && v !== selectedRoom.room_from) {
                                  updateRoom.mutate({ id: selectedRoom.id, room_from: v } as any);
                                }
                              }}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input 
                              type="number" 
                              className="h-9 text-xs px-2 w-16 mx-auto text-center border-slate-200 bg-white" 
                              defaultValue={selectedRoom?.room_to ?? 0}
                              onBlur={e => {
                                const v = parseInt(e.target.value) || 0;
                                if (selectedRoom && v !== selectedRoom.room_to) {
                                  updateRoom.mutate({ id: selectedRoom.id, room_to: v } as any);
                                }
                              }}
                            />
                          </td>

                          <td className="py-2 px-3">
                             <Input type="number" className="h-9 text-xs px-2 w-20 mx-auto text-center border-slate-200" value={sp.price_adult} onChange={e => {
                               const updated = [...specialPrices]; updated[idx].price_adult = parseFloat(e.target.value) || 0; setSpecialPrices(updated);
                             }} />
                           </td>
                          <td className="py-2 px-3">
                            <Input type="number" className="h-9 text-xs px-2 w-20 mx-auto text-center border-slate-200" value={sp.price_child_6_12} onChange={e => {
                              const updated = [...specialPrices]; updated[idx].price_child_6_12 = parseFloat(e.target.value) || 0; setSpecialPrices(updated);
                            }} />
                          </td>
                          <td className="py-2 px-3">
                            <Input type="number" className="h-9 text-xs px-2 w-20 mx-auto text-center border-slate-200" value={sp.price_child_2_6} onChange={e => {
                              const updated = [...specialPrices]; updated[idx].price_child_2_6 = parseFloat(e.target.value) || 0; setSpecialPrices(updated);
                            }} />
                          </td>
                          <td className="py-2 px-3 text-center">

                          <ConfirmDelete itemName="this special price row" onConfirm={() => setSpecialPrices(prev => prev.filter((_, i) => i !== idx))}>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </ConfirmDelete>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between items-end">
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSpecialPrices(prev => [...prev, { from_date: "", to_date: "", room_id: "", commission: 0, price_adult: 0, price_child_6_12: 0, price_child_2_6: 0 }])} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Special Price
                </Button>
                <Button type="button" variant="navy" size="sm" className="gap-1" onClick={async () => {
                  if (hotelRooms.length === 0) { toast.error("Add room types in Default Prices tab first"); return; }
                  const lastFrom = specialPrices.length > 0 ? specialPrices[specialPrices.length - 1].from_date : "";
                  const lastTo = specialPrices.length > 0 ? specialPrices[specialPrices.length - 1].to_date : "";
                  
                  // Keep it to the standard 4 unique types in the Special Prices UI
                  const uniqueTypes = Array.from(new Set(hotelRooms.map(r => r.room_type)));
                  const existingForDates = new Set(
                    specialPrices.filter(sp => sp.from_date === lastFrom && sp.to_date === lastTo)
                      .map(sp => {
                        const r = hotelRooms.find(room => room.id === sp.room_id);
                        return r ? r.room_type : null;
                      }).filter(Boolean)
                  );
                  
                  const toAddTypes = uniqueTypes.filter(t => !existingForDates.has(t));

                  if (toAddTypes.length === 0) {
                    toast.info("All 4 room types already added for these dates.");
                    return;
                  }

                  const toAdd = toAddTypes.map(typeName => {
                    // Find the FIRST tier of this type (usually the one with the highest 'room_from')
                    const r = hotelRooms
                      .filter(room => room.room_type === typeName)
                      .sort((a, b) => (b as any).room_from - (a as any).room_from)[0];
                      
                    if (!r) return null;
                    return {
                      from_date: lastFrom, to_date: lastTo, room_id: r.id,
                      commission: 0,
                      price_adult: r.price_adult || 0, 
                      price_child_6_12: r.price_child_6 || 0,
                      price_child_2_6: r.price_child || 0
                    };
                  }).filter(Boolean);

                  setSpecialPrices(prev => [...prev, ...toAdd as any]);
                  toast.success(`Added ${toAdd.length} room types`);
                }}>
                  <Plus className="h-3.5 w-3.5" /> Add All Types
                </Button>
                <Select onValueChange={(sourceId) => {
                  const sourceHotel = allHotelsList.find(h => h.id === sourceId);
                  if (!sourceHotel || !sourceHotel.hotel_special_prices || sourceHotel.hotel_special_prices.length === 0) {
                    toast.error("Source hotel has no special prices to copy");
                    return;
                  }
                  
                  if (window.confirm(`Are you sure you want to copy all ${sourceHotel.hotel_special_prices.length} special prices from "${sourceHotel.name}"? This will APPEND them to your current list.`)) {
                    const toAdd = sourceHotel.hotel_special_prices.map(sp => {
                      // Find the room in the SOURCE hotel to get its type
                      const sourceRoom = sourceHotel.hotel_rooms?.find(r => r.id === sp.room_id);
                      if (!sourceRoom) return null;
                      
                      // Find the matching room type in the TARGET (current) hotel
                      const targetRoom = hotelRooms.find(r => r.room_type === sourceRoom.room_type);
                      if (!targetRoom) return null;
                      
                      const { id, created_at, hotel_id, ...spData } = sp;
                      return {
                        ...spData,
                        room_id: targetRoom.id
                      };
                    }).filter(Boolean);
                    
                    if (toAdd.length === 0) {
                      toast.error("No matching room types found between hotels");
                      return;
                    }
                    
                    setSpecialPrices(prev => [...prev, ...toAdd as any]);
                    toast.success(`Successfully copied ${toAdd.length} special prices from ${sourceHotel.name}`);
                  }
                }}>
                  <SelectTrigger className="h-8 w-auto text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5">
                    <Copy className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Copy from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allHotelsList
                      .filter(h => h.id !== hotel?.id)
                      .map(h => (
                        <SelectItem key={h.id} value={h.id} className="text-xs">
                          {h.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Prices are per night. Ranges are inclusive and editable.
              </p>
            </div>
          </TabsContent>

          {/* ===== EXTRA TAB ===== */}
          <TabsContent value="extra" className="mt-0 space-y-5">
            <div id="hotel-operations" data-jump-section="Operations" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Operations</h3>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Hotel Operator Email:</Label>
                <Input value={opsEmail} onChange={e => setOpsEmail(e.target.value)} placeholder="operator@hotel.com" />
              </div>
            </div>

            <div id="hotel-guest-options" data-jump-section="Guest Options" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Guest Options</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-sm">Add Child</Label>
                    <p className="text-xs text-muted-foreground">Allow child guests in bookings</p>
                  </div>
                  <Switch checked={addChild} onCheckedChange={setAddChild} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-semibold text-sm">Add Infant</Label>
                    <p className="text-xs text-muted-foreground">Allow infant guests in bookings</p>
                  </div>
                  <Switch checked={addInfant} onCheckedChange={setAddInfant} />
                </div>
              </div>
            </div>

            <div id="hotel-policy" data-jump-section="Policy" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Policy</h3>
              <div className="space-y-1">
                <Label className="font-semibold text-sm">Hotel Policy:</Label>
                <Textarea value={hotelPolicy} onChange={e => setHotelPolicy(e.target.value)} placeholder="Hotel policy details..." className="min-h-[100px]" />
              </div>
            </div>
          </TabsContent>

          {/* ===== AVAILABLE DATES TAB ===== */}
          <TabsContent value="available-dates" className="mt-0 space-y-6">
            {/* Date Ranges Section */}
            <div className="space-y-3">
              <h3 className="text-primary font-medium text-sm">Available Hotel Dates</h3>

              {availableDates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No date ranges configured</p>
                  <p className="text-xs text-muted-foreground">Add availability periods below.</p>
                </div>
              )}

              {availableDates.map((d, idx) => (
                <div key={idx} className={`grid grid-cols-[1fr_1fr_120px_40px] gap-3 items-end p-3 rounded-lg border ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"}`}>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From Date</Label>
                    <DateInput value={d.from_date} onValueChange={v => {
                      const updated = [...availableDates]; updated[idx].from_date = v; setAvailableDates(updated);
                    }} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To Date</Label>
                    <DateInput value={d.to_date} onValueChange={v => {
                      const updated = [...availableDates]; updated[idx].to_date = v; setAvailableDates(updated);
                    }} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rooms</Label>
                    <Input type="number" min="0" value={d.available_rooms} onChange={e => {
                      const updated = [...availableDates]; updated[idx].available_rooms = parseInt(e.target.value) || 0; setAvailableDates(updated);
                    }} className="h-9" placeholder="0" />
                  </div>
                  <ConfirmDelete itemName="this available-date row" onConfirm={() => setAvailableDates(prev => prev.filter((_, i) => i !== idx))}>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  </ConfirmDelete>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={() => setAvailableDates(prev => [...prev, { from_date: "", to_date: "", available_rooms: 0 }])} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Date Range
              </Button>
            </div>

            {/* Visual Availability Calendar with sales insights */}
            {availableDates.length > 0 && hotel?.id && (
              <HotelAvailabilityInsightsCalendar
                hotelId={hotel.id}
                availableDates={availableDates}
                rooms={hotelRooms.map(r => ({ id: r.id, room_type: r.room_type }))}
              />
            )}
          </TabsContent>
            </div>
            <SectionJumpNav scrollContainerRef={scrollContainerRef} rescanKey={activeTab} />
          </div>
        </div>
      </Tabs>

      {/* Sticky Footer */}
      <div className="flex-shrink-0 flex justify-between gap-3 px-4 py-4 border-t bg-muted/30">
        <div>
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading} onClick={onSubmit}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden border-l-4 border-primary shadow-[-8px_0_30px_-10px_hsl(var(--primary)/0.35)]" style={{ left: sidebarOffset }}>
      {formContent}
    </div>
  );
}
