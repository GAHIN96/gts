import { useMemo, useState, useEffect, forwardRef } from "react";
import gtsLogoOfficial from "@/assets/gts-logo-official.png";
import { VisaDocIcon } from "@/components/icons/VisaDocIcon";
import { FlightGlobeIcon } from "@/components/icons/FlightGlobeIcon";
import { GroupPackageIcon } from "@/components/icons/GroupPackageIcon";
import { BuildGroupIcon } from "@/components/icons/BuildGroupIcon";
import {
  Plane, BedDouble, Map, FileCheck, MessageSquarePlus, CirclePlus, ArrowLeftRight,
  Clock, ListChecks,
  TrendingUp, UsersRound, Landmark, PieChart, Percent,
  Globe, Building2, Gem, MapPin, Shield, Lock, ShieldAlert, Settings2,
  Pencil, LogOut, HelpCircle, Scale, Plus, ChevronsLeft, ChevronsRight, ChevronDown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useNotifications } from "@/hooks/useNotifications";
import { useActiveSections, type ActiveSections } from "@/hooks/useActiveSections";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VisaIcon = forwardRef<HTMLSpanElement, { className?: string }>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("inline-flex items-center justify-center", className)} {...props}>
    <VisaDocIcon className="w-full h-full" size={undefined as any} color="currentColor" />
  </span>
)) as any;

const FlightIcon = forwardRef<HTMLSpanElement, { className?: string }>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("inline-flex items-center justify-center", className)} {...props}>
    <FlightGlobeIcon className="w-full h-full" size={undefined as any} color="currentColor" />
  </span>
)) as any;

const GroupPkgIcon = forwardRef<HTMLSpanElement, { className?: string }>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("inline-flex items-center justify-center", className)} {...props}>
    <GroupPackageIcon className="w-full h-full" size={undefined as any} color="currentColor" />
  </span>
)) as any;

const BuildOwnIcon = forwardRef<HTMLSpanElement, { className?: string }>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("inline-flex items-center justify-center", className)} {...props}>
    <BuildGroupIcon className="w-full h-full" size={undefined as any} color="currentColor" />
  </span>
)) as any;

const BADGE_ROUTES: Record<string, string[]> = {
  "/bookings": ["booking"],
  "/special-requests": ["special request"],
  "/finance": ["payment"],
};

const urlToSectionKey: Record<string, keyof ActiveSections> = {
  "/transfers": "transfers",
  "/tours": "tours",
  "/requests-and-services": "requests",
  "/visas": "visas",
  "/flights": "flights",
  "/hotels": "hotels",
  "/packages": "packages",
  "/packages/custom-group/build": "build_custom",
};

type NavItemDef = {
  title: string;
  shortLabel?: string;
  url: string;
  icon: React.ElementType;
  roles: string[];
  adminEditUrl?: string;
  adminAddUrl?: string;
};

const travelModules: NavItemDef[] = [
  { title: "Group Packages", shortLabel: "Packages", url: "/packages", icon: GroupPkgIcon, roles: ["admin", "finance", "agency"], adminEditUrl: "/packages?view=manage", adminAddUrl: "/packages?view=manage&new=1" },
  { title: "Build Your Own", shortLabel: "Build", url: "/packages/custom-group/build", icon: BuildOwnIcon, roles: ["admin", "finance", "agency"], adminEditUrl: "/packages/custom-group/manage" },
  { title: "Flights", url: "/flights", icon: FlightIcon, roles: ["admin", "finance", "agency"], adminEditUrl: "/flights?view=manage", adminAddUrl: "/flights?view=manage&new=1" },
  { title: "Hotels", url: "/hotels", icon: BedDouble, roles: ["admin", "finance", "agency"], adminEditUrl: "/hotels?view=manage", adminAddUrl: "/hotels?view=manage&new=1" },
  { title: "Visas", url: "/visas", icon: VisaIcon, roles: ["admin", "finance", "agency"], adminEditUrl: "/visas?view=manage", adminAddUrl: "/visas?view=manage&new=1" },
  { title: "Tours", url: "/tours", icon: Map, roles: ["admin", "finance", "agency"], adminEditUrl: "/tours?view=manage", adminAddUrl: "/tours?view=manage&new=1" },
  { title: "Transfers", url: "/transfers", icon: ArrowLeftRight, roles: ["admin", "finance", "agency"], adminEditUrl: "/transfers?view=manage", adminAddUrl: "/transfers?view=manage&new=1" },
  { title: "Requests & Services", shortLabel: "Requests", url: "/requests-and-services", icon: MessageSquarePlus, roles: ["admin", "finance", "agency"], adminEditUrl: "/requests-and-services?view=manage", adminAddUrl: "/requests-and-services?view=manage&new=1" },
  { title: "Booking History", shortLabel: "History", url: "/booking-history", icon: Clock, roles: ["agency"] },
  { title: "My Agency", url: "/my-agency", icon: Settings2, roles: ["agency"] },
];

