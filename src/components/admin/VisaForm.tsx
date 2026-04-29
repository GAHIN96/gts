import { useEffect, useState, useRef } from "react";
import { SectionJumpNav } from "@/components/admin/SectionJumpNav";
import { useSidebarOffset } from "@/hooks/useSidebarOffset";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, X, Upload, DollarSign, FileText, RotateCcw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateVisa, useUpdateVisa, type Visa, type VisaInsert } from "@/hooks/useVisas";
import { useVisaPrices, useSaveVisaPrices, type VisaPrice } from "@/hooks/useVisaPrices";
import { useCountries } from "@/hooks/useCountries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const visaSchema = z.object({
  visa_type: z.string().min(1, "Visa name is required"),
  country: z.string().min(1, "Country is required"),
  ops_email: z.string().optional(),
  is_active: z.boolean().default(true),
  price: z.coerce.number().min(0).default(0),
  order_number: z.string().optional(),
  passport_required: z.boolean().default(false),
  photo_required: z.boolean().default(false),
  id_scan_required: z.boolean().default(false),
  processing_days: z.coerce.number().min(1).default(7),
  requirements: z.string().optional(),
  issue_duration: z.string().optional(),
  remarks: z.string().optional(),
  terms_policy: z.string().optional(),
});

type VisaFormValues = z.infer<typeof visaSchema>;

interface PriceRow {
  min_age: number;
  max_age: number;
  price: number;
  commission: number;
}

interface VisaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visa?: Visa | null;
}

