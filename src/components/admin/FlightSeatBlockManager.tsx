import { useState } from "react";
import { useFlightSeatBlocks, useCreateSeatBlock, useUpdateSeatBlock, useDeleteSeatBlock, FlightSeatBlock } from "@/hooks/useFlightSeatBlocks";
import { useAgencies } from "@/hooks/useAgencies";
import { useUpdateFlight } from "@/hooks/useFlights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Lock, Loader2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import type { Flight } from "@/hooks/useFlights";

interface FlightSeatBlockManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flight: Flight;
}

export function FlightSeatBlockManager({ open, onOpenChange, flight }: FlightSeatBlockManagerProps) {
  const { data: blocks, isLoading } = useFlightSeatBlocks(flight.id);
  const { data: agencies } = useAgencies();
  const createBlock = useCreateSeatBlock();
  const updateBlock = useUpdateSeatBlock();
  const deleteBlock = useDeleteSeatBlock();
  const updateFlight = useUpdateFlight();

  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FlightSeatBlock | null>(null);
  const [agencyId, setAgencyId] = useState<string>("");
  const [seats, setSeats] = useState("");
  const [notes, setNotes] = useState("");

  const totalBlocked = blocks?.filter(b => b.is_active).reduce((sum, b) => sum + b.blocked_seats, 0) ?? 0;
  const totalSeats = flight.total_seats ?? 100;
  const sellableSeats = (flight as any).sellable_seats ?? totalSeats;
  const reservedSeats = totalSeats - sellableSeats;
  const freeSeats = sellableSeats - totalBlocked;

  const [localSellable, setLocalSellable] = useState<number>(sellableSeats);
  const [isSavingSellable, setIsSavingSellable] = useState(false);

  const handleSaveSellable = async () => {
    if (localSellable < totalBlocked) {
      toast.error(`Cannot set below ${totalBlocked} — there are already ${totalBlocked} seats blocked`);
      return;
    }
    setIsSavingSellable(true);
    try {
      await updateFlight.mutateAsync({
        id: flight.id,
        sellable_seats: localSellable,
        available_seats: localSellable - totalBlocked,
      } as any);
      toast.success(`Sellable seats set to ${localSellable}. ${totalSeats - localSellable} seats reserved.`);
    } catch {
      toast.error("Failed to update sellable seats");
    } finally {
      setIsSavingSellable(false);
    }
  };

  const resetForm = () => {
    setAgencyId("");
    setSeats("");
    setNotes("");
    setEditingBlock(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    const seatCount = parseInt(seats);
    if (!seatCount || seatCount <= 0) {
      toast.error("Enter a valid number of seats");
      return;
    }

    const currentBlockSeats = editingBlock?.blocked_seats ?? 0;
    if (seatCount - currentBlockSeats > freeSeats) {
      toast.error(`Only ${freeSeats + currentBlockSeats} seats available to block`);
      return;
    }

    try {
      if (editingBlock) {
        await updateBlock.mutateAsync({
          id: editingBlock.id,
          blocked_seats: seatCount,
          agency_id: agencyId || null,
          notes: notes || null,
        });
        toast.success("Seat block updated");
      } else {
        await createBlock.mutateAsync({
          flight_id: flight.id,
          agency_id: agencyId || null,
          blocked_seats: seatCount,
          notes: notes || undefined,
        });
        toast.success("Seats blocked successfully");
      }
      resetForm();
    } catch {
      toast.error("Failed to save seat block");
    }
  };

  const handleEdit = (block: FlightSeatBlock) => {
    setEditingBlock(block);
    setAgencyId(block.agency_id || "");
    setSeats(String(block.blocked_seats));
    setNotes(block.notes || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlock.mutateAsync(id);
      toast.success("Seat block removed");
    } catch {
      toast.error("Failed to remove seat block");
    }
  };

  const handleToggleActive = async (block: FlightSeatBlock) => {
    try {
      await updateBlock.mutateAsync({ id: block.id, is_active: !block.is_active });
      toast.success(block.is_active ? "Block deactivated" : "Block activated");
    } catch {
      toast.error("Failed to update block");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Block Seats — {flight.airline} {flight.flight_number || ""}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[100px] rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalSeats}</p>
            <p className="text-xs text-muted-foreground">Total Seats</p>
          </div>
          <div className="flex-1 min-w-[100px] rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{sellableSeats}</p>
            <p className="text-xs text-muted-foreground">Sellable</p>
          </div>
          <div className="flex-1 min-w-[100px] rounded-lg border border-warning/30 bg-warning/5 p-3 text-center">
            <p className="text-2xl font-bold text-warning">{reservedSeats}</p>
            <p className="text-xs text-muted-foreground">Reserved</p>
          </div>
          <div className="flex-1 min-w-[100px] rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{totalBlocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </div>
          <div className="flex-1 min-w-[100px] rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-success">{Math.max(0, freeSeats)}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
        </div>

        {/* Sellable Seats Control */}
        <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-sm text-foreground">Sellable Seats Limit</h4>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Control how many seats are open for sale. The rest will be reserved and hidden from agencies.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sellable: <strong className="text-foreground">{localSellable}</strong> of {totalSeats}</span>
              <span className="text-muted-foreground">Reserved: <strong className="text-warning">{totalSeats - localSellable}</strong></span>
            </div>
            <Slider
              min={0}
              max={totalSeats}
              step={1}
              value={[localSellable]}
              onValueChange={(v) => setLocalSellable(v[0])}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>0 (sell none)</span>
              <span>{totalSeats} (sell all)</span>
            </div>
          </div>
          {localSellable !== sellableSeats && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSaveSellable}
                disabled={isSavingSellable}
                className="gap-1.5"
              >
                {isSavingSellable && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Limit ({localSellable} sellable)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocalSellable(sellableSeats)}
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        {showForm ? (
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
            <h4 className="font-medium text-sm">{editingBlock ? "Edit Block" : "New Seat Block"}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agency (optional)</Label>
                <Select value={agencyId} onValueChange={setAgencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Admin-held block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Admin-held (no agency)</SelectItem>
                    {agencies?.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.agency_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Seats to Block</Label>
                <Input
                  type="number"
                  min={1}
                  max={freeSeats + (editingBlock?.blocked_seats ?? 0)}
                  value={seats}
                  onChange={e => setSeats(e.target.value)}
                  placeholder={`Max ${freeSeats + (editingBlock?.blocked_seats ?? 0)}`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createBlock.isPending || updateBlock.isPending}>
                {(createBlock.isPending || updateBlock.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingBlock ? "Update" : "Block Seats"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setShowForm(true)} disabled={freeSeats <= 0}>
            <Plus className="h-4 w-4 mr-1" />
            Add Block
          </Button>
        )}

        {/* Blocks Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !blocks || blocks.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No seat blocks yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Blocked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.map(block => (
                <TableRow key={block.id}>
                  <TableCell className="font-medium">
                    {block.agency?.agency_name || <span className="text-muted-foreground italic">Admin-held</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{block.blocked_seats} seats</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={block.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(block)}
                    >
                      {block.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                    {block.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(block)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Seat Block</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will release {block.blocked_seats} blocked seats. Continue?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(block.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
