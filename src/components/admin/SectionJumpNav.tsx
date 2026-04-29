import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ListTree } from "lucide-react";

interface SectionJumpNavProps {
  /** Ref to the scrollable container that holds the sections. */
  scrollContainerRef: React.RefObject<HTMLElement>;
  /** Optional key that triggers a re-scan when it changes (e.g. active tab). */
  rescanKey?: string | number;
  className?: string;
}

type Section = { id: string; label: string };

/**
 * Sticky in-panel "Jump to section" rail.
 *
 * Auto-discovers sections by looking for `[data-jump-section]` elements
 * inside the given scroll container. Each section must have an `id` and a
 * `data-jump-section="Section Title"` attribute. Scroll-spy highlights the
 * section nearest the top of the container.
 */
export function SectionJumpNav({ scrollContainerRef, rescanKey, className }: SectionJumpNavProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Discover sections (re-scans when rescanKey changes / on resize / mutations)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scan = () => {
      const found = Array.from(
        container.querySelectorAll<HTMLElement>("[data-jump-section]")
      )
        .filter((el) => el.id)
        .map((el) => ({ id: el.id, label: el.dataset.jumpSection || el.id }));
      setSections(found);
      if (found.length && !found.some((s) => s.id === activeId)) {
        setActiveId(found[0].id);
      }
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(container, { childList: true, subtree: true });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollContainerRef, rescanKey]);

  // Scroll-spy
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || sections.length === 0) return;

    const onScroll = () => {
      const top = container.getBoundingClientRect().top;
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const offset = el.getBoundingClientRect().top - top;
        if (offset - 80 <= 0) current = s.id;
        else break;
      }
      setActiveId(current);
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [sections, scrollContainerRef]);

  const jumpTo = (id: string) => {
    const container = scrollContainerRef.current;
    const el = document.getElementById(id);
    if (!container || !el) return;
    const top = el.offsetTop - 16;
    container.scrollTo({ top, behavior: "smooth" });
  };

  if (sections.length < 2) return null;

  return (
    <div
      ref={navRef}
      className={cn(
        "hidden xl:flex sticky top-3 self-start flex-col gap-1 ml-3 w-52 shrink-0 max-h-[calc(100vh-180px)] overflow-y-auto",
        "rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm p-2",
        className
      )}
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-2 border-b border-border/50 mb-1">
        <ListTree className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Jump to section
        </span>
      </div>
      {sections.map((s) => {
        const isActive = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jumpTo(s.id)}
            className={cn(
              "group flex items-center gap-2 text-left text-[12px] rounded-lg px-2.5 py-1.5 transition-all",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0 transition-all",
                isActive ? "bg-primary scale-110" : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60"
              )}
            />
            <span className="truncate">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
