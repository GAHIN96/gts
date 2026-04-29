import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  Upload,
  CreditCard,
  Building2,
  Banknote,
  MapPin,
  Check,
  Loader2,
  ArrowLeftRight,
  Landmark,
  Lock,
  X,
  FileImage,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const paymentMethods: { value: string; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "qicard", label: "QiCard", icon: <CreditCard className="h-5 w-5" />, description: "Pay using your QiCard" },
  { value: "first_iraqi_bank", label: "First Iraqi Bank", icon: <Building2 className="h-5 w-5" />, description: "Transfer via First Iraqi Bank" },
  { value: "bank_transfer", label: "Bank Transfer", icon: <Banknote className="h-5 w-5" />, description: "Direct bank transfer" },
  { value: "pay_in_office", label: "Pay in Office", icon: <MapPin className="h-5 w-5" />, description: "Visit our office to pay" },
  { value: "pay_by_transfer", label: "Pay by Transfer", icon: <ArrowLeftRight className="h-5 w-5" />, description: "Transfer funds directly" },
  { value: "pay_by_card", label: "Pay by Card", icon: <CreditCard className="h-5 w-5" />, description: "Pay using a card" },
  { value: "rasheed_bank", label: "Rasheed Bank", icon: <Landmark className="h-5 w-5" />, description: "Transfer via Rasheed Bank" },
  { value: "trade_bank_iraq", label: "Trade Bank of Iraq (TBI)", icon: <Landmark className="h-5 w-5" />, description: "Transfer via Trade Bank of Iraq" },
  { value: "national_bank_iraq", label: "National Bank of Iraq", icon: <Landmark className="h-5 w-5" />, description: "Transfer via National Bank of Iraq" },
  { value: "kurdistan_intl_bank", label: "Kurdistan International Bank", icon: <Landmark className="h-5 w-5" />, description: "Transfer via Kurdistan International Bank" },
];

const formSchema = z.object({
  paymentMethod: z.enum([
    "qicard",
    "first_iraqi_bank",
    "bank_transfer",
    "pay_in_office",
    "pay_by_transfer",
    "pay_by_card",
    "rasheed_bank",
    "trade_bank_iraq",
    "national_bank_iraq",
    "kurdistan_intl_bank",
  ]),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof formSchema>;

interface PaymentUploadFormProps {
  totalAmount: number;
  bookingNumber?: string;
  onSubmit: (data: PaymentFormData, proofFile?: File) => void;
  isLoading?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function PaymentUploadForm({
  totalAmount,
  bookingNumber,
  onSubmit,
  isLoading,
}: PaymentUploadFormProps) {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethod: "qicard",
      transactionReference: "",
      notes: "",
    },
  });

  const selectedMethod = form.watch("paymentMethod");
  const requiresProof = selectedMethod !== "pay_in_office";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    reader.onloadend = () => {
      setProofPreview(reader.result as string);
      setUploadProgress(100);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setProofFile(null);
    setProofPreview(null);
    setUploadProgress(0);
  };

  const handleSubmit = (data: PaymentFormData) => {
    onSubmit(data, proofFile || undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Order Summary — gradient navy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl overflow-hidden border border-border/40 shadow-card"
        >
          <div className="absolute inset-0 bg-gradient-navy" />
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-accent/20 blur-2xl" />
          <div className="relative p-5 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm mb-2">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white">
                  Total Amount Due
                </span>
              </div>
              {bookingNumber && (
                <p className="text-xs text-white/70">Booking: {bookingNumber}</p>
              )}
            </div>
            <p
              className="text-3xl font-extrabold text-white tracking-tight"
              style={{ textShadow: "0 0 24px hsl(0 0% 100% / 0.3)" }}
            >
              ${totalAmount.toLocaleString()}
            </p>
          </div>
        </motion.div>

        {/* Payment Method Selection */}
        <Card className="rounded-3xl border border-border/40 shadow-card">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="font-heading">Payment Method</CardTitle>
              <CardDescription>Select how you'd like to pay</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] uppercase tracking-[0.16em] font-bold">
              <Lock className="h-3 w-3" />
              Verified
            </span>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      {paymentMethods.map((method, idx) => {
                        const checked = field.value === method.value;
                        return (
                          <motion.div
                            key={method.value}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.3 }}
                          >
                            <RadioGroupItem
                              value={method.value}
                              id={method.value}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={method.value}
                              className={cn(
                                "relative flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
                                checked
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border/60 bg-card hover:border-primary/30",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                                  checked
                                    ? "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/30 text-primary shadow-sm"
                                    : "bg-muted border-border text-muted-foreground",
                                )}
                              >
                                {method.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground text-sm truncate">
                                  {method.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {method.description}
                                </p>
                              </div>
                              {checked && (
                                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] uppercase tracking-wider font-bold">
                                  <Check className="h-2.5 w-2.5" />
                                  Selected
                                </span>
                              )}
                            </Label>
                          </motion.div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Payment Proof */}
        {requiresProof && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="rounded-3xl border border-border/40 shadow-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading">Payment Proof</CardTitle>
                  <CardDescription>
                    Upload a screenshot or photo of your payment confirmation
                  </CardDescription>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] uppercase tracking-[0.16em] font-bold">
                  <Lock className="h-3 w-3" />
                  Encrypted
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                    Upload Payment Proof
                  </Label>

                  {proofPreview ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-border/60 bg-muted/30 p-4"
                    >
                      <div className="flex items-start gap-4">
                        {proofFile?.type.startsWith("image/") ? (
                          <img
                            src={proofPreview}
                            alt="Payment proof"
                            className="w-24 h-24 rounded-xl object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                            <FileImage className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {proofFile?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {proofFile && formatBytes(proofFile.size)}
                          </p>
                          {uploadProgress < 100 ? (
                            <div className="mt-2">
                              <Progress value={uploadProgress} className="h-1.5" />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Processing… {uploadProgress}%
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] uppercase tracking-wider font-bold">
                              <Check className="h-2.5 w-2.5" />
                              Ready
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeFile}
                            className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remove & re-upload
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <label className="block cursor-pointer group">
                      <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 p-8 text-center transition-all group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:-translate-y-0.5 group-hover:shadow-md">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mb-3 shadow-sm">
                          <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, PDF · up to 10 MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="transactionReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                        Transaction Reference (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter transaction/receipt number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notes */}
        <Card className="rounded-3xl border border-border/40 shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information about your payment..."
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

        <Button
          type="submit"
          variant="navy"
          className="w-full h-12 rounded-2xl font-semibold tracking-wide shadow-md hover:shadow-lg transition-all"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : selectedMethod === "pay_in_office" ? (
            "Confirm Booking"
          ) : (
            "Submit Payment Proof"
          )}
        </Button>
      </form>
    </Form>
  );
}
