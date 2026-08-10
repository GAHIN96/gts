import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActiveSections, type ActiveSections, defaultActiveSections } from "@/hooks/useActiveSections";
import { 
  Car, 
  Compass, 
  MessageSquarePlus, 
  Stamp, 
  PlaneTakeoff, 
  Hotel, 
  Layers, 
  RotateCcw,
  Check,
  PowerOff,
  Sliders,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { GroupPackageIcon } from "@/components/icons/GroupPackageIcon";
import { BuildGroupIcon } from "@/components/icons/BuildGroupIcon";

interface SectionConfigItem {
  key: keyof ActiveSections;
  name: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const sectionItems: SectionConfigItem[] = [
  {
    key: "transfers",
    name: "Transfers",
    description: "Airport transfers, city transfers, and vehicle transport bookings.",
    icon: Car,
  },
  {
    key: "tours",
    name: "Tours & Excursions",
    description: "Guided tours, sight-seeing activities, and excursion packages.",
    icon: Compass,
  },
  {
    key: "requests",
    name: "Requests & Services",
    description: "Special requests, custom service quotes, and agency inquiries.",
    icon: MessageSquarePlus,
  },
  {
    key: "visas",
    name: "Visas",
    description: "Visa processing services, application forms, and status tracking.",
    icon: Stamp,
  },
  {
    key: "flights",
    name: "Flights",
    description: "Flight search, PNR seat blocking, and airline ticket bookings.",
    icon: PlaneTakeoff,
  },
  {
    key: "hotels",
    name: "Hotels",
    description: "Hotel room search, rates management, and room reservations.",
    icon: Hotel,
  },
  {
    key: "packages",
    name: "Group Packages",
    description: "Pre-packaged group itineraries and fixed package bookings.",
    icon: GroupPackageIcon,
  },
  {
    key: "build_custom",
    name: "Build Your Own Group",
    description: "Custom group itinerary design and customized quote generator.",
    icon: BuildGroupIcon,
  },
];

export function ModuleActivationSettings() {
  const { sections, toggleSection, saveSections, isLoading } = useActiveSections();

  const handleReset = async () => {
    await saveSections(defaultActiveSections);
  };

  const activeCount = Object.values(sections).filter(Boolean).length;
  const totalCount = sectionItems.length;

  return (
    <Card className="shadow-card border-border/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Sliders className="h-5 w-5 text-primary" />
              Active Sections & Modules Control
              <Badge variant="navy" className="ml-2 text-[10px] uppercase font-semibold">
                Admin Only
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Enable or deactivate specific sections (Transfers, Tours, Requests, etc.). Deactivated sections are hidden from non-admin users.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-medium text-xs">
              {activeCount} of {totalCount} Active
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sectionItems.map((item) => {
            const isActive = sections[item.key] ?? true;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  isActive
                    ? "bg-card border-border hover:border-primary/40 shadow-sm"
                    : "bg-muted/40 border-dashed border-border/80 opacity-75"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-lg shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {item.name}
                      </span>
                      {isActive ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 h-4">
                          <Check className="h-2.5 w-2.5 mr-0.5" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px] py-0 px-1.5 h-4">
                          <PowerOff className="h-2.5 w-2.5 mr-0.5" /> Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleSection(item.key)}
                    aria-label={`Toggle ${item.name} section`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
