import { useState } from "react";
import { 
  Download, 
  FileSpreadsheet, 
  Filter,
  Search,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  Package,
  PlaneTakeoff,
  Hotel,
  Compass,
  Stamp,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBookings } from "@/hooks/useBookings";
import { format } from "date-fns";
import { exportToExcel as generateExcel } from "@/utils/excelExport";
import jsPDF from "jspdf";

const bookingTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  package: { label: "Packages", icon: Package, color: "text-primary" },
  flight: { label: "Flights", icon: PlaneTakeoff, color: "text-coral" },
  hotel: { label: "Hotels", icon: Hotel, color: "text-gold" },
  tour: { label: "Tours", icon: Compass, color: "text-success" },
  visa: { label: "Visas", icon: Stamp, color: "text-purple-500" },
};

const FinancialReports = () => {
  const { data: bookings, isLoading } = useBookings();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");

  // Get bookings by type
  const getBookingsByType = (type: string) => bookings?.filter((b) => b.booking_type === type) || [];

  // Filter bookings
  const filteredBookings = bookings?.filter((booking) => {
    const matchesSearch = 
      booking.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.booking_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesType = activeTab === "all" || booking.booking_type === activeTab;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  // Stats per type
  const typeStats = {
    all: bookings?.length || 0,
    package: getBookingsByType("package").length,
    flight: getBookingsByType("flight").length,
    hotel: getBookingsByType("hotel").length,
    tour: getBookingsByType("tour").length,
    visa: getBookingsByType("visa").length,
  };

  // Calculate summary stats
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const confirmedRevenue = filteredBookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const pendingRevenue = filteredBookings
    .filter(b => b.status === 'pending_payment' || b.status === 'payment_under_review')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success/10 text-success border-success/20">Confirmed</Badge>;
      case 'pending_payment':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Pending Payment</Badge>;
      case 'payment_under_review':
        return <Badge className="bg-info/10 text-info border-info/20">Under Review</Badge>;
      case 'canceled':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Canceled</Badge>;
      case 'refunded':
        return <Badge className="bg-muted text-muted-foreground">Refunded</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const exportToExcel = () => {
    const exportData = filteredBookings.map((booking) => {
      // Parse passenger details
      const passengers = Array.isArray(booking.passenger_details) 
        ? booking.passenger_details 
        : [];
      
      const passengerNames = passengers
        .map((p: any) => `${p.firstName || ''} ${p.lastName || ''}`.trim())
        .filter(Boolean)
        .join(', ');

      const packageName = booking.package_departures?.group_packages?.name || 'N/A';
      const cityName = booking.package_departures?.group_packages?.cities?.name || 'N/A';
      const departureDate = booking.package_departures?.departure_date 
        ? format(new Date(booking.package_departures.departure_date), 'dd/MM/yyyy')
        : 'N/A';
      const returnDate = booking.package_departures?.return_date
        ? format(new Date(booking.package_departures.return_date), 'dd/MM/yyyy')
        : 'N/A';

      return {
        'Booking Number': booking.booking_number,
        'Booking Type': booking.booking_type,
        'Status': booking.status || 'draft',
        'Package Name': packageName,
        'Destination': cityName,
        'Departure Date': departureDate,
        'Return Date': returnDate,
        'Number of Passengers': booking.passengers || 1,
        'Passenger Names': passengerNames || 'N/A',
        'Total Amount (USD)': booking.total_amount,
        'Special Requests': booking.special_requests || '',
        'Notes': booking.notes || '',
        'Created At': booking.created_at ? format(new Date(booking.created_at), 'dd/MM/yyyy HH:mm') : 'N/A',
        'Updated At': booking.updated_at ? format(new Date(booking.updated_at), 'dd/MM/yyyy HH:mm') : 'N/A',
      };
    });

    const filename = `Financial_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    generateExcel(exportData, "Financial Report", filename);
  };

  // Export to PDF
  const exportToPDF = () => {
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFontSize(18);
    pdf.text('Financial Report', 14, 20);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 28);
    
    // Summary
    pdf.setFontSize(12);
    pdf.text(`Total Revenue: $${totalRevenue.toLocaleString()}`, 14, 40);
    pdf.text(`Confirmed: $${confirmedRevenue.toLocaleString()}`, 90, 40);
    pdf.text(`Pending: $${pendingRevenue.toLocaleString()}`, 160, 40);
    pdf.text(`Bookings: ${filteredBookings.length}`, 230, 40);
    
    // Table
    const headers = ['Booking #', 'Type', 'Service', 'Destination', 'Passengers', 'Amount', 'Status'];
    const colWidths = [35, 25, 55, 40, 25, 30, 25];
    let y = 55;
    
    pdf.setFillColor(26, 35, 126);
    pdf.rect(14, y - 6, pageWidth - 28, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    
    let x = 14;
    headers.forEach((header, i) => {
      pdf.text(header, x + 2, y);
      x += colWidths[i];
    });
    
    y += 8;
    pdf.setTextColor(0, 0, 0);
    
    filteredBookings.slice(0, 40).forEach((booking, index) => {
      if (y > 190) {
        pdf.addPage();
        y = 20;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(14, y - 5, pageWidth - 28, 8, 'F');
      }
      
      const row = [
        booking.booking_number,
        booking.booking_type,
        (booking.package_departures?.group_packages?.name || 'N/A').substring(0, 28),
        (booking.package_departures?.group_packages?.cities?.name || 'N/A'),
        String(booking.passengers || 1),
        `$${booking.total_amount.toLocaleString()}`,
        booking.status || 'draft',
      ];
      
      x = 14;
      pdf.setFontSize(8);
      row.forEach((cell, i) => {
        pdf.text(cell, x + 2, y);
        x += colWidths[i];
      });
      
      y += 8;
    });
    
    const filename = `Financial_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(filename);
  };

  const stats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Confirmed Revenue",
      value: `$${confirmedRevenue.toLocaleString()}`,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Pending Revenue",
      value: `$${pendingRevenue.toLocaleString()}`,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Total Bookings",
      value: filteredBookings.length.toString(),
      icon: TrendingUp,
      color: "text-info",
      bg: "bg-info/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-muted-foreground">Complete booking data for finance team review</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={exportToExcel} 
            disabled={filteredBookings.length === 0}
            className="bg-success hover:bg-success/90"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            onClick={exportToPDF} 
            disabled={filteredBookings.length === 0}
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs by Booking Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="all" className="gap-1">
            All <Badge variant="secondary" className="ml-1">{typeStats.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="package" className="gap-1">
            <Package className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.package}</Badge>
          </TabsTrigger>
          <TabsTrigger value="flight" className="gap-1">
            <PlaneTakeoff className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.flight}</Badge>
          </TabsTrigger>
          <TabsTrigger value="hotel" className="gap-1">
            <Hotel className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.hotel}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tour" className="gap-1">
            <Compass className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.tour}</Badge>
          </TabsTrigger>
          <TabsTrigger value="visa" className="gap-1">
            <Stamp className="h-3 w-3" /> <Badge variant="secondary" className="ml-1">{typeStats.visa}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by booking number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="payment_under_review">Under Review</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                Showing {filteredBookings.length} of {bookings?.length || 0} bookings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Package/Service</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead className="text-center">Passengers</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm font-medium">
                        {booking.booking_number}
                      </TableCell>
                      <TableCell className="capitalize">
                        {booking.booking_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell>
                        {booking.package_departures?.group_packages?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {booking.package_departures?.group_packages?.cities?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {booking.package_departures?.departure_date 
                          ? format(new Date(booking.package_departures.departure_date), 'dd MMM yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        {booking.passengers || 1}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${booking.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(booking.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {booking.created_at 
                          ? format(new Date(booking.created_at), 'dd/MM/yyyy')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialReports;
