import { type LucideIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-6 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card to-muted/20">
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      {/* Subtle dotted grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Icon medallion */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/20 blur-xl scale-110" />
        <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-accent/10 border border-primary/15 shadow-lg flex items-center justify-center animate-float">
          <Icon className="h-11 w-11 text-primary" strokeWidth={1.75} />
          <div className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full bg-gradient-to-br from-gold to-gold/70 flex items-center justify-center shadow-md ring-2 ring-card">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>

      <h3 className="relative text-xl font-bold text-foreground mb-2 tracking-tight text-center">
        {title}
      </h3>
      {description && (
        <p className="relative text-sm text-muted-foreground text-center max-w-md leading-relaxed mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="navy"
          size="lg"
          onClick={onAction}
          className="relative gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 rounded-xl px-6"
        >
          <Sparkles className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
