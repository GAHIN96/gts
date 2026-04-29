import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUpdateSpecialRequest } from "@/hooks/useSpecialRequests";
import { Loader2, Send, Clock, User, DollarSign, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const formSchema = z.object({
  admin_response: z.string().min(10, "Response must be at least 10 characters"),
  status: z.string().min(1, "Status is required"),
});

type FormData = z.infer<typeof formSchema>;

interface SpecialRequest {
  id: string;
  request_type: string;
  description: string;
  travelers?: number | null;
  budget?: number | null;
  priority?: string | null;
  status?: string | null;
  admin_response?: string | null;
  created_at: string;
}

interface SpecialRequestResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SpecialRequest | null;
}

const formatRequestType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case "high": return "text-destructive";
    case "medium": return "text-gold";
    case "low": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
};

export function SpecialRequestResponseDialog({ 
  open, 
  onOpenChange, 
  request 
}: SpecialRequestResponseDialogProps) {
  const updateRequest = useUpdateSpecialRequest();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      admin_response: request?.admin_response || "",
      status: request?.status || "in_review",
    },
  });

  // Update form when request changes
  useState(() => {
    if (request) {
      form.reset({
        admin_response: request.admin_response || "",
        status: request.status || "in_review",
      });
    }
  });

  const onSubmit = async (data: FormData) => {
    if (!request) return;
    
    try {
      await updateRequest.mutateAsync({
        id: request.id,
        admin_response: data.admin_response,
        status: data.status,
      });
      toast.success("Response sent successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to send response");
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Respond to Request
          </DialogTitle>
          <DialogDescription>
            Review the request details and provide your response
          </DialogDescription>
        </DialogHeader>

        {/* Request Summary */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-primary/5">
              {formatRequestType(request.request_type)}
            </Badge>
            <span className={`text-sm font-medium capitalize ${getPriorityColor(request.priority)}`}>
              {request.priority || 'Normal'} Priority
            </span>
          </div>
          
          <p className="text-sm text-foreground">{request.description}</p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {request.travelers || 1} travelers
            </span>
            {request.budget && (
              <span className="flex items-center gap-1 text-primary font-medium">
                <DollarSign className="h-3.5 w-3.5" />
                ${request.budget} budget
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="admin_response"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Response</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your response to this request..."
                      className="min-h-[120px] resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="navy" disabled={updateRequest.isPending}>
                {updateRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send Response
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
