import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRolePermissions, useUpdatePermission, PERMISSION_MODULES, ModuleKey } from "@/hooks/usePermissions";
import { Lock, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const ROLES = [
  { value: "admin" as const, label: "Admin", description: "Full system access" },
  { value: "finance" as const, label: "Finance", description: "Financial operations" },
  { value: "agency" as const, label: "Agency", description: "Booking & travel" },
];

const PERMISSION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  export: "Export",
};

export default function PermissionsManager() {
  const { data: permissions, isLoading } = useRolePermissions();
  const updatePermission = useUpdatePermission();
  const [activeRole, setActiveRole] = useState("admin");

  const getPermission = (role: string, module: string, permission: string) => {
    return permissions?.find(
      (p) => p.role === role && p.module === module && p.permission === permission
    );
  };

  const handleToggle = (id: string, currentEnabled: boolean) => {
    updatePermission.mutate(
      { id, enabled: !currentEnabled },
      {
        onSuccess: () => toast.success("Permission updated"),
        onError: () => toast.error("Failed to update permission"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Create</TableHead>
                  <TableHead>Edit</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  const moduleEntries = Object.entries(PERMISSION_MODULES) as [ModuleKey, typeof PERMISSION_MODULES[ModuleKey]][];

  const activeRoleData = ROLES.find((r) => r.value === activeRole);
  const activeCount = permissions?.filter((p) => p.role === activeRole && p.enabled).length || 0;
  const totalCount = permissions?.filter((p) => p.role === activeRole).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Permissions
        </h1>
        <Badge variant="outline" className="text-[11px] font-medium px-2 py-0.5">
          {activeCount}/{totalCount} active for {activeRoleData?.label}
        </Badge>
      </div>

      <Tabs value={activeRole} onValueChange={setActiveRole}>
        <TabsList className="h-8 w-full max-w-xs">
          {ROLES.map((r) => (
            <TabsTrigger key={r.value} value={r.value} className="text-xs h-7 flex-1">
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ROLES.map((role) => (
          <TabsContent key={role.value} value={role.value} className="mt-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-[180px]">Module</TableHead>
                      <TableHead className="text-xs">Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleEntries.map(([moduleKey, moduleConfig]) => (
                      <TableRow key={moduleKey}>
                        <TableCell className="text-xs font-medium">{moduleConfig.label}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-3">
                            {moduleConfig.permissions.map((perm) => {
                              const record = getPermission(role.value, moduleKey, perm);
                              if (!record) return null;
                              return (
                                <div key={perm} className="flex items-center gap-1.5 min-w-[90px]">
                                  <Switch
                                    checked={record.enabled}
                                    onCheckedChange={() => handleToggle(record.id, record.enabled)}
                                    disabled={updatePermission.isPending}
                                    className="scale-75"
                                  />
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                    {record.enabled ? (
                                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                                    ) : (
                                      <X className="h-2.5 w-2.5 text-muted-foreground/40" />
                                    )}
                                    {PERMISSION_LABELS[perm] || perm}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
