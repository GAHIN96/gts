import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { FloatingAIChat } from "@/components/FloatingAIChat";
import { RealtimeBookingAlerts } from "@/components/dashboard/RealtimeBookingAlerts";
import { CommandPalette } from "@/components/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

import { LayoutDashboard, Plane, BedDouble, Package, FileCheck, History, Settings } from "lucide-react";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  const items = [
    { label: "Home", icon: LayoutDashboard, path: "/" },
    { label: "Flights", icon: Plane, path: "/flights" },
    { label: "Packages", icon: Package, path: "/packages" },
    { label: "Visas", icon: FileCheck, path: "/visas" },
    { label: "Bookings", icon: History, path: role === "agency" ? "/booking-history" : "/bookings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-2xl border-t border-border/40 shadow-[0_-8px_25px_rgba(0,0,0,0.12)] print:hidden pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-16 px-1.5">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 rounded-xl transition-all active:scale-95 touch-manipulation",
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 h-1 w-8 rounded-b-full bg-primary shadow-[0_2px_8px_hsl(var(--primary))]" />
              )}
              <item.icon className={cn("h-5 w-5 transition-all duration-200", isActive && "text-primary scale-110 -translate-y-0.5")} />
              <span className={cn("text-[10px] tracking-tight font-medium transition-colors", isActive && "text-primary font-semibold")}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

import { useMockDataInserter } from "@/hooks/useMockDataInserter";

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role } = useAuth();
  const isAdmin = role === "admin" || role === "finance";
  
  useMockDataInserter();

  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto relative">
            {children}
          </main>
        </SidebarInset>
      </div>
      <FloatingAIChat />
      <CommandPalette />
      {isAdmin && <RealtimeBookingAlerts />}
      <MobileBottomNav />
    </SidebarProvider>
  );
};

export default DashboardLayout;
