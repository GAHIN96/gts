import { 
  Star, 
  Plus, 
  Search,
  Filter,
  Clock,
  MessageSquare,
  MessageSquarePlus,
  CheckCircle,
  AlertCircle,
  Eye,
  Reply,
  Send,
  Users,
  DollarSign,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  useSpecialRequests,
  useMySpecialRequests,
  useUpdateSpecialRequest
} from "@/hooks/useSpecialRequests";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { SpecialRequestForm } from "@/components/admin/SpecialRequestForm";
import { SpecialRequestResponseDialog } from "@/components/admin/SpecialRequestResponseDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { useBannerSettings } from "@/hooks/useBannerSettings";

const getStatusConfig = (status: string | null) => {
  switch (status) {
    case "pending":
      return { label: "Pending", icon: Clock, className: "bg-gold/10 text-gold border-gold/30" };
    case "in_review":
      return { label: "In Review", icon: Eye, className: "bg-primary/10 text-primary border-primary/30" };
    case "resolved":
      return { label: "Resolved", icon: CheckCircle, className: "bg-success/10 text-success border-success/30" };
    case "rejected":
      return { label: "Rejected", icon: AlertCircle, className: "bg-destructive/10 text-destructive border-destructive/30" };
    default:
      return { label: status || "Pending", icon: Clock, className: "bg-muted text-muted-foreground" };
  }
};

const getPriorityConfig = (priority: string | null) => {
  switch (priority) {
    case "high":
      return { label: "High", className: "bg-destructive/10 text-destructive border-destructive/30" };
    case "medium":
      return { label: "Medium", className: "bg-gold/10 text-gold border-gold/30" };
    case "low":
      return { label: "Low", className: "bg-muted text-muted-foreground border-border" };
    default:
      return null;
  }
};

const getRequestTypeIcon = (type: string) => {
  const map: Record<string, React.ElementType> = {
    custom_package: Sparkles,
    group_booking: Users,
    special_pricing: DollarSign,
    vip_service: Star,
  };
  return map[type.toLowerCase()] || MessageSquare;
};

const formatRequestType = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

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
  user_id: string;
}

const SpecialRequests = () => {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const { banners } = useBannerSettings();
  const heroImages = [banners.specialRequests];
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [userMessageDialogOpen, setUserMessageDialogOpen] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<SpecialRequest | null>(null);

  const handleRespond = (request: SpecialRequest) => {
    setSelectedRequest(request);
    setResponseDialogOpen(true);
  };

  const handleOpenUserMessage = (request: SpecialRequest) => {
    setSelectedRequest(request);
    setUserNote("");
    setUserMessageDialogOpen(true);
  };

  const handleSendUserMessage = async () => {
    if (!selectedRequest || !userNote.trim()) return;
    try {
      const updatedDescription = `${selectedRequest.description}\n\n[User Note - ${new Date().toLocaleDateString()}]: ${userNote.trim()}`;
      await updateRequest.mutateAsync({
        id: selectedRequest.id,
        description: updatedDescription,
        status: "pending",
      });
      toast.success("Note added to request");
      setUserMessageDialogOpen(false);
      setUserNote("");
    } catch (error) {
      toast.error("Failed to update request");
    }
  };

  const { data: allRequests, isLoading: isLoadingAll } = useSpecialRequests();
  const { data: myRequests, isLoading: isLoadingMy } = useMySpecialRequests();
  const updateRequest = useUpdateSpecialRequest();

  const requests = isAdmin ? allRequests : myRequests;
  const isLoading = isAdmin ? isLoadingAll : isLoadingMy;

  const filteredRequests = requests?.filter(request => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      request.request_type.toLowerCase().includes(query) ||
      request.description.toLowerCase().includes(query)
    );
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateRequest.mutateAsync({ id, status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <SpecialRequestForm open={formOpen} onOpenChange={setFormOpen} />
      <SpecialRequestResponseDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        request={selectedRequest}
      />

      {/* User Message Dialog */}
      <Dialog open={userMessageDialogOpen} onOpenChange={setUserMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Request Details & Messages
            </DialogTitle>
            <DialogDescription>
              View updates or send additional context to support
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between font-semibold">
                  <span>Type: {formatRequestType(selectedRequest.request_type)}</span>
                  <Badge variant="outline">{selectedRequest.status || "pending"}</Badge>
                </div>
                <p className="text-muted-foreground">{selectedRequest.description}</p>
                {selectedRequest.admin_response && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                    <p className="font-bold text-primary mb-1 uppercase tracking-wide">Support Response:</p>
                    <p className="text-foreground/90">{selectedRequest.admin_response}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Add a note or message for support
                </label>
                <Textarea
                  placeholder="Type your message or additional request details here..."
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setUserMessageDialogOpen(false)}>
                  Close
                </Button>
                <Button 
                  variant="navy" 
                  onClick={handleSendUserMessage} 
                  disabled={!userNote.trim() || updateRequest.isPending}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Send Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row gap-3 justify-between">
        <div className="flex flex-1 flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search requests..." 
              className="pl-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="navy" className="rounded-xl shrink-0" onClick={() => setFormOpen(true)}>
          {isAdmin ? <Plus className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          {isAdmin ? "Create Request" : "New Request"}
        </Button>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex gap-4 flex-1">
                    <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                    <div className="space-y-3 flex-1">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-4">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-start">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-20 rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="No special requests found"
          description={searchQuery ? "Try adjusting your search or filters" : "Create your first special request to get started"}
          actionLabel="Create Request"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request, index) => {
            const statusConfig = getStatusConfig(request.status);
            const priorityConfig = getPriorityConfig(request.priority);
            const TypeIcon = getRequestTypeIcon(request.request_type);
            const StatusIcon = statusConfig.icon;

            return (
              <Card 
                key={request.id} 
                className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in overflow-hidden"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left accent + icon */}
                    <div className="hidden md:flex w-20 items-center justify-center bg-muted/30 border-r border-border/50">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-primary/5 text-[11px] font-semibold">
                              {formatRequestType(request.request_type)}
                            </Badge>
                            {priorityConfig && (
                              <Badge className={`${priorityConfig.className} text-[11px]`}>
                                {priorityConfig.label}
                              </Badge>
                            )}
                            <Badge className={`${statusConfig.className} text-[11px] gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                            {request.description}
                          </p>

                          {/* Meta info */}
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {request.travelers || 1} travelers
                            </span>
                            {request.budget && (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                <DollarSign className="h-3.5 w-3.5" />
                                ${request.budget.toLocaleString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {request.created_at 
                                ? formatDistanceToNow(new Date(request.created_at), { addSuffix: true })
                                : 'Unknown'}
                            </span>
                          </div>

                          {/* Admin Response */}
                          {request.admin_response && (
                            <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
                              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Admin Response</p>
                              <p className="text-sm text-foreground/80">{request.admin_response}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isAdmin && (
                            <Select 
                              value={request.status || "pending"} 
                              onValueChange={(value) => handleStatusChange(request.id, value)}
                            >
                              <SelectTrigger className="w-[130px] h-9 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {isAdmin ? (
                            <Button variant="navy" size="sm" className="rounded-lg" onClick={() => handleRespond(request)}>
                              <Reply className="h-4 w-4 mr-1" />
                              Respond
                            </Button>
                          ) : (
                            <Button variant="navy" size="sm" className="rounded-lg" onClick={() => handleOpenUserMessage(request)}>
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpecialRequests;
