import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const agencySchema = z.object({
  agency_name: z.string().trim().min(2, "Agency name must be at least 2 characters").max(100, "Agency name must be less than 100 characters"),
  license_number: z.string().trim().max(50, "License number must be less than 50 characters").optional(),
  address: z.string().trim().max(200, "Address must be less than 200 characters").optional(),
  city: z.string().trim().max(50, "City must be less than 50 characters").optional(),
  country: z.string().trim().max(50, "Country must be less than 50 characters").optional(),
});

type AgencyFormData = z.infer<typeof agencySchema>;

interface AgencyRegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AgencyRegistrationForm = ({ open, onOpenChange }: AgencyRegistrationFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AgencyFormData>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      agency_name: "",
      license_number: "",
      address: "",
      city: "",
      country: "",
    },
  });

  const onSubmit = async (data: AgencyFormData) => {
    if (!user) {
      toast.error("You must be logged in to register an agency");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if user already has an agency
      const { data: existingAgency } = await supabase
        .from("agencies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingAgency) {
        toast.error("You already have a registered agency");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("agencies").insert({
        user_id: user.id,
        agency_name: data.agency_name,
        license_number: data.license_number || null,
        address: data.address || null,
        city: data.city || null,
        country: data.country || null,
        is_verified: false,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Agency registration submitted! Awaiting admin verification.");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register agency");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Register Your Agency
          </DialogTitle>
          <DialogDescription>
            Submit your agency details for verification. An admin will review and approve your registration.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agency_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agency Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Travel Agency Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Business license number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Full business address" 
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit for Verification
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AgencyRegistrationForm;
