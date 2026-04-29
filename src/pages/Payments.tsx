import { useState } from "react";
import { 
  CreditCard, Search, DollarSign, Clock, CheckCircle, XCircle, Eye, FileText,
  Download, Ticket, Loader2, CheckSquare, Square, Building2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UniversalVoucher, VoucherType } from "@/components/booking/UniversalVoucher";
import { toast } from "sonner";
import { usePayments, useApprovePayment, useRejectPayment, Payment } from "@/hooks/usePayments";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "unpaid":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Unpaid</Badge>;
    case "proof_uploaded":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">Rejected</Badge>;
    case "refunded":
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">Refunded</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{status}</Badge>;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case "qicard": return "QiCard";
    case "first_iraqi_bank": return "First Iraqi Bank";
    case "bank_transfer": return "Bank Transfer";
    case "pay_in_office": return "Pay in Office";
    case "pay_by_transfer": return "Pay by Transfer";
    case "pay_by_card": return "Pay by Card";
    case "rasheed_bank": return "Rasheed Bank";
    case "trade_bank_iraq": return "Trade Bank of Iraq (TBI)";
    case "national_bank_iraq": return "National Bank of Iraq";
    case "kurdistan_intl_bank": return "Kurdistan International Bank";
    default: return method;
  }
};

const Payments = () => {
  const { data: payments, isLoading, refetch } = usePayments();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const pendingPayments = payments?.filter((p) => p.status === "proof_uploaded") || [];
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedPayments = payments?.filter((p) => p.status === "approved") || [];
  const approvedTotal = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Reconciliation stats
  const totalBooked = payments?.reduce((sum, p) => {
    if (p.bookings?.total_amount) return sum + Number(p.bookings.total_amount);
    return sum;
  }, 0) || 0;
  const totalCollected = approvedTotal;
  const outstanding = totalBooked - totalCollected;

  const handleApprove = async (payment: Payment) => {
    try {
      await approvePayment.mutateAsync(payment.id);
      toast.success("Payment approved!");
    } catch (error: any) {
      toast.error("Failed to approve payment", { description: error.message });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const id of selectedIds) {
      try {
        await approvePayment.mutateAsync(id);
        success++;
      } catch {}
    }
    toast.success(`${success} payment(s) approved`);
    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    let success = 0;
    for (const id of selectedIds) {
      try {
        await rejectPayment.mutateAsync({ id, reason: bulkRejectReason });
        success++;
      } catch {}
    }
    toast.success(`${success} payment(s) rejected`);
    setSelectedIds([]);
    setBulkRejectOpen(false);
    setBulkRejectReason("");
  };

  const handleRejectClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPayment) return;
    try {
      await rejectPayment.mutateAsync({ id: selectedPayment.id, reason: rejectReason });
      toast.error("Payment rejected");
      setRejectModalOpen(false);
      setSelectedPayment(null);
    } catch (error: any) {
      toast.error("Failed to reject payment", { description: error.message });
    }
  };

  const handleViewVoucher = (payment: Payment) => {
    setSelectedPayment(payment);
    setVoucherModalOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingIds = filteredPayments.filter(p => p.status === "proof_uploaded").map(p => p.id);
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const filteredPayments = (payments || []).filter(payment => {
    const matchesSearch = !searchQuery || 
      payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.bookings?.booking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedPendingCount = selectedIds.filter(id => 
    pendingPayments.some(p => p.id === id)
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voucher Modal */}
      <Dialog open={voucherModalOpen} onOpenChange={setVoucherModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Booking Voucher</DialogTitle>
          </DialogHeader>
          {selectedPayment && selectedPayment.bookings && (
            <UniversalVoucher
              details={{
                type: (selectedPayment.bookings.booking_type as VoucherType) || "package",
                bookingId: selectedPayment.bookings.id,
                bookingNumber: selectedPayment.bookings.booking_number,
                serviceName: selectedPayment.bookings.package_departures?.group_packages?.name || "Service",
                totalAmount: Number(selectedPayment.amount),
                passengerCount: selectedPayment.bookings.passengers || 1,
                passengerNames: [],
                destination: selectedPayment.bookings.package_departures?.group_packages?.cities?.name,
                departureDate: selectedPayment.bookings.package_departures?.departure_date 
                  ? new Date(selectedPayment.bookings.package_departures.departure_date) : undefined,
                returnDate: selectedPayment.bookings.package_departures?.return_date
                  ? new Date(selectedPayment.bookings.package_departures.return_date) : undefined,
                status: selectedPayment.status === "approved" ? "confirmed" : "pending",
              }}
              onClose={() => setVoucherModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Reject Payment</DialogTitle>
            <DialogDescription className="text-xs">Provide a reason for rejecting this payment.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[80px] text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="text-xs h-8">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm} disabled={rejectPayment.isPending} className="text-xs h-8">
              {rejectPayment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Modal */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">Reject {selectedPendingCount} Payment(s)</DialogTitle>
            <DialogDescription className="text-xs">This will reject all selected pending payments.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={bulkRejectReason}
            onChange={(e) => setBulkRejectReason(e.target.value)}
            className="min-h-[80px] text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkRejectOpen(false)} className="text-xs h-8">Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkReject} className="text-xs h-8">
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payments
          </h1>
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-amber-600 border-amber-300">
              <Clock className="h-3 w-3" />
              {pendingPayments.length} Pending (${pendingTotal.toLocaleString()})
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-emerald-600 border-emerald-300">
              <CheckCircle className="h-3 w-3" />
              ${approvedTotal.toLocaleString()} Collected
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-destructive border-destructive/30">
              ${outstanding.toLocaleString()} Outstanding
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Search booking #, reference..." 
            className="pl-8 h-8 text-xs" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="proof_uploaded">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            <Badge variant="secondary" className="text-[11px]">{selectedIds.length} selected</Badge>
            <Button size="sm" onClick={handleBulkApprove} disabled={approvePayment.isPending} className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="h-3 w-3" /> Approve All
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkRejectOpen(true)} className="h-7 text-[11px] gap-1 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3" /> Reject All
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-7 text-[11px]">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === filteredPayments.filter(p => p.status === "proof_uploaded").length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-xs">Booking</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Proof</TableHead>
                <TableHead className="text-xs">Submitted</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className={selectedIds.includes(payment.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      {payment.status === "proof_uploaded" && (
                        <Checkbox
                          checked={selectedIds.includes(payment.id)}
                          onCheckedChange={() => toggleSelect(payment.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-mono">{payment.bookings?.booking_number || "N/A"}</p>
                      <p className="text-[10px] text-muted-foreground">{payment.bookings?.booking_type}</p>
                    </TableCell>
                    <TableCell className="text-xs font-bold">${Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-[11px]">{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                    <TableCell>
                      {payment.proof_url ? (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-primary" onClick={() => window.open(payment.proof_url!, "_blank")}>
                          <FileText className="h-3 w-3 mr-1" /> View
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground font-mono">
                      {format(new Date(payment.created_at!), "MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status || "unpaid")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {payment.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handleViewVoucher(payment)} className="h-6 px-2 text-[11px] gap-1">
                            <Ticket className="h-3 w-3" /> Voucher
                          </Button>
                        )}
                        {payment.status === "proof_uploaded" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(payment)} disabled={approvePayment.isPending} className="h-6 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectClick(payment)} className="h-6 px-2 text-[11px] gap-1 text-destructive border-destructive/30">
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {payment.status === "rejected" && payment.rejection_reason && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={payment.rejection_reason}>
                            {payment.rejection_reason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
