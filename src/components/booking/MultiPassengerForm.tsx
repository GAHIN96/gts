import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User, Plus, Trash2, Mail, Phone, Loader2 } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const passengerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  passportNumber: z.string().min(5, "Valid passport number required"),
  passportExpiry: z.string().optional(),
  email: z.string().email("Valid email required"),
  nationality: z.string().min(2, "Nationality is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"]),
});

const formSchema = z.object({
  passengers: z.array(passengerSchema).min(1, "At least one passenger required"),
  contactEmail: z.string().email("Valid email required"),
  contactPhone: z.string().min(8, "Valid phone number required"),
});

export type MultiPassengerFormData = z.infer<typeof formSchema>;

interface MultiPassengerFormProps {
  initialCount?: number;
  onSubmit: (data: MultiPassengerFormData) => void;
  onPassengerCountChange?: (count: number) => void;
  isLoading?: boolean;
}

export function MultiPassengerForm({
  initialCount = 1,
  onSubmit,
  onPassengerCountChange,
  isLoading = false,
}: MultiPassengerFormProps) {
  const form = useForm<MultiPassengerFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengers: Array.from({ length: initialCount }, () => ({
        fullName: "",
        passportNumber: "",
        passportExpiry: "",
        email: "",
        nationality: "",
        dateOfBirth: "",
        gender: "male" as const,
      })),
      contactEmail: "",
      contactPhone: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers",
  });

  const addPassenger = () => {
    append({
      fullName: "",
      passportNumber: "",
      passportExpiry: "",
      email: "",
      nationality: "",
      dateOfBirth: "",
      gender: "male",
    });
    onPassengerCountChange?.(fields.length + 1);
  };

  const removePassenger = (index: number) => {
    if (fields.length > 1) {
      remove(index);
      onPassengerCountChange?.(fields.length - 1);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Contact Information */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-[hsl(231,70%,15%)] mb-2">Contact Information</h3>
        <p className="text-[hsl(231,15%,46%)] text-sm mb-6">We'll send booking confirmations here</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Input
                {...form.register("contactEmail")}
                type="email"
                placeholder="your@email.com"
                className="pl-10 rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
            {form.formState.errors.contactEmail && (
              <p className="text-xs text-[hsl(0,84%,60%)]">{form.formState.errors.contactEmail.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-[hsl(231,70%,15%)]">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(231,15%,46%)]" />
              <Input
                {...form.register("contactPhone")}
                type="tel"
                placeholder="+1 234 567 8900"
                className="pl-10 rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
              />
            </div>
            {form.formState.errors.contactPhone && (
              <p className="text-xs text-[hsl(0,84%,60%)]">{form.formState.errors.contactPhone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Passengers */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-[hsl(231,70%,15%)]">Passenger Details</h3>
            <p className="text-[hsl(231,15%,46%)] text-sm">{fields.length} passenger{fields.length > 1 ? 's' : ''}</p>
          </div>
          <Button
            type="button"
            onClick={addPassenger}
            className="rounded-xl bg-[hsl(231,70%,30%)] hover:bg-[hsl(231,75%,20%)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Passenger
          </Button>
        </div>

        <div className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all",
                "border-[hsl(240,6%,90%)] hover:border-[hsl(231,70%,30%)]/30"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(231,70%,30%)]/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-[hsl(231,70%,30%)]" />
                  </div>
                  <span className="font-semibold text-[hsl(231,70%,15%)]">Passenger {index + 1}</span>
                </div>
                {fields.length > 1 && (
                  <ConfirmDelete itemName={`Passenger ${index + 1}`} onConfirm={() => removePassenger(index)}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-[hsl(0,84%,60%)] hover:bg-[hsl(0,84%,60%)]/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDelete>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Full Name (as on passport)</Label>
                  <Input
                    {...form.register(`passengers.${index}.fullName`)}
                    placeholder="John Doe"
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                  {form.formState.errors.passengers?.[index]?.fullName && (
                    <p className="text-xs text-[hsl(0,84%,60%)]">
                      {form.formState.errors.passengers[index]?.fullName?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Passport Number</Label>
                  <Input
                    {...form.register(`passengers.${index}.passportNumber`)}
                    placeholder="AB1234567"
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                  {form.formState.errors.passengers?.[index]?.passportNumber && (
                    <p className="text-xs text-[hsl(0,84%,60%)]">
                      {form.formState.errors.passengers[index]?.passportNumber?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Passport Expiry Date</Label>
                  <DateInput
                    value={form.watch(`passengers.${index}.passportExpiry`) || ""}
                    onValueChange={(v) => form.setValue(`passengers.${index}.passportExpiry`, v)}
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Email</Label>
                  <Input
                    {...form.register(`passengers.${index}.email`)}
                    type="email"
                    placeholder="passenger@email.com"
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                  {form.formState.errors.passengers?.[index]?.email && (
                    <p className="text-xs text-[hsl(0,84%,60%)]">
                      {form.formState.errors.passengers[index]?.email?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Nationality</Label>
                  <Input
                    {...form.register(`passengers.${index}.nationality`)}
                    placeholder="American"
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                  {form.formState.errors.passengers?.[index]?.nationality && (
                    <p className="text-xs text-[hsl(0,84%,60%)]">
                      {form.formState.errors.passengers[index]?.nationality?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Date of Birth</Label>
                  <DateInput
                    value={form.watch(`passengers.${index}.dateOfBirth`) || ""}
                    onValueChange={(v) => form.setValue(`passengers.${index}.dateOfBirth`, v)}
                    className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]"
                  />
                  {form.formState.errors.passengers?.[index]?.dateOfBirth && (
                    <p className="text-xs text-[hsl(0,84%,60%)]">
                      {form.formState.errors.passengers[index]?.dateOfBirth?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[hsl(231,70%,15%)]">Gender</Label>
                  <Select
                    value={form.watch(`passengers.${index}.gender`)}
                    onValueChange={(value) => form.setValue(`passengers.${index}.gender`, value as "male" | "female")}
                  >
                    <SelectTrigger className="rounded-xl border-[hsl(240,6%,90%)] focus:border-[hsl(231,70%,30%)] focus:ring-[hsl(231,70%,30%)]">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit button */}
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
          "Continue to Payment"
        )}
      </Button>
    </form>
  );
}
