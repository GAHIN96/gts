import { useState } from "react";
import { Plus, Edit, Trash2, Bed, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHotelRooms, useDeleteHotelRoom, type HotelRoom } from "@/hooks/useHotelRooms";
import { HotelRoomForm } from "./HotelRoomForm";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface HotelRoomsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelId: string;
  hotelName: string;
}

// Room Inventory Badge Component
function RoomInventoryBadge({ available, total }: { available: number; total: number }) {
  const percentage = total > 0 ? (available / total) * 100 : 0;
  
  if (available === 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Sold Out
      </Badge>
    );
  }
  
  if (available <= 3) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Only {available} left!
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Bed className="h-3 w-3" />
      {available}/{total} rooms
    </Badge>
  );
}

export function HotelRoomsManager({ open, onOpenChange, hotelId, hotelName }: HotelRoomsManagerProps) {
  const { data: rooms, isLoading } = useHotelRooms(hotelId);
  const deleteRoom = useDeleteHotelRoom();
  const [roomFormOpen, setRoomFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<HotelRoom | null>(null);

  const handleEdit = (room: HotelRoom) => {
    setEditingRoom(room);
    setRoomFormOpen(true);
  };

  const handleDelete = (room: HotelRoom) => {
    setRoomToDelete(room);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (roomToDelete) {
      try {
        await deleteRoom.mutateAsync({ id: roomToDelete.id, hotelId });
        toast.success("Room deleted successfully");
      } catch (error) {
        toast.error("Failed to delete room");
      }
    }
    setDeleteDialogOpen(false);
    setRoomToDelete(null);
  };

  // Calculate total inventory stats
  const totalStats = rooms?.reduce(
    (acc, room) => ({
      totalRooms: acc.totalRooms + (room.total_rooms ?? 0),
      availableRooms: acc.availableRooms + (room.available_rooms ?? 0),
    }),
    { totalRooms: 0, availableRooms: 0 }
  ) ?? { totalRooms: 0, availableRooms: 0 };

  const occupancyRate = totalStats.totalRooms > 0 
    ? ((totalStats.totalRooms - totalStats.availableRooms) / totalStats.totalRooms) * 100 
    : 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Manage Rooms - {hotelName}</span>
              <Button variant="navy" size="sm" onClick={() => setRoomFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Room
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Inventory Summary */}
          {rooms && rooms.length > 0 && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Inventory</span>
                  <span className="text-sm text-muted-foreground">
                    {totalStats.availableRooms}/{totalStats.totalRooms} rooms available
                  </span>
                </div>
                <Progress value={100 - occupancyRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {occupancyRate.toFixed(0)}% occupancy rate
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : rooms?.length === 0 ? (
              <Card className="bg-secondary/30">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Bed className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No rooms added yet</p>
                  <Button variant="navy" className="mt-4" onClick={() => setRoomFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Room
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rooms?.map((room) => {
                  const available = room.available_rooms ?? 0;
                  const total = room.total_rooms ?? 0;
                  const percentage = total > 0 ? (available / total) * 100 : 0;
                  
                  return (
                    <Card key={room.id} className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{room.room_type}</h3>
                              <Badge variant={room.is_active ? "default" : "secondary"}>
                                {room.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <RoomInventoryBadge available={available} total={total} />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {room.capacity} guests
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                ${room.price_per_night}/night
                              </span>
                            </div>
                            
                            {/* Per guest type pricing */}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {(room as any).price_adult > 0 && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  Adult: ${(room as any).price_adult}
                                </Badge>
                              )}
                              {(room as any).price_child > 0 && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  Child 2-12: ${(room as any).price_child}
                                </Badge>
                              )}
                              {(room as any).price_child_6 > 0 && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  Child 2-6: ${(room as any).price_child_6}
                                </Badge>
                              )}
                              {(room as any).price_infant > 0 && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  Infant: ${(room as any).price_infant}
                                </Badge>
                              )}
                            </div>

                            {/* Room Availability Progress */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Room availability</span>
                                <span className={
                                  available === 0 ? "text-destructive" :
                                  available <= 3 ? "text-amber-500" : "text-muted-foreground"
                                }>
                                  {available}/{total} available
                                </span>
                              </div>
                              <Progress 
                                value={percentage} 
                                className="h-1.5"
                              />
                            </div>

                            {room.description && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {room.description}
                              </p>
                            )}

                            {room.amenities && room.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {room.amenities.map((amenity) => (
                                  <Badge key={amenity} variant="outline" className="text-xs">
                                    {amenity}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(room)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(room)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <HotelRoomForm
        open={roomFormOpen}
        onOpenChange={(open) => {
          setRoomFormOpen(open);
          if (!open) setEditingRoom(null);
        }}
        hotelId={hotelId}
        room={editingRoom}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{roomToDelete?.room_type}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
