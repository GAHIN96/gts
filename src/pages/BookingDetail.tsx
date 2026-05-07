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
  Banknote as BanknoteIcon,
  ShieldCheck,
  ShieldCheck as ShieldCheckIcon,
  CalendarDays,
  Clipboard,
  MessageCircle,
  ClipboardCheck,
  FileCheck2,
  Bell,
  Send,
  Trash2,
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useBooking, useUpdateBooking, useDeleteBooking } from "@/hooks/useBookings";
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
import { InternalNotifyDialog } from "@/components/booking/InternalNotifyDialog";
import { WhatsAppDialog } from "@/components/booking/WhatsAppDialog";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; bg: string; border: string; glow: string }> = {
  draft: { label: "Draft", color: "text-slate-500", icon: Clock, bg: "bg-slate-50", border: "border-slate-200", glow: "" },
  pending_payment: { label: "Pending Payment", color: "text-amber-600", icon: AlertCircle, bg: "bg-amber-50", border: "border-amber-200", glow: "" },
  payment_under_review: { label: "Under Review", color: "text-blue-600", icon: Clock, bg: "bg-blue-50", border: "border-blue-200", glow: "" },
  confirmed: { label: "Confirmed", color: "text-emerald-600", icon: CheckCircle, bg: "bg-emerald-50", border: "border-emerald-200", glow: "" },
  canceled: { label: "Canceled", color: "text-rose-600", icon: XCircle, bg: "bg-rose-50", border: "border-rose-200", glow: "" },
  refunded: { label: "Refunded", color: "text-slate-500", icon: DollarSign, bg: "bg-slate-50", border: "border-slate-200", glow: "" },
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
  bank_transfer: "Bank Transfer",
  cash: "Cash Payment",
  credit_card: "Credit Card",
  office: "Office Payment",
  wallet: "Agency Wallet",
  qicard: "QiCard",
  first_iraqi_bank: "First Iraqi Bank",
  pay_in_office: "Pay in Office",
  pay_by_transfer: "Pay by Transfer",
  pay_by_card: "Pay by Card",
  rasheed_bank: "Rasheed Bank",
  trade_bank_iraq: "Trade Bank of Iraq (TBI)",
  national_bank_iraq: "National Bank of Iraq",
  kurdistan_intl_bank: "Kurdistan International Bank",
};

const paymentStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  unpaid: { bg: "bg-slate-50", text: "text-slate-400", border: "border-slate-200" },
  proof_uploaded: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  rejected: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  refunded: { bg: "bg-slate-50", text: "text-slate-400", border: "border-slate-200" },
};

// ─── Section Header Component ───
const SectionHeader = ({ icon: Icon, title, iconBg = "bg-primary/10", iconColor = "text-primary", children }: {
  icon: React.ElementType; title: string; iconBg?: string; iconColor?: string; children?: React.ReactNode;
}) => (
  <div className="px-6 py-5 border-b border-border/50 flex items-center gap-3 bg-slate-50/30">
    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm", iconBg)}>
      <Icon className={cn("h-5 w-5", iconColor)} />
    </div>
    <h3 className="font-extrabold text-sm tracking-tight text-slate-800">{title}</h3>
    {children}
  </div>
);

// ─── Detail Row Component ───
const DetailRow = ({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: React.ElementType }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-slate-300 shrink-0" />}
      <div className="font-bold text-[13px] text-slate-700">{children}</div>
    </div>
  </div>
);

