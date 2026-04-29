import { useState } from "react";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Calendar, Users, DollarSign, Plane } from "lucide-react";
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
import { PackageDepartureForm } from "./PackageDepartureForm";
import {
  usePackageDepartures,
  useDeleteDeparture,
  type PackageDeparture,
} from "@/hooks/usePackageDepartures";
import { usePackageDepartureFlights } from "@/hooks/usePackageDepartureFlights";
import { toast } from "sonner";

interface PackageDeparturesManagerProps {
  packageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinationCity?: string | null;
}

function DepartureFlightInfo({ departureId }: { departureId: string }) {
  const { data: flights = [] } = usePackageDepartureFlights(departureId);
  
  if (flights.length === 0) return null;

  const outbound = flights.find(f => f.flight_type === "outbound");
  const returnFlight = flights.find(f => f.flight_type === "return");

  const fmt = (t: string | null | undefined) => (t ? t.slice(0, 5) : "--:--");
  const seats = (n: number | null | undefined) => (typeof n === "number" ? `${n} seats` : "seats N/A");

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {outbound?.flights && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Plane className="h-3 w-3" />
          Out: {outbound.flights.airline} {outbound.flights.flight_number} • {fmt(outbound.flights.departure_time)}→{fmt(outbound.flights.arrival_time)} • {seats(outbound.flights.available_seats)}
        </Badge>
      )}
      {returnFlight?.flights && (
        <Badge variant="outline" className="text-xs flex items-center gap-1">
          <Plane className="h-3 w-3 rotate-180" />
          Ret: {returnFlight.flights.airline} {returnFlight.flights.flight_number} • {fmt(returnFlight.flights.departure_time)}→{fmt(returnFlight.flights.arrival_time)} • {seats(returnFlight.flights.available_seats)}
        </Badge>
      )}
    </div>
  );
}

export function PackageDeparturesManager({
  packageId,
  open,
  onOpenChange,
  destinationCity,
}: PackageDeparturesManagerProps) {
  const { data: departures, isLoading } = usePackageDepartures(packageId);
  const deleteDeparture = useDeleteDeparture();

  const [formOpen, setFormOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<PackageDeparture | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (departure: PackageDeparture) => {
    setEditingDeparture(departure);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDeparture.mutateAsync({ id: deleteId, packageId });
      toast.success("Departure deleted successfully");
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete departure");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Manage Departures</span>
              <Button
                variant="navy"
                size="sm"
                onClick={() => {
                  setEditingDeparture(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Departure
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : departures?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No departures yet. Add your first departure date.
              </p>
            ) : (
              departures?.map((dep) => (
                <Card key={dep.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                              {format(new Date(dep.departure_date), "dd/MM/yyyy")} -{" "}
                              {format(new Date(dep.return_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <Badge variant={dep.is_active ? "default" : "secondary"}>
                            {dep.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${dep.price_per_person}/person</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>
                              {dep.available_seats}/{dep.total_seats} seats
                            </span>
                          </div>
                        </div>
                        <DepartureFlightInfo departureId={dep.id} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(dep)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(dep.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PackageDepartureForm
        open={formOpen}
        onOpenChange={setFormOpen}
        packageId={packageId}
        departure={editingDeparture}
        destinationCity={destinationCity}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Departure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this departure date. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
