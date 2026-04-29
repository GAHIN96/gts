import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateSpecialRequest } from "@/hooks/useSpecialRequests";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  Sparkles,
  Users,
  DollarSign,
  Flag,
  FileText,
  Tag,
  ArrowRight,
  CheckCircle2,
  Clock,
  Wand2,
} from "lucide-react";

const formSchema = z.object({
  request_type: z.string().min(1, "Request type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  travelers: z.coerce.number().min(1, "At least 1 traveler required"),
  budget: z.coerce.number().optional(),
  priority: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SpecialRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUEST_TYPES: Record<string, string> = {
  custom_package: "Custom Package",
  group_booking: "Group Booking",
  corporate_travel: "Corporate Travel",
  honeymoon: "Honeymoon",
  family_vacation: "Family Vacation",
  adventure: "Adventure Trip",
  other: "Other",
};

const PRIORITY_META: Record<string, { label: string; className: string; hint: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border", hint: "Flexible timeline" },
  medium: { label: "Medium", className: "bg-gold/10 text-gold border-gold/30", hint: "Within a week" },
  high: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/30", hint: "Urgent" },
};

export function SpecialRequestForm({ open, onOpenChange }: SpecialRequestFormProps) {
  const { user } = useAuth();
  const createRequest = useCreateSpecialRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      request_type: "",
      description: "",
      travelers: 1,
      budget: undefined,
      priority: "medium",
    },
  });

  const watchType = form.watch("request_type");
  const watchTravelers = form.watch("travelers");
  const watchBudget = form.watch("budget");
  const watchPriority = form.watch("priority") || "medium";
  const watchDesc = form.watch("description") || "";

  const priorityMeta = PRIORITY_META[watchPriority] || PRIORITY_META.medium;
  const perPerson = watchBudget && watchTravelers ? Math.round(Number(watchBudget) / Number(watchTravelers)) : 0;

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast.error("Please login to submit a request");
      return;
    }

    try {
      await createRequest.mutateAsync({
        user_id: user.id,
        request_type: data.request_type,
        description: data.description,
        travelers: data.travelers,
        budget: data.budget,
        priority: data.priority,
      });
      toast.success("Special request submitted successfully!");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to submit request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-none !w-auto !left-[var(--sidebar-width,16rem)] !right-0 !top-0 !translate-x-0 !translate-y-0 h-screen sm:rounded-none p-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] h-screen">
          {/* LEFT: form */}
          <div className="flex flex-col h-screen overflow-hidden">
            <DialogHeader className="px-8 pt-6 pb-4 border-b border-border">
              <DialogTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                New Special Request
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Tell us what you need — our team will craft a tailored proposal.
              </p>
            </DialogHeader>

            <Form {...form}>
              <form
                id="special-request-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
              >
                {/* Hero card */}
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                      <Wand2 className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight">Bespoke travel request</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Describe your trip — our specialists respond within 24h with options & pricing.
                      </p>
                    </div>
                    <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20 hidden sm:inline-flex">
                      <CheckCircle2 className="h-3 w-3" />
                      Free quote
                    </Badge>
                  </div>
                </div>

                {/* Request Type */}
                <FormField
                  control={form.control}
                  name="request_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                        <Tag className="h-4 w-4 text-primary" />
                        Request Type
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-primary" />
                        Trip Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Destinations, dates, room preferences, dietary needs, special occasions, accessibility requirements…"
                          className="min-h-[160px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between items-center">
                        <FormMessage />
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {watchDesc.length} characters
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Travelers + Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="travelers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                          <Users className="h-4 w-4 text-primary" />
                          Travelers
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={1} className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Budget (USD)
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">optional</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 5000" className="h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-sm font-semibold">
                        <Flag className="h-4 w-4 text-primary" />
                        Priority
                      </FormLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(["low", "medium", "high"] as const).map((p) => {
                          const meta = PRIORITY_META[p];
                          const active = field.value === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => field.onChange(p)}
                              className={`rounded-xl border p-3 text-left transition-all ${
                                active
                                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                                  : "border-border hover:border-primary/40 hover:bg-muted/40"
                              }`}
                            >
                              <Badge className={`${meta.className} text-[11px] mb-1.5`}>{meta.label}</Badge>
                              <p className="text-[11px] text-muted-foreground leading-tight">{meta.hint}</p>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {/* Footer */}
            <div className="border-t border-border bg-card px-8 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground hidden sm:block">
                <Clock className="h-3 w-3 inline mr-1" />
                We respond within 24 hours
              </p>
              <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="special-request-form"
                  variant="navy"
                  disabled={createRequest.isPending}
                  className="gap-2"
                >
                  {createRequest.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Submit Request
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: sticky summary */}
          <aside className="hidden lg:flex flex-col bg-muted/20 border-l border-border h-screen sticky top-0 overflow-y-auto">
            {/* Hero with photo */}
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80&auto=format&fit=crop"
                alt="Tailored travel"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-primary/10" />
              <div className="relative h-full flex flex-col justify-end p-5 text-primary-foreground">
                <Wand2 className="h-6 w-6 mb-1.5 opacity-95 drop-shadow" />
                <h3 className="font-bold text-lg leading-tight drop-shadow">Request Summary</h3>
                <p className="text-xs opacity-95 mt-0.5 drop-shadow">Live preview of your inquiry</p>
              </div>
            </div>

            <div className="flex-1 p-5 space-y-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Type</span>
                  <span className="text-sm font-semibold text-right">
                    {watchType ? REQUEST_TYPES[watchType] : <span className="text-muted-foreground italic">Not selected</span>}
                  </span>
                </div>
                <div className="border-t border-dashed border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Travelers</span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {watchTravelers || 1}
                  </span>
                </div>
                <div className="border-t border-dashed border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Priority</span>
                  <Badge className={`${priorityMeta.className} text-[11px]`}>{priorityMeta.label}</Badge>
                </div>
              </div>

              {watchBudget ? (
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Indicative budget</p>
                  <p className="text-3xl font-bold text-primary leading-none">
                    ${Number(watchBudget).toLocaleString()}
                  </p>
                  {perPerson > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ≈ ${perPerson.toLocaleString()} per traveler
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <DollarSign className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">Add a budget to get more accurate proposals</p>
                </div>
              )}

              <div className="rounded-xl bg-success/5 border border-success/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  What happens next
                </p>
                <ul className="text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                  <li>• Our travel specialists review your request</li>
                  <li>• You receive a tailored proposal within 24h</li>
                  <li>• Refine details and confirm — no commitment</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
