import { useSidebar } from "@/components/ui/sidebar";

/**
 * Returns the current left offset for full-screen admin editors so they
 * stretch from the sidebar's right edge to the viewport's right edge.
 *
 * - Mobile: 0 (sidebar is offcanvas)
 * - Collapsed (icon mode): 5rem (matches SIDEBAR_WIDTH_ICON)
 * - Expanded: 16rem (matches SIDEBAR_WIDTH)
 */
export function useSidebarOffset(): string {
  const { state, isMobile } = useSidebar();
  if (isMobile) return "0px";
  return state === "collapsed" ? "7rem" : "22rem";
}
