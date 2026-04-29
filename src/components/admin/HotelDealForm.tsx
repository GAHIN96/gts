import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useHotels } from "@/hooks/useHotels";
import { useCreateHotelDeal, useUpdateHotelDeal, type HotelDeal, type HotelDealInsert } from "@/hooks/useHotelDeals";
import { toast } from "sonner";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const dealSchema = z.object({
  hotel_id: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  original_price: z.coerce.number().min(0, "Price must be positive"),
  discounted_price: z.coerce.number().min(0, "Price must be positive"),
  discount_percent: z.coerce.number().min(0).max(100, "Max 100%"),
  image_url: z.string().optional(),
  expires_at: z.date().optional().nullable(),
  is_featured: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface HotelDealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: HotelDeal | null;
}

export function HotelDealForm({ open, onOpenChange, deal }: HotelDealFormProps) {
  const createDeal = useCreateHotelDeal();
  const updateDeal = useUpdateHotelDeal();
  const { data: hotels } = useHotels();
  const isEditing = !!deal;

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      hotel_id: null,
      title: "",
      description: "",
      original_price: 0,
      discounted_price: 0,
      discount_percent: 0,
      image_url: "",
      expires_at: null,
      is_featured: false,
      is_active: true,
    },
  });

  const originalPrice = form.watch("original_price");
  const discountedPrice = form.watch("discounted_price");

  // Auto-calculate discount percent
  useEffect(() => {
    if (originalPrice > 0 && discountedPrice > 0 && discountedPrice < originalPrice) {
      const percent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
      form.setValue("discount_percent", percent);
    }
  }, [originalPrice, discountedPrice, form]);

  useEffect(() => {
    if (deal) {
      form.reset({
        hotel_id: deal.hotel_id,
        title: deal.title,
        description: deal.description || "",
        original_price: deal.original_price,
        discounted_price: deal.discounted_price,
        discount_percent: deal.discount_percent,
        image_url: deal.image_url || "",
        expires_at: deal.expires_at ? new Date(deal.expires_at) : null,
        is_featured: deal.is_featured ?? false,
        is_active: deal.is_active ?? true,
      });
    } else {
      form.reset({
        hotel_id: null,
        title: "",
        description: "",
        original_price: 0,
        discounted_price: 0,
        discount_percent: 0,
        image_url: "",
        expires_at: null,
        is_featured: false,
        is_active: true,
      });
    }
  }, [deal, form]);

  const onSubmit = async (data: DealFormValues) => {
    try {
      const dealData: HotelDealInsert = {
        hotel_id: data.hotel_id || null,
        title: data.title,
        description: data.description || null,
        original_price: data.original_price,
        discounted_price: data.discounted_price,
        discount_percent: data.discount_percent,
        image_url: data.image_url || null,
        expires_at: data.expires_at ? data.expires_at.toISOString() : null,
        is_featured: data.is_featured,
        is_active: data.is_active,
      };

      if (isEditing && deal) {
        await updateDeal.mutateAsync({ id: deal.id, ...dealData });
        toast.success("Deal updated successfully");
      } else {
        await createDeal.mutateAsync(dealData);
        toast.success("Deal created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save deal");
    }
  };

  const isLoading = createDeal.isPending || updateDeal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Hotel Deal" : "Add New Hotel Deal"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Summer Special - Luxury Istanbul Resort" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hotel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to Hotel (Optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hotel (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No linked hotel</SelectItem>
                      {hotels?.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          {hotel.name} ({hotel.star_rating}★)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="5-star beachfront property with spa..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="original_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discounted_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount %</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expires At</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>No expiration</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="is_featured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 flex-1">
                    <FormLabel className="text-sm">Featured</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 flex-1">
                    <FormLabel className="text-sm">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="navy" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Deal" : "Create Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
