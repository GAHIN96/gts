import { useForm } from "react-hook-form";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Trash2, CalendarIcon, FileText, Upload, X, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";

import { useCreatePackage, useUpdatePackage, type GroupPackage, type GroupPackageInsert } from "@/hooks/usePackages";
import { useCities, useCreateCity } from "@/hooks/useCities";
import { useAirports } from "@/hooks/useAirports";
import { useAirlines } from "@/hooks/useAirlines";
import { useVisas } from "@/hooks/useVisas";
import { useSavePackageHotels, usePackageHotelsByPackage } from "@/hooks/usePackageHotels";
import { usePackageRates, useSavePackageRates } from "@/hooks/usePackageRates";
import { usePackageSpecialRates, useSavePackageSpecialRates } from "@/hooks/usePackageSpecialRates";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

import { RecurringScheduleSelector, ScheduleBadge } from "./RecurringScheduleSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PackageFlightHotelSelector } from "./PackageFlightHotelSelector";
import { DocumentRequirementManager, type DocumentRequirement } from "./DocumentRequirementManager";
import { PackageDeparturesInline } from "./PackageDeparturesInline";
import { PackageDefaultRatesTab, type RateRow } from "./PackageDefaultRatesTab";
import { PackageSpecialRatesTab, type SpecialRateRow } from "./PackageSpecialRatesTab";
import { PackageHotelAvailability } from "./PackageHotelAvailability";

const packageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city_id: z.string().min(1, "City is required"),
  departure_city_id: z.string().optional().nullable(),
  nights: z.coerce.number().min(1, "At least 1 night required"),
  starting_price: z.coerce.number().min(0, "Price must be positive"),
  description: z.string().optional(),
  includes_flight: z.boolean().default(false),
  includes_hotel: z.boolean().default(false),
  includes_transfer: z.boolean().default(false),
  includes_tours: z.boolean().default(false),
  included_items: z.string().optional(),
  not_included_items: z.string().optional(),
  is_active: z.boolean().default(true),
  schedule_type: z.enum(["specific", "recurring"]).default("specific"),
  valid_from: z.date().optional().nullable(),
  valid_until: z.date().optional().nullable(),
  barcode_value: z.string().optional(),
  barcode_link_url: z.string().optional(),
  source_airport: z.string().optional(),
  destination_airport: z.string().optional(),
  airline: z.string().optional(),
  group_ops_email: z.string().optional(),
  visa_ops_email: z.string().optional(),
  visa_required: z.boolean().default(true),
  visa_amount: z.coerce.number().default(0),
  visa_amount_adt: z.coerce.number().default(0),
  visa_amount_chd: z.coerce.number().default(0),
  visa_amount_inf: z.coerce.number().default(0),
  order_number: z.string().optional(),
  passport_required: z.boolean().default(true),
  photo_required: z.boolean().default(false),
  id_required: z.boolean().default(false),
  id_backside_required: z.boolean().default(false),
  guide_name: z.string().optional(),
  phone: z.string().optional(),
  gate_number: z.string().optional(),
  group_policy: z.string().optional(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

interface DayProgram {
  day: number;
  title: string;
  activities: string[];
}

interface GroupPackageFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  pkg?: GroupPackage | null;
  fullPage?: boolean;
  onClose?: () => void;
}

interface SelectedHotel {
  hotelId: string;
  tier: "3-star" | "4-star" | "5-star";
  priceAdjustment: number;
  isDefault: boolean;
}

