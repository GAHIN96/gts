import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Package,
  PlaneTakeoff,
  Hotel,
  Compass,
  Stamp,
  Car,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  Shield,
  FileText,
  Building2,
  Globe,
  MapPin,
  DollarSign,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommandItem {
  label: string;
  icon: React.ElementType;
  url: string;
  keywords?: string;
  roles?: string[];
}

const navigationItems: CommandItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, url: "/", keywords: "home overview" },
  { label: "Group Packages", icon: Package, url: "/packages", keywords: "tours groups travel" },
  { label: "Create Package", icon: Package, url: "/packages/create", keywords: "new add", roles: ["admin"] },
  { label: "Flights", icon: PlaneTakeoff, url: "/flights", keywords: "airplane airline" },
  { label: "Hotels", icon: Hotel, url: "/hotels", keywords: "accommodation rooms" },
  { label: "Tours", icon: Compass, url: "/tours", keywords: "activities experiences" },
  { label: "Visas", icon: Stamp, url: "/visas", keywords: "passport documents" },
  { label: "Transfers", icon: Car, url: "/transfers", keywords: "transport pickup" },
  { label: "Bookings", icon: Calendar, url: "/bookings", keywords: "reservations orders" },
  { label: "Payments", icon: CreditCard, url: "/payments", keywords: "billing invoices", roles: ["admin", "finance"] },
  { label: "Agencies", icon: Building2, url: "/agencies", keywords: "partners agents", roles: ["admin"] },
  { label: "Users & Roles", icon: Users, url: "/users-roles", keywords: "accounts permissions", roles: ["admin"] },
  { label: "Reports", icon: BarChart3, url: "/reports", keywords: "analytics statistics", roles: ["admin", "finance"] },
  { label: "Financial Reports", icon: DollarSign, url: "/financial-reports", keywords: "revenue profit", roles: ["admin", "finance"] },
  { label: "Booking Analytics", icon: BarChart3, url: "/booking-analytics", keywords: "charts data", roles: ["admin", "finance"] },
  { label: "Countries", icon: Globe, url: "/countries", keywords: "destinations", roles: ["admin"] },
  { label: "Cities", icon: MapPin, url: "/cities", keywords: "locations", roles: ["admin"] },
  { label: "Airlines", icon: PlaneTakeoff, url: "/airlines", keywords: "carriers", roles: ["admin"] },
  { label: "Airports", icon: PlaneTakeoff, url: "/airports", keywords: "terminals", roles: ["admin"] },
  { label: "Additional Services", icon: Sparkles, url: "/additional-services", keywords: "extras add-ons", roles: ["admin"] },
  { label: "Special Requests", icon: FileText, url: "/special-requests", keywords: "custom" },
  { label: "Security Monitor", icon: Shield, url: "/security", keywords: "audit logs alerts", roles: ["admin"] },
  { label: "Settings", icon: Settings, url: "/settings", keywords: "preferences config" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredItems = useMemo(() => {
    return navigationItems.filter((item) => {
      if (!item.roles) return true;
      return role && item.roles.includes(role);
    });
  }, [role]);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages... (Ctrl+K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {filteredItems.map((item) => (
            <CommandItem
              key={item.url}
              value={`${item.label} ${item.keywords || ""}`}
              onSelect={() => handleSelect(item.url)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
