import React, { useState, useEffect } from "react";
import { 
  MessageCircle, 
  Send,
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

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  defaultMessage: string;
}

export const WhatsAppDialog = ({ 
  open, 
  onOpenChange, 
  phoneNumber,
  defaultMessage
}: WhatsAppDialogProps) => {
  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    if (open) {
      setMessage(defaultMessage);
    }
  }, [open, defaultMessage]);

  const handleSend = () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-2xl p-6 border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-3 pb-4">
          <div className="h-14 w-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center mb-2">
            <MessageCircle className="h-7 w-7 text-[#25D366]" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Edit WhatsApp Message</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Customize the message before sending it to the passenger.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Message Template</label>
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[200px] rounded-xl border-border/60 bg-muted/30 focus:ring-[#25D366]/20 resize-none p-4 text-sm leading-relaxed"
            />
          </div>

          <div className="p-4 rounded-xl bg-[#25D366]/[0.03] border border-[#25D366]/10 flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-[#25D366] shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This message will be sent to <strong>{phoneNumber}</strong>. You can use standard formatting like *bold*, _italic_, or ~strikethrough~.
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
            className="rounded-xl h-11 gap-2 font-bold px-8 shadow-lg shadow-[#25D366]/20 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <Send className="h-4 w-4" /> Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
