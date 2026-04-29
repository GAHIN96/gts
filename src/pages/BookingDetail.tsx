import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useRef, useState, useEffect } from "react";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useBookingAuditLogs, getChangeDescription } from "@/hooks/useBookingAuditLogs";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plane,
  BedDouble,
  Map,
  FileCheck,
  ArrowLeftRight,
  History,
  Package,
  Mail,
  Phone,
  FileText,
  User,
  Hash,
  Star,
  Globe,
  Route,
  MapPin,
  Sparkles,
  CreditCard,
  Printer,
  Building2,
  Eye,
  DownloadCloud,
  Loader2,
  Image,
  ExternalLink,
  Receipt,
  Banknote,
  ShieldCheck,
  CalendarDays,
  Clipboard,
  MessageCircle,
  ClipboardCheck,
  FileCheck2,
  Banknote as BanknoteIcon,
  ShieldCheck as ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBooking, useUpdateBooking } from "@/hooks/useBookings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePayments, useApprovePayment, useRejectPayment } from "@/hooks/usePayments";
import { useAuth } from "@/contexts/AuthContext";
import { UniversalVoucher, type VoucherDetails, type VoucherType } from "@/components/booking/UniversalVoucher";
import { VoucherPreviewDialog } from "@/components/booking/VoucherPreviewDialog";
import { generatePDFFromElement } from "@/utils/pdfGenerator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string; border: string; glow: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground", icon: Clock, bg: "bg-muted/60", border: "border-muted", glow: "" },
  pending_payment: { label: "Pending Payment", color: "text-gold", icon: AlertCircle, bg: "bg-gold/10", border: "border-gold/30", glow: "shadow-[0_0_12px_hsl(var(--gold)/0.15)]" },
  payment_under_review: { label: "Under Review", color: "text-primary", icon: Clock, bg: "bg-primary/10", border: "border-primary/30", glow: "shadow-[0_0_12px_hsl(var(--primary)/0.15)]" },
  confirmed: { label: "Confirmed", color: "text-success", icon: CheckCircle, bg: "bg-success/10", border: "border-success/30", glow: "shadow-[0_0_12px_hsl(var(--success)/0.15)]" },
  canceled: { label: "Canceled", color: "text-destructive", icon: XCircle, bg: "bg-destructive/10", border: "border-destructive/30", glow: "" },
  refunded: { label: "Refunded", color: "text-muted-foreground", icon: DollarSign, bg: "bg-muted/60", border: "border-muted", glow: "" },
};

const bookingTypeConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  package: { label: "Package", icon: Package, gradient: "from-primary to-navy-light" },
  flight: { label: "Flight", icon: Plane, gradient: "from-primary to-navy-light" },
  hotel: { label: "Hotel", icon: BedDouble, gradient: "from-primary to-navy-light" },
  tour: { label: "Tour", icon: Map, gradient: "from-primary to-navy-light" },
  visa: { label: "Visa", icon: FileCheck, gradient: "from-primary to-navy-light" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, gradient: "from-primary to-navy-light" },
};

const paymentMethodLabels: Record<string, string> = {
  qicard: "QiCard",
  first_iraqi_bank: "First Iraqi Bank",
  bank_transfer: "Bank Transfer",
  pay_in_office: "Pay in Office",
  pay_by_transfer: "Pay by Transfer",
  pay_by_card: "Pay by Card",
  rasheed_bank: "Rasheed Bank",
  trade_bank_iraq: "Trade Bank of Iraq (TBI)",
  national_bank_iraq: "National Bank of Iraq",
  kurdistan_intl_bank: "Kurdistan International Bank",
};

const paymentStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  unpaid: { bg: "bg-muted/60", text: "text-muted-foreground", border: "border-muted" },
  proof_uploaded: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/30" },
  approved: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
  rejected: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
  refunded: { bg: "bg-muted/60", text: "text-muted-foreground", border: "border-muted" },
};

// ─── Section Header Component ───
const SectionHeader = ({ icon: Icon, title, iconBg = "bg-primary/10", iconColor = "text-primary", children }: {
  icon: React.ElementType; title: string; iconBg?: string; iconColor?: string; children?: React.ReactNode;
}) => (
  <div className="px-6 py-4 border-b border-border/40 flex items-center gap-3">
    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", iconBg)}>
      <Icon className={cn("h-4.5 w-4.5", iconColor)} />
    </div>
    <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">{title}</h3>
    {children}
  </div>
);

// ─── Detail Row Component ───
const DetailRow = ({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: React.ElementType }) => (
  <div className="space-y-1.5">
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
      <div className="font-semibold text-[13.5px]">{children}</div>
    </div>
  </div>
);

