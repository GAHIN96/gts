import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Mail, Phone, MessageSquare, Loader2, Minus, Plus } from "lucide-react";

const toTitleCase = (str: string) =>
  str.replace(/\b\w/g, c => c.toUpperCase()).replace(/(?<=\b\w)\w*/g, m => m.toLowerCase()).replace(/\s+/g, ' ');
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(8, "Valid phone number required"),
  specialRequests: z.string().optional(),
});

export type LeadTravelerFormData = z.infer<typeof formSchema>;

interface LeadTravelerFormProps {
  groupSize: number;
  onGroupSizeChange: (size: number) => void;
  onSubmit: (data: LeadTravelerFormData) => void;
  isLoading?: boolean;
  minGroupSize?: number;
  maxGroupSize?: number;
}

export function LeadTravelerForm({
  groupSize,
  onGroupSizeChange,
  onSubmit,
  isLoading = false,
  minGroupSize = 1,
  maxGroupSize = 20,
}: LeadTravelerFormProps) {
  const form = useForm<LeadTravelerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      specialRequests: "",
    },
  });

  // Auto-fill from logged-in user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          if (profile.full_name && !form.getValues("fullName")) form.setValue("fullName", profile.full_name);
          if (profile.email && !form.getValues("email")) form.setValue("email", profile.email);
          if (profile.phone && !form.getValues("phone")) form.setValue("phone", profile.phone);
        }
      } catch {}
    };
    fetchProfile();
  }, []);

  const decreaseGroupSize = () => {
    if (groupSize > minGroupSize) {
      onGroupSizeChange(groupSize - 1);
    }
  };

  const increaseGroupSize = () => {
    if (groupSize < maxGroupSize) {
      onGroupSizeChange(groupSize + 1);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Group Size Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-[hsl(231,70%,15%)] mb-2">Group Size</h3>
        <p className="text-[hsl(231,15%,46%)] text-sm mb-6">How many travelers in your group?</p>

        <div className="flex items-center justify-center gap-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={decreaseGroupSize}
            disabled={groupSize <= minGroupSize}
            className="h-12 w-12 rounded-xl border-2 border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)] disabled:opacity-50"
          >
            <Minus className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <span className="text-4xl font-bold text-[hsl(231,70%,30%)]">{groupSize}</span>
            <p className="text-sm text-[hsl(231,15%,46%)] mt-1">
              {groupSize === 1 ? "traveler" : "travelers"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={increaseGroupSize}
            disabled={groupSize >= maxGroupSize}
            className="h-12 w-12 rounded-xl border-2 border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)] disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Lead Traveler Details */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[hsl(231,70%,30%)]/10 flex items-center justify-center">
            <User className="h-5 w-5 text-[hsl(231,70%,30%)]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[hsl(231,70%,15%)]">Lead Traveler Details</h3>
            <p className="text-[hsl(231,15%,46%)] text-sm">Main contact for this booking</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Input
                {...form.register("fullName")}
                placeholder="John Doe"
                onChange={e => form.setValue("fullName", toTitleCase(e.target.value))}
                className="pl-10 rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
            {form.formState.errors.fullName && (
              <p className="text-xs text-[hsl(0,84%,60%)]">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Input
                {...form.register("email")}
                type="email"
                placeholder="your@email.com"
                className="pl-10 rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-xs text-[hsl(0,84%,60%)]">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Input
                {...form.register("phone")}
                type="tel"
                placeholder="+1 234 567 8900"
                className="pl-10 rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
            {form.formState.errors.phone && (
              <p className="text-xs text-[hsl(0,84%,60%)]">{form.formState.errors.phone.message}</p>
            )}
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Special Requests (Optional)</Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Textarea
                {...form.register("specialRequests")}
                placeholder="Any dietary requirements, accessibility needs, or other requests..."
                className="pl-10 min-h-[100px] rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 rounded-2xl bg-[hsl(231,70%,30%)] hover:bg-[hsl(231,75%,20%)] text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Confirm Booking"
        )}
      </Button>
    </form>
  );
}
