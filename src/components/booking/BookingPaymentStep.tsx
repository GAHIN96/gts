import { useState } from "react";
import {
  CreditCard, Upload, Loader2, CheckCircle, Building2, Landmark,
  Wallet, ArrowLeft, ShieldCheck, Lock, Sparkles, Receipt, User, Hash, Eye, EyeOff,
  ChevronDown, Zap, ArrowRightLeft
} from "lucide-react";
import fibLogo from "@/assets/fib-logo.png";
import qicardLogo from "@/assets/qicard-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreatePayment } from "@/hooks/usePayments";
import { useAgencyCreditCheck, useUpdateAgencyUsedCredit, useRecordCreditTransaction } from "@/hooks/useAgencyCreditCheck";
import { cn } from "@/lib/utils";
import { generatePaymentReceiptPdf } from "@/utils/paymentReceiptPdf";

type PaymentMethodValue =
  | "qicard" | "first_iraqi_bank" | "bank_transfer" | "pay_by_card"
  | "pay_in_office" | "rasheed_bank" | "trade_bank_iraq"
  | "national_bank_iraq" | "kurdistan_intl_bank" | "agency_credit";

// Card-based methods that need cardholder / card number / CVV
const CARD_METHODS: PaymentMethodValue[] = [
  "qicard", "pay_by_card", "first_iraqi_bank",
  "rasheed_bank", "trade_bank_iraq", "national_bank_iraq", "kurdistan_intl_bank",
];

// Methods that require proof upload (non-card, non-credit)
const PROOF_METHODS: PaymentMethodValue[] = ["bank_transfer", "pay_in_office"];

// SVG logo components for each payment method
const PaymentLogo = ({ method, className }: { method: PaymentMethodValue; className?: string }) => {
  const base = cn("flex-shrink-0", className);
  switch (method) {
    case "qicard":
      return (
        <img src={qicardLogo} alt="QiCard" className={cn(base, "h-6 w-auto object-contain")} />
      );
    case "first_iraqi_bank":
      return (
        <img src={fibLogo} alt="FIB" className={cn(base, "h-6 w-auto object-contain")} />
      );
    case "pay_by_card":
      return (
        <div className={cn(base, "flex items-center gap-1")}>
          <svg viewBox="0 0 24 16" className="h-4 w-6"><rect rx="2" width="24" height="16" fill="#1A1F71"/><circle cx="9" cy="8" r="5" fill="#EB001B" opacity="0.9"/><circle cx="15" cy="8" r="5" fill="#F79E1B" opacity="0.9"/><path d="M12 3.8a5 5 0 010 8.4 5 5 0 000-8.4z" fill="#FF5F00"/></svg>
          <svg viewBox="0 0 24 16" className="h-4 w-6"><rect rx="2" width="24" height="16" fill="#1434CB"/><text x="12" y="11.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="Arial">VISA</text></svg>
        </div>
      );
    case "bank_transfer":
      return (
        <div className={cn(base, "font-bold text-[9px] tracking-tight text-primary bg-primary/10 rounded-md px-1.5 py-0.5 border border-primary/20")}>
          WIRE
        </div>
      );
    case "rasheed_bank":
      return (
        <div className={cn(base, "font-extrabold text-[9px] tracking-tight text-teal-700 bg-teal-50 rounded-md px-1.5 py-0.5 border border-teal-200")}>
          RB
        </div>
      );
    case "trade_bank_iraq":
      return (
        <div className={cn(base, "font-extrabold text-[9px] tracking-tight text-indigo-700 bg-indigo-50 rounded-md px-1.5 py-0.5 border border-indigo-200")}>
          TBI
        </div>
      );
    case "national_bank_iraq":
      return (
        <div className={cn(base, "font-extrabold text-[9px] tracking-tight text-violet-700 bg-violet-50 rounded-md px-1.5 py-0.5 border border-violet-200")}>
          NBI
        </div>
      );
    case "kurdistan_intl_bank":
      return (
        <div className={cn(base, "font-extrabold text-[9px] tracking-tight text-sky-700 bg-sky-50 rounded-md px-1.5 py-0.5 border border-sky-200")}>
          KIB
        </div>
      );
    case "agency_credit":
      return null;
    default:
      return null;
  }
};

