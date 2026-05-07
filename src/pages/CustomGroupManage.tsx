import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Search, Boxes, Settings2, List } from "lucide-react";
import { CustomGroupPricingDialog } from "@/components/admin/CustomGroupPricingDialog";
import { CustomGroupSettingsPanel } from "@/components/admin/CustomGroupSettingsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  payment_under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function CustomGroupManage() {
  const [search, setSearch] = useState("");
  const [editBooking, setEditBooking] = useState<any>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["custom-group-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, profiles!bookings_user_id_fkey(email, full_name)")
        .eq("booking_type", "custom_group")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (bookings || []).filter((b: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.booking_number?.toLowerCase().includes(q) ||
      b.profiles?.email?.toLowerCase().includes(q) ||
      b.profiles?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Boxes className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Custom Group Management</h1>
      </div>

      <Tabs defaultValue="bookings" className="space-y-6">
        <TabsList className="rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="bookings" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <List className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
            <Settings2 className="h-4 w-4" />
            Builder Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-end">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No custom group bookings found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Agency / User</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Final</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b: any) => {
                    const meta = b.metadata || {};
                    const discountPct = meta.discount_percent || 0;
                    const discountAmt = meta.discount_amount || 0;
                    const originalTotal = meta.original_total || b.total_amount;
                    const discountDisplay = discountPct > 0
                      ? `${discountPct}%`
                      : discountAmt > 0
                        ? `$${discountAmt}`
                        : "—";

                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-sans font-medium text-sm">{b.booking_number}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium text-foreground">{b.profiles?.full_name || "—"}</p>
                            <p className="text-muted-foreground text-xs">{b.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{b.passengers || 1}</TableCell>
                        <TableCell className="text-right font-medium">${originalTotal}</TableCell>
                        <TableCell className="text-right">{discountDisplay}</TableCell>
                        <TableCell className="text-right font-bold text-primary">${b.total_amount}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[b.status] || ""} variant="secondary">
                            {b.status?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {b.created_at ? format(new Date(b.created_at), "dd MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditBooking(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <CustomGroupSettingsPanel />
        </TabsContent>
      </Tabs>

      {editBooking && (
        <CustomGroupPricingDialog
          open={!!editBooking}
          onOpenChange={(open) => !open && setEditBooking(null)}
          booking={editBooking}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