export function VisaForm({ open, onOpenChange, visa }: VisaFormProps) {
  const sidebarOffset = useSidebarOffset();
  const createVisa = useCreateVisa();
  const updateVisa = useUpdateVisa();
  const saveVisaPrices = useSaveVisaPrices();
  const { countries } = useCountries();
  const { data: existingPrices } = useVisaPrices(visa?.id);
  const isEditing = !!visa;

  const [activeTab, setActiveTab] = useState("home");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [flagFile, setFlagFile] = useState<File | null>(null);
  const [flagPreview, setFlagPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<VisaFormValues>({
    resolver: zodResolver(visaSchema),
    defaultValues: {
      visa_type: "", country: "", ops_email: "", is_active: true,
      price: 0, order_number: "", passport_required: false,
      photo_required: false, id_scan_required: false,
      processing_days: 7, requirements: "", issue_duration: "",
      remarks: "", terms_policy: "",
    },
  });

  useEffect(() => {
    if (visa) {
      form.reset({
        visa_type: visa.visa_type || "", country: visa.country || "",
        ops_email: (visa as any).ops_email || "",
        is_active: visa.is_active ?? true, price: visa.price || 0,
        order_number: (visa as any).order_number || "",
        passport_required: (visa as any).passport_required ?? false,
        photo_required: (visa as any).photo_required ?? false,
        id_scan_required: (visa as any).id_scan_required ?? false,
        processing_days: visa.processing_days ?? 7,
        requirements: visa.requirements?.join(", ") || "",
        issue_duration: (visa as any).issue_duration || "",
        remarks: (visa as any).remarks || "",
        terms_policy: (visa as any).terms_policy || "",
      });
      setFlagPreview((visa as any).flag_image_url || null);
    } else {
      form.reset(); setFlagPreview(null);
    }
    setFlagFile(null); setActiveTab("home");
  }, [visa, form]);

  useEffect(() => {
    if (existingPrices) {
      setPriceRows(existingPrices.map(p => ({ min_age: p.min_age, max_age: p.max_age, price: p.price, commission: p.commission })));
    } else if (!visa) {
      setPriceRows([]);
    }
  }, [existingPrices, visa]);

  const handleFlagUpload = async (): Promise<string | null> => {
    if (!flagFile) return flagPreview;
    setUploading(true);
    try {
      const ext = flagFile.name.split(".").pop();
      const path = `visa-flags/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(path, flagFile);
      if (error) throw error;
      const { data } = supabase.storage.from("images").getPublicUrl(path);
      return data.publicUrl;
    } catch { toast.error("Failed to upload flag image"); return flagPreview; }
    finally { setUploading(false); }
  };

  const addPriceRow = () => setPriceRows(prev => [...prev, { min_age: 0, max_age: 100, price: 0, commission: 0 }]);
  const removePriceRow = (index: number) => setPriceRows(prev => prev.filter((_, i) => i !== index));
  const updatePriceRow = (index: number, field: keyof PriceRow, value: number) => {
    setPriceRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const onSubmit = async (data: VisaFormValues) => {
    try {
      const flagUrl = await handleFlagUpload();
      const visaData: any = {
        visa_type: data.visa_type, country: data.country,
        ops_email: data.ops_email || null, is_active: data.is_active,
        price: data.price, order_number: data.order_number || null,
        passport_required: data.passport_required, photo_required: data.photo_required,
        id_scan_required: data.id_scan_required, processing_days: data.processing_days,
        requirements: data.requirements ? data.requirements.split(",").map(r => r.trim()).filter(Boolean) : [],
        documents_required: [
          ...(data.passport_required ? ["Passport Scan"] : []),
          ...(data.photo_required ? ["Photo"] : []),
          ...(data.id_scan_required ? ["ID Scan"] : []),
        ],
        issue_duration: data.issue_duration || null,
        remarks: data.remarks || null, terms_policy: data.terms_policy || null,
        flag_image_url: flagUrl,
      };

      let savedId: string;
      if (isEditing && visa) {
        await updateVisa.mutateAsync({ id: visa.id, ...visaData });
        savedId = visa.id;
        toast.success("Visa updated");
      } else {
        const result = await createVisa.mutateAsync(visaData);
        savedId = result.id;
        toast.success("Visa created");
      }
      await saveVisaPrices.mutateAsync({ visaId: savedId, prices: priceRows });
      onOpenChange(false);
    } catch { toast.error("Failed to save visa"); }
  };

  const isLoading = createVisa.isPending || updateVisa.isPending || uploading;
  const tabClass = "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-3";
  const watchActive = form.watch("is_active");
  const visaName = form.watch("visa_type");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col overflow-hidden border-l-4 border-primary shadow-[-8px_0_30px_-10px_hsl(var(--primary)/0.35)]" style={{ left: sidebarOffset }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? visaName || "Edit Visa" : "New Visa"}
          </h2>
          {isEditing && (
            <Badge variant={watchActive ? "default" : "secondary"} className="ml-2 text-[10px]">
              {watchActive ? "Active" : "Inactive"}
            </Badge>
          )}
          {flagPreview && (
            <img src={flagPreview} alt="Flag" className="h-6 rounded border ml-2" />
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="hover:bg-muted">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="bg-transparent h-12 gap-6 p-0">
                <TabsTrigger value="home" className={tabClass}>Home</TabsTrigger>
                <TabsTrigger value="prices" className={tabClass}>
                  Prices {priceRows.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{priceRows.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="remarks" className={tabClass}>Remarks</TabsTrigger>
              </TabsList>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
              <div className="flex gap-0 items-start">
                <div className="flex-1 min-w-0">
              {/* HOME TAB */}
              <TabsContent value="home" className="mt-0 space-y-6">
                {/* Visa Info */}
                <div id="visa-info" data-jump-section="Visa Info" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Visa Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="visa_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Visa Name</FormLabel>
                        <FormControl><Input placeholder="DUBAI VISA MULTI-ENTRY" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {countries?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Starting Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="number" min="0" className="pl-8" {...field} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="order_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Order #</FormLabel>
                        <FormControl><Input placeholder="1" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Operations */}
                <div id="visa-operations" data-jump-section="Operations" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Operations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="ops_email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Visa Operator Email</FormLabel>
                        <FormControl><Input placeholder="visa@company.com" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="processing_days" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="uppercase text-xs font-semibold tracking-wider text-muted-foreground">Processing Days</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold text-sm">Status</Label>
                      <p className="text-xs text-muted-foreground">Visa is {watchActive ? "visible" : "hidden"} to agencies</p>
                    </div>
                    <Switch checked={watchActive} onCheckedChange={v => form.setValue("is_active", v)} />
                  </div>
                </div>

                {/* Document Requirements */}
                <div id="visa-docs" data-jump-section="Documents" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Document Requirements</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                      <div>
                        <Label className="font-semibold text-sm">Passport Scan</Label>
                        <p className="text-xs text-muted-foreground">Required</p>
                      </div>
                      <Switch checked={form.watch("passport_required")} onCheckedChange={v => form.setValue("passport_required", v)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                      <div>
                        <Label className="font-semibold text-sm">Photo Scan</Label>
                        <p className="text-xs text-muted-foreground">Required</p>
                      </div>
                      <Switch checked={form.watch("photo_required")} onCheckedChange={v => form.setValue("photo_required", v)} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/20">
                      <div>
                        <Label className="font-semibold text-sm">ID Scan</Label>
                        <p className="text-xs text-muted-foreground">Required</p>
                      </div>
                      <Switch checked={form.watch("id_scan_required")} onCheckedChange={v => form.setValue("id_scan_required", v)} />
                    </div>
                  </div>
                </div>

                {/* Flag Upload */}
                <div id="visa-flag" data-jump-section="Flag / Symbol" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Flag / Symbol</h3>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setFlagFile(file); setFlagPreview(URL.createObjectURL(file)); }
                      }} />
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Choose File</span>
                      </div>
                    </label>
                    {flagPreview && (
                      <div className="flex items-center gap-2">
                        <img src={flagPreview} alt="Flag" className="h-12 rounded border" />
                        <Button type="button" variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => { setFlagFile(null); setFlagPreview(null); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* PRICES TAB */}
              <TabsContent value="prices" className="mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-primary font-medium text-sm">Visa Prices</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addPriceRow} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Price Tier
                  </Button>
                </div>

                {priceRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center">
                    <DollarSign className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No price tiers configured</p>
                    <p className="text-xs text-muted-foreground">Click "Add Price Tier" to set age-based pricing.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Min Age</span>
                      <span>Max Age</span>
                      <span>Price ($)</span>
                      <span>Commission ($)</span>
                      <span className="w-9" />
                    </div>

                    {priceRows.map((row, index) => (
                      <div key={index} className={`grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 p-3 items-center border-t ${index % 2 === 1 ? "bg-muted/10" : ""}`}>
                        <Select value={String(row.min_age)} onValueChange={(v) => updatePriceRow(index, "min_age", Number(v))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 101 }, (_, i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={String(row.max_age)} onValueChange={(v) => updatePriceRow(index, "max_age", Number(v))}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 101 }, (_, i) => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={row.price} onChange={(e) => updatePriceRow(index, "price", Number(e.target.value))} className="h-9" />
                        <Input type="number" min="0" step="0.01" value={row.commission} onChange={(e) => updatePriceRow(index, "commission", Number(e.target.value))} className="h-9" />
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => removePriceRow(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* REMARKS TAB */}
              <TabsContent value="remarks" className="mt-0 space-y-6">
                <div id="visa-details" data-jump-section="Details" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Details</h3>
                  <FormField control={form.control} name="requirements" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Requirements:</FormLabel>
                      <FormControl><Textarea placeholder="Passport, Photo, ID" rows={3} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="issue_duration" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Issue Duration:</FormLabel>
                      <FormControl><Textarea placeholder="2-3 Working Days" rows={2} {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <div id="visa-policy" data-jump-section="Remarks & Policy" className="space-y-4 p-4 border border-t-2 border-t-primary rounded-lg bg-card shadow-sm scroll-mt-4">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-primary">Remarks & Policy</h3>
                  <FormField control={form.control} name="remarks" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Remarks:</FormLabel>
                      <FormControl><Textarea placeholder="Duration of Stay 60 Days" rows={2} {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="terms_policy" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Terms/Policy:</FormLabel>
                      <FormControl><Textarea placeholder="In case of refusal there would be no refund" rows={2} {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </TabsContent>
                </div>
                <SectionJumpNav scrollContainerRef={scrollContainerRef} rescanKey={activeTab} />
              </div>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-between gap-3 px-4 py-4 border-t bg-muted/30 shrink-0">
            <div>
              {!isEditing && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { form.reset(); setPriceRows([]); setFlagFile(null); setFlagPreview(null); }} className="gap-1 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button type="submit" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
