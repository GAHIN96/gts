import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useCreateHotelRoom, useUpdateHotelRoom, type HotelRoom, type HotelRoomInsert } from "@/hooks/useHotelRooms";
import { toast } from "sonner";
import { useEffect } from "react";

const roomSchema = z.object({
  room_type: z.string().min(1, "Room type is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1").default(2),
  price_per_night: z.coerce.number().min(0, "Price must be positive"),
  price_adult: z.coerce.number().min(0).default(0),
  price_child: z.coerce.number().min(0).default(0),
  price_child_6: z.coerce.number().min(0).default(0),
  price_infant: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
  amenities: z.string().optional(),
  is_active: z.boolean().default(true),
  total_rooms: z.coerce.number().min(1, "At least 1 room required").default(10),
  available_rooms: z.coerce.number().min(0, "Cannot be negative").default(10),
});

type RoomFormValues = z.infer<typeof roomSchema>;

interface HotelRoomFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string;
  room?: HotelRoom | null;
}

export function HotelRoomForm({ open, onOpenChange, hotelId, room }: HotelRoomFormProps) {
  const createRoom = useCreateHotelRoom();
  const updateRoom = useUpdateHotelRoom();
  const isEditing = !!room;

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      room_type: "",
      capacity: 2,
      price_per_night: 0,
      price_adult: 0,
      price_child: 0,
      price_child_6: 0,
      price_infant: 0,
      description: "",
      amenities: "",
      is_active: true,
      total_rooms: 10,
      available_rooms: 10,
    },
  });

  const totalRooms = form.watch("total_rooms");
  const availableRooms = form.watch("available_rooms");

  useEffect(() => {
    if (room) {
      form.reset({
        room_type: room.room_type,
        capacity: room.capacity,
        price_per_night: room.price_per_night,
        price_adult: (room as any).price_adult ?? 0,
        price_child: (room as any).price_child ?? 0,
        price_child_6: (room as any).price_child_6 ?? 0,
        price_infant: (room as any).price_infant ?? 0,
        description: room.description || "",
        amenities: room.amenities?.join(", ") || "",
        is_active: room.is_active ?? true,
        total_rooms: room.total_rooms ?? 10,
        available_rooms: room.available_rooms ?? 10,
      });
    } else {
      form.reset({
        room_type: "",
        capacity: 2,
        price_per_night: 0,
        price_adult: 0,
        price_child: 0,
        price_child_6: 0,
        price_infant: 0,
        description: "",
        amenities: "",
        is_active: true,
        total_rooms: 10,
        available_rooms: 10,
      });
    }
  }, [room, form]);

  // Ensure available_rooms doesn't exceed total_rooms
  useEffect(() => {
    if (availableRooms > totalRooms) {
      form.setValue("available_rooms", totalRooms);
    }
  }, [totalRooms, availableRooms, form]);

  const onSubmit = async (data: RoomFormValues) => {
    try {
      const roomData: any = {
        hotel_id: hotelId,
        room_type: data.room_type,
        capacity: data.capacity,
        price_per_night: data.price_per_night,
        price_adult: data.price_adult,
        price_child: data.price_child,
        price_child_6: data.price_child_6,
        price_infant: data.price_infant,
        description: data.description || null,
        amenities: data.amenities ? data.amenities.split(",").map(a => a.trim()) : [],
        is_active: data.is_active,
        total_rooms: data.total_rooms,
        available_rooms: Math.min(data.available_rooms, data.total_rooms),
      };

      if (isEditing && room) {
        await updateRoom.mutateAsync({ id: room.id, ...roomData });
        toast.success("Room updated successfully");
      } else {
        await createRoom.mutateAsync(roomData);
        toast.success("Room created successfully");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save room");
    }
  };

  const isLoading = createRoom.isPending || updateRoom.isPending;

  // Calculate inventory status
  const getInventoryStatus = () => {
    if (availableRooms === 0) return { text: "Sold out", color: "text-destructive" };
    if (availableRooms <= 3) return { text: "Low inventory", color: "text-amber-500" };
    return { text: `${availableRooms}/${totalRooms} available`, color: "text-muted-foreground" };
  };

  const inventoryStatus = getInventoryStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Room" : "Add New Room"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="room_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Standard Double, Suite, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (guests)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_per_night"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Night ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Per Guest Type Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Price Per Guest Type</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price_adult"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adult (12+) $</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_child"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child (2-12) $</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_child_6"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child (2-6) $</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_infant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Infant (0-2) $</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Room Inventory */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Room Inventory</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_rooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Rooms</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="available_rooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Rooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max={totalRooms}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className={`text-sm font-medium ${inventoryStatus.color}`}>
                  {inventoryStatus.text}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the room..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amenities (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="King Bed, City View, Mini Bar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Make this room available
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="navy" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Room" : "Add Room"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
