import { useEffect } from "react";
import { Moon, Sun, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNavigate, useLocation } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb";

// Route label map for breadcrumbs
const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "packages": "Group Packages",
  "flights": "Flights",
  "hotels": "Hotels",
  "tours": "Tours",
  "visas": "Visas",
  "transfers": "Transfers",
  "special-requests": "Special Requests",
  "additional-services": "Additional Services",
  "booking-history": "Booking History",
  "bookings": "Bookings",
  "payments": "Payments",
  "finance-dashboard": "Finance Dashboard",
  "credit-report": "Credit Report",
  "commission": "Commission",
  "users": "Users & Roles",
  "reports": "Reports & Analytics",
  "financial-reports": "Financial Reports",
  "countries": "Countries",
  "cities": "Manage Cities",
  "airports": "Manage Airports",
  "airlines": "Manage Airlines",
  "amenities": "Amenities",
  "settings": "Settings",
  "agencies": "Agencies",
  "voucher-customization": "Voucher Template",
  "audit-logs": "Audit Logs",
  "permissions": "Permissions",
  "security": "Security Monitor",
  "new": "New",
  "edit": "Edit",
  "book": "Book",
};

const DashboardHeader = () => {
  const { user, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings: companySettings, refetch } = useCompanySettings();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleSettingsUpdate = () => refetch();
    window.addEventListener("company-settings-updated", handleSettingsUpdate);
    return () => window.removeEventListener("company-settings-updated", handleSettingsUpdate);
  }, [refetch]);

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-coral text-white';
      case 'finance': return 'bg-gold text-navy';
      default: return 'bg-navy text-white';
    }
  };

  const isDark = theme === "dark";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    if (!user?.email) return "";
    const name = user.user_metadata?.full_name || user.email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Build breadcrumbs from pathname, hiding UUID segments
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments
    .map((seg, i) => {
      const path = "/" + pathSegments.slice(0, i + 1).join("/");
      const label = routeLabels[seg] || seg;
      return { label, path };
    })
    .filter(crumb => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(crumb.label));

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">

          {/* Greeting + Breadcrumbs */}
          <div className="hidden sm:flex items-center gap-3">
            {pathSegments.length === 0 && (
              <span className="text-sm font-medium text-muted-foreground">
                {getGreeting()}, <span className="text-foreground font-semibold">{getUserName()}</span>
              </span>
            )}
          </div>
          {breadcrumbs.length > 0 && (
            <nav className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => navigate("/")}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
              >
                Dashboard
              </button>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={crumb.path} className="flex items-center gap-1">
                    <span className="text-muted-foreground/40 text-xs">›</span>
                    {isLast ? (
                      <span className="text-xs font-semibold text-foreground bg-primary/8 px-2.5 py-1 rounded-md">
                        {crumb.label}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate(crumb.path)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md hover:bg-muted/60 transition-colors cursor-pointer"
                      >
                        {crumb.label}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-muted"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun className="h-4 w-4 text-primary" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1">
                <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition-all hover:ring-primary/60">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl shadow-lg border-border/50" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  <Badge className={`w-fit ${getRoleBadgeColor()}`}>
                    {role?.toUpperCase() || 'USER'}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-lg cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive rounded-lg cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
