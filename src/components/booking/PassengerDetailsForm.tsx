import { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, User, Upload, FileText, X, Minus, Loader2, CheckCircle, AlertCircle, CreditCard, Heart, Image, FileCheck, CalendarIcon, Bed, Building2 } from "lucide-react";

const toTitleCase = (str: string) =>
  str.replace(/\b\w/g, c => c.toUpperCase()).replace(/(?<=\b\w)\w*/g, m => m.toLowerCase()).replace(/\s+/g, ' ');
import { format, addMonths, differenceInYears, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentRequirement {
  id: string;
  name: string;
  description?: string;
  icon: string;
  required: boolean;
}

const createPassengerSchema = (requiredDocuments: DocumentRequirement[]) => {
  return z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    passportNumber: z.string().optional(),
    passportExpiry: z.string().optional(),
    documents: z.array(z.object({
      documentId: z.string(),
      documentName: z.string(),
      documentUrl: z.string(),
    })).optional(),
  });
};

const createFormSchema = (requiredDocuments: DocumentRequirement[]) => z.object({
  passengers: z.array(createPassengerSchema(requiredDocuments)).min(1, "At least one passenger is required"),
  specialRequests: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  agencyName: z.string().optional(),
  agentName: z.string().optional(),
  agencyPhone: z.string().optional(),
  agencyEmail: z.string().optional(),
});

export type PassengerFormData = z.infer<ReturnType<typeof createFormSchema>>;

interface RoomAssignment {
  roomNumber: number;
  roomType: string;
  bedType?: string;
  guestCount: number;
  adults: number;
  children6to12: number;
  children2to6: number;
  infants: number;
}

interface PassengerDetailsFormProps {
  passengerCount: number;
  onPassengerCountChange?: (count: number) => void;
  onSubmit: (data: PassengerFormData) => void;
  isLoading?: boolean;
  minPassengers?: number;
  maxPassengers?: number;
  showPassengerCounter?: boolean;
  requiredDocuments?: DocumentRequirement[];
  roomAssignments?: RoomAssignment[];
  visaPrice?: number;
  getVisaPriceForGuest?: (guestIndex: number) => number;
  onPassengerVisaChange?: (passengerIndex: number, hasVisa: boolean) => void;
  passengerVisaSelections?: Record<number, boolean>;
  pricePerGuest?: number;
  guestPrices?: Record<number, number>;
  hidePassengerInfo?: boolean;
  hideSpecialRequests?: boolean;
  submitLabel?: string;
  departureDate?: string;
  initialData?: PassengerFormData;
  passengerCategories?: string[];
  hideGuestTotal?: boolean;
}

const getIconComponent = (iconValue: string) => {
  switch (iconValue) {
    case "passport": return FileCheck;
    case "file": return FileText;
    case "id-card": return CreditCard;
    case "medical": return Heart;
    case "photo": return Image;
    default: return FileText;
  }
};

