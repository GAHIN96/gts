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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateAdditionalService, useUpdateAdditionalService, type AdditionalService } from "@/hooks/useAdditionalServices";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  per_person: z.boolean(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface AdditionalServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: AdditionalService | null;
}

export function AdditionalServiceForm({ open, onOpenChange, service }: AdditionalServiceFormProps) {
  const createService = useCreateAdditionalService();
  const updateService = useUpdateAdditionalService();
  const isEditing = !!service;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      price: 0,
      per_person: true,
      is_active: true,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        category: service.category,
        description: service.description || "",
        price: service.price,
        per_person: service.per_person ?? true,
        is_active: service.is_active ?? true,
      });
    } else {
      form.reset({
        name: "",
        category: "",
        description: "",
        price: 0,
        per_person: true,
        is_active: true,
      });
    }
  }, [service, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({
          id: service.id,
          name: data.name,
          category: data.category,
          description: data.description,
          price: data.price,
          per_person: data.per_person,
          is_active: data.is_active,
        });
        toast.success("Service updated successfully!");
      } else {
        await createService.mutateAsync({
          name: data.name,
          category: data.category,
          description: data.description,
          price: data.price,
          per_person: data.per_person,
          is_active: data.is_active,
        });
        toast.success("Service created successfully!");
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? "Failed to update service" : "Failed to create service");
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "Add New Service"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Airport Transfer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="meal">Meal</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the service..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="per_person"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mb-0">Per Person</FormLabel>
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
                  <FormItem className="flex items-center gap-3">
                    <FormLabel className="mb-0">Active</FormLabel>
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
              <Button type="submit" variant="navy" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Service" : "Create Service"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
