import React, { useState } from "react";
import { 
  Bell, 
  Send, 
  Users, 
  FileCheck, 
  Banknote, 
  Globe, 
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InternalNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (dept: string, note: string) => Promise<void>;
  isSending: boolean;
}

export const InternalNotifyDialog = ({ 
  open, 
  onOpenChange, 
  onSend, 
  isSending 
}: InternalNotifyDialogProps) => {
  const [selectedDept, setSelectedDept] = useState<string>("ops");
  const [note, setNote] = useState("");

  const departments = [
    { id: "ops", label: "Operations Team", icon: Users },
    { id: "visa", label: "Visa Department", icon: FileCheck },
    { id: "finance", label: "Finance Team", icon: Banknote },
    { id: "technical", label: "Technical Support", icon: Globe },
  ];

  const handleSend = async () => {
    if (!note.trim()) return;
    await onSend(selectedDept, note);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-6 border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-3 pb-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Bell className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Internal Department Notify</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Alert specific teams about this booking with a custom message.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Department</label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-12 rounded-xl border-border/60 bg-muted/30 focus:ring-primary/20">
                <SelectValue placeholder="Choose department" />
              </SelectTrigger>
              <SelectContent className="rounded-xl p-1">
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id} className="rounded-lg py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <dept.icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">{dept.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Add Internal Note</label>
            <Textarea
              placeholder="Type instructions or details for the department..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] rounded-xl border-border/60 bg-muted/30 focus:ring-primary/20 resize-none p-4 text-sm"
            />
          </div>

          <div className="p-4 rounded-xl bg-primary/[0.03] border border-primary/10 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This will send a priority email to the selected department containing all booking details, passenger info, and your custom note.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0 mt-6">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 font-semibold text-muted-foreground"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !note.trim()}
            className="rounded-xl h-11 gap-2 font-bold px-8 shadow-lg shadow-primary/20"
          >
            {isSending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4" /> Send Notification</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
