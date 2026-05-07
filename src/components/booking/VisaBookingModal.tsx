import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText, CheckCircle, Clock, Plus, Minus, User, Upload, X, Trash2, Globe, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useCreateBooking } from "@/hooks/useBookings";
import { UniversalVoucher } from "./UniversalVoucher";
import { BookingPaymentStep } from "./BookingPaymentStep";
import type { Visa } from "@/hooks/useVisas";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { BookingCelebration } from "./BookingCelebration";
import { useRef } from "react";
import { getCountryFlagUrl } from "@/utils/countryFlags";

const applicantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  passportNumber: z.string().min(1, "Passport number is required"),
  passportExpiry: z.string().optional(),
  nationality: z.string().min(1, "Nationality is required"),
  documents: z.array(z.object({
    documentName: z.string(),
    documentUrl: z.string(),
  })).optional(),
});

const formSchema = z.object({
  applicants: z.array(applicantSchema).min(1, "At least one applicant is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().min(1, "Phone number is required"),
  notes: z.string().optional(),
});

type VisaFormData = z.infer<typeof formSchema>;

interface VisaBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visa: Visa | null;
}

export function VisaBookingModal({ open, onOpenChange, visa }: VisaBookingModalProps) {
  const [step, setStep] = useState<"form" | "payment" | "voucher">("form");
  const [showCelebration, setShowCelebration] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    number: string;
    formData: VisaFormData;
  } | null>(null);
  const [uploadingState, setUploadingState] = useState<{ applicantIndex: number; docName: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const createBooking = useCreateBooking();

  const requiredDocs = visa?.documents_required || [];

  const form = useForm<VisaFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      applicants: [{
        firstName: "",
        lastName: "",
        passportNumber: "",
        passportExpiry: "",
        nationality: "",
        documents: [],
      }],
      contactEmail: "",
      contactPhone: "",
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "applicants",
  });

  const handleFileUpload = async (applicantIndex: number, docName: string, file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WebP, or PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploadingState({ applicantIndex, docName });
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const sanitizedDocName = docName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const fileName = `${user.id}/${Date.now()}-visa-${applicantIndex}-${sanitizedDocName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('passenger-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Update applicant documents array
      const currentDocs = form.getValues(`applicants.${applicantIndex}.documents`) || [];
      const existingIndex = currentDocs.findIndex(d => d.documentName === docName);
      
      if (existingIndex >= 0) {
        currentDocs[existingIndex] = { documentName: docName, documentUrl: fileName };
      } else {
        currentDocs.push({ documentName: docName, documentUrl: fileName });
      }
      
      form.setValue(`applicants.${applicantIndex}.documents`, currentDocs, { shouldValidate: true });
      toast.success(`${docName} uploaded successfully`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploadingState(null);
        setUploadProgress(0);
      }, 500);
    }
  };

  const removeDocument = (applicantIndex: number, docName: string) => {
    const currentDocs = form.getValues(`applicants.${applicantIndex}.documents`) || [];
    const updated = currentDocs.filter(d => d.documentName !== docName);
    form.setValue(`applicants.${applicantIndex}.documents`, updated);
  };

  const getUploadedDoc = (applicantIndex: number, docName: string) => {
    const docs = form.watch(`applicants.${applicantIndex}.documents`) || [];
    return docs.find(d => d.documentName === docName);
  };

  const getApplicantDocCompletion = (applicantIndex: number) => {
    const docs = form.watch(`applicants.${applicantIndex}.documents`) || [];
    const uploaded = requiredDocs.filter(docName => docs.some(d => d.documentName === docName));
    return { uploaded: uploaded.length, total: requiredDocs.length };
  };

  const onSubmit = async (data: VisaFormData) => {
    if (!visa) return;
    
    // Validate that all applicants have all required documents
    if (requiredDocs.length > 0) {
      const incomplete = data.applicants.some((a, idx) => {
        const completion = getApplicantDocCompletion(idx);
        return completion.uploaded < completion.total;
      });
      if (incomplete) {
        toast.error("Please upload all required documents for every applicant");
        return;
      }
    }
    
    try {
      const booking = await createBooking.mutateAsync({
        booking_type: "visa",
        visa_id: visa.id,
        total_amount: visa.price * data.applicants.length,
        passengers: data.applicants.length,
        passenger_details: data.applicants.map((a, index) => ({
          firstName: a.firstName,
          lastName: a.lastName,
          passportNumber: a.passportNumber,
          passportExpiry: a.passportExpiry || null,
          nationality: a.nationality,
          documents: a.documents || [],
          isLead: index === 0,
        })),
        notes: JSON.stringify({
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          additionalNotes: data.notes,
        }),
        status: "pending_payment",
      });

      setBookingResult({
        id: booking.id,
        number: booking.booking_number,
        formData: data,
      });
      setStep("payment");
      toast.success(`Booking created! Please complete payment.`);
    } catch (error) {
      toast.error("Failed to submit application");
    }
  };

  const handleClose = () => {
    setStep("form");
    setBookingResult(null);
    setShowCelebration(false);
    form.reset();
    onOpenChange(false);
  };

  if (!visa) return null;

  const totalPrice = visa.price * fields.length;

  return (
    <>
    <BookingCelebration
      show={showCelebration}
      bookingNumber={bookingResult?.number || ""}
      title={`${visa.country} - ${visa.visa_type}`}
      totalAmount={totalPrice}
      type="visa"
      summaryItems={[
        { label: "Country", value: visa.country },
        { label: "Visa Type", value: visa.visa_type },
        { label: "Processing", value: `${visa.processing_days} days` },
        { label: "Applicants", value: `${fields.length}` },
      ]}
      onClose={() => { setShowCelebration(false); handleClose(); }}
    />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-0 overflow-hidden">
        {step === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] h-screen">
            {/* LEFT: Form */}
            <div className="flex flex-col h-screen overflow-hidden">
              <DialogHeader className="px-8 pt-6 pb-4 border-b border-border">
                <DialogTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Apply for Visa
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form
                  id="visa-form"
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
                >
                  {/* Hero Visa Card */}
                  <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                        <Globe className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-tight truncate">
                          {visa.country} — {visa.visa_type}
                        </h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {visa.processing_days} days processing
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {requiredDocs.length} document{requiredDocs.length === 1 ? "" : "s"} required
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-primary leading-none">
                          ${visa.price}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">
                          per applicant
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Required Documents Info */}
                  {requiredDocs.length > 0 ? (
                    <div className="bg-gold/5 border border-gold/20 rounded-xl p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gold" />
                        Required Documents
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {requiredDocs.map((doc, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-gold" />
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-success shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold">No documents required</span>
                        <span className="text-muted-foreground"> — Iraqi passport holders enter visa-free.</span>
                      </div>
                    </div>
                  )}

                  {/* Applicant Counter */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-base">Number of Applicants</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Max 10 per booking</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => fields.length > 1 && remove(fields.length - 1)}
                          disabled={fields.length <= 1}
                          className="h-10 w-10 rounded-lg"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="text-center min-w-[60px]">
                          <span className="text-3xl font-bold text-primary leading-none">{fields.length}</span>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                            {fields.length === 1 ? "applicant" : "applicants"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => append({
                            firstName: "",
                            lastName: "",
                            passportNumber: "",
                            passportExpiry: "",
                            nationality: "",
                            documents: [],
                          })}
                          disabled={fields.length >= 10}
                          className="h-10 w-10 rounded-lg"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <h4 className="text-sm font-semibold uppercase tracking-wide">Contact Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+964 xxx xxx xxxx" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Applicant Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <h4 className="text-sm font-semibold uppercase tracking-wide">Applicant Details</h4>
                    </div>

                    {fields.map((field, index) => {
                      const docCompletion = getApplicantDocCompletion(index);
                      const isComplete = docCompletion.uploaded === docCompletion.total && docCompletion.total > 0;

                      return (
                        <Card key={field.id} className="shadow-sm border-border">
                          <CardHeader className="flex flex-row items-center justify-between py-3 bg-muted/20 border-b border-border">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              Applicant {index + 1}
                              {index === 0 && <span className="text-xs text-muted-foreground font-normal">(Primary)</span>}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {requiredDocs.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className={isComplete
                                    ? "border-success text-success text-xs bg-success/5"
                                    : "text-xs"
                                  }
                                >
                                  {docCompletion.uploaded}/{docCompletion.total} docs
                                </Badge>
                              )}
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive h-8 w-8"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`applicants.${index}.firstName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name (as in passport)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="John" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`applicants.${index}.lastName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Surname (as in passport)</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`applicants.${index}.passportNumber`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passport Number</FormLabel>
                                    <FormControl>
                                      <Input placeholder="A12345678" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`applicants.${index}.nationality`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nationality</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Iraqi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name={`applicants.${index}.passportExpiry`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Passport Expiry Date</FormLabel>
                                  <FormControl>
                                    <DateInput value={field.value || ""} onValueChange={field.onChange} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Document Uploads */}
                            {requiredDocs.length > 0 && (
                              <div className="space-y-3 pt-3 border-t border-border">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                  <Upload className="h-4 w-4 text-primary" />
                                  Required Documents
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {requiredDocs.map((docName) => {
                                    const uploadKey = `${index}-${docName}`;
                                    const isUploading = uploadingState?.applicantIndex === index && uploadingState?.docName === docName;
                                    const uploadedDoc = getUploadedDoc(index, docName);

                                    return (
                                      <div key={docName} className="space-y-2">
                                        <div className="flex items-center gap-1.5">
                                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="text-sm font-medium">{docName}</span>
                                          <span className="text-destructive text-xs">*</span>
                                        </div>
                                        <input
                                          ref={(el) => (fileInputRefs.current[uploadKey] = el)}
                                          type="file"
                                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileUpload(index, docName, file);
                                          }}
                                        />

                                        {uploadedDoc?.documentUrl ? (
                                          <div className="flex items-center justify-between bg-success/10 rounded-lg p-2.5 border border-success/20">
                                            <div className="flex items-center gap-2">
                                              <CheckCircle className="h-4 w-4 text-success" />
                                              <span className="text-xs text-success font-medium">Uploaded</span>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                              onClick={() => removeDocument(index, docName)}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => fileInputRefs.current[uploadKey]?.click()}
                                            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                          >
                                            {isUploading ? (
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-center gap-2">
                                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                  <span className="text-xs text-muted-foreground">{uploadProgress}%</span>
                                                </div>
                                                <Progress value={uploadProgress} className="h-1" />
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-center gap-2">
                                                <Upload className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Upload {docName}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              {/* Sticky footer */}
              <div className="border-t border-border bg-background/95 backdrop-blur px-8 py-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="visa-form"
                  variant="navy"
                  disabled={createBooking.isPending}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Application
                </Button>
              </div>
            </div>

            {/* RIGHT: Summary sidebar */}
            <aside className="hidden lg:flex flex-col bg-muted/20 border-l border-border h-screen sticky top-0 overflow-y-auto">
              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/60">
                <img
                  src={`https://source.unsplash.com/640x320/?${encodeURIComponent(visa.country)},travel,landmark`}
                  alt={visa.country}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
                <div className="absolute top-3 right-3">
                  {(() => {
                    const flag = getCountryFlagUrl(visa.country, 80);
                    return flag ? (
                      <img
                        src={flag}
                        alt={`${visa.country} flag`}
                        className="h-8 w-12 object-cover rounded shadow-md ring-1 ring-white/30"
                      />
                    ) : null;
                  })()}
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-bold text-lg text-primary-foreground line-clamp-1 drop-shadow">{visa.country}</h3>
                  <p className="text-xs text-primary-foreground/90 drop-shadow">{visa.visa_type}</p>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Application Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" /> Processing
                      </span>
                      <span className="font-medium">{visa.processing_days} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" /> Documents
                      </span>
                      <span className="font-medium">{requiredDocs.length} required</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" /> Applicants
                      </span>
                      <span className="font-medium">{fields.length}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Fee per applicant</span>
                    <span>${visa.price}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>× Applicants</span>
                    <span>{fields.length}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-border">
                    <span className="text-sm font-semibold">Total Fee</span>
                    <span className="text-2xl font-bold text-primary">${totalPrice}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Secure submission. Documents encrypted in transit and stored privately.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : step === "payment" ? (
          <div className="px-8 py-6 overflow-y-auto h-screen">
            <BookingPaymentStep
              bookingId={bookingResult?.id || ""}
              totalAmount={totalPrice}
              bookingNumber={bookingResult?.number || ""}
              onPaymentComplete={() => {
                setShowCelebration(true);
                setStep("voucher");
              }}
            />
          </div>
        ) : (
          <div className="px-8 py-6 overflow-y-auto h-screen">
            <UniversalVoucher
              details={{
                type: "visa",
                bookingId: bookingResult?.id || "",
                bookingNumber: bookingResult?.number || "",
                serviceName: `${visa.country} ${visa.visa_type}`,
                totalAmount: totalPrice,
                passengerCount: fields.length,
                passengerNames: bookingResult?.formData.applicants.map(
                  a => `${a.firstName} ${a.lastName}`
                ) || [],
                contactEmail: bookingResult?.formData.contactEmail,
                contactPhone: bookingResult?.formData.contactPhone,
                visaCountry: visa.country,
                visaType: visa.visa_type,
                processingDays: visa.processing_days,
                status: "pending",
              }}
              onClose={handleClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
