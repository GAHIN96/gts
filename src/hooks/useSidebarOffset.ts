import { useSidebar } from "@/components/ui/sidebar";

/**
 * Returns the current left offset for full-screen admin editors so they
 * stretch from the sidebar's right edge to the viewport's right edge.
 *
 * - Mobile: 0 (sidebar is offcanvas)
 * - Collapsed (icon mode): 5rem (matches SIDEBAR_WIDTH_ICON)
 * - Expanded: 16rem (matches SIDEBAR_WIDTH)
 */
import { useState, useEffect } from "react";

export function useSidebarOffset(): string {
  const { isMobile } = useSidebar();
  const [width, setWidth] = useState("96px");

  useEffect(() => {
    if (isMobile) {
      setWidth("0px");
      return;
    }

    const computedWidth = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim();
    if (computedWidth) {
      setWidth(computedWidth);
    } else {
      const isCompact = localStorage.getItem("sidebar.compact.v1") === "1";
      setWidth(isCompact ? "64px" : "96px");
    }
  }, [isMobile]);

  return isMobile ? "0px" : width;
}