export function PassengerDetailsForm({
  passengerCount,
  onPassengerCountChange,
  onSubmit,
  isLoading,
  minPassengers = 1,
  maxPassengers = 20,
  showPassengerCounter = true,
  requiredDocuments = [],
  roomAssignments,
  visaPrice,
  getVisaPriceForGuest,
  onPassengerVisaChange,
  passengerVisaSelections = {},
  pricePerGuest,
  guestPrices,
  hidePassengerInfo = false,
  hideSpecialRequests = false,
  submitLabel = "Confirm Booking",
  departureDate,
  initialData,
  passengerCategories,
  hideGuestTotal = false,
}: PassengerDetailsFormProps) {
  const [uploadingState, setUploadingState] = useState<{ passengerIndex: number; docId: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Passport number is always required now
  const formSchema = createFormSchema(requiredDocuments);

  const form = useForm<PassengerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      passengers: Array.from({ length: passengerCount }, () => ({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        passportNumber: "",
        passportExpiry: "",
        documents: [],
      })),
      specialRequests: "",
      contactEmail: "",
      contactPhone: "",
      agencyName: "",
      agentName: "",
      agencyPhone: "",
      agencyEmail: "",
    },
    mode: "onChange",
  });

  // Auto-fill agency & contact info from logged-in user's profile
  useEffect(() => {
    const fetchAgencyInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", user.id)
          .single();

        // Fetch agency
        const { data: agency } = await supabase
          .from("agencies")
          .select("agency_name, contact_email, contact_phone, contact_person_name")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          if (profile.email && !form.getValues("contactEmail")) {
            form.setValue("contactEmail", profile.email);
          }
          if (profile.phone && !form.getValues("contactPhone")) {
            form.setValue("contactPhone", profile.phone);
          }
          // Auto-fill first passenger name from profile
          if (profile.full_name && !form.getValues("passengers.0.firstName")) {
            const nameParts = profile.full_name.trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";
            form.setValue("passengers.0.firstName", firstName);
            if (lastName && !form.getValues("passengers.0.lastName")) {
              form.setValue("passengers.0.lastName", lastName);
            }
          }
        }

        if (agency) {
          if (agency.agency_name && !form.getValues("agencyName")) {
            form.setValue("agencyName", agency.agency_name);
          }
          if (agency.contact_person_name && !form.getValues("agentName")) {
            form.setValue("agentName", agency.contact_person_name);
          }
          if (agency.contact_phone && !form.getValues("agencyPhone")) {
            form.setValue("agencyPhone", agency.contact_phone);
          }
          if (agency.contact_email && !form.getValues("agencyEmail")) {
            form.setValue("agencyEmail", agency.contact_email);
          }
          // Also fill contact fields from agency if profile didn't have them
          if (agency.contact_email && !form.getValues("contactEmail")) {
            form.setValue("contactEmail", agency.contact_email);
          }
          if (agency.contact_phone && !form.getValues("contactPhone")) {
            form.setValue("contactPhone", agency.contact_phone);
          }
        }
      } catch (error) {
        console.error("Failed to fetch agency info:", error);
      }
    };

    fetchAgencyInfo();
  }, []);

  const watchedValues = useWatch({ control: form.control });
  const formState = form.formState;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });

  // Sync fields array with passengerCount changes (e.g. from GuestRoomSelector)
  // Preserve scroll position to prevent jumping when guests change in sidebar
  useEffect(() => {
    const currentCount = fields.length;
    if (passengerCount === currentCount) return;
    
    const scrollY = window.scrollY;
    
    if (passengerCount > currentCount) {
      for (let i = 0; i < passengerCount - currentCount; i++) {
        append({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          passportNumber: "",
          passportExpiry: "",
          documents: [],
        });
      }
    } else if (passengerCount < currentCount) {
      for (let i = currentCount - 1; i >= passengerCount; i--) {
        remove(i);
      }
    }
    
    // Aggressively restore scroll position across multiple frames
    const restore = () => window.scrollTo(0, scrollY);
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }, [passengerCount]);

  // Calculate form completion
  const calculateCompletion = () => {
    if (!watchedValues.passengers) return 0;
    
    const requiredDocsCount = requiredDocuments.filter(d => d.required).length;
    const baseFieldsPerPassenger = 5; // firstName, lastName, dob, passportNumber, passportExpiry
    const totalFields = 
      (watchedValues.passengers.length * (baseFieldsPerPassenger + requiredDocsCount));
    
    let filledFields = 0;
    
    watchedValues.passengers.forEach((passenger: any) => {
      if (passenger?.firstName) filledFields++;
      if (passenger?.lastName) filledFields++;
      if (passenger?.dateOfBirth) filledFields++;
      if (passenger?.passportNumber) filledFields++;
      if (passenger?.passportExpiry) filledFields++;
      
      // Count uploaded documents
      requiredDocuments.filter(d => d.required).forEach(doc => {
        const uploaded = passenger?.documents?.find((d: any) => d.documentId === doc.id);
        if (uploaded?.documentUrl) filledFields++;
      });
    });
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const getPassengerCompletion = (index: number) => {
    const passenger = watchedValues.passengers?.[index];
    if (!passenger) return { filled: 0, total: 5, complete: false };
    
    const requiredDocsCount = requiredDocuments.filter(d => d.required).length;
    const total = 5 + requiredDocsCount;
    
    let filled = 0;
    if (passenger.firstName) filled++;
    if (passenger.lastName) filled++;
    if (passenger.dateOfBirth) filled++;
    if (passenger.passportNumber) filled++;
    if (passenger.passportExpiry) filled++;
    
    requiredDocuments.filter(d => d.required).forEach(doc => {
      const uploaded = passenger?.documents?.find((d: any) => d.documentId === doc.id);
      if (uploaded?.documentUrl) filled++;
    });
    
    return { filled, total, complete: filled === total };
  };

  const completionPercentage = calculateCompletion();

  const handleFileUpload = async (passengerIndex: number, docId: string, docName: string, file: File) => {
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

    setUploadingState({ passengerIndex, docId });
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-passenger-${passengerIndex}-${docId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('passenger-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Update passenger documents
      const currentDocs = form.getValues(`passengers.${passengerIndex}.documents`) || [];
      const existingIndex = currentDocs.findIndex((d: any) => d.documentId === docId);
      
      if (existingIndex >= 0) {
        currentDocs[existingIndex] = { documentId: docId, documentName: docName, documentUrl: fileName };
      } else {
        currentDocs.push({ documentId: docId, documentName: docName, documentUrl: fileName });
      }
      
      form.setValue(`passengers.${passengerIndex}.documents`, currentDocs, { shouldValidate: true });
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

  const removeDocument = (passengerIndex: number, docId: string) => {
    const currentDocs = form.getValues(`passengers.${passengerIndex}.documents`) || [];
    const updated = currentDocs.filter((d: any) => d.documentId !== docId);
    form.setValue(`passengers.${passengerIndex}.documents`, updated);
  };

  const getUploadedDoc = (passengerIndex: number, docId: string) => {
    const docs = watchedValues.passengers?.[passengerIndex]?.documents || [];
    return docs.find((d: any) => d.documentId === docId);
  };

  const decreasePassengers = () => {
    if (fields.length > minPassengers) {
      remove(fields.length - 1);
      onPassengerCountChange?.(fields.length - 1);
    }
  };

  const increasePassengers = () => {
    if (fields.length < maxPassengers) {
      append({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        passportNumber: "",
        passportExpiry: "",
        documents: [],
      });
      onPassengerCountChange?.(fields.length + 1);
    }
  };

  const renderDocumentUpload = (passengerIndex: number, doc: DocumentRequirement, compact = false) => {
    const uploadKey = `${passengerIndex}-${doc.id}`;
    const isUploading = uploadingState?.passengerIndex === passengerIndex && uploadingState?.docId === doc.id;
    const uploadedDoc = getUploadedDoc(passengerIndex, doc.id);
    const IconComponent = getIconComponent(doc.icon);

    if (compact) {
      return (
        <div key={doc.id} className="space-y-1">
          <div className="flex items-center gap-1.5">
            <IconComponent className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium">{doc.name}</span>
            {doc.required && <span className="text-destructive text-xs">*</span>}
          </div>
          <input
            ref={(el) => (fileInputRefs.current[uploadKey] = el)}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(passengerIndex, doc.id, doc.name, file);
            }}
          />
          {uploadedDoc?.documentUrl ? (
            <div className="flex items-center justify-between bg-success/10 rounded-lg p-2">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-success" />
                <span className="text-xs text-success font-medium">Uploaded</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removeDocument(passengerIndex, doc.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => fileInputRefs.current[uploadKey]?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Upload
            </Button>
          )}
        </div>
      );
    }

    return (
      <div key={doc.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
          <FormLabel className="mb-0">
            {doc.name}
            {doc.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
        </div>
        {doc.description && (
          <p className="text-xs text-muted-foreground">{doc.description}</p>
        )}
        <input
          ref={(el) => (fileInputRefs.current[uploadKey] = el)}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(passengerIndex, doc.id, doc.name, file);
          }}
        />
        
        {uploadedDoc?.documentUrl ? (
          <div className="flex items-center justify-between bg-success/10 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-success" />
              <span className="text-sm text-success font-medium">Document uploaded</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => removeDocument(passengerIndex, doc.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRefs.current[uploadKey]?.click()}
            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {isUploading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">
                  Click to upload {doc.name.toLowerCase()} (JPG, PNG, PDF)
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">Max 5MB</p>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to get guest type label based on room assignments
  const getGuestTypeLabel = (globalIndex: number): { type: string; roomName: string } => {
    if (!roomAssignments || roomAssignments.length === 0) {
      return { type: "Adult", roomName: "" };
    }
    let cursor = 0;
    for (const room of roomAssignments) {
      const adultEnd = cursor + room.adults;
      const child612End = adultEnd + room.children6to12;
      const child26End = child612End + room.children2to6;
      const infantEnd = child26End + room.infants;
      if (globalIndex < adultEnd) {
        return { type: "Adult (12+)", roomName: `Room ${room.roomNumber}` };
      }
      if (globalIndex < child612End) {
        return { type: "Child (2-12)", roomName: `Room ${room.roomNumber}` };
      }
      if (globalIndex < child26End) {
        return { type: "Child (2-6)", roomName: `Room ${room.roomNumber}` };
      }
      if (globalIndex < infantEnd) {
        return { type: "Infant", roomName: `Room ${room.roomNumber}` };
      }
      cursor = infantEnd;
    }
    return { type: "Adult", roomName: "" };
  };

  // Auto-detect age category from DOB.
  // Falls back to today's date if no departureDate is provided so the
  // Adult/Child/Infant badge still appears for hotel-only bookings.
  const getAutoCategory = (dob: string | undefined): string | null => {
    if (!dob) return null;
    try {
      const dobDate = parseISO(dob);
      const refDate = departureDate ? parseISO(departureDate) : new Date();
      const age = differenceInYears(refDate, dobDate);
      if (isNaN(age)) return null;
      if (age >= 12) return "Adult";
      if (age >= 2) return "Child";
      return "Infant";
    } catch { return null; }
  };

  // Check passport expiry validity
  const getPassportExpiryWarning = (expiry: string | undefined): { type: 'expired' | 'less6months' | null; message: string } => {
    if (!expiry) return { type: null, message: "" };
    try {
      const expiryDate = parseISO(expiry);
      const now = new Date();
      if (expiryDate < now) {
        return { type: 'expired', message: "⚠ Passport is expired! Please renew before travel." };
      }
      // Check against departure date first, otherwise against today
      const referenceDate = departureDate ? parseISO(departureDate) : now;
      const minExpiry = addMonths(referenceDate, 6);
      if (expiryDate < minExpiry) {
        return { type: 'less6months', message: `⚠ Passport expires on ${format(expiryDate, 'dd/MM/yyyy')} — must be valid for at least 6 months after ${departureDate ? format(parseISO(departureDate), 'dd/MM/yyyy') : 'today'}.` };
      }
    } catch {}
    return { type: null, message: "" };
  };

  // Check if DOB matches expected category for a given passenger index
  const getDobCategoryMismatch = (dob: string | undefined, index: number): string | null => {
    if (!dob) return null;
    const detectedCat = getAutoCategory(dob);
    if (!detectedCat) return null;
    
    // For flight-only (no room assignments), check infant category from passengerCategories
    if (!roomAssignments || roomAssignments.length === 0) {
      const presetCat = passengerCategories?.[index];
      if (presetCat === "Infant" && detectedCat !== "Infant") {
        return `This passenger is detected as "${detectedCat}" but must be an Infant (under 2 years). Please enter a valid infant date of birth.`;
      }
      return null;
    }
    
    const expected = getGuestTypeLabel(index);
    const expectedType = expected.type;
    if (expectedType.includes("Adult") && detectedCat !== "Adult") {
      return `This passenger is detected as "${detectedCat}" but assigned as Adult. Please correct the date of birth or guest assignment.`;
    }
    if (expectedType.includes("Child") && detectedCat !== "Child") {
      return `This passenger is detected as "${detectedCat}" but assigned as Child. Please correct the date of birth or guest assignment.`;
    }
    if (expectedType.includes("Infant") && detectedCat !== "Infant") {
      return `This passenger is detected as "${detectedCat}" but assigned as Infant. Please correct the date of birth or guest assignment.`;
    }
    return null;
  };

  // Aggregate validation issues across all passengers — used to render
  // a prominent banner at the top of the form and badges per room/guest.
  type IssueKind = "expired" | "less6months" | "dob_mismatch";
  interface PassengerIssue {
    passengerIndex: number;
    guestLabel: string;
    roomNumber?: number;
    kinds: IssueKind[];
  }

  const passengerIssues: PassengerIssue[] = [];
  const issueCountByRoom: Record<number, number> = {};
  (watchedValues.passengers || []).forEach((p, idx) => {
    const expiryWarn = getPassportExpiryWarning(p?.passportExpiry);
    const dobMismatch = getDobCategoryMismatch(p?.dateOfBirth, idx);
    const kinds: IssueKind[] = [];
    if (expiryWarn.type) kinds.push(expiryWarn.type);
    if (dobMismatch) kinds.push("dob_mismatch");
    if (kinds.length === 0) return;

    const guestInfo = getGuestTypeLabel(idx);
    let roomNumber: number | undefined;
    if (roomAssignments && roomAssignments.length > 0) {
      let cursor = 0;
      for (const room of roomAssignments) {
        if (idx < cursor + room.guestCount) {
          roomNumber = room.roomNumber;
          break;
        }
        cursor += room.guestCount;
      }
    }
    if (roomNumber !== undefined) {
      issueCountByRoom[roomNumber] = (issueCountByRoom[roomNumber] || 0) + 1;
    }
    passengerIssues.push({
      passengerIndex: idx,
      guestLabel: `${guestInfo.type.replace(/\s*\(.*\)/, "")} ${idx + 1}`,
      roomNumber,
      kinds,
    });
  });

  const expiredCount = passengerIssues.filter((i) => i.kinds.includes("expired")).length;
  const less6Count = passengerIssues.filter((i) => i.kinds.includes("less6months")).length;
  const mismatchCount = passengerIssues.filter((i) => i.kinds.includes("dob_mismatch")).length;
  const hasIssues = passengerIssues.length > 0;

  // Custom validation before submit — hard-blocks on expired passports,
  // passports expiring within 6 months of travel, and DOB/category mismatches.
  const handleValidatedSubmit = (data: PassengerFormData) => {
    let hasError = false;

    data.passengers.forEach((passenger, index) => {
      const guestInfo = getGuestTypeLabel(index);

      // --- Passport expiry checks ---
      if (passenger.passportExpiry) {
        const expiry = parseISO(passenger.passportExpiry);
        const now = new Date();
        if (expiry < now) {
          form.setError(`passengers.${index}.passportExpiry`, {
            type: "manual",
            message: "Passport is expired! Please renew before travel.",
          });
          hasError = true;
        } else if (departureDate) {
          const depDate = parseISO(departureDate);
          const minExpiry = addMonths(depDate, 6);
          if (expiry < minExpiry) {
            form.setError(`passengers.${index}.passportExpiry`, {
              type: "manual",
              message: "Passport must be valid for at least 6 months after departure date",
            });
            hasError = true;
          }
        }
      }

      // --- DOB / category checks ---
      // Use the same helper that powers the on-screen badges so the
      // submit guard is always consistent with what the user sees.
      const mismatch = getDobCategoryMismatch(passenger.dateOfBirth, index);
      if (mismatch) {
        form.setError(`passengers.${index}.dateOfBirth`, {
          type: "manual",
          message: mismatch,
        });
        hasError = true;
      }

      // Extra age-band check when departureDate is known
      if (passenger.dateOfBirth && departureDate) {
        const dob = parseISO(passenger.dateOfBirth);
        const depDate = parseISO(departureDate);
        const ageAtDeparture = differenceInYears(depDate, dob);
        const expectedType = guestInfo.type;

        let ageError = "";
        if (expectedType === "Adult (12+)" && ageAtDeparture < 12) {
          ageError = `This guest is ${ageAtDeparture} years old at departure — too young for Adult (12+)`;
        } else if (expectedType === "Child (2-12)" && (ageAtDeparture < 2 || ageAtDeparture >= 12)) {
          ageError = `This guest is ${ageAtDeparture} years old at departure — does not match Child (2-12)`;
        } else if (expectedType === "Child (2-6)" && (ageAtDeparture < 2 || ageAtDeparture >= 6)) {
          ageError = `This guest is ${ageAtDeparture} years old at departure — does not match Child (2-6)`;
        } else if (expectedType.includes("Infant") && ageAtDeparture >= 2) {
          ageError = `This guest is ${ageAtDeparture} years old at departure — too old for Infant (Under 2)`;
        }

        if (!ageError && passengerCategories?.[index] === "Infant" && ageAtDeparture >= 2) {
          ageError = `This passenger must be an Infant (under 2 years old). Detected age: ${ageAtDeparture} years.`;
        }

        if (ageError) {
          form.setError(`passengers.${index}.dateOfBirth`, {
            type: "manual",
            message: ageError,
          });
          hasError = true;
        }
      }
    });

    // Final guard — if the aggregated banner shows any issue, block submit.
    if (hasError || hasIssues) {
      toast.error(
        expiredCount > 0
          ? `Cannot continue — ${expiredCount} passenger(s) have expired or invalid passports.`
          : "Please fix the highlighted issues before continuing"
      );
      // Scroll the banner into view
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValidatedSubmit)} className="space-y-6">
        {/* Header — "Guest Information" with progress */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Guest Information</h2>
            <p className="text-sm text-muted-foreground mt-1">Provide document details for all travelers.</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progress</span>
              <span className="text-sm font-bold text-primary">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-1.5 w-28" />
          </div>
        </div>

        {/* Top aggregated banner removed — issues are surfaced via the
            per-room badges and inline field warnings instead. */}
        {showPassengerCounter && (
          <Card className="shadow-card bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Group Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={decreasePassengers}
                  disabled={fields.length <= minPassengers}
                  className="h-12 w-12 rounded-xl"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary">{fields.length}</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fields.length === 1 ? "passenger" : "passengers"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={increasePassengers}
                  disabled={fields.length >= maxPassengers}
                  className="h-12 w-12 rounded-xl"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passenger Details */}
        <div className="space-y-6">
          {roomAssignments && roomAssignments.length > 0 ? (
            <>
            {roomAssignments.map((room, roomIndex) => {
              const startIndex = roomAssignments.slice(0, roomIndex).reduce((sum, r) => sum + r.guestCount, 0);
              const roomPassengers = fields.slice(startIndex, startIndex + room.guestCount);
              
              return (
                <div key={roomIndex} className="space-y-4">
                  {/* Room Header Banner */}
                  <div className={cn(
                    "flex items-center gap-3 px-5 py-3 rounded-xl border transition-colors",
                    issueCountByRoom[room.roomNumber] > 0
                      ? "bg-destructive/10 border-destructive/40"
                      : "bg-muted/60 border-border",
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center border shadow-sm",
                      issueCountByRoom[room.roomNumber] > 0
                        ? "bg-destructive/15 border-destructive/30"
                        : "bg-card border-border",
                    )}>
                      <Bed className={cn(
                        "h-4 w-4",
                        issueCountByRoom[room.roomNumber] > 0 ? "text-destructive" : "text-muted-foreground",
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                        Room {room.roomNumber} - {room.bedType || 'Double'}
                        {issueCountByRoom[room.roomNumber] > 0 && (
                          <Badge variant="destructive" className="text-[10px] gap-1 h-5">
                            <AlertCircle className="h-3 w-3" />
                            {issueCountByRoom[room.roomNumber]} issue{issueCountByRoom[room.roomNumber] > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {room.guestCount} {room.adults >= 1 ? 'Adult' : ''} Guest{room.guestCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5 bg-card rounded-xl border border-border p-5">
                    {roomPassengers.map((field, idx) => {
                      const actualIndex = startIndex + idx;
                      const passengerStatus = getPassengerCompletion(actualIndex);
                      const guestInfo = getGuestTypeLabel(actualIndex);
                      
                      return (
                        <div key={field.id} className="space-y-4">
                          {/* Guest N Details — with blue left accent */}
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-5 rounded-full bg-primary" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">
                              Guest {idx + 1} Details
                            </h4>
                            {actualIndex === 0 && <Badge variant="secondary" className="text-[10px] px-1.5">Lead</Badge>}
                            <Badge variant="outline" className={`text-[10px] px-1.5 ${guestInfo.type.includes('Child') ? 'border-amber-500/30 text-amber-600' : guestInfo.type.includes('Infant') ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-primary'}`}>
                              {guestInfo.type}
                            </Badge>
                            {visaPrice !== undefined && (
                              <div className="ml-auto flex items-center gap-1.5">
                                <span className={cn("text-[10px] font-medium", passengerVisaSelections[actualIndex] ? "text-emerald-600" : "text-destructive")}>
                                  {passengerVisaSelections[actualIndex] ? "Visa ✓" : `-$${getVisaPriceForGuest ? getVisaPriceForGuest(actualIndex) : visaPrice}`}
                                </span>
                                <Switch
                                  checked={passengerVisaSelections[actualIndex] || false}
                                  onCheckedChange={(checked) => onPassengerVisaChange?.(actualIndex, checked)}
                                  className="scale-[0.65]"
                                />
                              </div>
                            )}
                          </div>

                          {/* 5-column form row */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              <FormField
                                control={form.control}
                                name={`passengers.${actualIndex}.firstName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">First Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Alexander" {...field} onChange={e => field.onChange(toTitleCase(e.target.value))} className="h-10 bg-muted/40 border-border/60" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`passengers.${actualIndex}.lastName`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Surname *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Dupont" {...field} onChange={e => field.onChange(toTitleCase(e.target.value))} className="h-10 bg-muted/40 border-border/60" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`passengers.${actualIndex}.dateOfBirth`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DOB *</FormLabel>
                                    <FormControl>
                                      <DateInput value={field.value || ""} onValueChange={field.onChange} className="h-10 bg-muted/40 border-border/60" />
                                    </FormControl>
                                    <FormMessage />
                                    {(() => {
                                      const dob = watchedValues.passengers?.[actualIndex]?.dateOfBirth;
                                      const cat = getAutoCategory(dob);
                                      const mismatch = getDobCategoryMismatch(dob, actualIndex);
                                      return (
                                        <>
                                          {cat && !mismatch && <p className={`text-[10px] font-semibold mt-0.5 ${cat === 'Adult' ? 'text-primary' : cat === 'Infant' ? 'text-destructive' : 'text-amber-600'}`}>→ {cat}</p>}
                                          {mismatch && (
                                            <div className="mt-1 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5">
                                              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                                              <p className="text-[11px] font-semibold leading-tight text-destructive">{mismatch}</p>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`passengers.${actualIndex}.passportNumber`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Passport No. *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="A00000000" {...field} className="h-10 bg-muted/40 border-border/60" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`passengers.${actualIndex}.passportExpiry`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry *</FormLabel>
                                    <FormControl>
                                      <DateInput value={field.value || ""} onValueChange={field.onChange} className="h-10 bg-muted/40 border-border/60" />
                                    </FormControl>
                                    <FormMessage />
                                    {(() => {
                                      const warning = getPassportExpiryWarning(watchedValues.passengers?.[actualIndex]?.passportExpiry);
                                      if (!warning.type) return null;
                                      const isExpired = warning.type === 'expired';
                                      return (
                                        <div className={cn(
                                          "mt-1 flex items-start gap-1.5 rounded-md border px-2 py-1.5",
                                          isExpired ? "border-destructive/50 bg-destructive/10" : "border-amber-500/50 bg-amber-500/10"
                                        )}>
                                          <AlertCircle className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", isExpired ? "text-destructive" : "text-amber-600")} />
                                          <p className={cn("text-[11px] font-semibold leading-tight", isExpired ? "text-destructive" : "text-amber-700 dark:text-amber-500")}>{warning.message}</p>
                                        </div>
                                      );
                                    })()}
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Required Documentation — card style */}
                            {requiredDocuments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Required Documentation</p>
                                <div className="grid grid-cols-3 gap-3">
                                  {requiredDocuments.map(doc => {
                                    const uploadKey = `${actualIndex}-${doc.id}`;
                                    const isUploadingDoc = uploadingState?.passengerIndex === actualIndex && uploadingState?.docId === doc.id;
                                    const uploadedDoc = getUploadedDoc(actualIndex, doc.id);
                                    const IconComponent = getIconComponent(doc.icon);
                                    return (
                                      <div
                                        key={doc.id}
                                        onClick={() => { if (!uploadedDoc?.documentUrl) fileInputRefs.current[uploadKey]?.click(); }}
                                        className={cn(
                                          "relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                          uploadedDoc?.documentUrl ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-border/60 hover:border-primary/40"
                                        )}
                                      >
                                        <input ref={(el) => (fileInputRefs.current[uploadKey] = el)} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(actualIndex, doc.id, doc.name, file); }} />
                                        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center border border-border shadow-sm shrink-0">
                                          {uploadedDoc?.documentUrl ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : isUploadingDoc ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <IconComponent className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-foreground truncate">{doc.name}{doc.required && ' *'}</p>
                                          <p className="text-[10px] text-primary truncate">{uploadedDoc?.documentUrl ? 'Uploaded ✓' : (doc.description || 'PDF/JPG Max 5MB')}</p>
                                        </div>
                                        {uploadedDoc?.documentUrl && (
                                          <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-5 w-5 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeDocument(actualIndex, doc.id); }}><X className="h-3 w-3" /></Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Guest Total */}
                            {!hideGuestTotal && (() => {
                              const guestPrice = guestPrices?.[actualIndex] ?? pricePerGuest;
                              if (guestPrice === undefined || guestPrice <= 0) return null;
                              const deduction = visaPrice !== undefined && !passengerVisaSelections[actualIndex] ? (getVisaPriceForGuest ? getVisaPriceForGuest(actualIndex) : visaPrice) : 0;
                              return (
                                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Guest Total</span>
                                  <div className="flex items-center gap-2">
                                    {deduction > 0 && <Badge variant="outline" className="text-[10px] px-1.5 border-destructive/30 text-destructive">-${deduction} visa</Badge>}
                                    <span className="text-xl font-bold text-foreground">${(guestPrice - deduction).toFixed(0)}</span>
                                  </div>
                                </div>
                              );
                            })()}

                            {idx < roomPassengers.length - 1 && <div className="border-b border-border/30" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            </>
          ) : (
            // Original layout
            <>
              <h3 className="text-lg font-semibold">Passenger Details</h3>
              <div className="grid grid-cols-1 gap-4">
                {fields.map((field, index) => {
                  const passengerStatus = getPassengerCompletion(index);
                  
                  return (
                    <Card key={field.id} className={`shadow-card ${passengerStatus.complete ? 'ring-1 ring-success/50' : ''}`}>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            passengerStatus.complete ? 'bg-success/10' : 'bg-primary/10'
                          }`}>
                            {passengerStatus.complete ? (
                              <CheckCircle className="h-4 w-4 text-success" />
                            ) : (
                              <User className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          {(() => {
                            const dob = watchedValues.passengers?.[index]?.dateOfBirth;
                            const cat = getAutoCategory(dob);
                            const presetCat = passengerCategories?.[index];
                            const label = cat || presetCat;
                            return label ? `${label} ${index + 1}` : `Passenger ${index + 1}`;
                          })()}
                          {index === 0 && <span className="text-xs text-muted-foreground">(Lead Traveler)</span>}
                          {(() => {
                            const dob = watchedValues.passengers?.[index]?.dateOfBirth;
                            const cat = getAutoCategory(dob);
                            const presetCat = passengerCategories?.[index];
                            const displayCat = cat || presetCat;
                            if (!displayCat) return null;
                            return (
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${displayCat === 'Adult' ? 'border-primary/30 text-primary' : displayCat === 'Infant' ? 'border-destructive/30 text-destructive' : 'border-amber-500/30 text-amber-600'}`}>
                                {displayCat}
                              </Badge>
                            );
                          })()}
                        </CardTitle>
                        {fields.length > minPassengers && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8"
                            onClick={() => {
                              remove(index);
                              onPassengerCountChange?.(fields.length - 1);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`passengers.${index}.firstName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name (as in passport)</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} onChange={e => field.onChange(toTitleCase(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`passengers.${index}.lastName`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Surname (as in passport)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} onChange={e => field.onChange(toTitleCase(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`passengers.${index}.dateOfBirth`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date of Birth</FormLabel>
                                <FormControl>
                                  <DateInput value={field.value || ""} onValueChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                                {(() => {
                                  const dob = watchedValues.passengers?.[index]?.dateOfBirth;
                                  const cat = getAutoCategory(dob);
                                  const mismatch = getDobCategoryMismatch(dob, index);
                                  return (
                                    <>
                                      {cat && !mismatch && <p className={`text-xs font-semibold mt-1 ${cat === 'Adult' ? 'text-primary' : cat === 'Infant' ? 'text-destructive' : 'text-amber-600'}`}>→ Detected: {cat}</p>}
                                      {mismatch && (
                                        <div className="mt-1.5 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2">
                                          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                          <p className="text-xs font-semibold leading-tight text-destructive">{mismatch}</p>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`passengers.${index}.passportNumber`}
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
                            name={`passengers.${index}.passportExpiry`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Passport Expiry</FormLabel>
                                <FormControl>
                                  <DateInput value={field.value || ""} onValueChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                                {(() => {
                                  const warning = getPassportExpiryWarning(watchedValues.passengers?.[index]?.passportExpiry);
                                  if (!warning.type) return null;
                                  const isExpired = warning.type === 'expired';
                                  return (
                                    <div className={cn(
                                      "mt-1.5 flex items-start gap-2 rounded-md border px-2.5 py-2",
                                      isExpired ? "border-destructive/50 bg-destructive/10" : "border-amber-500/50 bg-amber-500/10"
                                    )}>
                                      <AlertCircle className={cn("h-4 w-4 shrink-0 mt-0.5", isExpired ? "text-destructive" : "text-amber-600")} />
                                      <p className={cn("text-xs font-semibold leading-tight", isExpired ? "text-destructive" : "text-amber-700 dark:text-amber-500")}>{warning.message}</p>
                                    </div>
                                  );
                                })()}
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Per-passenger Visa Toggle */}
                        {visaPrice !== undefined && (
                          <div className={cn(
                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                            passengerVisaSelections[index]
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : "bg-destructive/5 border-destructive/20"
                          )}>
                            <div className="flex items-center gap-3">
                              <FileCheck className={cn("h-5 w-5", passengerVisaSelections[index] ? "text-emerald-600" : "text-destructive")} />
                              <div>
                                <p className="font-medium text-sm">{passengerVisaSelections[index] ? "Visa Included" : "No Visa"}</p>
                                <p className="text-xs text-muted-foreground">Included in package price</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!passengerVisaSelections[index] && (
                                <span className="text-sm font-bold text-destructive">-${getVisaPriceForGuest ? getVisaPriceForGuest(index) : visaPrice}</span>
                              )}
                              <Switch
                                checked={passengerVisaSelections[index] || false}
                                onCheckedChange={(checked) => onPassengerVisaChange?.(index, checked)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Document Uploads */}
                        {requiredDocuments.length > 0 && (
                          <div className="grid grid-cols-3 gap-3">
                            <p className="text-sm font-medium text-muted-foreground col-span-3">Required Documents</p>
                            {requiredDocuments.map(doc => renderDocumentUpload(index, doc))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Agency Information */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Agency Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="agencyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agency Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Agency Name" {...field} className="h-10 bg-muted/40 border-border/60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agencyEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agency Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="agent@voyage-editorial.com" {...field} className="h-10 bg-muted/40 border-border/60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Special Requests */}
        {!hideSpecialRequests && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Special Requests</CardTitle>
            <p className="text-xs text-muted-foreground">
              e.g. twin room, king room, separate beds, smoking room.
              Special requests are subject to availability and not guaranteed.
            </p>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Twin room, king room, separate beds, smoking room, dietary requirements..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        )}


        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => window.history.back()} className="text-sm font-semibold text-primary flex items-center gap-1.5 hover:underline">
            ← Previous
          </button>
          <Button 
            type="submit" 
            className="h-12 px-8 rounded-xl text-sm font-bold gap-2" 
            variant="navy" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
