import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SectionGuard } from "@/components/SectionGuard";
import { ThemeProvider } from "@/components/ThemeProvider";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Packages from "./pages/Packages";
import BookPackage from "./pages/BookPackage";
import Flights from "./pages/Flights";
import Hotels from "./pages/Hotels";
import Tours from "./pages/Tours";
import TourDetail from "./pages/TourDetail";
import Visas from "./pages/Visas";
import Transfers from "./pages/Transfers";
import RequestsAndServices from "./pages/RequestsAndServices";
// Payments page removed - integrated into FinanceCenter
import Bookings from "./pages/Bookings";
import BookingHistory from "./pages/BookingHistory";
import BookingDetail from "./pages/BookingDetail";
import BookingCalendar from "./pages/BookingCalendar";
import BookingAnalytics from "./pages/BookingAnalytics";
import Agencies from "./pages/Agencies";
import UsersRoles from "./pages/UsersRoles";
import Reports from "./pages/Reports";
import FinanceCenter from "./pages/FinanceCenter";
import Settings from "./pages/Settings";
import VoucherCustomization from "./pages/VoucherCustomization";
import CommissionManagement from "./pages/CommissionManagement";
import BookFlight from "./pages/BookFlight";
import BookCustomGroup from "./pages/BookCustomGroup";
import BuildCustomGroup from "./pages/BuildCustomGroup";
import CustomGroupManage from "./pages/CustomGroupManage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Countries from "./pages/Countries";
import Airlines from "./pages/Airlines";
import Airports from "./pages/Airports";
import Amenities from "./pages/Amenities";
import Cities from "./pages/Cities";
import AuditLogs from "./pages/AuditLogs";
import PermissionsManager from "./pages/PermissionsManager";
import SecurityMonitor from "./pages/SecurityMonitor";
import AgencyProfile from "./pages/AgencyProfile";
import HotelAvailabilityReconciliation from "./pages/HotelAvailabilityReconciliation";

// Smart router: agencies go to their detail page, admins/finance stay on BookingDetail
const BookingDetailRouter = () => {
  const { id } = useParams();
  const { role } = useAuth();
  if (role === "agency") {
    return <Navigate to={`/booking-history/${id}`} replace />;
  }
  return <BookingDetail />;
};
import { isAbortError } from "@/utils/errorUtils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (isAbortError(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="gts-travel-theme">
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="packages" sectionName="Group Packages">
                      <Packages />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/:id"
              element={<Navigate to="/packages" replace />}
            />
            <Route
              path="/packages/:id/book"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="packages" sectionName="Group Packages">
                      <BookPackage />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/custom-group/build"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="build_custom" sectionName="Build Custom Group">
                      <BuildCustomGroup />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/custom-group/book"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="build_custom" sectionName="Build Custom Group">
                      <BookCustomGroup />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/custom-group/manage"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <CustomGroupManage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/flights"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="flights" sectionName="Flights">
                      <Flights />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/flights/:id/book"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="flights" sectionName="Flights">
                      <BookFlight />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hotels"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="hotels" sectionName="Hotels">
                      <Hotels />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tours"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="tours" sectionName="Tours">
                      <Tours />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tours/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="tours" sectionName="Tours">
                      <TourDetail />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/visas"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="visas" sectionName="Visas">
                      <Visas />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="transfers" sectionName="Transfers">
                      <Transfers />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests-and-services"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <SectionGuard sectionKey="requests" sectionName="Requests & Services">
                      <RequestsAndServices />
                    </SectionGuard>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/payments" element={<Navigate to="/finance" replace />} />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Bookings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BookingDetailRouter />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-history"
              element={
                <ProtectedRoute allowedRoles={['agency']}>
                  <DashboardLayout>
                    <BookingHistory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-history/:id"
              element={
                <ProtectedRoute allowedRoles={['agency']}>
                  <DashboardLayout>
                    <BookingDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-calendar"
              element={<Navigate to="/reports" replace />}
            />
            <Route
              path="/booking-analytics"
              element={<Navigate to="/reports" replace />}
            />
            <Route
              path="/agencies"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <Agencies />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <UsersRoles />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'finance']}>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={['admin', 'finance']}>
                  <DashboardLayout>
                    <FinanceCenter />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/financial-reports" element={<Navigate to="/finance" replace />} />
            <Route path="/finance-dashboard" element={<Navigate to="/finance" replace />} />
            <Route path="/credit-report" element={<Navigate to="/finance" replace />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'finance']}>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/voucher-customization"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <VoucherCustomization />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/commission"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DashboardLayout>
                    <CommissionManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/countries" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><Countries /></DashboardLayout></ProtectedRoute>} />
            <Route path="/airlines" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><Airlines /></DashboardLayout></ProtectedRoute>} />
            <Route path="/airports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><Airports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/amenities" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><Amenities /></DashboardLayout></ProtectedRoute>} />
            <Route path="/cities" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><Cities /></DashboardLayout></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AuditLogs /></DashboardLayout></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PermissionsManager /></DashboardLayout></ProtectedRoute>} />
            <Route path="/security" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><SecurityMonitor /></DashboardLayout></ProtectedRoute>} />
            <Route path="/my-agency" element={<ProtectedRoute allowedRoles={['agency']}><DashboardLayout><AgencyProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hotels/reconciliation" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><HotelAvailabilityReconciliation /></DashboardLayout></ProtectedRoute>} />
            <Route path="/pnr-bookings" element={<Navigate to="/bookings" replace />} />
            <Route path="/pnr-reports" element={<Navigate to="/reports" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
