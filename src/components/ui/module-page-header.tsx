import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatPill {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color?: string; // tailwind text color class e.g. "text-primary"
}

interface ModulePageHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  count?: number;
  actions?: React.ReactNode;
  stats?: StatPill[];
  iconBg?: string;
  iconColor?: string;
}

export function ModulePageHeader({
  icon: Icon,
  title,
  subtitle,
  count,
  actions,
  stats,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
}: ModulePageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {count !== undefined && (
                <Badge variant="secondary" className="rounded-lg text-xs font-bold px-2.5">
                  {count}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
            >
              <stat.icon className={cn("h-4 w-4", stat.color || "text-primary")} />
              <span className="text-sm font-bold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