const adminModules: NavItemDef[] = [
  { title: "Bookings", url: "/bookings", icon: ListChecks, roles: ["admin", "finance"] },
  { title: "Finance Center", shortLabel: "Finance", url: "/finance", icon: TrendingUp, roles: ["admin", "finance"] },
  { title: "Commission", url: "/commission", icon: Percent, roles: ["admin"] },
  { title: "Users & Roles", shortLabel: "Users", url: "/users", icon: UsersRound, roles: ["admin"] },
  { title: "Reports & Analytics", shortLabel: "Reports", url: "/reports", icon: PieChart, roles: ["admin", "finance"] },
];

const administrationModules: NavItemDef[] = [
  { title: "Countries", url: "/countries", icon: Globe, roles: ["admin"] },
  { title: "Manage Cities", shortLabel: "Cities", url: "/cities", icon: MapPin, roles: ["admin"] },
  { title: "Manage Airports", shortLabel: "Airports", url: "/airports", icon: Building2, roles: ["admin"] },
  { title: "Manage Airlines", shortLabel: "Airlines", url: "/airlines", icon: Plane, roles: ["admin"] },
  { title: "Amenities", url: "/amenities", icon: Gem, roles: ["admin"] },
];

const settingsItems: NavItemDef[] = [
  { title: "Settings", url: "/settings", icon: Settings2, roles: ["admin", "finance"] },
  { title: "Agencies", url: "/agencies", icon: Landmark, roles: ["admin"] },
  { title: "Voucher Template", shortLabel: "Voucher", url: "/voucher-customization", icon: FileCheck, roles: ["admin"] },
  { title: "Audit Logs", shortLabel: "Audit", url: "/audit-logs", icon: Shield, roles: ["admin"] },
  { title: "Hotel Reconciliation", shortLabel: "Reconcile", url: "/hotels/reconciliation", icon: Scale, roles: ["admin"] },
  { title: "Permissions", shortLabel: "Perms", url: "/permissions", icon: Lock, roles: ["admin"] },
  { title: "Security Monitor", shortLabel: "Security", url: "/security", icon: ShieldAlert, roles: ["admin"] },
];

const SECTION_DOT: Record<string, string> = {
  Recent: "hsl(45,90%,60%)",
  Travel: "hsl(6,70%,62%)",
  Manage: "hsl(214,65%,58%)",
  Admin: "hsl(290,30%,62%)",
  System: "hsl(0,0%,75%)",
};

