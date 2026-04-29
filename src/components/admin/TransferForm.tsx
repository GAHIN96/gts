import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCities } from "@/hooks/useCities";
import { useCreateTransfer, useUpdateTransfer, type Transfer } from "@/hooks/useTransfers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Upload, Loader2, X } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  city_id: z.string().optional(),
  transfer_type: z.string().min(1, "Transfer type is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  price: z.coerce.number().min(0, "Price must be positive"),
  route_from: z.string().optional(),
  route_to: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface TransferFormProps {
  transfer?: Transfer | null;
  onSuccess: () => void;
}

export const TransferForm = ({ transfer, onSuccess }: TransferFormProps) => {
  const { data: cities } = useCities();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const [imageUrl, setImageUrl] = useState<string>(transfer?.image_url || "");
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: transfer?.name || "",
      description: transfer?.description || "",
      city_id: transfer?.city_id || "",
      transfer_type: transfer?.transfer_type || "airport",
      vehicle_type: transfer?.vehicle_type || "sedan",
      capacity: transfer?.capacity || 4,
      price: transfer?.price || 0,
      route_from: transfer?.route_from || "",
      route_to: transfer?.route_to || "",
      image_url: transfer?.image_url || "",
      is_active: transfer?.is_active ?? true,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('transfer-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('transfer-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      form.setValue('image_url', publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl("");
    form.setValue('image_url', "");
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const transferData = {
        name: values.name,
        description: values.description || null,
        city_id: values.city_id || null,
        transfer_type: values.transfer_type,
        vehicle_type: values.vehicle_type,
        capacity: values.capacity,
        price: values.price,
        route_from: values.route_from || null,
        route_to: values.route_to || null,
        image_url: imageUrl || null,
        is_active: values.is_active,
      };

      if (transfer) {
        await updateTransfer.mutateAsync({ id: transfer.id, ...transferData });
        toast.success("Transfer updated successfully");
      } else {
        await createTransfer.mutateAsync(transferData);
        toast.success("Transfer created successfully");
      }
      onSuccess();
    } catch (error) {
      toast.error(transfer ? "Failed to update transfer" : "Failed to create transfer");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Premium Airport Transfer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Route From/To */}
        <div className="space-y-2">
          <FormLabel>Route</FormLabel>
          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="route_from"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Airport / Hotel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <FormField
              control={form.control}
              name="route_to"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="City Center / Hotel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Example: Airport → City Center, Hotel → Airport
          </p>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Comfortable transfer service with meet & greet..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cities?.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}, {city.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transfer_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transfer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="airport">Airport Transfer</SelectItem>
                    <SelectItem value="city">City Transfer</SelectItem>
                    <SelectItem value="intercity">Intercity Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicle_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormDescription>Maximum passengers allowed</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixed Price (USD)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" {...field} />
                </FormControl>
                <FormDescription>Fixed price for the entire ride</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <FormLabel>Transfer Image</FormLabel>
          {imageUrl ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border">
              <img 
                src={imageUrl} 
                alt="Transfer" 
                className="w-full h-full object-cover"
              />
              <ConfirmDelete itemName="this image" onConfirm={removeImage}>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              </ConfirmDelete>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          )}
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <FormLabel>Active</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Make this transfer available for booking
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createTransfer.isPending || updateTransfer.isPending}
        >
          {transfer ? "Update Transfer" : "Create Transfer"}
        </Button>
      </form>
    </Form>
  );
};
