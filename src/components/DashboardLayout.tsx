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

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  const items = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Book", icon: Package, path: "/packages" },
    { label: "History", icon: History, path: role === "agency" ? "/booking-history" : "/bookings" },
    { label: "Settings", icon: Settings, path: role === "agency" ? "/agency-profile" : "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden frosted-glass border-t border-border/40 shadow-[0_-4px_20px_hsl(var(--foreground)/0.06)] print:hidden pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-all active:scale-90",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "text-primary scale-110")} />
              <span className={cn("text-[10px] font-semibold", isActive && "text-primary")}>{item.label}</span>
              {isActive && (
                <div className="absolute bottom-1.5 h-1 w-6 rounded-full bg-primary" />
              )}
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