const RECENT_KEY = "sidebar.recent.v1";
const COMPACT_KEY = "sidebar.compact.v1";
const SIDEBAR_DEFAULT_WIDTH = "96px";
const SIDEBAR_COMPACT_WIDTH = "64px";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { role, user, signOut } = useAuth();
  const { settings: companySettings } = useCompanySettings();
  const { notifications } = useNotifications();

  // ===== Compact mode =====
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COMPACT_KEY) === "1";
  });
  useEffect(() => {
    localStorage.setItem(COMPACT_KEY, compact ? "1" : "0");
    document.documentElement.style.setProperty("--sidebar-width", compact ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_DEFAULT_WIDTH);
  }, [compact]);

  // ===== Collapsible Sections =====
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { Travel: true, Manage: false, Admin: false, System: false };
    try {
      const stored = localStorage.getItem("sidebar.sections.v1");
      return stored ? JSON.parse(stored) : { Travel: true, Manage: false, Admin: false, System: false };
    } catch {
      return { Travel: true, Manage: false, Admin: false, System: false };
    }
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("sidebar.sections.v1", JSON.stringify(next));
      return next;
    });
  };

  // ===== Recent visits =====
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    if (!currentPath || currentPath === "/") return;
    setRecent((prev) => {
      const next = [currentPath, ...prev.filter((p) => p !== currentPath)].slice(0, 3);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, [currentPath]);

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [route, keywords] of Object.entries(BADGE_ROUTES)) {
      counts[route] = notifications.filter(
        (n) => !n.is_read && keywords.some((kw) => n.title.toLowerCase().includes(kw))
      ).length;
    }
    return counts;
  }, [notifications]);

  const { isSectionActive } = useActiveSections();

  const isActive = (path: string) => {
    if (currentPath === path) return true;
    if (path === "/packages") return false;
    return currentPath.startsWith(path + "/");
  };
  const canAccess = (roles: string[], url?: string) => {
    if (!role || !roles.includes(role)) return false;
    if (url && urlToSectionKey[url]) {
      const active = isSectionActive(urlToSectionKey[url]);
      if (!active && role !== "admin") return false;
    }
    return true;
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName = user?.email?.split("@")[0] || "User";

  const allNavItems = useMemo(
    () => [...travelModules, ...adminModules, ...administrationModules, ...settingsItems],
    []
  );
  const recentItems = useMemo(
    () => recent
      .map((r) => allNavItems.find((i) => i.url === r && canAccess(i.roles, i.url)))
      .filter(Boolean) as NavItemDef[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recent, allNavItems, role, isSectionActive]
  );

  // Keyboard shortcuts: Alt+1..9
  const visibleItems = useMemo(() => [
    ...travelModules.filter((i) => canAccess(i.roles, i.url)),
    ...adminModules.filter((i) => canAccess(i.roles, i.url)),
    ...administrationModules.filter((i) => canAccess(i.roles, i.url)),
    ...settingsItems.filter((i) => canAccess(i.roles, i.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [role, isSectionActive]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      const n = parseInt(e.key, 10);
      if (Number.isNaN(n) || n < 1 || n > 9) return;
      const target = visibleItems[n - 1];
      if (target) {
        e.preventDefault();
        navigate(target.url);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visibleItems, navigate]);

  const RailItem = ({ item, shortcutNum }: { item: NavItemDef; shortcutNum?: number }) => {
    const active = isActive(item.url);
    const badgeCount = badgeCounts[item.url] || 0;
    const showAdminActions = role === "admin" && (item.adminEditUrl || item.adminAddUrl);
    const label = item.shortLabel || item.title;
    const hasBadge = badgeCount > 0;
    const sectionKey = urlToSectionKey[item.url];
    const isSectionActiveFlag = sectionKey ? isSectionActive(sectionKey) : true;
    const isDisabledForAdmin = !isSectionActiveFlag && role === "admin";

    return (
      <div className="relative w-full group/rail">
        <Tooltip delayDuration={250}>
          <TooltipTrigger asChild>
            <NavLink
              to={item.url}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0 mx-1.5 my-px rounded-xl px-1 transition-all duration-200",
                compact ? "py-2.5" : "py-2",
                "text-sidebar-rail-fg/80 hover:text-sidebar-rail-fg hover:bg-white/10",
                active && "sidebar-rail-tile-active text-white",
                isDisabledForAdmin && "opacity-50 grayscale"
              )}
              activeClassName=""
            >
              {active && (
                <>
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[4px] rounded-r-full bg-gradient-to-b from-[hsl(6,70%,62%)] via-[hsl(290,40%,60%)] to-[hsl(214,65%,54%)] shadow-[0_0_12px_hsl(6,70%,62%/0.7)] z-10" />
                  <span className="absolute inset-0 rounded-xl bg-white/[0.03] animate-pulse duration-[3s]" />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-l-full bg-[hsl(6,70%,62%)]/40" />
                </>
              )}
              <span className="relative transition-transform duration-200 group-hover/rail:scale-110 group-hover/rail:-translate-y-0.5">
                <item.icon
                  className={cn("h-[26px] w-[26px] transition-all duration-300", active ? "text-white drop-shadow-[0_0_8px_hsl(6,70%,65%/0.6)] scale-105" : "group-hover/rail:text-white/90")}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 leading-none bg-[hsl(6,70%,60%)] text-white shadow-md ring-1 ring-white/40 animate-pulse">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              {!compact && (
                <span className={cn(
                  "text-[10.5px] leading-none font-medium tracking-[-0.01em] text-center truncate max-w-full -mt-0.5",
                  active && "font-semibold"
                )}>
                  {label}
                </span>
              )}
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs px-2 py-1 flex items-center gap-2">
            <span>{item.title}</span>
            {shortcutNum && shortcutNum <= 9 && (
              <kbd className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-sans font-medium">⌥{shortcutNum}</kbd>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Admin hover actions */}
        {showAdminActions && (
          <div className="absolute top-1 right-1 opacity-0 group-hover/rail:opacity-100 transition-opacity flex flex-col gap-0.5 z-10">
            {item.adminAddUrl && (
              <Link
                to={item.adminAddUrl}
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md bg-white/15 hover:bg-[hsl(6,70%,60%)] text-white"
                title={`Add ${item.title}`}
              >
                <Plus className="h-2.5 w-2.5" />
              </Link>
            )}
            {item.adminEditUrl && (
              <Link
                to={item.adminEditUrl}
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md bg-white/15 hover:bg-white/25 text-white"
                title={`Manage ${item.title}`}
              >
                <Pencil className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>
        )}

        {/* Notification preview popover */}
        {hasBadge && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label={`${badgeCount} unread for ${item.title}`}
                className="absolute top-0 right-0 h-6 w-4 z-10"
              />
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-72 p-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[12px] font-semibold">{item.title} · {badgeCount} new</p>
                <Link to={item.url} className="text-[11px] text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {notifications
                  .filter((n) => !n.is_read && (BADGE_ROUTES[item.url] || []).some((kw) => n.title.toLowerCase().includes(kw)))
                  .slice(0, 5)
                  .map((n) => (
                    <div key={n.id} className="px-2 py-1.5 rounded-md hover:bg-muted text-[12px]">
                      <p className="font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>}
                    </div>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

  const SectionLabel = ({ children, first, expanded, onToggle }: { children: string; first?: boolean; expanded: boolean; onToggle: () => void }) => {
    if (compact) {
      return <div className={cn("h-px mx-3 bg-white/15", first ? "mt-2 mb-1" : "my-2")} />;
    }
    const dot = SECTION_DOT[children] || "white";
    return (
      <div 
        className={cn("px-3 mb-1.5 flex items-center gap-2 justify-center cursor-pointer group/label", first ? "mt-3" : "mt-5")}
        onClick={onToggle}
      >
        {!first && <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />}
        <span className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 shadow-inner transition-all duration-300",
          "hover:bg-white/10 hover:border-white/20 active:scale-95",
          !expanded && "opacity-60"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full transition-all duration-300", 
            expanded ? "animate-indicator-pulse" : "scale-75 opacity-50"
          )} style={{ background: dot, boxShadow: expanded ? `0 0 8px ${dot}` : 'none' }} />
          <span className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-white/50 group-hover/label:text-white transition-colors">
            {children}
          </span>
          <ChevronDown className={cn("h-2.5 w-2.5 text-white/20 transition-transform duration-300", !expanded && "-rotate-90")} />
        </span>
        {!first && <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/10 to-transparent" />}
      </div>
    );
  };

  const groups: { label: string; items: NavItemDef[] }[] = [
    { label: "Travel", items: travelModules.filter((i) => canAccess(i.roles, i.url)) },
    { label: "Manage", items: adminModules.filter((i) => canAccess(i.roles, i.url)) },
    { label: "Admin", items: administrationModules.filter((i) => canAccess(i.roles, i.url)) },
    { label: "System", items: settingsItems.filter((i) => canAccess(i.roles, i.url)) },
  ].filter((g) => g.items.length > 0);

  let shortcutCounter = 0;

  return (
    <Sidebar
      collapsible="none"
      className="border-r-0 sidebar-rail relative shrink-0"
      style={{ "--sidebar-width": compact ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_DEFAULT_WIDTH } as React.CSSProperties}
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] sidebar-rail-accent-strip z-10" />

      {/* Logo */}
      <SidebarHeader className={cn(
        "!p-0 flex items-center justify-center border-b border-white/10 shrink-0 relative overflow-hidden sidebar-premium-glow",
        compact ? "h-[56px]" : "h-[68px]"
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,hsl(6,70%,65%/0.25),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <Link to="/" className="relative flex items-center justify-center w-full h-full px-2">
          <img
            src={companySettings.logo && !companySettings.logo.includes('company-logo') ? companySettings.logo : gtsLogoOfficial}
            alt="Logo"
            className={cn(
              "object-contain brightness-0 invert drop-shadow-[0_2px_6px_hsl(0,0%,0%,0.35)]",
              compact ? "max-h-9 max-w-[44px]" : "max-h-12 max-w-[76px]"
            )}
          />
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="flex-1 overflow-y-auto sidebar-rail-scrollbar py-1 relative">
        {groups.map((group, gi) => {
          const isExpanded = expandedSections[group.label] !== false;
          return (
            <div key={gi} className="transition-all duration-300">
              <SectionLabel 
                first={gi === 0} 
                expanded={isExpanded}
                onToggle={() => toggleSection(group.label)}
              >
                {group.label}
              </SectionLabel>
              <div className={cn(
                "flex flex-col overflow-hidden transition-all duration-500 ease-in-out",
                isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
              )}>
                {group.items.map((item) => {
                  shortcutCounter++;
                  return <RailItem key={item.title} item={item} shortcutNum={shortcutCounter} />;
                })}
              </div>
            </div>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="!p-0 shrink-0 relative">
        <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex flex-col py-2">
          {/* Compact toggle */}
          <Tooltip delayDuration={250}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCompact((v) => !v)}
                className="flex flex-col items-center justify-center gap-0 mx-1.5 my-px rounded-xl py-1.5 text-sidebar-rail-fg/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {compact ? <ChevronsRight className="h-[20px] w-[20px]" strokeWidth={2} /> : <ChevronsLeft className="h-[20px] w-[20px]" strokeWidth={2} />}
                {!compact && <span className="text-[9.5px] font-medium leading-none tracking-[-0.01em] -mt-0.5">Compact</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs px-2 py-1">{compact ? "Expand sidebar" : "Compact mode"}</TooltipContent>
          </Tooltip>

          {/* Help */}
          <Tooltip delayDuration={250}>
            <TooltipTrigger asChild>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-help-assistant"))}
                className="flex flex-col items-center justify-center gap-0 mx-1.5 my-px rounded-xl py-2 text-sidebar-rail-fg/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <HelpCircle className="h-[24px] w-[24px]" strokeWidth={1.75} />
                {!compact && <span className="text-[10.5px] font-medium leading-none tracking-[-0.01em] -mt-0.5">Help</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs px-2 py-1">Help</TooltipContent>
          </Tooltip>

          {/* User */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0 mx-1.5 my-px rounded-xl py-2 text-sidebar-rail-fg/80 hover:text-white hover:bg-white/10 transition-all group/user">
                <span className="relative h-10 w-10 rounded-full p-[1.5px] bg-gradient-to-br from-[hsl(6,70%,62%)] via-[hsl(290,40%,65%)] to-[hsl(214,70%,55%)] shadow-[0_4px_12px_hsl(0,0%,0%,0.3)] transition-transform duration-300 group-hover/user:scale-110">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-[hsl(214,60%,32%)] text-[14px] font-bold text-white shadow-inner">
                    {userInitial}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[hsl(142,76%,46%)] ring-2 ring-[hsl(214,70%,28%)] shadow-[0_0_10px_hsl(142,76%,46%/0.8)]" />
                </span>
                {!compact && <span className="text-[10px] font-medium leading-none tracking-[-0.01em] truncate max-w-[68px] -mt-0.5">{userName}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-56 p-1">
              <div className="px-2 py-2 mb-1 border-b border-border">
                <p className="text-[13px] font-semibold truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                {role && <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{role}</p>}
              </div>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] rounded-md hover:bg-foreground/[0.06] text-foreground/80 hover:text-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
