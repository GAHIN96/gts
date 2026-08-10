import React from "react";
import { useActiveSections, type ActiveSections } from "@/hooks/useActiveSections";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, PowerOff, ArrowLeft, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SectionGuardProps {
  sectionKey: keyof ActiveSections;
  sectionName: string;
  children: React.ReactNode;
}

export function SectionGuard({ sectionKey, sectionName, children }: SectionGuardProps) {
  const { isSectionActive } = useActiveSections();
  const { role } = useAuth();
  const navigate = useNavigate();
  const active = isSectionActive(sectionKey);
  const isAdmin = role === "admin";

  if (!active) {
    if (isAdmin) {
      return (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>
                <strong>Admin Preview Notice:</strong> The <strong>{sectionName}</strong> section is currently <strong>DEACTIVATED</strong> for non-admin users.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="border-amber-500/30 hover:bg-amber-500/10 text-xs shrink-0 gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage in Settings
            </Button>
          </div>
          {children}
        </div>
      );
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg border-border/60">
          <CardContent className="pt-8 pb-8 px-6 space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <PowerOff className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 mb-1">
                Section Deactivated
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {sectionName} Unavailable
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The {sectionName.toLowerCase()} service is currently inactive or undergoing maintenance. An administrator can enable this section from the settings menu.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="default"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
