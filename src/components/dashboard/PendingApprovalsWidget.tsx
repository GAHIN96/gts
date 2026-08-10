import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Package,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings, useUpdateBooking, type Booking } from "@/hooks/useBookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PendingApprovalsWidget = () => {
  const navigate = useNavigate();
  const { data: bookings, isLoading } = useBookings();
  const updateBooking = useUpdateBooking();

  // Filter bookings that need approval
  const pendingApprovals = bookings?.filter(
    (b) => b.status === "payment_under_review"
  ).slice(0, 5) || [];

  const pendingPayments = bookings?.filter(
    (b) => b.status === "pending_payment"
  ).slice(0, 3) || [];

  const sendStatusNotification = async (booking: Booking, newStatus: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", booking.user_id)
        .maybeSingle();

      if (profile?.email) {
        await supabase.functions.invoke("booking-status-notification", {
          body: {
            bookingId: booking.id,
            newStatus,
            bookingNumber: booking.booking_number,
            bookingType: booking.booking_type,
            userEmail: profile.email,
            totalAmount: booking.total_amount,
          },
        });
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  const handleApprove = async (booking: Booking) => {
    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        status: "confirmed",
      });
      await sendStatusNotification(booking, "confirmed");
      toast.success(`Booking ${booking.booking_number} approved`);
    } catch (error) {
      toast.error("Failed to approve booking");
    }
  };

  const handleReject = async (booking: Booking) => {
    try {
      await updateBooking.mutateAsync({
        id: booking.id,
        status: "pending_payment",
      });
      await sendStatusNotification(booking, "pending_payment");
      toast.success(`Payment for ${booking.booking_number} rejected`);
    } catch (error) {
      toast.error("Failed to reject payment");
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = pendingApprovals.length + pendingPayments.length;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            Pending Approvals
            {totalPending > 0 && (
              <Badge className="bg-coral text-white">{totalPending}</Badge>
            )}
          </CardTitle>
          <CardDescription>Bookings requiring your attention</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/bookings")}
        >
          View All
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {totalPending === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success opacity-50" />
            <p>All caught up! No pending approvals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Payment Under Review - Priority */}
            {pendingApprovals.map((booking) => (
              <div
                key={booking.id}
                className="p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {booking.booking_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.package_departures?.group_packages?.name || booking.booking_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      ${booking.total_amount.toLocaleString()}
                    </p>
                    <Badge className="bg-primary/20 text-primary text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      Under Review
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {booking.passengers} passengers • {booking.package_departures?.departure_date && 
                      format(new Date(booking.package_departures.departure_date), "dd/MM/yyyy")}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="navy"
                      onClick={() => handleApprove(booking)}
                      disabled={updateBooking.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(booking)}
                      disabled={updateBooking.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Pending Payment - Secondary */}
            {pendingPayments.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Awaiting Payment
                </p>
                {pendingPayments.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gold/10 flex items-center justify-center">
                          <Package className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{booking.booking_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.passengers} passengers
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          ${booking.total_amount.toLocaleString()}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => navigate("/bookings")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