type MethodCategory = "instant" | "transfer" | "secondary_bank" | "credit";

const PAYMENT_METHODS: {
  value: PaymentMethodValue;
  label: string;
  icon: typeof CreditCard;
  description: string;
  gradient: string;
  iconBg: string;
  category: MethodCategory;
}[] = [
  {
    value: "qicard",
    label: "QiCard",
    icon: CreditCard,
    description: "Pay using your QiCard",
    gradient: "from-blue-500/10 to-blue-600/5",
    iconBg: "bg-blue-500/15 text-blue-600",
    category: "instant",
  },
  {
    value: "pay_by_card",
    label: "Mastercard / Visa",
    icon: CreditCard,
    description: "Pay with credit or debit card",
    gradient: "from-orange-500/10 to-orange-600/5",
    iconBg: "bg-orange-500/15 text-orange-600",
    category: "instant",
  },
  {
    value: "first_iraqi_bank",
    label: "FIB (First Iraqi Bank)",
    icon: Landmark,
    description: "Transfer via First Iraqi Bank",
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/15 text-emerald-600",
    category: "transfer",
  },
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    icon: Building2,
    description: "Direct bank wire transfer",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/15 text-primary",
    category: "transfer",
  },
  {
    value: "rasheed_bank",
    label: "Rasheed Bank",
    icon: Landmark,
    description: "Transfer via Rasheed Bank",
    gradient: "from-teal-500/10 to-teal-600/5",
    iconBg: "bg-teal-500/15 text-teal-600",
    category: "secondary_bank",
  },
  {
    value: "trade_bank_iraq",
    label: "Trade Bank of Iraq",
    icon: Landmark,
    description: "Transfer via TBI",
    gradient: "from-indigo-500/10 to-indigo-600/5",
    iconBg: "bg-indigo-500/15 text-indigo-600",
    category: "secondary_bank",
  },
  {
    value: "national_bank_iraq",
    label: "National Bank of Iraq",
    icon: Landmark,
    description: "Transfer via National Bank",
    gradient: "from-violet-500/10 to-violet-600/5",
    iconBg: "bg-violet-500/15 text-violet-600",
    category: "secondary_bank",
  },
  {
    value: "kurdistan_intl_bank",
    label: "Kurdistan International Bank",
    icon: Landmark,
    description: "Transfer via KIB",
    gradient: "from-sky-500/10 to-sky-600/5",
    iconBg: "bg-sky-500/15 text-sky-600",
    category: "secondary_bank",
  },
  {
    value: "agency_credit",
    label: "Agency Credit",
    icon: Wallet,
    description: "Pay instantly from your credit balance",
    gradient: "from-emerald-500/10 to-emerald-600/5",
    iconBg: "bg-emerald-500/15 text-emerald-600",
    category: "credit",
  },
];

interface BookingPaymentStepProps {
  bookingId: string;
  totalAmount: number;
  bookingNumber: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export function BookingPaymentStep({
  bookingId,
  totalAmount,
  bookingNumber,
  onPaymentComplete,
  onBack,
}: BookingPaymentStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodValue | "">("");
  const [transactionRef, setTransactionRef] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  // Card details state
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showCvv, setShowCvv] = useState(false);

  const createPayment = useCreatePayment();
  const { data: creditCheck } = useAgencyCreditCheck(totalAmount);
  const updateCredit = useUpdateAgencyUsedCredit();
  const recordTransaction = useRecordCreditTransaction();

  const isCredit = selectedMethod === "agency_credit";
  const isCardMethod = CARD_METHODS.includes(selectedMethod as PaymentMethodValue);
  const hasSufficientCredit = creditCheck?.hasCredit && creditCheck?.agencyId;
  const needsProof = PROOF_METHODS.includes(selectedMethod as PaymentMethodValue);