// ─── Change History Component ───
const BookingChangeHistory = ({ bookingId }: { bookingId: string }) => {
  const { data: logs, isLoading } = useBookingAuditLogs(bookingId);

  if (isLoading) return null;
  if (!logs || logs.length === 0) return null;

  const severityStyles = {
    major: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "Major" },
    important: { bg: "bg-gold/10", text: "text-gold", border: "border-gold/20", label: "Important" },
    minor: { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border/30", label: "" },
  };

  return (
    <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
      <CardContent className="p-0">
        <SectionHeader icon={History} title="Change History" iconBg="bg-primary/10" iconColor="text-primary">
          <Badge variant="secondary" className="ml-auto rounded-lg text-xs font-bold px-3">{logs.length}</Badge>
        </SectionHeader>
        <div className="p-4">
          {logs.map((log, idx) => {
            const change = getChangeDescription(log);
            const sev = severityStyles[change.severity];
            const dotColor = change.severity === "major" ? "bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.4)]" 
              : change.severity === "important" ? "bg-gold shadow-[0_0_6px_hsl(var(--gold)/0.4)]" 
              : "bg-muted-foreground/30";
            return (
              <div key={log.id} className="relative flex gap-4 py-3 animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                {/* Timeline connecting line */}
                {idx < logs.length - 1 && (
                  <div className={cn(
                    "absolute left-[17px] top-[42px] bottom-0 w-px",
                    change.severity === "major" ? "bg-gradient-to-b from-destructive/30 to-border/20" 
                    : change.severity === "important" ? "bg-gradient-to-b from-gold/30 to-border/20" 
                    : "bg-border/30"
                  )} />
                )}
                {/* Dot with glow */}
                <div className={cn(
                  "h-[10px] w-[10px] rounded-full mt-1.5 shrink-0 ring-4 ring-background z-10 transition-all",
                  dotColor
                )} />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{change.changeType}</span>
                    {sev.label && (
                      <Badge className={cn("text-[9px] font-bold rounded-md px-1.5 py-0 h-4 border", sev.bg, sev.text, sev.border)}>
                        {sev.label}
                      </Badge>
                    )}
                  </div>
                  {change.before !== "-" && change.after !== "-" && (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="bg-destructive/8 text-destructive/80 px-2 py-0.5 rounded-md font-medium line-through">{change.before}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="bg-success/8 text-success px-2 py-0.5 rounded-md font-medium">{change.after}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{format(new Date(log.created_at), "dd MMM yyyy • HH:mm")}</span>
                    {log.user_email && <span className="font-medium">{log.user_email}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: booking, isLoading } = useBooking(id || "");
  const { settings: companySettings } = useCompanySettings();
  const { data: payments } = usePayments();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  const updateBooking = useUpdateBooking();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const voucherRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSendingVoucher, setIsSendingVoucher] = useState(false);

  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [docPreviewType, setDocPreviewType] = useState<"image" | "pdf">("image");
  const [loadingDocIndex, setLoadingDocIndex] = useState<number | null>(null);
  const [downloadingDocIndex, setDownloadingDocIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const [proofPreviewOpen, setProofPreviewOpen] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofPreviewType, setProofPreviewType] = useState<"image" | "pdf">("image");
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Passenger checklist state from metadata
  const [passengerChecks, setPassengerChecks] = useState<Record<number, { documents: boolean; payment: boolean; visa: boolean }>>({});

  // Threaded comments
  const [comments, setComments] = useState<Array<{ text: string; author: string; email: string; timestamp: string }>>([]);
  const [newComment, setNewComment] = useState("");

  const handleViewProof = async (proofUrl: string, paymentId: string) => {
    setLoadingProofId(paymentId);
    try {
      const match = proofUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, path] = match;
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
        if (!error && data?.signedUrl) {
          const isPdf = path.toLowerCase().endsWith('.pdf');
          setProofPreviewType(isPdf ? "pdf" : "image");
          setProofPreviewUrl(data.signedUrl);
          setProofPreviewOpen(true);
        } else {
          window.open(proofUrl, '_blank');
        }
      } else {
        window.open(proofUrl, '_blank');
      }
    } catch {
      toast.error("Failed to load payment proof");
    } finally {
      setLoadingProofId(null);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      await approvePayment.mutateAsync(paymentId);
      toast.success("Payment approved and booking confirmed");
    } catch {
      toast.error("Failed to approve payment");
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectingPaymentId) return;
    try {
      await rejectPayment.mutateAsync({ id: rejectingPaymentId, reason: rejectionReason });
      toast.success("Payment rejected");
      setRejectDialogOpen(false);
      setRejectingPaymentId(null);
      setRejectionReason("");
    } catch {
      toast.error("Failed to reject payment");
    }
  };


  const isAdmin = role === "admin";
  const isFinance = role === "finance";
  const canManage = isAdmin || isFinance;
  const backPath = canManage ? "/bookings" : "/booking-history";

  // Filter payments for this booking
  const bookingPayments = payments?.filter(p => p.booking_id === id) || [];

  useEffect(() => {
    const fetchAgency = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("agencies").select("agency_name").eq("user_id", user.id).maybeSingle();
      if (data) setAgencyName(data.agency_name);
    };
    fetchAgency();
  }, []);

  // Load passenger checklist from metadata
  useEffect(() => {
    if (!booking) return;
    const meta = booking.metadata as any;
    if (meta?.passengerChecks) {
      setPassengerChecks(meta.passengerChecks);
    }
    if (meta?.comments && Array.isArray(meta.comments)) {
      setComments(meta.comments);
    }
  }, [booking]);

  const savePassengerCheck = async (pIdx: number, field: "documents" | "payment" | "visa", value: boolean) => {
    if (!booking) return;
    const updated = { ...passengerChecks };
    if (!updated[pIdx]) updated[pIdx] = { documents: false, payment: false, visa: false };
    updated[pIdx][field] = value;
    setPassengerChecks(updated);
    const existingMeta = (booking.metadata as any) || {};
    try {
      await updateBooking.mutateAsync({ id: booking.id, metadata: { ...existingMeta, passengerChecks: updated } as any });
    } catch { toast.error("Failed to save checklist"); }
  };

  const handlePostComment = async () => {
    if (!booking || !newComment.trim()) return;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const comment = {
      text: newComment.trim(),
      author: currentUser?.user_metadata?.full_name || role || "User",
      email: currentUser?.email || "",
      timestamp: new Date().toISOString(),
    };
    const updatedComments = [...comments, comment];
    const existingMeta = (booking.metadata as any) || {};
    try {
      await updateBooking.mutateAsync({ id: booking.id, metadata: { ...existingMeta, comments: updatedComments } as any });
      setComments(updatedComments);
      setNewComment("");
      toast.success("Comment added");
    } catch { toast.error("Failed to add comment"); }
  };

  const handleSendVoucherEmail = async () => {
    if (!booking) return;
    setIsSendingEmail(true);
    try {
      const email = booking.profiles?.email;
      if (!email) { toast.error("No email found"); setIsSendingEmail(false); return; }
      await supabase.functions.invoke("send-voucher-email", {
        body: {
          recipientEmail: email,
          recipientName: booking.profiles?.full_name || "Valued Customer",
          bookingNumber: booking.booking_number,
          serviceName: booking.package_departures?.group_packages?.name || booking.flights?.airline || booking.hotels?.name || booking.tours?.name || booking.booking_type,
          destination: booking.package_departures?.group_packages?.cities?.name || booking.hotels?.cities?.name || booking.tours?.cities?.name || booking.visas?.country,
          passengers: booking.passengers,
          totalAmount: booking.total_amount,
          bookingType: booking.booking_type,
        },
      });
      toast.success("Voucher email sent to " + email);
    } catch {
      toast.error("Failed to send voucher email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // ─── Document Helpers ───
  // Helper to get all document URLs for a passenger (supports both legacy documentUrl and new documents array)
  const getPassengerDocs = (p: any): Array<{ name: string; url: string }> => {
    const docs: Array<{ name: string; url: string }> = [];
    if (p.documentUrl) {
      docs.push({ name: "Document", url: p.documentUrl });
    }
    if (Array.isArray(p.documents)) {
      p.documents.forEach((d: any) => {
        if (d.documentUrl) {
          docs.push({ name: d.documentName || d.documentId || "Document", url: d.documentUrl });
        }
      });
    }
    return docs;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from('passenger-documents').createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch {
      toast.error("Failed to access document");
      return null;
    }
  };

  const handleViewDoc = async (documentUrl: string, index: number) => {
    setLoadingDocIndex(index);
    const signedUrl = await getSignedUrl(documentUrl);
    if (signedUrl) {
      setDocPreviewType(documentUrl.toLowerCase().endsWith('.pdf') ? "pdf" : "image");
      setDocPreviewUrl(signedUrl);
      setDocPreviewOpen(true);
    }
    setLoadingDocIndex(null);
  };

  const handleDownloadDoc = async (documentUrl: string, passengerName: string, index: number) => {
    setDownloadingDocIndex(index);
    try {
      const signedUrl = await getSignedUrl(documentUrl);
      if (signedUrl) {
        const fileExt = documentUrl.split('.').pop() || 'pdf';
        const fileName = `${booking?.booking_number}-${passengerName.replace(/\s+/g, '-')}.${fileExt}`;
        const response = await fetch(signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Document downloaded");
      }
    } catch {
      toast.error("Failed to download document");
    } finally {
      setDownloadingDocIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!booking) return;
    const allPassengers = Array.isArray(booking.passenger_details) ? booking.passenger_details as any[] : [];
    setDownloadingAll(true);
    let downloaded = 0;
    for (const p of allPassengers) {
      const docs = getPassengerDocs(p);
      for (const doc of docs) {
        try {
          const signedUrl = await getSignedUrl(doc.url);
          if (signedUrl) {
            const fileExt = doc.url.split('.').pop() || 'pdf';
            const fileName = `${booking.booking_number}-${p.firstName}-${p.lastName}-${doc.name}.${fileExt}`;
            const response = await fetch(signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            downloaded++;
          }
        } catch { /* continue */ }
      }
    }
    toast.success(`Downloaded ${downloaded} document${downloaded > 1 ? 's' : ''}`);
    setDownloadingAll(false);
  };

  // ─── Admin Action Helpers ───
  const sendStatusNotification = async (newStatus: string) => {
    if (!booking) return;
    try {
      const email = booking.profiles?.email;
      if (email) {
        await supabase.functions.invoke("booking-status-notification", {
          body: {
            bookingId: booking.id, newStatus, bookingNumber: booking.booking_number,
            bookingType: booking.booking_type, userEmail: email, totalAmount: booking.total_amount,
          },
        });
      }
    } catch { /* silent */ }
  };

  const sendVoucherEmail = async () => {
    if (!booking) return;
    try {
      const email = booking.profiles?.email;
      if (!email) { toast.error("No email found"); return; }
      const sName = booking.package_departures?.group_packages?.name || booking.flights?.airline || booking.hotels?.name || booking.tours?.name || booking.visas?.country || booking.booking_type;
      const dest = booking.package_departures?.group_packages?.cities?.name || booking.hotels?.cities?.name || booking.tours?.cities?.name || booking.visas?.country;
      await supabase.functions.invoke("payment-notification", {
        body: {
          userEmail: email, userName: booking.profiles?.full_name || "Valued Customer", status: "approved",
          bookingNumber: booking.booking_number, bookingType: booking.booking_type,
          serviceName: sName, destination: dest, passengers: booking.passengers, totalAmount: booking.total_amount,
        },
      });
      toast.success("Voucher sent to " + email);
    } catch {
      toast.error("Failed to send voucher email");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    try {
      await updateBooking.mutateAsync({ id: booking.id, status: newStatus as any });
      await sendStatusNotification(newStatus);
      toast.success("Booking status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleApproveAndSendVoucher = async () => {
    if (!booking) return;
    setIsSendingVoucher(true);
    try {
      await updateBooking.mutateAsync({ id: booking.id, status: "confirmed" as any });
      await sendVoucherEmail();
      toast.success("Booking confirmed and voucher sent!");
      setPreviewOpen(false);
    } catch {
      toast.error("Failed to approve booking");
    } finally {
      setIsSendingVoucher(false);
    }
  };

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-muted-foreground/20" />
        </div>
        <h2 className="text-xl font-bold mb-2">Booking not found</h2>
        <p className="text-muted-foreground text-sm mb-6">This booking may have been removed or doesn't exist</p>
        <Button variant="outline" onClick={() => navigate(backPath)} className="rounded-xl gap-2">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const status = statusConfig[booking.status || "draft"];
  const StatusIcon = status.icon;
  const typeConfig = bookingTypeConfig[booking.booking_type] || bookingTypeConfig.package;
  const TypeIcon = typeConfig.icon;

  let notesData: Record<string, any> | null = null;
  try { if (booking.notes) notesData = JSON.parse(booking.notes); } catch { notesData = null; }

  const passengers = Array.isArray(booking.passenger_details) ? booking.passenger_details as any[] : [];
  
  const passengersWithDocs = passengers.filter(p => getPassengerDocs(p).length > 0);

  const serviceName = notesData?.packageName
    || notesData?.serviceName
    || booking.package_departures?.group_packages?.name
    || booking.flights?.airline
    || booking.hotels?.name
    || booking.tours?.name
    || booking.visas?.country
    || booking.booking_type;

  const destination = notesData?.destination
    || notesData?.arrivalCity
    || booking.package_departures?.group_packages?.cities?.name
    || booking.hotels?.cities?.name
    || booking.tours?.cities?.name
    || booking.visas?.country;

  const buildVoucherDetails = (): VoucherDetails => {
    const getVoucherType = (): VoucherType => {
      const type = booking.booking_type?.toLowerCase();
      if (type === "flight") return "flight";
      if (type === "hotel") return "hotel";
      if (type === "tour") return "tour";
      if (type === "visa") return "visa";
      if (type === "transfer") return "transfer";
      return "package";
    };
    const pkg = booking.package_departures?.group_packages;
    const dep = booking.package_departures;
    const isPackageType = getVoucherType() === "package";

    const voucherBase: any = {
      type: getVoucherType(),
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      serviceName: serviceName || "Booking",
      totalAmount: booking.total_amount,
      passengerCount: booking.passengers || 1,
      passengerNames: passengers.map((p) => `${p.firstName || ''} ${p.lastName || ''}`.trim()).filter(Boolean),
      contactEmail: notesData?.contactEmail,
      contactPhone: notesData?.contactPhone,
      status: "confirmed",
      departureCity: notesData?.departureCity,
      arrivalCity: notesData?.arrivalCity,
      airline: notesData?.airline,
      flightNumber: notesData?.flightNumber,
      departureDate: notesData?.departureDate ? new Date(notesData.departureDate) : undefined,
      returnDate: notesData?.returnDate ? new Date(notesData.returnDate) : undefined,
      hotelName: notesData?.hotelName,
      hotelStars: notesData?.hotelStarRating,
      destination: destination,
      agencyName: agencyName || undefined,
      agencyLogo: booking.agencies?.logo_url || undefined,
    };

    if (isPackageType && pkg) {
      voucherBase.packageDetails = {
        packageName: pkg.name || serviceName || "",
        destination: destination || "",
        nights: (pkg as any).nights || notesData?.nights || 0,
        departureDate: dep?.departure_date || notesData?.departureDate || "",
        returnDate: dep?.return_date || notesData?.returnDate || "",
        fromCity: notesData?.departureCity || "",
        outboundFlight: (dep?.fl_number || notesData?.flightNumber || notesData?.departureCity) ? {
          airline: (pkg as any)?.airline || notesData?.airline || "",
          flightNumber: dep?.fl_number || notesData?.flightNumber || "",
          departureCity: notesData?.departureCity || "",
          arrivalCity: notesData?.arrivalCity || destination || "",
          departureAirportCode: (pkg as any)?.source_airport || null,
          arrivalAirportCode: (pkg as any)?.destination_airport || null,
          departureDate: dep?.departure_date || notesData?.departureDate || "",
          departureTime: dep?.departure_time || null,
          arrivalTime: dep?.dept_arr_time || null,
          baggage: dep?.baggage || notesData?.baggage || "",
        } : undefined,
        returnFlight: (dep?.ret_fl_number || dep?.return_date) ? {
          airline: (pkg as any)?.airline || notesData?.airline || "",
          flightNumber: dep?.ret_fl_number || "",
          departureCity: notesData?.arrivalCity || destination || "",
          arrivalCity: notesData?.departureCity || "",
          departureAirportCode: (pkg as any)?.destination_airport || null,
          arrivalAirportCode: (pkg as any)?.source_airport || null,
          departureDate: dep?.return_date || notesData?.returnDate || "",
          departureTime: dep?.return_time || null,
          arrivalTime: dep?.ret_arr_time || null,
          baggage: dep?.baggage || notesData?.baggage || "",
        } : undefined,
        hotel: notesData?.hotelName ? {
          name: notesData.hotelName,
          starRating: notesData.hotelStarRating || 0,
          checkIn: dep?.departure_date || notesData?.departureDate || "",
          checkOut: dep?.return_date || notesData?.returnDate || "",
          nights: (pkg as any).nights || notesData?.nights || 0,
        } : undefined,
        transfer: (notesData?.guideName || (pkg as any)?.guide_name) ? {
          guideName: notesData?.guideName || (pkg as any)?.guide_name || "",
          phone: notesData?.guidePhone || (pkg as any)?.phone || "",
          gateNumber: notesData?.gateNumber || (pkg as any)?.gate_number || "",
        } : undefined,
        passengers: passengers.map((p: any) => ({
          name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
          passportNumber: p.passportNumber || "",
          birthDate: p.dateOfBirth || p.birthDate || "",
          ageGroup: p.ageGroup || "ADULT",
          roomType: notesData?.roomType || p.roomType || "",
        })),
        groupPolicy: notesData?.groupPolicy || (pkg as any)?.group_policy || "",
      };
    }

    return voucherBase;
  };

  const handleDownloadVoucher = async () => {
    if (!voucherRef.current) return;
    setIsGeneratingPDF(true);
    try {
      await generatePDFFromElement(voucherRef.current, `voucher-${booking.booking_number}.pdf`);
      toast.success("Voucher downloaded");
    } catch { toast.error("Failed to generate voucher"); }
    finally { setIsGeneratingPDF(false); }
  };

  const handlePrintVoucher = () => {
    if (!voucherRef.current) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { toast.error("Please allow popups to print"); return; }
    const voucherHTML = voucherRef.current.innerHTML;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Voucher - ${booking.booking_number}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { background: #fff; display: flex; justify-content: center; font-family: 'Segoe UI', -apple-system, system-ui, sans-serif; } .voucher-container { width: 794px; padding: 24px; background: #fff; } @media print { body { background: #fff; } .voucher-container { padding: 0; } @page { margin: 0.5cm; size: A4; } }</style></head><body><div class="voucher-container">${voucherHTML}</div><script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); };<\/script></body></html>`);
    printWindow.document.close();
  };

  const steps = ["draft", "pending_payment", "payment_under_review", "confirmed"];
  const stepLabels = ["Draft", "Pending Payment", "Under Review", "Confirmed"];
  const currentIdx = steps.indexOf(booking.status || "draft");
  const isCanceled = booking.status === "canceled" || booking.status === "refunded";
  const isPending = booking.status === "pending_payment" || booking.status === "payment_under_review";

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">

      {/* ═══════ HERO HEADER ═══════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-card)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.02]" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-bl-full" />
        <div className="relative px-6 py-5 flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="shrink-0 rounded-xl hover:bg-muted/60 h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={cn(
            "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0",
            typeConfig.gradient
          )}>
            <TypeIcon className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{serviceName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(booking.booking_number);
                  toast.success("Booking number copied!");
                }}
                className="text-sm text-muted-foreground font-mono bg-muted/50 px-2.5 py-0.5 rounded-lg hover:bg-muted transition-colors cursor-pointer flex items-center gap-1.5 group/copy"
                title="Click to copy"
              >
                {booking.booking_number}
                <Clipboard className="h-3 w-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
              </button>
              {destination && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {destination}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-semibold print:hidden" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Badge className={cn(
              "gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border-2 shadow-sm",
              status.bg, status.color, status.border, status.glow
            )}>
              <StatusIcon className="h-4 w-4" />
              {status.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* ═══════ DRAFT EXPIRY COUNTDOWN ═══════ */}
      {booking.status === "draft" && booking.created_at && (() => {
        const hoursLeft = 24 - differenceInHours(new Date(), new Date(booking.created_at));
        const minsLeft = Math.max(0, (24 * 60) - differenceInMinutes(new Date(), new Date(booking.created_at)));
        const hDisplay = Math.max(0, Math.floor(minsLeft / 60));
        const mDisplay = minsLeft % 60;
        const isUrgent = hoursLeft <= 6;
        const isExpired = hoursLeft <= 0;
        return (
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-xl border animate-fade-in",
            isExpired ? "border-destructive/30 bg-destructive/5" : isUrgent ? "border-gold/30 bg-gold/5" : "border-border/50 bg-muted/30"
          )}>
            <Clock className={cn("h-5 w-5", isExpired ? "text-destructive" : isUrgent ? "text-gold" : "text-muted-foreground")} />
            <div className="flex-1">
              <p className={cn("text-sm font-bold", isExpired ? "text-destructive" : isUrgent ? "text-gold" : "text-foreground")}>
                {isExpired ? "Draft Expired" : `Draft expires in ${hDisplay}h ${mDisplay}m`}
              </p>
              <p className="text-xs text-muted-foreground">Complete your booking before it auto-expires</p>
            </div>
          </div>
        );
      })()}

      {/* ═══════ STATUS TIMELINE ═══════ */}
      <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
        <CardContent className="p-6 md:px-10 md:py-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const stepCfg = statusConfig[step];
              const StepIcon = stepCfg.icon;
              const isPastStep = !isCanceled && currentIdx > idx;
              const isActive = !isCanceled && booking.status === step;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex items-center justify-center h-12 w-12 rounded-full border-[2.5px] transition-all duration-500",
                      isCanceled ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : isActive ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                        : isPastStep ? "border-success bg-success text-primary-foreground shadow-md shadow-success/20"
                        : "border-border bg-muted/40 text-muted-foreground"
                    )}>
                      {isPastStep ? <CheckCircle className="h-5.5 w-5.5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-[11px] mt-3 font-bold text-center leading-tight tracking-wide uppercase",
                      isActive ? "text-primary" : isPastStep ? "text-success" : "text-muted-foreground/60"
                    )}>
                      {stepLabels[idx]}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className="flex-1 flex items-center -mt-7">
                      <div className={cn(
                        "w-full h-[3px] rounded-full mx-4 transition-all duration-700",
                        isPastStep ? "bg-gradient-to-r from-success to-success/70" : "bg-border/50"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ═══════ KEY METRICS ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Type", value: booking.booking_type, icon: TypeIcon, color: "text-primary", bg: "bg-primary/8", capitalize: true },
          { label: "Travelers", value: booking.passengers || 1, icon: Users, color: "text-primary", bg: "bg-primary/8" },
          { label: "Total Amount", value: `$${booking.total_amount.toLocaleString()}`, icon: Banknote, color: "text-success", bg: "bg-success/8", bold: true },
          { label: "Booked On", value: format(new Date(booking.created_at || ""), "dd/MM/yyyy"), icon: CalendarDays, color: "text-gold", bg: "bg-gold/8" },
        ].map((item, i) => (
          <Card key={i} className="group rounded-2xl border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-[var(--shadow-md)] overflow-hidden">
            <CardContent className="relative p-5 flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105", item.bg)}>
                <item.icon className={cn("h-5.5 w-5.5", item.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                <p className={cn(
                  "mt-1 truncate",
                  item.bold ? "font-bold text-xl tracking-tight" : "font-semibold text-[15px]",
                  item.capitalize && "capitalize"
                )}>{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Left Column ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Service Details */}
          {(destination || notesData?.flightRoute || notesData?.departureCity) && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Globe} title="Service Details" />
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                    {destination && <DetailRow label="Destination" icon={MapPin}>{destination}</DetailRow>}
                    {notesData?.flightRoute && <DetailRow label="Route" icon={Route}>{notesData.flightRoute}</DetailRow>}
                    {notesData?.departureDate && <DetailRow label="Departure Date">{format(new Date(notesData.departureDate), "dd/MM/yyyy")}</DetailRow>}
                    {notesData?.returnDate && <DetailRow label="Return Date">{format(new Date(notesData.returnDate), "dd/MM/yyyy")}</DetailRow>}
                    {notesData?.airline && <DetailRow label="Airline">{notesData.airline}</DetailRow>}
                    {notesData?.flightNumber && <DetailRow label="Flight Number"><span className="font-mono">{notesData.flightNumber}</span></DetailRow>}
                    {notesData?.flightIncluded !== undefined && (
                      <DetailRow label="Flight Included">
                        <Badge className={cn(
                          "text-xs font-bold rounded-lg px-3 py-0.5",
                          notesData.flightIncluded ? "bg-success/12 text-success border border-success/25" : "bg-muted text-muted-foreground"
                        )}>
                          {notesData.flightIncluded ? "Yes" : "No"}
                        </Badge>
                      </DetailRow>
                    )}
                    {notesData?.visaIncluded !== undefined && (
                      <DetailRow label="Visa Included">
                        <Badge className={cn(
                          "text-xs font-bold rounded-lg px-3 py-0.5",
                          notesData.visaIncluded ? "bg-success/12 text-success border border-success/25" : "bg-muted text-muted-foreground"
                        )}>
                          {notesData.visaIncluded ? "Yes" : "No"}
                        </Badge>
                      </DetailRow>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotel Details */}
          {notesData?.hotelName && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={BedDouble} title="Hotel Details" iconBg="bg-gold/10" iconColor="text-gold" />
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                    <DetailRow label="Hotel">
                      <span className="text-base">{notesData.hotelName}</span>
                    </DetailRow>
                    {notesData.hotelStarRating && (
                      <DetailRow label="Rating">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: notesData.hotelStarRating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1.5">({notesData.hotelStarRating}-star)</span>
                        </div>
                      </DetailRow>
                    )}
                    {notesData.hotelTier && (
                      <DetailRow label="Tier">
                        <Badge className={cn(
                          "text-xs font-bold rounded-lg px-3 py-0.5",
                          notesData.hotelIsDefault ? "bg-success/12 text-success border border-success/25" : "bg-primary/12 text-primary border border-primary/25"
                        )}>
                          {notesData.hotelIsDefault ? "Included" : "Upgrade"}
                        </Badge>
                      </DetailRow>
                    )}
                    {notesData.hotelPriceAdjustment > 0 && (
                      <DetailRow label="Price Adjustment">
                        <span className="text-primary font-bold">+${notesData.hotelPriceAdjustment}/night</span>
                      </DetailRow>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Travelers */}
          {passengers.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Users} title="Travelers">
                  <Badge variant="secondary" className="ml-auto rounded-lg text-xs font-bold px-3">{passengers.length}</Badge>
                </SectionHeader>
                <div className="p-4 space-y-2">
                  {passengers.map((p: any, i: number) => (
                    <div key={i} className="group flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all duration-200 border border-transparent hover:border-border/40">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:shadow-md transition-shadow">
                        <span className="text-sm font-bold text-primary">{(p.firstName?.[0] || '').toUpperCase()}{(p.lastName?.[0] || '').toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{p.firstName} {p.lastName}</p>
                          {i === 0 && <Badge variant="secondary" className="text-[9px] font-bold rounded-md px-1.5 py-0 h-4">LEAD</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {p.passportNumber && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Hash className="h-3 w-3" /> {p.passportNumber}
                            </span>
                          )}
                          {p.dateOfBirth && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" /> {format(new Date(p.dateOfBirth), "dd/MM/yyyy")}
                            </span>
                          )}
                          {p.nationality && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" /> {p.nationality}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 rounded-lg text-[11px] font-bold">#{i + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Passenger Checklist */}
          {canManage && passengers.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={ClipboardCheck} title="Passenger Readiness" iconBg="bg-gold/10" iconColor="text-gold" />
                <div className="p-4 space-y-2">
                  {passengers.map((p: any, i: number) => {
                    const checks = passengerChecks[i] || { documents: false, payment: false, visa: false };
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/30">
                        <span className="text-sm font-semibold min-w-[120px] truncate">{p.firstName} {p.lastName}</span>
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={checks.documents} onCheckedChange={(v) => savePassengerCheck(i, "documents", !!v)} className="h-4 w-4" />
                            <FileCheck2 className="h-3 w-3 text-muted-foreground" /> Docs
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={checks.payment} onCheckedChange={(v) => savePassengerCheck(i, "payment", !!v)} className="h-4 w-4" />
                            <BanknoteIcon className="h-3 w-3 text-muted-foreground" /> Paid
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Checkbox checked={checks.visa} onCheckedChange={(v) => savePassengerCheck(i, "visa", !!v)} className="h-4 w-4" />
                            <ShieldCheckIcon className="h-3 w-3 text-muted-foreground" /> Visa
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {passengers.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={FileText} title="Passenger Documents">
                  <Badge variant="secondary" className="rounded-lg text-xs font-bold px-3">
                    {passengersWithDocs.length} / {passengers.length}
                  </Badge>
                  {passengersWithDocs.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto rounded-lg gap-1.5 text-xs h-8 font-semibold"
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                    >
                      {downloadingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
                      Download All
                    </Button>
                  )}
                </SectionHeader>
                <div className="p-4 space-y-2">
                  {passengersWithDocs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                        <FileText className="h-7 w-7 text-muted-foreground/25" />
                      </div>
                      <p className="text-sm font-medium">No documents uploaded yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Documents will appear here once uploaded by the agency</p>
                    </div>
                  ) : (
                    passengers.map((p: any, i: number) => {
                      const pDocs = getPassengerDocs(p);
                      const hasDocs = pDocs.length > 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                              hasDocs ? "bg-card hover:bg-muted/20 border-border/40 hover:border-border/60" : "bg-muted/15 border-dashed border-border/30"
                            )}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className={cn(
                                "h-11 w-11 rounded-xl flex items-center justify-center",
                                hasDocs ? "bg-success/10" : "bg-muted/50"
                              )}>
                                <FileText className={cn("h-5 w-5", hasDocs ? "text-success" : "text-muted-foreground/40")} />
                              </div>
                              <div>
                                <p className="font-bold text-sm">
                                  {p.firstName} {p.lastName}
                                  {i === 0 && <Badge variant="secondary" className="ml-2 text-[9px] font-bold rounded-md px-1.5 py-0 h-4">LEAD</Badge>}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {p.passportNumber ? `Passport: ${p.passportNumber}` : "No passport info"}
                                  {hasDocs && <span className="ml-2 text-success font-semibold">• {pDocs.length} doc{pDocs.length > 1 ? 's' : ''}</span>}
                                </p>
                              </div>
                            </div>
                            {!hasDocs && (
                              <Badge variant="outline" className="text-muted-foreground/60 text-xs rounded-lg font-medium">Not uploaded</Badge>
                            )}
                          </div>
                          {hasDocs && (
                            <div className="ml-14 space-y-1">
                              {pDocs.map((doc, docIdx) => {
                                const globalIdx = i * 100 + docIdx;
                                const isPdf = doc.url.toLowerCase().endsWith('.pdf');
                                const DocIcon = isPdf ? FileText : Image;
                                return (
                                  <div key={docIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="flex items-center gap-2">
                                      <DocIcon className="h-4 w-4 text-success" />
                                      <span className="text-xs font-medium">{doc.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{isPdf ? "PDF" : "Image"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Button variant="ghost" size="sm" className="rounded-lg gap-1 h-7 text-xs font-semibold" onClick={() => handleViewDoc(doc.url, globalIdx)} disabled={loadingDocIndex === globalIdx}>
                                        {loadingDocIndex === globalIdx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                        View
                                      </Button>
                                      <Button variant="outline" size="sm" className="rounded-lg gap-1 h-7 text-xs font-semibold" onClick={() => handleDownloadDoc(doc.url, `${p.firstName}-${p.lastName}-${doc.name}`, globalIdx)} disabled={downloadingDocIndex === globalIdx}>
                                        {downloadingDocIndex === globalIdx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                        Download
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {bookingPayments.length > 0 && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Receipt} title="Payment History" iconBg="bg-success/10" iconColor="text-success">
                  <Badge variant="secondary" className="ml-auto rounded-lg text-xs font-bold px-3">{bookingPayments.length}</Badge>
                </SectionHeader>
                <div className="p-4 space-y-2">
                  {bookingPayments.map((payment) => {
                    const pStatus = paymentStatusColors[payment.status || "unpaid"] || paymentStatusColors.unpaid;
                    return (
                      <div key={payment.id} className="p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/50 transition-colors space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", pStatus.bg)}>
                              <CreditCard className={cn("h-4.5 w-4.5", pStatus.text)} />
                            </div>
                            <div>
                              <p className="font-bold text-sm">${payment.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                                {payment.transaction_reference && <span className="ml-2 font-mono">#{payment.transaction_reference}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{format(new Date(payment.created_at || ""), "dd/MM/yyyy")}</span>
                            <Badge className={cn("text-[10px] font-bold rounded-lg px-2.5 py-0.5 uppercase border", pStatus.bg, pStatus.text, pStatus.border)}>
                              {(payment.status || "unpaid").replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        {/* Payment proof actions */}
                        {payment.proof_url && (
                          <div className="flex items-center gap-2 ml-[3.375rem]">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1.5 rounded-lg"
                              disabled={loadingProofId === payment.id}
                              onClick={() => handleViewProof(payment.proof_url!, payment.id)}
                            >
                              {loadingProofId === payment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                              View Receipt
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs gap-1.5 rounded-lg"
                              onClick={() => window.open(payment.proof_url!, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </Button>
                          </div>
                        )}
                        {/* Admin approve/reject actions */}
                        {canManage && (payment.status === "proof_uploaded" || payment.status === "unpaid") && (
                          <div className="flex items-center gap-2 ml-[3.375rem]">
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1.5 rounded-lg bg-success hover:bg-success/90 text-white"
                              disabled={approvePayment.isPending}
                              onClick={() => handleApprovePayment(payment.id)}
                            >
                              {approvePayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 text-xs gap-1.5 rounded-lg"
                              disabled={rejectPayment.isPending}
                              onClick={() => { setRejectingPaymentId(payment.id); setRejectDialogOpen(true); }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground ml-[3.375rem] bg-muted/30 p-2 rounded-lg border border-border/20">{payment.notes}</p>
                        )}
                        {payment.rejection_reason && (
                          <p className="text-xs text-destructive ml-[3.375rem] bg-destructive/5 p-2 rounded-lg border border-destructive/20">
                            Rejection: {payment.rejection_reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Threaded Comments */}
          <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
            <CardContent className="p-0">
              <SectionHeader icon={MessageCircle} title="Comments & Notes">
                <Badge variant="secondary" className="ml-auto rounded-lg text-xs font-bold px-3">{comments.length}</Badge>
              </SectionHeader>
              <div className="p-4 space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Start the conversation.</p>
                )}
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{(c.author?.[0] || "?").toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(c.timestamp), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 bg-muted/25 p-3 rounded-xl border border-border/20">{c.text}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[60px] rounded-xl text-sm"
                  />
                  <Button onClick={handlePostComment} disabled={!newComment.trim()} className="rounded-xl h-auto self-end px-4">
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change History / Audit Trail */}
          <BookingChangeHistory bookingId={booking.id} />

          {/* Special Requests */}
          {booking.special_requests && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Sparkles} title="Special Requests" iconBg="bg-gold/10" iconColor="text-gold" />
                <div className="p-6">
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/25 p-4 rounded-xl border border-border/30">
                    {booking.special_requests}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Notes */}
          {booking.notes && !notesData && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Clipboard} title="Notes" iconBg="bg-muted" iconColor="text-muted-foreground" />
                <div className="p-6">
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/25 p-4 rounded-xl border border-border/30">
                    {booking.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">

          {/* Agency / Customer */}
          {canManage && (booking.agencies || booking.profiles) && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Building2} title="Agency / Customer" />
                <div className="p-5 space-y-4">
                  {booking.agencies && (
                    <div className="p-3.5 bg-gradient-to-br from-primary/[0.05] to-primary/[0.02] rounded-xl border border-primary/10">
                      <p className="font-bold text-sm">{booking.agencies.agency_name}</p>
                      {booking.agencies.license_number && <p className="text-xs text-muted-foreground mt-0.5">License: {booking.agencies.license_number}</p>}
                      {booking.agencies.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />{booking.agencies.city}, {booking.agencies.country}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{booking.profiles?.full_name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="truncate text-xs font-medium">{booking.profiles?.email || "-"}</span>
                    </div>
                    {booking.profiles?.phone && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{booking.profiles.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          {(notesData?.contactEmail || notesData?.contactPhone) && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Phone} title="Contact Information" iconBg="bg-success/10" iconColor="text-success" />
                <div className="p-5 space-y-4">
                  {notesData.contactEmail && (
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</p>
                        <p className="font-semibold text-sm truncate mt-0.5">{notesData.contactEmail}</p>
                      </div>
                    </div>
                  )}
                  {notesData.contactPhone && (
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-success/8 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-success" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Phone</p>
                        <p className="font-semibold text-sm mt-0.5">{notesData.contactPhone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Actions */}
          {canManage && (
            <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={ShieldCheck} title="Admin Actions" iconBg="bg-primary/10" iconColor="text-primary" />
                <div className="p-5 space-y-3">
                  {isPending && (
                    <>
                      <Button
                        className="w-full bg-success hover:bg-success/90 text-primary-foreground rounded-xl h-11 gap-2 shadow-md shadow-success/20 font-bold"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <CheckCircle className="h-4 w-4" /> Confirm & Send Voucher
                      </Button>
                      <Button
                        className="w-full rounded-xl h-11 gap-2 font-bold"
                        variant="destructive"
                        onClick={() => handleStatusChange("canceled")}
                      >
                        <XCircle className="h-4 w-4" /> Reject / Cancel
                      </Button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <Button className="w-full rounded-xl h-11 gap-2 font-semibold" variant="outline" onClick={sendVoucherEmail}>
                      <Mail className="h-4 w-4" /> Resend Voucher Email
                    </Button>
                  )}
                  {booking.status !== "canceled" && booking.status !== "refunded" && !isPending && (
                    <Button className="w-full rounded-xl h-11 gap-2 font-semibold" variant="destructive" onClick={() => handleStatusChange("canceled")}>
                      <XCircle className="h-4 w-4" /> Cancel Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* WhatsApp Share */}
          {(() => {
            const leadPassenger = passengers[0];
            const phone = leadPassenger?.phone || leadPassenger?.phoneNumber || notesData?.contactPhone || booking.profiles?.phone;
            if (!phone) return null;
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const msg = encodeURIComponent(
              `📋 Booking Confirmation\n\n` +
              `Booking #: ${booking.booking_number}\n` +
              `Service: ${serviceName || '-'}\n` +
              `Destination: ${destination || '-'}\n` +
              `Travelers: ${booking.passengers || 1}\n` +
              `Amount: $${booking.total_amount.toLocaleString()}\n` +
              `Status: ${booking.status || 'draft'}\n\n` +
              `Thank you for booking with us! 🌍`
            );
            return (
              <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
                <CardContent className="p-0">
                  <SectionHeader icon={MessageCircle} title="Notify Passenger" iconBg="bg-success/10" iconColor="text-success" />
                  <div className="p-5">
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl h-11 border-success/30 text-success hover:bg-success/10 font-semibold"
                      onClick={() => window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank')}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send via WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Actions */}
          <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
            <CardContent className="p-0">
              <SectionHeader icon={Printer} title="Actions" iconBg="bg-muted" iconColor="text-muted-foreground" />
              <div className="p-5 space-y-3">
                {booking.status === "confirmed" && (
                  <>
                    <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-border/50 font-semibold" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4" /> Preview Voucher
                    </Button>
                    <Button onClick={handleDownloadVoucher} disabled={isGeneratingPDF} className="w-full gap-2 rounded-xl h-11 shadow-sm font-bold">
                      {isGeneratingPDF ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Download className="h-4 w-4" /> Download Voucher</>}
                    </Button>
                    <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-border/50 font-semibold" onClick={handlePrintVoucher}>
                      <Printer className="h-4 w-4" /> Print Voucher
                    </Button>
                    <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-primary/30 text-primary hover:bg-primary/10 font-semibold" onClick={handleSendVoucherEmail} disabled={isSendingEmail}>
                      {isSendingEmail ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Mail className="h-4 w-4" /> Email Voucher</>}
                    </Button>
                  </>
                )}
                {/* Print Receipt */}
                <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-border/50 font-semibold" onClick={() => {
                  const receiptWindow = window.open('', '_blank', 'width=800,height=700');
                  if (!receiptWindow) { toast.error("Please allow popups to print"); return; }
                  const paidPayments = bookingPayments.filter(p => p.status === 'approved');
                  const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
                  receiptWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${booking.booking_number}</title><style>
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', -apple-system, system-ui, sans-serif; }
                    body { background: #fff; padding: 40px; color: #1a1a2a; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a237e; padding-bottom: 20px; margin-bottom: 24px; }
                    .title { font-size: 28px; font-weight: 800; color: #1a237e; }
                    .subtitle { font-size: 12px; color: #888; margin-top: 4px; }
                    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
                    .badge-confirmed { background: #dcfce7; color: #16a34a; }
                    .badge-pending { background: #fef3c7; color: #d97706; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                    .info-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600; margin-bottom: 4px; }
                    .info-item span { font-size: 14px; font-weight: 600; }
                    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #1a237e; color: #fff; border-radius: 10px; margin-top: 24px; }
                    .total-label { font-size: 14px; font-weight: 600; }
                    .total-amount { font-size: 24px; font-weight: 800; }
                    .payments { margin-top: 24px; }
                    .payments h3 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 12px; }
                    .payment-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; }
                    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #aaa; }
                    @media print { body { padding: 20px; } @page { margin: 1cm; } }
                  </style></head><body>
                    <div class="header">
                      <div>
                        <div class="title">PAYMENT RECEIPT</div>
                        <div class="subtitle">Generated ${format(new Date(), "dd/MM/yyyy 'at' HH:mm")}</div>
                      </div>
                      <div class="badge ${booking.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending'}">${booking.status === 'confirmed' ? 'Confirmed' : booking.status || 'Draft'}</div>
                    </div>
                    <div class="info-grid">
                      <div class="info-item"><label>Booking Number</label><span>${booking.booking_number}</span></div>
                      <div class="info-item"><label>Type</label><span style="text-transform:capitalize">${booking.booking_type}</span></div>
                      <div class="info-item"><label>Service</label><span>${serviceName || '-'}</span></div>
                      <div class="info-item"><label>Destination</label><span>${destination || '-'}</span></div>
                      <div class="info-item"><label>Travelers</label><span>${booking.passengers || 1}</span></div>
                      <div class="info-item"><label>Booking Date</label><span>${format(new Date(booking.created_at || ''), 'dd/MM/yyyy')}</span></div>
                    </div>
                    ${bookingPayments.length > 0 ? `<div class="payments"><h3>Payment History</h3>${bookingPayments.map(p => `<div class="payment-row"><span>${paymentMethodLabels[p.payment_method] || p.payment_method} — ${p.status}</span><span style="font-weight:700">$${p.amount.toLocaleString()}</span></div>`).join('')}</div>` : ''}
                    <div class="total-row"><span class="total-label">Total Amount</span><span class="total-amount">$${booking.total_amount.toLocaleString()}</span></div>
                    <div class="footer">This is a computer-generated receipt and does not require a signature.</div>
                  </body><script>window.onload = function() { setTimeout(function() { window.print(); }, 400); }<\/script></html>`);
                  receiptWindow.document.close();
                }}>
                  <Receipt className="h-4 w-4" /> Print Receipt
                </Button>
                <Button variant="outline" className="w-full gap-2 rounded-xl h-11 border-border/50 font-semibold" onClick={() => navigate(backPath)}>
                  <ArrowLeft className="h-4 w-4" /> Back to {canManage ? "Bookings" : "History"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="rounded-2xl border-border/50 shadow-[var(--shadow-sm)] overflow-hidden">
            <CardContent className="p-0">
              <SectionHeader icon={Clipboard} title="Summary" iconBg="bg-muted" iconColor="text-muted-foreground" />
              <div className="p-5">
                {[
                  { label: "Booking #", value: booking.booking_number, mono: true },
                  { label: "Type", value: booking.booking_type, capitalize: true },
                  { label: "Travelers", value: `${booking.passengers || 1}` },
                  { label: "Created", value: format(new Date(booking.created_at || ""), "dd/MM/yyyy") },
                ].map((row, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={cn(
                        "text-sm font-semibold",
                        row.mono && "font-mono text-xs bg-muted/50 px-2 py-0.5 rounded-md",
                        row.capitalize && "capitalize"
                      )}>{row.value}</span>
                    </div>
                    {i < 3 && <Separator className="bg-border/30" />}
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t-2 border-primary/15 flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">Total</span>
                  <span className="font-bold text-2xl tracking-tight text-primary">${booking.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden voucher for PDF generation */}
      <div className="fixed -left-[9999px] top-0" style={{ width: '794px' }}>
        <div ref={voucherRef} style={{ width: '794px', backgroundColor: '#ffffff' }}>
          <UniversalVoucher details={buildVoucherDetails()} printMode />
        </div>
      </div>

      {/* Voucher Preview Dialog */}
      <VoucherPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        booking={booking}
        onConfirmSend={handleApproveAndSendVoucher}
        isSending={isSendingVoucher}
        previewOnly={booking.status === "confirmed"}
      />

      {/* Document Preview Dialog */}
      <Dialog open={docPreviewOpen} onOpenChange={setDocPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-bold">Document Preview</span>
              {docPreviewUrl && (
                <Button variant="outline" size="sm" className="rounded-lg gap-1.5 font-semibold" onClick={() => window.open(docPreviewUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" /> Open in New Tab
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted/20 rounded-xl overflow-hidden border border-border/30">
            {docPreviewUrl && (
              docPreviewType === "pdf" ? (
                <iframe src={docPreviewUrl} className="w-full h-[70vh] border-0" title="Document Preview" />
              ) : (
                <img src={docPreviewUrl} alt="Document Preview" className="max-w-full max-h-[70vh] object-contain" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Proof Preview Dialog */}
      <Dialog open={proofPreviewOpen} onOpenChange={setProofPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="font-bold">Payment Receipt</span>
              {proofPreviewUrl && (
                <Button variant="outline" size="sm" className="rounded-lg gap-1.5 font-semibold" onClick={() => window.open(proofPreviewUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" /> Open in New Tab
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted/20 rounded-xl overflow-hidden border border-border/30">
            {proofPreviewUrl && (
              proofPreviewType === "pdf" ? (
                <iframe src={proofPreviewUrl} className="w-full h-[70vh] border-0" title="Payment Proof" />
              ) : (
                <img src={proofPreviewUrl} alt="Payment Receipt" className="max-w-full max-h-[70vh] object-contain" />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { setRejectDialogOpen(open); if (!open) { setRejectingPaymentId(null); setRejectionReason(""); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold">Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reason for rejection</label>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="rounded-xl min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-lg" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="rounded-lg gap-1.5"
                disabled={rejectPayment.isPending}
                onClick={handleRejectPayment}
              >
                {rejectPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetail;
