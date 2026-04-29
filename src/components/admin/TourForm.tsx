import { useState, useRef, useEffect } from "react";
import { SectionJumpNav } from "@/components/admin/SectionJumpNav";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Loader2, Plus, Trash2, Upload, X, GripVertical, Compass, MapPin,
  Clock, Users, Star, Image, Calendar, CheckCircle, DollarSign, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateTour, useUpdateTour, type Tour, type TourInsert } from "@/hooks/useTours";
import { useCities } from "@/hooks/useCities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DayProgram {
  day: number;
  title: string;
  description: string;
  activities: string[];
  images: string[];
}

const tourSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city_id: z.string().min(1, "City is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  duration_hours: z.coerce.number().min(1).default(4),
  max_participants: z.coerce.number().min(1).default(20),
  description: z.string().optional(),
  includes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type TourFormValues = z.infer<typeof tourSchema>;

interface TourFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour?: Tour | null;
}

export function TourForm({ open, onOpenChange, tour }: TourFormProps) {
  const sidebarOffset = useSidebarOffset();
  const createTour = useCreateTour();
  const updateTour = useUpdateTour();
  const { data: cities } = useCities();
  const isEditing = !!tour;
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeTourTab, setActiveTourTab] = useState("home");

  const [dayPrograms, setDayPrograms] = useState<DayProgram[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<number | null>(null);
  const [tourImages, setTourImages] = useState<string[]>([]);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      name: "", city_id: "", price: 0, duration_hours: 4,
      max_participants: 20, description: "", includes: "", is_active: true,
    },
  });

  useEffect(() => {
    if (tour) {
      form.reset({
        name: tour.name || "", city_id: tour.city_id || "",
        price: tour.price || 0, duration_hours: tour.duration_hours ?? 4,
        max_participants: tour.max_participants ?? 20,
        description: tour.description || "",
        includes: tour.includes?.join(", ") || "",
        is_active: tour.is_active ?? true,
      });
      const existingDayProgram = tour.day_program
        ? (Array.isArray(tour.day_program) ? tour.day_program as unknown as DayProgram[] : [])
        : [];
      setDayPrograms(existingDayProgram);
      setTourImages(tour.images || []);
    } else {
      form.reset({
        name: "", city_id: "", price: 0, duration_hours: 4,
        max_participants: 20, description: "", includes: "", is_active: true,
      });
      setDayPrograms([]);
      setTourImages([]);
    }
  }, [tour, form]);

  const addDayProgram = () => {
    setDayPrograms([...dayPrograms, {
      day: dayPrograms.length + 1, title: "", description: "", activities: [], images: [],
    }]);
  };

  const removeDayProgram = (index: number) => {
    const updated = dayPrograms.filter((_, i) => i !== index).map((dp, i) => ({ ...dp, day: i + 1 }));
    setDayPrograms(updated);
  };

  const updateDayProgram = (index: number, field: keyof DayProgram, value: any) => {
    const updated = [...dayPrograms];
    updated[index] = { ...updated[index], [field]: value };
    setDayPrograms(updated);
  };

  const handleDayImageUpload = async (dayIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image size should be less than 5MB"); return; }

    setIsUploadingImage(dayIndex);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `day-programs/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(filePath);
      const updated = [...dayPrograms];
      updated[dayIndex].images = [...(updated[dayIndex].images || []), publicUrl];
      setDayPrograms(updated);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(null);
    }
  };

  const removeDayImage = (dayIndex: number, imageIndex: number) => {
    const updated = [...dayPrograms];
    updated[dayIndex].images = updated[dayIndex].images.filter((_, i) => i !== imageIndex);
    setDayPrograms(updated);
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Please upload an image file"); return; }
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `main/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('tour-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(filePath);
      setTourImages([...tourImages, publicUrl]);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  const removeMainImage = (index: number) => {
    setTourImages(tourImages.filter((_, i) => i !== index));
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    const reordered = [...tourImages];
    const [img] = reordered.splice(index, 1);
    reordered.unshift(img);
    setTourImages(reordered);
    toast.success("Cover photo updated");
  };

  const onSubmit = async (data: TourFormValues) => {
    try {
      const tourData: TourInsert = {
        name: data.name, city_id: data.city_id, price: data.price,
        duration_hours: data.duration_hours, max_participants: data.max_participants,
        description: data.description || null,
        includes: data.includes ? data.includes.split(",").map(i => i.trim()) : [],
        is_active: data.is_active, day_program: dayPrograms as any, images: tourImages,
      };
      if (isEditing && tour) {
        await updateTour.mutateAsync({ id: tour.id, ...tourData });
        toast.success("Tour updated");
      } else {
        await createTour.mutateAsync(tourData);
        toast.success("Tour created");
      }
      onOpenChange(false);
      form.reset();
      setDayPrograms([]);
      setTourImages([]);
    } catch (error) {
      toast.error("Failed to save tour");
    }
  };

  const isSaving = createTour.isPending || updateTour.isPending;
  const tourName = form.watch("name");
  const isActive = form.watch("is_active");

    if (!open) return null;

    const tabClass = "text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-1.5";

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col animate-fade-in border-l-4 border-primary shadow-[-8px_0_30px_-10px_hsl(var(--primary)/0.35)]" style={{ left: sidebarOffset }}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/5 via-background to-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {tourName || (isEditing ? "Edit Tour" : "New Tour")}
                {isActive && <Badge className="bg-success/10 text-success text-[10px]">Active</Badge>}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? "Editing tour details" : "Create a new tour experience"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl">
              Close
            </Button>
            <Button variant="navy" size="sm" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="rounded-xl">
              {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Tour"}
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-0 items-start">
          <div className="flex-1 min-w-0">
        <Tabs value={activeTourTab} onValueChange={setActiveTourTab} className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="home" className={tabClass}>
              <Compass className="h-3.5 w-3.5 mr-1.5" />Home
            </TabsTrigger>
            <TabsTrigger value="gallery" className={tabClass}>
              <Image className="h-3.5 w-3.5 mr-1.5" />Gallery
              {tourImages.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{tourImages.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="itinerary" className={tabClass}>
              <Calendar className="h-3.5 w-3.5 mr-1.5" />Itinerary
              {dayPrograms.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{dayPrograms.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* HOME TAB */}
          <TabsContent value="home">
            <Form {...form}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tour Info Section */}
                <div id="tour-info" data-jump-section="Tour Info" className="space-y-4 p-5 border border-border/60 border-t-2 border-t-primary rounded-xl bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <Compass className="h-3.5 w-3.5" />Tour Information
                  </h3>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Name</FormLabel>
                      <FormControl><Input placeholder="Bosphorus Cruise & Old City Tour" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City / Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cities?.map((city) => (
                            <SelectItem key={city.id} value={city.id}>
                              <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{city.name}, {city.country}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe the tour experience..." rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Operations Section */}
                <div className="space-y-6">
                  <div id="tour-pricing" data-jump-section="Pricing" className="space-y-4 p-5 border border-border/60 border-t-2 border-t-primary rounded-xl bg-card shadow-sm scroll-mt-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5" />Pricing & Capacity
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price / Person</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                              <Input type="number" min="0" className="pl-7" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="duration_hours" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (hrs)</FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="max_participants" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Participants</FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* Includes */}
                  <div id="tour-schedule" data-jump-section="Schedule" className="space-y-4 p-5 border border-border/60 border-t-2 border-t-primary rounded-xl bg-card shadow-sm scroll-mt-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5" />Inclusions
                    </h3>
                    <FormField control={form.control} name="includes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Included Items (comma-separated)</FormLabel>
                        <FormControl><Input placeholder="Entrance fees, Lunch, Guide, Transport" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {form.watch("includes") && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.watch("includes")!.split(",").filter(Boolean).map((item, i) => (
                          <Badge key={i} variant="outline" className="text-[11px] bg-success/5 border-success/20 text-success">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />{item.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Settings */}
                  <div id="tour-settings" data-jump-section="Settings" className="space-y-4 p-5 border border-border/60 border-t-2 border-t-primary rounded-xl bg-card shadow-sm scroll-mt-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Settings</h3>
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                        <div>
                          <Label className="font-semibold text-sm">Active Status</Label>
                          <p className="text-xs text-muted-foreground">Make available for booking</p>
                        </div>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    )} />
                  </div>
                </div>
              </div>
            </Form>
          </TabsContent>

          {/* GALLERY TAB */}
          <TabsContent value="gallery">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Tour Gallery</h3>
                  <p className="text-xs text-muted-foreground">{tourImages.length} images • Click to set as cover</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => mainFileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />Upload Image
                </Button>
                <input ref={mainFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
              </div>

              {tourImages.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                  <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">No images yet</p>
                  <Button type="button" variant="link" size="sm" onClick={() => mainFileInputRef.current?.click()}>
                    Upload your first image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {tourImages.map((image, index) => (
                    <div
                      key={index}
                      className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        index === 0 ? "border-primary shadow-md" : "border-transparent hover:border-primary/30"
                      }`}
                      onClick={() => setCoverImage(index)}
                    >
                      <div className="aspect-[4/3]">
                        <img src={image} alt={`Tour ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">Cover</Badge>
                      )}
                      <div className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </div>
                      <ConfirmDelete itemName="this photo" onConfirm={() => removeMainImage(index)}>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute bottom-2 right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </ConfirmDelete>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ITINERARY TAB */}
          <TabsContent value="itinerary">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Day-by-Day Itinerary</h3>
                  <p className="text-xs text-muted-foreground">Add detailed activities for each day</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addDayProgram}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Add Day
                </Button>
              </div>

              {dayPrograms.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">No itinerary days yet</p>
                  <Button type="button" variant="link" size="sm" onClick={addDayProgram}>
                    Add your first day
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dayPrograms.map((dayProgram, index) => (
                    <Card key={index} className="border-border/60 overflow-hidden">
                      {/* Day header with accent */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                            {dayProgram.day}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{dayProgram.title || `Day ${dayProgram.day}`}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {dayProgram.activities?.length || 0} activities • {dayProgram.images?.length || 0} photos
                            </p>
                          </div>
                        </div>
                        <ConfirmDelete itemName={`Day ${dayProgram.day}`} onConfirm={() => removeDayProgram(index)}>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDelete>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">Day Title</Label>
                            <Input
                              placeholder="e.g., Arrival & City Tour"
                              value={dayProgram.title}
                              onChange={(e) => updateDayProgram(index, 'title', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Activities (comma-separated)</Label>
                            <Input
                              placeholder="Airport pickup, Hotel check-in, City tour"
                              value={dayProgram.activities?.join(', ') || ''}
                              onChange={(e) => updateDayProgram(index, 'activities', e.target.value.split(',').map(a => a.trim()))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Description</Label>
                          <Textarea
                            placeholder="Describe what happens on this day..."
                            value={dayProgram.description}
                            onChange={(e) => updateDayProgram(index, 'description', e.target.value)}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        {/* Activities preview badges */}
                        {dayProgram.activities && dayProgram.activities.filter(Boolean).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {dayProgram.activities.filter(Boolean).map((act, ai) => (
                              <Badge key={ai} variant="outline" className="text-[10px] px-2 py-0 h-5 font-normal bg-muted/20">
                                <CheckCircle className="h-2.5 w-2.5 mr-1 text-primary/60" />{act}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {/* Day photos */}
                        <div>
                          <Label className="text-xs font-medium mb-1.5 block">Day Photos</Label>
                          <div className="flex flex-wrap gap-2">
                            {dayProgram.images?.map((image, imgIndex) => (
                              <div key={imgIndex} className="relative h-16 w-16 rounded-lg overflow-hidden border group">
                                <img src={image} alt={`Day ${dayProgram.day}`} className="h-full w-full object-cover" />
                                <ConfirmDelete itemName="this day photo" onConfirm={() => removeDayImage(index, imgIndex)}>
                                  <Button
                                    type="button" variant="destructive" size="icon"
                                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </ConfirmDelete>
                              </div>
                            ))}
                            <div
                              className="h-16 w-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => fileInputRefs.current[index]?.click()}
                            >
                              {isUploadingImage === index ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <input
                              ref={(el) => (fileInputRefs.current[index] = el)}
                              type="file" accept="image/*" className="hidden"
                              onChange={(e) => handleDayImageUpload(index, e)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
          </div>
          <SectionJumpNav scrollContainerRef={scrollContainerRef} rescanKey={activeTourTab} />
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="flex-shrink-0 flex justify-between gap-3 px-4 py-4 border-t bg-muted/30">
        <div>
          {!isEditing && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { form.reset(); setDayPrograms([]); setTourImages([]); }} className="gap-1 text-muted-foreground">
              Reset
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button type="button" variant="navy" disabled={isSaving} onClick={form.handleSubmit(onSubmit)}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