  const isSecondaryBankSelected = PAYMENT_METHODS.find(m => m.value === selectedMethod)?.category === "secondary_bank";
  const [showMoreBanks, setShowMoreBanks] = useState(false);
  const showMoreBanksEffective = showMoreBanks || isSecondaryBankSelected;


  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Please upload JPG, PNG, WebP, or PDF");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (isCardMethod && (!cardHolder.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvv.length < 3)) {
      toast.error("Please fill in all card details correctly");
      return;
    }
    if (needsProof && !proofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setProcessing(true);

    try {
      if (isCredit) {
        if (!creditCheck?.agencyId || !hasSufficientCredit) {
          toast.error("Insufficient credit balance");
          setProcessing(false);
          return;
        }

        const newUsed = creditCheck.usedCredit + totalAmount;

        await createPayment.mutateAsync({
          booking_id: bookingId,
          amount: totalAmount,
          payment_method: "agency_credit",
          status: "approved",
          transaction_reference: `CREDIT-${bookingNumber}`,
        });

        await updateCredit.mutateAsync({
          agencyId: creditCheck.agencyId,
          newUsedCredit: newUsed,
        });

        await recordTransaction.mutateAsync({
          agencyId: creditCheck.agencyId,
          amount: totalAmount,
          transactionType: "booking",
          description: `Booking ${bookingNumber} - Credit payment`,
          bookingId,
          balanceAfter: newUsed,
        });

        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId);

        toast.success("Payment confirmed via agency credit!");
        // Generate receipt PDF
        generatePaymentReceiptPdf({
          bookingNumber,
          paymentMethod: "agency_credit",
          amount: totalAmount,
          transactionRef: `CREDIT-${bookingNumber}`,
          status: "approved",
          paidAt: new Date(),
        }).catch(console.error);
        onPaymentComplete();
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let proofUrl = "";
        if (proofFile) {
          setUploading(true);
          const ext = proofFile.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}-${bookingNumber}.${ext}`;

          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 15, 90));
          }, 200);

          const { error: uploadError } = await supabase.storage
            .from("payment-proofs")
            .upload(fileName, proofFile);

          clearInterval(progressInterval);
          setUploadProgress(100);

          if (uploadError) throw uploadError;
          proofUrl = fileName;
          setUploading(false);
        }

        await createPayment.mutateAsync({
          booking_id: bookingId,
          amount: totalAmount,
          payment_method: selectedMethod,
          status: "proof_uploaded",
          transaction_reference: transactionRef || undefined,
          proof_url: proofUrl,
        });

        await supabase
          .from("bookings")
          .update({ status: "payment_under_review" })
          .eq("id", bookingId);

        toast.success("Payment proof submitted! Under review.");
        // Generate receipt PDF
        generatePaymentReceiptPdf({
          bookingNumber,
          paymentMethod: selectedMethod,
          amount: totalAmount,
          transactionRef: transactionRef || undefined,
          status: "proof_uploaded",
          paidAt: new Date(),
        }).catch(console.error);
        onPaymentComplete();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment processing failed");
    } finally {
      setProcessing(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* ═══ Premium Header Card ═══ */}
      <div className="relative rounded-3xl border border-border/40 overflow-hidden shadow-elegant">
        {/* Layered backdrop */}
        <div className="absolute inset-0 bg-gradient-navy" />
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_20%,white_0%,transparent_40%),radial-gradient(circle_at_80%_80%,white_0%,transparent_45%)]" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="h-10 w-10 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-[9px] uppercase tracking-[0.15em] font-bold text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Secure Checkout
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-primary-foreground tracking-tight font-heading leading-tight">
                  Complete Payment
                </h3>
                <p className="text-xs sm:text-sm text-primary-foreground/60 font-light mt-0.5 truncate">
                  Booking <span className="font-sans font-medium font-medium text-primary-foreground/80">#{bookingNumber}</span>
                </p>
              </div>
            </div>

            {/* Amount card */}
            <div className="flex-shrink-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 sm:px-5 sm:py-3.5 text-right shadow-xl">
              <p className="text-[9px] uppercase tracking-[0.18em] text-primary-foreground/60 font-bold">
                Amount Due
              </p>
              <div className="flex items-baseline gap-1 justify-end mt-0.5">
                <span className="text-sm font-semibold text-primary-foreground/70">$</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-primary-foreground font-heading leading-none tracking-tight">
                  {totalAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-[0.15em] text-primary-foreground/50 font-medium mt-1">USD</p>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] text-primary-foreground/70">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              <span className="font-medium tracking-wide">256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-amber-300" />
              <span className="font-medium tracking-wide">PCI Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              <span className="font-medium tracking-wide">Instant Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Payment Methods Grid ═══ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/20 shadow-sm">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-foreground tracking-tight font-heading">
              Select Payment Method
            </h4>
            <p className="text-[11px] text-muted-foreground font-light">
              All transactions are encrypted end-to-end
            </p>
          </div>
          <Badge variant="outline" className="h-6 text-[9px] uppercase tracking-wider font-bold bg-muted/40 hidden sm:inline-flex">
            <ShieldCheck className="h-2.5 w-2.5 mr-1 text-emerald-500" />
            Verified
          </Badge>
        </div>

        <RadioGroup
          value={selectedMethod}
          onValueChange={(v) => setSelectedMethod(v as PaymentMethodValue)}
          className="space-y-5"
        >
          {(() => {
            const renderCard = (method: typeof PAYMENT_METHODS[number], idx: number, opts?: { compact?: boolean }) => {
              const Icon = method.icon;
              const isAgencyCredit = method.value === "agency_credit";
              const disabled = isAgencyCredit && (!creditCheck?.agencyId || creditCheck?.isHardLimitExceeded);
              const compact = opts?.compact;
              const isSelected = selectedMethod === method.value;

              return (
                <motion.div
                  key={method.value}
                  custom={idx}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                >
                  <label
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl border cursor-pointer transition-all duration-300 group overflow-hidden",
                      compact ? "p-2.5" : "p-3.5",
                      isSelected
                        ? "border-primary/60 bg-gradient-to-br shadow-lg shadow-primary/10 ring-2 ring-primary/15 " + method.gradient
                        : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30 hover:shadow-md hover:-translate-y-0.5",
                      disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {isSelected && (
                      <>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ maskImage: "linear-gradient(90deg,transparent,black,transparent)" }} />
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] uppercase tracking-wider font-bold shadow-sm">
                          <CheckCircle className="h-2.5 w-2.5" />
                          Selected
                        </span>
                      </>
                    )}
                    <RadioGroupItem value={method.value} disabled={disabled} className="sr-only" />
                    <div className={cn(
                      "rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border",
                      compact ? "h-9 w-9" : "h-11 w-11",
                      isSelected
                        ? method.iconBg + " border-current/20 shadow-sm scale-105"
                        : "bg-muted/40 text-muted-foreground border-border/40 group-hover:bg-muted group-hover:scale-105"
                    )}>
                      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("font-bold text-foreground truncate", compact ? "text-[13px]" : "text-sm")}>{method.label}</p>
                        <PaymentLogo method={method.value} />
                      </div>
                      {!compact && (
                        <p className="text-[11px] text-muted-foreground font-light mt-0.5">{method.description}</p>
                      )}
                    </div>
                    {!isSelected && (
                      <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 border-2 bg-transparent border-border/60 group-hover:border-primary/40" />
                    )}
                  </label>
                </motion.div>
              );
            };

            const renderCategoryHeader = (
              icon: React.ReactNode,
              label: string,
              right?: React.ReactNode
            ) => (
              <div className="flex items-center gap-2.5 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />
                {right}
              </div>
            );

            const instant = PAYMENT_METHODS.filter(m => m.category === "instant");
            const transfer = PAYMENT_METHODS.filter(m => m.category === "transfer");
            const secondary = PAYMENT_METHODS.filter(m => m.category === "secondary_bank");
            const credit = PAYMENT_METHODS.find(m => m.category === "credit");
            const agencyCredit = credit && creditCheck?.agencyId ? credit : null;
            const creditDisabled = !!creditCheck?.isHardLimitExceeded;

            return (
              <>
                {/* INSTANT PAYMENT */}
                <div className="space-y-2.5">
                  {renderCategoryHeader(<Zap className="h-3 w-3" />, "Instant Payment")}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {instant.map((m, i) => renderCard(m, i))}
                  </div>
                </div>

                {/* BANK TRANSFER */}
                <div className="space-y-2.5">
                  {renderCategoryHeader(<ArrowRightLeft className="h-3 w-3" />, "Bank Transfer")}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {transfer.map((m, i) => renderCard(m, i))}
                  </div>
                </div>

                {/* MORE IRAQI BANKS */}
                <div className="space-y-2.5">
                  {renderCategoryHeader(
                    <Landmark className="h-3 w-3" />,
                    "More Iraqi Banks",
                    <button
                      type="button"
                      onClick={() => setShowMoreBanks(s => !s)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-muted border border-border/50 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showMoreBanksEffective ? "Hide" : "Show"}
                      <ChevronDown className={cn("h-3 w-3 transition-transform", showMoreBanksEffective && "rotate-180")} />
                    </button>
                  )}
                  <AnimatePresence initial={false}>
                    {showMoreBanksEffective && (
                      <motion.div
                        key="secondary-banks"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {secondary.map((m, i) => renderCard(m, i, { compact: true }))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ACCOUNT BALANCE */}
                {agencyCredit && (
                  <div className="space-y-2.5">
                    {renderCategoryHeader(<Wallet className="h-3 w-3" />, "Account Balance")}
                    <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
                      <label
                        className={cn(
                          "relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 group overflow-hidden",
                          selectedMethod === "agency_credit"
                            ? "border-emerald-500/60 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                            : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5",
                          creditDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        {selectedMethod === "agency_credit" && (
                          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] uppercase tracking-wider font-bold shadow-sm">
                            <CheckCircle className="h-2.5 w-2.5" />
                            Selected
                          </span>
                        )}
                        <RadioGroupItem value="agency_credit" disabled={creditDisabled} className="sr-only" />
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/30">
                          <Wallet className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-extrabold text-foreground tracking-tight">Agency Credit</p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                              <Zap className="h-2.5 w-2.5" /> Instant
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-light mt-0.5">Pay instantly from your credit balance — no proof needed</p>
                          {creditCheck && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                ${creditCheck.availableCredit.toLocaleString()} available
                              </span>
                              {creditCheck.isHardLimitExceeded && (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1">Insufficient</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </motion.div>
                  </div>
                )}
              </>
            );
          })()}
        </RadioGroup>
      </div>

      {/* ═══ Card Details Form ═══ */}
      <AnimatePresence mode="wait">
        {isCardMethod && (
          <motion.div
            key="card-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-2xl border-border/40 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground tracking-tight">Card Information</h4>
                    <p className="text-[11px] text-muted-foreground font-light">Enter your card details</p>
                  </div>
                  {selectedMethod && <PaymentLogo method={selectedMethod as PaymentMethodValue} />}
                </div>
              </div>
              <CardContent className="p-5 space-y-4">
                {/* Card Holder */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Card Holder Name
                  </Label>
                  <Input
                    placeholder="Full name as shown on card"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="h-10 rounded-xl border-border/50 bg-background/50 focus:bg-background uppercase tracking-wide"
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    Card Number
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                      className="h-10 rounded-xl border-border/50 bg-background/50 focus:bg-background font-sans font-medium tracking-widest pr-16"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <PaymentLogo method={selectedMethod as PaymentMethodValue} />
                    </div>
                  </div>
                </div>

                {/* Expiry + CVV row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Expiry Date</Label>
                    <Input
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className="h-10 rounded-xl border-border/50 bg-background/50 focus:bg-background font-sans font-medium tracking-widest"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">CVV</Label>
                    <div className="relative">
                      <Input
                        type={showCvv ? "text" : "password"}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                        className="h-10 rounded-xl border-border/50 bg-background/50 focus:bg-background font-sans font-medium tracking-widest pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Proof Upload ═══ */}
      <AnimatePresence mode="wait">
        {needsProof && (
          <motion.div
            key="proof-upload"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-2xl border-border/40 shadow-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/30 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground tracking-tight">Payment Details</h4>
                    <p className="text-[11px] text-muted-foreground font-light">Upload proof and reference</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-4">
                {/* Transaction Reference */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Transaction Reference <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. TXN-12345 or receipt number"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="h-10 rounded-xl border-border/50 bg-background/50 focus:bg-background"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Payment Proof <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground font-light">
                    Upload screenshot or receipt (JPG, PNG, WebP, PDF — max 10MB)
                  </p>

                  {proofFile ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="flex items-start gap-3">
                        {proofPreview ? (
                          <img
                            src={proofPreview}
                            alt="Payment proof"
                            className="w-20 h-20 rounded-lg object-cover border border-border/30 shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{proofFile.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs mt-1.5 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setProofFile(null);
                              setProofPreview(null);
                            }}
                          >
                            Remove & re-upload
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl p-8 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 group">
                      <div className="h-14 w-14 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors mb-3">
                        <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Click to upload proof</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 font-light">
                        Drag & drop or browse files
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}

                  {uploading && (
                    <div className="space-y-1.5 pt-1">
                      <Progress value={uploadProgress} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground text-center font-light">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Agency Credit Breakdown ═══ */}
      <AnimatePresence mode="wait">
        {isCredit && creditCheck && (
          <motion.div
            key="credit-breakdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="rounded-2xl border-emerald-500/30 shadow-card overflow-hidden">
              {/* Wallet-style header */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-white/60 font-bold">Agency Wallet</p>
                      <p className="text-sm font-bold text-white">{creditCheck.agencyName || "Agency"}</p>
                    </div>
                  </div>
                  {hasSufficientCredit ? (
                    <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold gap-1">
                      <CheckCircle className="h-3 w-3" /> Sufficient
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Insufficient</Badge>
                  )}
                </div>
                {/* Credit progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/70">
                    <span>Credit Usage</span>
                    <span className="font-semibold text-white/90">
                      ${creditCheck.usedCredit.toLocaleString()} / ${creditCheck.creditLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all duration-500"
                      style={{ width: `${creditCheck.creditLimit > 0 ? Math.min(100, (creditCheck.usedCredit / creditCheck.creditLimit) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-light">Available Balance</span>
                  <span className="text-lg font-extrabold text-emerald-600">${creditCheck.availableCredit.toLocaleString()}</span>
                </div>
                <div className="border-t border-border/30 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-foreground">This Booking</span>
                    <span className="font-bold text-primary">−${totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-light">After Payment</span>
                    <span className="font-bold text-emerald-600">
                      ${Math.max(0, creditCheck.availableCredit - totalAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Submit Button ═══ */}
      <div className="space-y-3 pt-2">
        <Button
          className={cn(
            "relative w-full h-14 rounded-2xl text-base font-heading font-bold tracking-wide transition-all duration-300 overflow-hidden group",
            "bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/95 hover:to-primary",
            "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.6)]",
            "hover:-translate-y-0.5 active:translate-y-0",
            "disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed"
          )}
          onClick={handleSubmit}
          disabled={
            !selectedMethod ||
            processing ||
            (needsProof && !proofFile) ||
            (isCredit && !hasSufficientCredit) ||
            (isCardMethod && (!cardHolder.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvv.length < 3))
          }
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {processing ? (
            <span className="relative flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing Payment...
            </span>
          ) : isCredit ? (
            <span className="relative flex items-center gap-2.5">
              <Wallet className="h-5 w-5" />
              Pay ${totalAmount.toLocaleString()} with Agency Credit
            </span>
          ) : isCardMethod ? (
            <span className="relative flex items-center gap-2.5">
              <Lock className="h-4 w-4" />
              Pay ${totalAmount.toLocaleString()} Securely
            </span>
          ) : (
            <span className="relative flex items-center gap-2.5">
              <Upload className="h-4 w-4" />
              Submit Payment Proof
            </span>
          )}
        </Button>

        {/* Subtle footer note */}
        <p className="text-center text-[10px] text-muted-foreground/70 font-light tracking-wide">
          By continuing you agree to our <span className="underline underline-offset-2 hover:text-foreground cursor-pointer">Terms</span> & <span className="underline underline-offset-2 hover:text-foreground cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </motion.div>
  );
}