export function GroupPackageForm({ open, onOpenChange, pkg, fullPage, onClose }: GroupPackageFormProps) {
  const sidebarOffset = useSidebarOffset();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const savePackageHotels = useSavePackageHotels();
  const savePackageRates = useSavePackageRates();
  const saveSpecialRates = useSavePackageSpecialRates();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { airports, isLoading: airportsLoading } = useAirports();
  const { airlines, isLoading: airlinesLoading } = useAirlines();
  const { data: visas } = useVisas();
  const referenceDataReady = !citiesLoading && !airportsLoading && !airlinesLoading && !!cities && !!airports && !!airlines;
  const createCity = useCreateCity();
  const { data: existingPackageHotels } = usePackageHotelsByPackage(pkg?.id || null);
  const { data: existingRates } = usePackageRates(pkg?.id || null);
  const { data: existingSpecialRates } = usePackageSpecialRates(pkg?.id || null);
  const isEditing = !!pkg;

  const [dayProgram, setDayProgram] = useState<DayProgram[]>([]);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<SelectedHotel[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<DocumentRequirement[]>([]);
  const [programPdfUrl, setProgramPdfUrl] = useState<string | null>(null);
  const [programPdfFile, setProgramPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string | null>(null);
  const [barcodeImageFile, setBarcodeImageFile] = useState<File | null>(null);
  const [uploadingBarcode, setUploadingBarcode] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const submitInProgressRef = useRef(false);
  const lastPkgIdRef = useRef<string | null>(null);
  const [defaultRates, setDefaultRates] = useState<RateRow[]>([]);
  const [specialRates, setSpecialRates] = useState<SpecialRateRow[]>([]);
  const [activeTab, setActiveTab] = useState("general");
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityCountry, setNewCityCountry] = useState("");
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      city_id: "",
      departure_city_id: null,
      nights: 3,
      starting_price: 0,
      description: "",
      includes_flight: false,
      includes_hotel: false,
      includes_transfer: false,
      includes_tours: false,
      included_items: "",
      not_included_items: "",
      is_active: true,
      schedule_type: "specific",
      valid_from: null,
      valid_until: null,
      barcode_value: "",
      barcode_link_url: "",
      source_airport: "",
      destination_airport: "",
      airline: "",
      group_ops_email: "",
      visa_ops_email: "",
      visa_required: true,
      visa_amount: 0,
      visa_amount_adt: 0,
      visa_amount_chd: 0,
      visa_amount_inf: 0,
      order_number: "",
      passport_required: true,
      photo_required: false,
      id_required: false,
      id_backside_required: false,
      guide_name: "",
      phone: "",
      gate_number: "",
      group_policy: "",
    },
  });

  const scheduleType = form.watch("schedule_type");
  const validFrom = form.watch("valid_from");
  const validUntil = form.watch("valid_until");
  const cityId = form.watch("city_id");
  const includesFlight = form.watch("includes_flight");
  const includesHotel = form.watch("includes_hotel");

  // Load existing package hotels when editing
  useEffect(() => {
    if (existingPackageHotels && existingPackageHotels.length > 0) {
      setSelectedHotels(existingPackageHotels.map(ph => ({
        hotelId: ph.hotel_id,
        tier: ph.tier as "3-star" | "4-star" | "5-star",
        priceAdjustment: ph.price_adjustment || 0,
        isDefault: ph.is_default || false,
      })));
    }
  }, [existingPackageHotels]);

  // Load existing rates
  useEffect(() => {
    if (existingRates && existingRates.length > 0) {
      setDefaultRates(existingRates.map(r => ({
        hotel_id: r.hotel_id,
        guest_type: r.guest_type,
        room_type: r.room_type,
        capacity: r.capacity,
        count: r.count,
        price: r.price,
        commission: r.commission,
      })));
    }
  }, [existingRates]);

  useEffect(() => {
    if (existingSpecialRates && existingSpecialRates.length > 0) {
      setSpecialRates(existingSpecialRates.map(r => ({
        hotel_id: r.hotel_id,
        departure_date: r.departure_date,
        return_date: r.return_date,
        guest_type: r.guest_type,
        room_type: r.room_type,
        price: r.price,
        commission: r.commission,
      })));
    }
  }, [existingSpecialRates]);

  useEffect(() => {
    if (!referenceDataReady) return;
    if (pkg) {
      form.reset({
        name: pkg.name,
        city_id: pkg.city_id,
        departure_city_id: pkg.departure_city_id || null,
        nights: pkg.nights,
        starting_price: pkg.starting_price,
        description: pkg.description || "",
        includes_flight: pkg.includes_flight ?? false,
        includes_hotel: pkg.includes_hotel ?? false,
        includes_transfer: pkg.includes_transfer ?? false,
        includes_tours: pkg.includes_tours ?? false,
        included_items: pkg.included_items?.join(", ") || "",
        not_included_items: pkg.not_included_items?.join(", ") || "",
        is_active: pkg.is_active ?? true,
        schedule_type: (pkg.schedule_type as "specific" | "recurring") || "specific",
        valid_from: pkg.valid_from ? new Date(pkg.valid_from) : null,
        valid_until: pkg.valid_until ? new Date(pkg.valid_until) : null,
        barcode_value: (pkg as any).barcode_value || "",
        barcode_link_url: (pkg as any).barcode_link_url || "",
        source_airport: (pkg as any).source_airport || "",
        destination_airport: (pkg as any).destination_airport || "",
        airline: (pkg as any).airline || "",
        group_ops_email: (pkg as any).group_ops_email || "",
        visa_ops_email: (pkg as any).visa_ops_email || "",
        visa_required: (pkg as any).visa_required ?? true,
        visa_amount: (pkg as any).visa_amount || 0,
        visa_amount_adt: (pkg as any).visa_amount_adt || 0,
        visa_amount_chd: (pkg as any).visa_amount_chd || 0,
        visa_amount_inf: (pkg as any).visa_amount_inf || 0,
        order_number: (pkg as any).order_number || "",
        passport_required: (pkg as any).passport_required ?? true,
        photo_required: (pkg as any).photo_required ?? false,
        id_required: (pkg as any).id_required ?? false,
        id_backside_required: (pkg as any).id_backside_required ?? false,
        guide_name: (pkg as any).guide_name || "",
        phone: (pkg as any).phone || "",
        gate_number: (pkg as any).gate_number || "",
        group_policy: (pkg as any).group_policy || "",
      });
      setDayProgram((pkg.day_program as unknown as DayProgram[]) || []);
      setRecurringDays(pkg.recurring_days || []);
      setProgramPdfUrl((pkg as any).program_pdf_url || null);
      setProgramPdfFile(null);
      setBarcodeImageUrl((pkg as any).barcode_image_url || null);
      setBarcodeImageFile(null);
      const pkgDocs = (pkg as any).required_documents;
      if (pkgDocs && Array.isArray(pkgDocs)) {
        const seen = new Set<string>();
        const uniqueDocs = (pkgDocs as DocumentRequirement[]).filter(doc => {
          if (seen.has(doc.id)) return false;
          seen.add(doc.id);
          return true;
        });
        setRequiredDocuments(uniqueDocs);
      } else {
        setRequiredDocuments([]);
      }
    } else {
      form.reset({
        name: "",
        city_id: "",
        departure_city_id: null,
        nights: 3,
        starting_price: 0,
        description: "",
        includes_flight: false,
        includes_hotel: false,
        includes_transfer: false,
        includes_tours: false,
        included_items: "",
        not_included_items: "",
        is_active: true,
        schedule_type: "specific",
        valid_from: null,
        valid_until: null,
        barcode_value: "",
        barcode_link_url: "",
        source_airport: "",
        destination_airport: "",
        airline: "",
        group_ops_email: "",
        visa_ops_email: "",
        visa_required: true,
        visa_amount: 0,
        visa_amount_adt: 0,
        visa_amount_chd: 0,
        visa_amount_inf: 0,
        order_number: "",
        passport_required: true,
        photo_required: false,
        id_required: false,
        id_backside_required: false,
        guide_name: "",
        phone: "",
        gate_number: "",
        group_policy: "",
      });
      setDayProgram([]);
      setRecurringDays([]);
      setSelectedHotels([]);
      setRequiredDocuments([]);
      setProgramPdfUrl(null);
      setProgramPdfFile(null);
      setDefaultRates([]);
      setSpecialRates([]);
    }
    const currentPkgId = pkg?.id || null;
    if (lastPkgIdRef.current !== currentPkgId) {
      setActiveTab("general");
      lastPkgIdRef.current = currentPkgId;
    }
  }, [pkg, form, referenceDataReady]);

  const nights = form.watch("nights");

  // Sync day program with nights
  useEffect(() => {
    if (nights > dayProgram.length) {
      const newDays: DayProgram[] = [];
      for (let i = dayProgram.length + 1; i <= nights; i++) {
        newDays.push({ day: i, title: `Day ${i}`, activities: [] });
      }
      setDayProgram([...dayProgram, ...newDays]);
    } else if (nights < dayProgram.length) {
      setDayProgram(dayProgram.slice(0, nights));
    }
  }, [nights]);

  const updateDayTitle = (dayIndex: number, title: string) => {
    const updated = [...dayProgram];
    updated[dayIndex] = { ...updated[dayIndex], title };
    setDayProgram(updated);
  };

  const updateDayActivities = (dayIndex: number, activitiesStr: string) => {
    const updated = [...dayProgram];
    updated[dayIndex] = {
      ...updated[dayIndex],
      activities: activitiesStr.split("\n").filter((a) => a.trim()),
    };
    setDayProgram(updated);
  };

  const uploadProgramPdf = async (packageId: string): Promise<string | null> => {
    if (!programPdfFile) return programPdfUrl;
    
    setUploadingPdf(true);
    try {
      const fileExt = programPdfFile.name.split('.').pop();
      const filePath = `${packageId}/program.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('package-programs')
        .upload(filePath, programPdfFile, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('package-programs')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemovePdf = () => {
    setProgramPdfUrl(null);
    setProgramPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const uploadBarcodeImage = async (packageId: string): Promise<string | null> => {
    if (!barcodeImageFile) return barcodeImageUrl;
    setUploadingBarcode(true);
    try {
      const fileExt = barcodeImageFile.name.split('.').pop();
      const filePath = `${packageId}/barcode.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('package-programs')
        .upload(filePath, barcodeImageFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('package-programs').getPublicUrl(filePath);
      return urlData.publicUrl;
    } finally {
      setUploadingBarcode(false);
    }
  };

  const handleRemoveBarcode = () => {
    setBarcodeImageUrl(null);
    setBarcodeImageFile(null);
    if (barcodeInputRef.current) barcodeInputRef.current.value = '';
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: PackageFormValues) => {
    if (isSubmitting || submitInProgressRef.current) return;
    submitInProgressRef.current = true;
    setIsSubmitting(true);
    try {
      let pdfUrl = programPdfUrl;

      const packageData: GroupPackageInsert = {
        name: data.name,
        city_id: data.city_id,
        departure_city_id: data.departure_city_id || null,
        nights: data.nights,
        starting_price: data.starting_price,
        description: data.description || null,
        includes_flight: data.includes_flight,
        includes_hotel: data.includes_hotel,
        includes_transfer: data.includes_transfer,
        includes_tours: data.includes_tours,
        included_items: data.included_items ? data.included_items.split(",").map((i) => i.trim()) : [],
        not_included_items: data.not_included_items ? data.not_included_items.split(",").map((i) => i.trim()) : [],
        day_program: dayProgram as any,
        is_active: data.is_active,
        schedule_type: data.schedule_type,
        recurring_days: data.schedule_type === "recurring" ? recurringDays : null,
        valid_from: data.valid_from ? format(data.valid_from, "yyyy-MM-dd") : null,
        valid_until: data.valid_until ? format(data.valid_until, "yyyy-MM-dd") : null,
        barcode_value: data.barcode_value || null,
        barcode_link_url: data.barcode_link_url || null,
        required_documents: requiredDocuments,
        source_airport: data.source_airport || null,
        destination_airport: data.destination_airport || null,
        airline: data.airline || null,
        group_ops_email: data.group_ops_email || null,
        visa_ops_email: data.visa_ops_email || null,
        visa_required: data.visa_required,
        visa_amount: data.visa_required ? (data.visa_amount || 0) : 0,
        visa_amount_adt: data.visa_required ? (data.visa_amount_adt || 0) : 0,
        visa_amount_chd: data.visa_required ? (data.visa_amount_chd || 0) : 0,
        visa_amount_inf: data.visa_required ? (data.visa_amount_inf || 0) : 0,
        order_number: data.order_number || null,
        passport_required: data.passport_required,
        photo_required: data.photo_required,
        id_required: data.id_required,
        id_backside_required: data.id_backside_required,
        guide_name: data.guide_name || null,
        phone: data.phone || null,
        gate_number: data.gate_number || null,
        group_policy: data.group_policy || null,
      } as any;

      let packageId: string;

      if (isEditing && pkg) {
        pdfUrl = await uploadProgramPdf(pkg.id);
        const barcodeUrl = await uploadBarcodeImage(pkg.id);
        await updatePackage.mutateAsync({ id: pkg.id, ...packageData, program_pdf_url: pdfUrl, barcode_image_url: barcodeUrl } as any);
        packageId = pkg.id;
        toast.success("Package updated successfully");
      } else {
        const newPackage = await createPackage.mutateAsync(packageData);
        packageId = newPackage.id;
        pdfUrl = await uploadProgramPdf(packageId);
        const barcodeUrl = await uploadBarcodeImage(packageId);
        if (pdfUrl || barcodeUrl) {
          await updatePackage.mutateAsync({ id: packageId, program_pdf_url: pdfUrl, barcode_image_url: barcodeUrl } as any);
        }
        toast.success("Package created successfully");
      }

      // Save package hotels
      if (data.includes_hotel && selectedHotels.length > 0) {
        await savePackageHotels.mutateAsync({
          packageId,
          hotels: selectedHotels.map(h => ({
            hotel_id: h.hotelId,
            tier: h.tier,
            price_adjustment: h.priceAdjustment,
            is_default: h.isDefault,
          })),
        });
      }

      // Save default rates (always save to sync deletions too)
      await savePackageRates.mutateAsync({
        packageId,
        rates: defaultRates,
      });

      // Save special rates
      const validSpecialRates = specialRates.filter(r => r.departure_date && r.return_date);
      if (validSpecialRates.length > 0) {
        await saveSpecialRates.mutateAsync({
          packageId,
          rates: validSpecialRates,
        });
      }

      if (onClose) onClose();
      else if (onOpenChange) onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save package";
      toast.error(message);
    } finally {
      submitInProgressRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isLoading = createPackage.isPending || updatePackage.isPending || isSubmitting;
  const [savingRates, setSavingRates] = useState(false);

  const TAB_ORDER = ["general", "departures", "hotel-availability", "default-rates", "special-rates"];
  const currentTabIndex = TAB_ORDER.indexOf(activeTab);
  const canGoPrev = currentTabIndex > 0;
  const canGoNext = currentTabIndex < TAB_ORDER.length - 1;
  const goToPrevTab = () => { if (canGoPrev) setActiveTab(TAB_ORDER[currentTabIndex - 1]); };
  const goToNextTab = () => {
    const nextTab = TAB_ORDER[currentTabIndex + 1];
    // Don't navigate to disabled tabs (departures/rates) if not editing
    if (!isEditing && nextTab !== "general") return;
    if (canGoNext) setActiveTab(nextTab);
  };

  const handleSaveRatesOnly = async () => {
    if (!pkg) return;
    setSavingRates(true);
    try {
      if (activeTab === "default-rates") {
        await savePackageRates.mutateAsync({ packageId: pkg.id, rates: defaultRates });
        toast.success("Default rates saved successfully");
      } else if (activeTab === "special-rates") {
        const validSpecialRates = specialRates.filter(r => r.departure_date && r.return_date);
        if (validSpecialRates.length > 0) {
          await saveSpecialRates.mutateAsync({ packageId: pkg.id, rates: validSpecialRates });
          toast.success("Special rates saved successfully");
        } else {
          toast.info("No valid special rates to save");
        }
      }
    } catch (error) {
      toast.error("Failed to save rates");
    } finally {
      setSavingRates(false);
    }
  };

  const getValidityInfo = () => {
    if (!validUntil) return null;
    const daysRemaining = differenceInDays(validUntil, new Date());
    if (daysRemaining < 0) return { text: "Expired", variant: "destructive" as const };
    if (daysRemaining === 0) return { text: "Expires today", variant: "destructive" as const };
    if (daysRemaining <= 7) return { text: `${daysRemaining} days left`, variant: "warning" as const };
    return { text: `Valid until ${format(validUntil, "dd/MM/yyyy")}`, variant: "secondary" as const };
  };

  const validityInfo = getValidityInfo();

  const handleClose = () => {
    if (onClose) onClose();
    else if (onOpenChange) onOpenChange(false);
  };

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1">
          <div className={fullPage ? "mb-6" : "px-6"}>
            <div className="flex overflow-x-auto min-w-0 sm:grid w-full sm:grid-cols-5 rounded-lg bg-primary/5 border border-primary/15 p-1 text-muted-foreground gap-1">
              {[
                { value: "general", label: "General", disabled: false },
                { value: "departures", label: "Departures", disabled: !isEditing },
                { value: "hotel-availability", label: "Hotel Availability", disabled: !isEditing },
                { value: "default-rates", label: "Hotels Default Rates", disabled: !isEditing },
                { value: "special-rates", label: "Hotels Special Rates", disabled: !isEditing },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-40",
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-primary/70 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={fullPage ? "" : "max-h-[calc(90vh-180px)] overflow-y-auto px-6 pb-6"}>
                {/* ===== GENERAL TAB ===== */}
                {activeTab === "general" && (
                <div className="mt-4 space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">General</h3>
                    
                    {/* Row 1: Name, Description, From, Source Airport, Destination City, Destination Airport, Airline */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Group Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Group name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="departure_city_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From</FormLabel>
                            <div className="flex gap-1">
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a City" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {cities?.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name}, {city.country}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowAddCity(true)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            {showAddCity && (
                              <div className="mt-2 p-3 border rounded-lg bg-muted/50 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Add New City</p>
                                <Input placeholder="City name" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} />
                                <Input placeholder="Country" value={newCityCountry} onChange={(e) => setNewCityCountry(e.target.value)} />
                                <div className="flex gap-2">
                                  <Button type="button" size="sm" disabled={!newCityName || !newCityCountry || createCity.isPending}
                                    onClick={async () => {
                                      try {
                                        const newCity = await createCity.mutateAsync({ name: newCityName, country: newCityCountry });
                                        field.onChange(newCity.id);
                                        setNewCityName(""); setNewCityCountry(""); setShowAddCity(false);
                                        toast.success("City added");
                                      } catch { toast.error("Failed to add city"); }
                                    }}
                                  >
                                    {createCity.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddCity(false); setNewCityName(""); setNewCityCountry(""); }}>Cancel</Button>
                                </div>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="source_airport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Airport</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select airport" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {airports?.filter(a => a.is_active).map((airport) => (
                                  <SelectItem key={airport.id} value={airport.code}>
                                    {airport.code} - {airport.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="city_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination City</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a City" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cities?.map((city) => (
                                  <SelectItem key={city.id} value={city.id}>
                                    {city.name}, {city.country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="destination_airport"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination Airport</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select airport" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {airports?.filter(a => a.is_active).map((airport) => (
                                  <SelectItem key={airport.id} value={airport.code}>
                                    {airport.code} - {airport.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Airline field */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <FormField
                        control={form.control}
                        name="airline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Airline</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select airline" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {airlines?.filter(a => a.is_active).map((al) => (
                                  <SelectItem key={al.id} value={al.name}>
                                    {al.name} ({al.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Row 2: Ops emails, visa, order, document requirements */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                      <FormField
                        control={form.control}
                        name="group_ops_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Ops. Email</FormLabel>
                            <FormControl>
                              <Input placeholder="ops@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="visa_ops_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visa Ops Email</FormLabel>
                            <FormControl>
                              <Input placeholder="visa@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="visa_required"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-6">
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="!mt-0">Visa Required</FormLabel>
                          </FormItem>
                        )}
                      />
                      {form.watch("visa_required") && (
                        <>
                          <FormField
                            control={form.control}
                            name="visa_amount_adt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visa ADT (12+)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input type="number" min={0} placeholder="0" className="pl-7" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="visa_amount_chd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visa CHD (2-12)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input type="number" min={0} placeholder="0" className="pl-7" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="visa_amount_inf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visa INF (0-2)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                    <Input type="number" min={0} placeholder="0" className="pl-7" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      <FormField
                        control={form.control}
                        name="order_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order #</FormLabel>
                            <FormControl>
                              <Input placeholder="Order number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                    </div>

                    {/* Row 3: Status, Guide, Phone, Gate, Starting Price, Cover Photo, Program File */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <FormField
                        control={form.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={(v) => field.onChange(v === "active")} value={field.value ? "active" : "inactive"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guide_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Guide Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Guide name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone #</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gate_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gate #</FormLabel>
                            <FormControl>
                              <Input placeholder="Gate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="starting_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Starting Cover Price</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nights"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Nights</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Group Policy */}
                    <FormField
                      control={form.control}
                      name="group_policy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Policy</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Group Policy" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>


                  {/* Includes */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">What's Included</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="includes_flight"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm">Flights</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="includes_hotel"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm">Hotel</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="includes_transfer"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm">Transfer</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="includes_tours"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm">Tours</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {(includesFlight || includesHotel) && cityId && (
                      <div className="mt-4">
                        <PackageFlightHotelSelector
                          cityId={cityId}
                          includesFlight={includesFlight}
                          includesHotel={includesHotel}
                          selectedHotels={selectedHotels}
                          onHotelsChange={setSelectedHotels}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="included_items"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Included Items (comma-separated)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Breakfast, Airport pickup, City tour..." rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="not_included_items"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Not Included (comma-separated)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Visa fees, Personal expenses..." rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>


                  {/* Program PDF Upload */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">Program PDF</h3>
                    
                    <div className="space-y-3">
                      {(programPdfUrl || programPdfFile) ? (
                        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium truncate flex-1">
                            {programPdfFile ? programPdfFile.name : 'Program PDF uploaded'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={handleRemovePdf}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                          onClick={() => pdfInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload program PDF</p>
                        </div>
                      )}
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProgramPdfFile(file);
                            setProgramPdfUrl(null);
                          }
                        }}
                      />
                      {(programPdfUrl || programPdfFile) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => pdfInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Replace PDF
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">Settings</h3>

                    <DocumentRequirementManager
                      documents={requiredDocuments}
                      onChange={setRequiredDocuments}
                    />

                    <FormField
                      control={form.control}
                      name="barcode_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode/QR Code Value (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter barcode value for voucher..." {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            This value will be used to generate a barcode on vouchers/PDFs
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Barcode Image Upload */}
                    <div className="space-y-3">
                      <FormLabel>Barcode Image (Optional)</FormLabel>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Upload a barcode/QR code image that will be shown on the package card. People can scan it or click to visit a link.
                      </p>
                      <input
                        ref={barcodeInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBarcodeImageFile(file);
                            setBarcodeImageUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {!barcodeImageUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 rounded-xl"
                          onClick={() => barcodeInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          Upload Barcode Image
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                          <img src={barcodeImageUrl} alt="Barcode" className="h-16 w-auto object-contain rounded-lg bg-white p-1" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Barcode image uploaded</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={handleRemoveBarcode}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => barcodeInputRef.current?.click()}>
                            <Upload className="h-3.5 w-3.5" />
                            Replace
                          </Button>
                        </div>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="barcode_link_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode Link URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/program" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            When users scan or click the barcode, they will be taken to this URL
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                )}

                {/* ===== DEPARTURES TAB ===== */}
                {activeTab === "departures" && (
                <div className="mt-4">
                  {isEditing && pkg ? (
                    <PackageDeparturesInline packageId={pkg.id} destinationCity={cities?.find(c => c.id === cityId)?.name || null} />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      Save the package first to manage departures.
                    </div>
                  )}
                </div>
                )}

                {/* ===== HOTEL AVAILABILITY TAB ===== */}
                {activeTab === "hotel-availability" && (
                <div className="mt-4">
                  {isEditing && pkg ? (
                    <PackageHotelAvailability packageId={pkg.id} />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      Save the package first to manage hotel availability.
                    </div>
                  )}
                </div>
                )}

                {/* ===== DEFAULT RATES TAB ===== */}
                {activeTab === "default-rates" && (
                <div className="mt-4">
                  <PackageDefaultRatesTab
                    packageHotels={existingPackageHotels || []}
                    rates={defaultRates}
                    onRatesChange={setDefaultRates}
                  />
                </div>
                )}

                {/* ===== SPECIAL RATES TAB ===== */}
                {activeTab === "special-rates" && (
                <div className="mt-4">
                  <PackageSpecialRatesTab
                    packageHotels={existingPackageHotels || []}
                    rates={specialRates}
                    onRatesChange={setSpecialRates}
                  />
                </div>
                )}
              </div>
            </div>

            <div className={cn("flex items-center justify-between border-t", fullPage ? "py-6" : "p-6 pt-4")}>
              {/* Navigation arrows */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToPrevTab}
                  disabled={!canGoPrev}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToNextTab}
                  disabled={!canGoNext || (!isEditing && currentTabIndex === 0)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {(activeTab === "default-rates" || activeTab === "special-rates") && isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleSaveRatesOnly}
                      disabled={savingRates}
                    >
                      {savingRates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save {activeTab === "default-rates" ? "Default Rates" : "Special Rates"}
                    </Button>
                    <Button type="submit" variant="navy" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save All & Close
                    </Button>
                  </>
                ) : (
                  <Button type="submit" variant="navy" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? "Update Package" : "Create Package"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
  );

  if (fullPage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? "Edit Package" : "Add New Package"}
          </h1>
        </div>
        {!referenceDataReady ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : formContent}
      </div>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden border-l-4 border-primary shadow-[-8px_0_30px_-10px_hsl(var(--primary)/0.35)]" style={{ left: sidebarOffset }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <h2 className="text-xl font-bold text-foreground">{isEditing ? "Edit Package" : "Add New Package"}</h2>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange?.(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {!referenceDataReady ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : formContent}
      </div>
    </div>
  );
}
