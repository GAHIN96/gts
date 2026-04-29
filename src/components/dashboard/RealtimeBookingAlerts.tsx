import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Package, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface NewBooking {
  id: string;
  booking_number: string;
  booking_type: string;
  total_amount: number;
  passengers: number;
  created_at: string;
}

export function RealtimeBookingAlerts() {
  const [newBookings, setNewBookings] = useState<NewBooking[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel("booking-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const booking = payload.new as NewBooking;
          
          // Add to list
          setNewBookings((prev) => [booking, ...prev.slice(0, 9)]);
          
          // Show toast notification
          toast.success("New Booking Created!", {
            description: `Booking ${booking.booking_number} - ${booking.booking_type} - $${booking.total_amount.toLocaleString()}`,
            action: {
              label: "View",
              onClick: () => navigate("/bookings"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleDismiss = (id: string) => {
    setNewBookings((prev) => prev.filter((b) => b.id !== id));
  };

  const handleDismissAll = () => {
    setNewBookings([]);
  };

  if (newBookings.length === 0 && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Floating Alert Button */}
      {newBookings.length > 0 && !isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 px-6 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-pulse"
          >
            <Bell className="h-5 w-5 mr-2" />
            {newBookings.length} New Booking{newBookings.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Alert Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96">
          <Card className="shadow-xl border-2 border-primary/20">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                New Bookings
                {newBookings.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground">
                    {newBookings.length}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {newBookings.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismissAll}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {newBookings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No new bookings
                </p>
              ) : (
                <ScrollArea className="h-72">
                  <div className="space-y-3">
                    {newBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {booking.booking_number}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="capitalize text-xs">
                                  {booking.booking_type}
                                </Badge>
                                <span>•</span>
                                <span>{booking.passengers || 1} pax</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                            onClick={() => handleDismiss(booking.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-primary">
                            ${Number(booking.total_amount).toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.created_at), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  navigate("/bookings");
                  setIsOpen(false);
                }}
              >
                View All Bookings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