// ─── Change History Component ───
const BookingChangeHistory = ({ bookingId }: { bookingId: string }) => {
  const { data: logs, isLoading } = useBookingAuditLogs(bookingId);

  if (isLoading) return null;
  if (!logs || logs.length === 0) return null;

  const severityStyles = {
    major: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200", label: "Major" },
    important: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", label: "Important" },
    minor: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: "" },
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
  const deleteBooking = useDeleteBooking();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const voucherRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSendingVoucher, setIsSendingVoucher] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

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
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

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
  
  const isPending = booking?.status === 'pending_payment' || booking?.status === 'payment_under_review';
  const isCanceled = booking?.status === 'canceled' || booking?.status === 'refunded';

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

  const handleDeleteBooking = async () => {
    if (!booking) return;
    if (!window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) return;
    try {
      await deleteBooking.mutateAsync(booking.id);
      toast.success("Booking deleted successfully");
      navigate("/bookings");
    } catch {
      toast.error("Failed to delete booking");
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

  const handleSendInternalNotify = async (deptId: string, note: string) => {
    if (!booking) return;
    setIsNotifying(true);
    try {
      const deptEmails = companySettings?.departmentEmails || {
        ops: "ops@gtsbooking.com",
        visa: "visa@gtsbooking.com",
        finance: "finance@gtsbooking.com",
        technical: "tech@gtsbooking.com",
      };
      
      const deptMap: Record<string, { label: string; email: string }> = {
        ops: { label: "Operations Team", email: deptEmails.ops },
        visa: { label: "Visa Department", email: deptEmails.visa },
        finance: { label: "Finance Team", email: deptEmails.finance },
        technical: { label: "Technical Support", email: deptEmails.technical },
      };
      
      const dept = deptMap[deptId];
      
      await supabase.functions.invoke("internal-notification", {
        body: {
          bookingId: booking.id,
          bookingNumber: booking.booking_number,
          department: dept?.label,
          recipientEmail: dept?.email,
          note: note,
          serviceName: serviceName,
          destination: destination,
          passengers: booking.passengers,
          totalAmount: booking.total_amount,
          customerName: booking.profiles?.full_name,
          agencyName: booking.agencies?.agency_name,
          status: booking.status
        },
      });
      
      toast.success(`Internal notification sent to ${dept?.label}`);
      setIsNotifyModalOpen(false);
    } catch (error) {
      console.error("Notify error:", error);
      toast.error("Failed to send internal notification");
    } finally {
      setIsNotifying(false);
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

  return (
    <>
    <div className="min-h-screen bg-slate-50 text-foreground selection:bg-primary/10">
      {/* ═══════ PROFESSIONAL BI HEADER ═══════ */}
      <header className="relative border-b border-primary/20 bg-primary overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-navy-dark pointer-events-none" />
        
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <button 
                onClick={() => navigate(-1)}
                className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all group shadow-xl backdrop-blur-md"
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em]">Booking Management</span>
                  <div className="h-[1px] w-12 bg-white/10" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">{booking.booking_number}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none">
                  {serviceName}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-6">
                  <div className={cn(
                    "flex items-center gap-2.5 px-6 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-lg",
                    booking.status === 'confirmed' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-white/10 border-white/20 text-white"
                  )}>
                    <status.icon className="h-4 w-4" />
                    {status.label}
                  </div>
                  <div className="flex items-center gap-2.5 px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold uppercase tracking-widest text-white/70 shadow-lg backdrop-blur-md">
                    <Hash className="h-4 w-4 text-white/40" />
                    {booking.id.substring(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-end px-10 py-6 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden group/valuation">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover/valuation:opacity-100 transition-opacity duration-700" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-2 relative z-10">Total Revenue</span>
                <div className="text-5xl font-bold text-white tabular-nums tracking-tighter relative z-10 flex items-baseline gap-1">
                  <span className="text-2xl text-white/30">$</span>
                  {booking.total_amount?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* ═══════ DRAFT EXPIRY PROTOCOL ═══════ */}
        {booking.status === "draft" && booking.created_at && (() => {
        const hoursLeft = 24 - differenceInHours(new Date(), new Date(booking.created_at));
        const minsLeft = Math.max(0, (24 * 60) - differenceInMinutes(new Date(), new Date(booking.created_at)));
        const hDisplay = Math.max(0, Math.floor(minsLeft / 60));
        const mDisplay = minsLeft % 60;
        const isUrgent = hoursLeft <= 6;
        const isExpired = hoursLeft <= 0;
        return (
          <div className={cn(
            "flex items-center gap-5 px-8 py-5 rounded-2xl border animate-fade-in relative overflow-hidden",
            isExpired ? "border-rose-200 bg-rose-50" : isUrgent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
          )}>
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              isExpired ? "bg-rose-100 text-rose-600" : isUrgent ? "bg-amber-100 text-amber-600 shadow-sm" : "bg-slate-100 text-slate-400"
            )}>
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-1", isExpired ? "text-rose-600" : isUrgent ? "text-amber-600" : "text-slate-400")}>
                {isExpired ? "EXPIRY_STATUS_EXPIRED" : "EXPIRY_STATUS_ACTIVE"}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold text-slate-800 tracking-tight">
                  {isExpired ? "Draft Expired" : `Booking Draft expires in ${hDisplay}h ${mDisplay}m`}
                </p>
                {!isExpired && isUrgent && <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════ OPERATIONAL STATUS TIMELINE ═══════ */}
      <Card className="rounded-2xl border-border/50 bg-card shadow-[var(--shadow-sm)] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-wrap items-center justify-between gap-y-10">
            {steps.map((step, idx) => {
              const StepIcon = statusConfig[step].icon;
              const isActive = booking.status === step;
              const isPastStep = steps.indexOf(booking.status || "draft") > idx;
              return (
                <div key={step} className="flex items-center flex-1 min-w-[120px]">
                  <div className="flex flex-col items-center group/step">
                    <div className={cn(
                      "flex items-center justify-center h-14 w-14 rounded-2xl border-2 transition-all duration-500 relative",
                      isCanceled ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm"
                        : isActive ? "border-primary bg-primary/5 text-primary shadow-md scale-110 z-10"
                        : isPastStep ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                        : "border-slate-100 bg-slate-50 text-slate-300"
                    )}>
                      {isPastStep ? <CheckCircle className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
                      {isActive && <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-20" />}
                    </div>
                    <span className={cn(
                      "text-[10px] mt-4 font-bold text-center leading-tight tracking-widest uppercase transition-colors duration-300",
                      isActive ? "text-primary" : isPastStep ? "text-emerald-500" : "text-slate-300"
                    )}>
                      {stepLabels[idx]}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className="flex-1 flex items-center -mt-8 mx-2 md:mx-4">
                      <div className={cn(
                        "w-full h-0.5 rounded-full transition-all duration-700 relative",
                        isPastStep ? "bg-emerald-200" : "bg-slate-100"
                      )}>
                        {isPastStep && <div className="absolute inset-0 bg-emerald-300/30 blur-[2px]" />}
                      </div>
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
          <Card key={i} className="group rounded-2xl border-border/50 bg-card hover:border-primary/20 transition-all duration-300 hover:shadow-[var(--shadow-md)] overflow-hidden">
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
            <Card className="rounded-2xl border-border/50 bg-card shadow-[var(--shadow-sm)] overflow-hidden">
              <CardContent className="p-0">
                <SectionHeader icon={Globe} title="Service Details" />
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                    {destination && <DetailRow label="Destination" icon={MapPin}>{destination}</DetailRow>}
                    {notesData?.flightRoute && <DetailRow label="Route" icon={Route}>{notesData.flightRoute}</DetailRow>}
                    {notesData?.departureDate && <DetailRow label="Departure Date">{format(new Date(notesData.departureDate), "dd/MM/yyyy")}</DetailRow>}
                    {notesData?.returnDate && <DetailRow label="Return Date">{format(new Date(notesData.returnDate), "dd/MM/yyyy")}</DetailRow>}
                    {notesData?.airline && <DetailRow label="Airline">{notesData.airline}</DetailRow>}
                    {notesData?.flightNumber && <DetailRow label="Flight Number"><span className="font-sans font-medium">{notesData.flightNumber}</span></DetailRow>}
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

          {/* Hotel Details Section */}
          {notesData?.hotelName && (
            <Card className="rounded-[2rem] border-border/60 bg-white overflow-hidden shadow-xl relative">
              <CardContent className="p-0">
                <SectionHeader icon={BedDouble} title="Hotel Specification" iconBg="bg-gold/10" iconColor="text-gold" />
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

          {/* Travelers Manifest */}
          {passengers.length > 0 && (
            <Card className="rounded-[2rem] border-border/60 bg-white overflow-hidden shadow-xl">
              <CardContent className="p-0">
                <SectionHeader icon={Users} title="Traveler Manifest">
                  <div className="ml-auto px-4 py-1 rounded-lg bg-slate-50 border border-border/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {passengers.length} Travelers
                  </div>
                </SectionHeader>
                <div className="p-6 space-y-3">
                  {passengers.map((p: any, i: number) => (
                    <div key={i} className="group flex items-center gap-5 p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all duration-300 border border-transparent hover:border-border/40">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm group-hover:scale-105 transition-transform">
                        <span className="text-sm font-bold text-primary">{(p.firstName?.[0] || '').toUpperCase()}{(p.lastName?.[0] || '').toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-base uppercase tracking-tight text-slate-600">{p.firstName} {p.lastName}</p>
                          {i === 0 && <span className="text-[9px] font-bold bg-primary text-white rounded-md px-2 py-0.5 tracking-widest uppercase">LEAD</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                          {p.passportNumber && (
                            <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Hash className="h-3 w-3 text-primary" /> {p.passportNumber}
                            </span>
                          )}
                          {p.dateOfBirth && (
                            <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Calendar className="h-3 w-3 text-primary" /> {format(new Date(p.dateOfBirth), "dd/MM/yyyy")}
                            </span>
                          )}
                          {p.nationality && (
                            <span className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Globe className="h-3 w-3 text-primary" /> {p.nationality}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-border/40">
                        #{i + 1}
                      </div>
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
                                {payment.transaction_reference && <span className="ml-2 font-sans font-medium">#{payment.transaction_reference}</span>}
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
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start relative z-30">

          {/* Action Control Center */}
          {canManage && (
            <Card className="rounded-[2.5rem] border-border/60 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-10 duration-700">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.03] pointer-events-none" />
              <CardContent className="p-0 relative z-10">
                <div className="px-8 py-8 border-b border-border/50 flex items-center gap-5 bg-slate-50/50">
                  <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-[0.3em] text-primary">Action Control</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Personnel Only</p>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  {isPending && (
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-800 tracking-tight">Authorization Required</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Status: {status.label}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
                    {isPending && (
                      <Button
                        className="w-full bg-primary text-white hover:bg-primary/90 rounded-2xl h-14 gap-4 shadow-2xl shadow-primary/30 font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] border-b-4 border-navy-dark"
                        onClick={() => setPreviewOpen(true)}
                      >
                        <CheckCircle className="h-5 w-5" /> Confirm Booking
                      </Button>
                    )}
                    
                    {booking.status === "confirmed" && (
                      <Button className="w-full rounded-2xl h-14 gap-4 font-bold uppercase tracking-widest bg-emerald-600 text-white shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.02] transition-all border-b-4 border-emerald-800" onClick={sendVoucherEmail}>
                        <Mail className="h-5 w-5" /> Send Voucher
                      </Button>
                    )}

                    <Button
                      className="w-full rounded-xl h-12 gap-3 font-bold bg-muted/50 border-border/50 hover:bg-muted text-foreground transition-all"
                      variant="outline"
                      onClick={() => setIsNotifyModalOpen(true)}
                    >
                      <Bell className="h-5 w-5 text-primary" /> Notify Internal
                    </Button>

                    {!isCanceled && (
                      <Button
                        className="w-full rounded-xl h-12 gap-3 font-bold bg-muted/50 border-border/50 hover:bg-muted text-foreground transition-all"
                        variant="outline"
                        onClick={() => handleStatusChange("canceled")}
                      >
                        <XCircle className="h-5 w-5 text-destructive" /> Cancel Booking
                      </Button>
                    )}

                    {/* Archival Receipt Button */}
                    <Button variant="outline" className="w-full gap-3 rounded-xl h-12 border-border/50 bg-muted/50 hover:bg-muted text-foreground font-bold transition-all" onClick={() => {
                      const receiptWindow = window.open('', '_blank', 'width=800,height=700');
                      if (!receiptWindow) { toast.error("Please allow popups to print"); return; }
                      receiptWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${booking.booking_number}</title><style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@700&display=swap');
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: #f4f7f9; padding: 60px; color: #1a1a2e; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
                        .page { background: #fff; max-width: 800px; margin: 0 auto; padding: 60px; border-radius: 30px; box-shadow: 0 40px 100px rgba(0,0,0,0.1); position: relative; overflow: hidden; }
                        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; font-weight: 900; color: rgba(0,0,0,0.03); pointer-events: none; white-space: nowrap; z-index: 0; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f0f4f8; padding-bottom: 40px; margin-bottom: 40px; position: relative; z-index: 1; }
                        .logo-area { display: flex; align-items: center; gap: 15px; }
                        .logo-icon { width: 45px; height: 45px; background: #1a237e; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 20px; }
                        .title { font-size: 32px; font-weight: 800; color: #1a237e; letter-spacing: -1px; }
                        .subtitle { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-top: 6px; }
                        .badge { display: inline-block; padding: 8px 16px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
                        .badge-confirmed { background: #dcfce7; color: #166534; }
                        .badge-pending { background: #fef3c7; color: #92400e; }
                        .content-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-bottom: 50px; position: relative; z-index: 1; }
                        .info-item { background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9; }
                        .info-item label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 800; margin-bottom: 8px; }
                        .info-item span { font-size: 15px; font-weight: 700; color: #1e293b; }
                        .info-item.mono span { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
                        .payments { margin-top: 40px; position: relative; z-index: 1; }
                        .payments h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 20px; display: flex; items-center: center; gap: 10px; }
                        .payments h3::after { content: ''; flex: 1; height: 1px; background: #f0f4f8; }
                        .payment-row { display: flex; justify-content: space-between; padding: 18px 0; border-bottom: 1px dotted #e2e8f0; font-size: 14px; align-items: center; }
                        .payment-method { font-weight: 600; color: #475569; }
                        .payment-amount { font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #1a237e; font-size: 16px; }
                        .total-box { margin-top: 50px; padding: 35px; background: #1a237e; color: #fff; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 20px 40px rgba(26, 35, 126, 0.25); position: relative; z-index: 1; }
                        .total-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
                        .total-val { font-size: 42px; font-weight: 900; letter-spacing: -2px; }
                        .footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid #f0f4f8; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6; position: relative; z-index: 1; }
                        @media print { body { padding: 0; background: #fff; } .page { box-shadow: none; border-radius: 0; padding: 40px; } }
                      </style></head><body>
                        <div class="page">
                          <div class="watermark">OFFICIAL RECEIPT</div>
                          <div class="header">
                            <div class="logo-area">
                              <div class="logo-icon">G</div>
                              <div>
                                <div class="title">OFFICIAL RECEIPT</div>
                                <div class="subtitle">Generated ${format(new Date(), "dd MMM yyyy • HH:mm")}</div>
                              </div>
                            </div>
                            <div class="badge ${booking.status === 'confirmed' ? 'badge-confirmed' : 'badge-pending'}">${booking.status === 'confirmed' ? 'Confirmed' : booking.status || 'Draft'}</div>
                          </div>
                          <div class="content-grid">
                            <div class="info-item mono"><label>Booking Reference</label><span>${booking.booking_number}</span></div>
                            <div class="info-item"><label>Service Type</label><span style="text-transform:capitalize">${booking.booking_type}</span></div>
                            <div class="info-item"><label>Experience</label><span>${serviceName || '-'}</span></div>
                            <div class="info-item"><label>Destination</label><span>${destination || '-'}</span></div>
                            <div class="info-item"><label>Travelers</label><span>${booking.passengers || 1} Person(s)</span></div>
                            <div class="info-item"><label>Issue Date</label><span>${format(new Date(booking.created_at || ''), 'dd MMMM yyyy')}</span></div>
                          </div>
                          <div class="payments">
                            <h3>Transaction History</h3>
                            ${bookingPayments.length > 0 ? bookingPayments.map(p => `
                              <div class="payment-row">
                                <div>
                                  <div class="payment-method">${paymentMethodLabels[p.payment_method] || p.payment_method}</div>
                                  <div style="font-size:10px;color:#94a3b8;margin-top:4px">${p.status.toUpperCase()} • ${format(new Date(p.created_at), 'dd/MM/yy')}</div>
                                </div>
                                <div class="payment-amount">$${p.amount.toLocaleString()}</div>
                              </div>
                            `).join('') : '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px">No transactions recorded</div>'}
                          </div>
                          <div class="total-box">
                            <div>
                              <div class="total-label">Grand Total</div>
                              <div style="font-size:10px;opacity:0.6;margin-top:4px">All Taxes & Fees Included</div>
                            </div>
                            <div class="total-val">$${booking.total_amount.toLocaleString()}</div>
                          </div>
                          <div class="footer">
                            This is a computer-generated official document from GTS booking.<br>
                            Verification ID: ${booking.id.substring(0, 8).toUpperCase()}-${booking.booking_number}<br>
                            © ${new Date().getFullYear()} GTS booking. All rights reserved.
                          </div>
                        </div>
                      </body><script>window.onload = function() { setTimeout(function() { window.print(); }, 400); }<\/script></html>`);
                      receiptWindow.document.close();
                    }}>
                      <Receipt className="h-5 w-5" /> Official Receipt
                    </Button>

                    <Button variant="outline" className="w-full gap-3 rounded-xl h-12 border-border/50 bg-muted/50 hover:bg-muted text-foreground font-bold transition-all" onClick={() => navigate(backPath)}>
                      <ArrowLeft className="h-5 w-5" /> Return to Hub
                    </Button>

                    {isAdmin && (
                      <div className="pt-4 border-t border-border/40">
                        <Button 
                          className="w-full rounded-xl h-12 gap-3 font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20 transition-all" 
                          variant="outline" 
                          onClick={handleDeleteBooking}
                        >
                          <Trash2 className="h-5 w-5" /> Delete Record
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Elite Financial Summary */}
          <Card className="rounded-[2rem] border-border/60 bg-white shadow-xl overflow-hidden group/fin">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />
            <CardContent className="p-0 relative z-10">
              <div className="px-8 py-6 border-b border-border/50 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clipboard className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-foreground">Financial Overview</h3>
              </div>
              <div className="p-8">
                {[
                  { label: "Booking Reference", value: booking.booking_number, mono: true },
                  { label: "Service Category", value: booking.booking_type, capitalize: true },
                  { label: "Number of Travelers", value: `${booking.passengers || 1}` },
                  { label: "Date of Issue", value: format(new Date(booking.created_at || ""), "dd MMM yyyy") },
                ].map((row, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center py-4 group/row">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover/row:text-primary transition-colors">{row.label}</span>
                      <span className={cn(
                        "text-sm font-bold text-foreground/90",
                        row.mono && "font-sans font-medium text-[11px] tracking-widest bg-muted/50 px-2 py-1 rounded-lg border border-border/50 text-primary",
                        row.capitalize && "capitalize"
                      )}>{row.value}</span>
                    </div>
                    {i < 3 && <div className="h-px w-full bg-gradient-to-r from-transparent via-border/30 to-transparent" />}
                  </div>
                ))}
                <div className="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/20 flex justify-between items-center shadow-inner group/total">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">Total Amount</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Currency: USD</p>
                  </div>
                  <span className="font-bold text-3xl tracking-tighter text-foreground drop-shadow-sm group-hover/total:scale-105 transition-transform origin-right">${booking.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agency & Client Details */}
          {canManage && (booking.agencies || booking.profiles) && (
            <Card className="rounded-[2rem] border-border/60 bg-white shadow-xl overflow-hidden">
              <CardContent className="p-0 relative z-10">
                <div className="px-8 py-6 border-b border-border/50 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-bold text-sm uppercase tracking-[0.2em] text-foreground">Account Information</h3>
                </div>
                <div className="p-8 space-y-6">
                  {booking.agencies && (
                    <div className="p-5 bg-gradient-to-br from-muted to-transparent rounded-2xl border border-border/50 group/agency hover:bg-muted/80 transition-all">
                      <p className="font-bold text-sm text-foreground tracking-tight">{booking.agencies.agency_name}</p>
                      {booking.agencies.license_number && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">License: {booking.agencies.license_number}</p>}
                      {booking.agencies.city && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-3 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-accent" />{booking.agencies.city}, {booking.agencies.country}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group/user">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/50 group-hover/user:scale-110 transition-transform">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Booked By</p>
                        <span className="font-bold text-foreground/90 text-sm">{booking.profiles?.full_name || "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group/mail">
                      <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/50 group-hover/mail:scale-110 transition-transform">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Primary Email</p>
                        <span className="truncate text-xs font-bold text-foreground/70 block mt-0.5">{booking.profiles?.email || "-"}</span>
                      </div>
                    </div>
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
                      onClick={() => setIsWhatsAppModalOpen(true)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send via WhatsApp
                    </Button>
                    <WhatsAppDialog
                      open={isWhatsAppModalOpen}
                      onOpenChange={setIsWhatsAppModalOpen}
                      phoneNumber={cleanPhone}
                      defaultMessage={msg}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })()}


        </div>
      </div>
    </main>

      {/* Internal Notification Dialog */}
      <InternalNotifyDialog
        open={isNotifyModalOpen}
        onOpenChange={setIsNotifyModalOpen}
        onSend={handleSendInternalNotify}
        isSending={isNotifying}
      />

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
    </>
  );
};

export default BookingDetail;
