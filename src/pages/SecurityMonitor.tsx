import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  ShieldAlert, Monitor, Lock, Unlock, AlertTriangle,
  Search, Shield, Activity, CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function useSecurityAlerts() {
  return useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useLoginAttempts(search: string) {
  return useQuery({
    queryKey: ["login-attempts", search],
    queryFn: async () => {
      let query = supabase
        .from("login_attempts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search) {
        query = query.ilike("email", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useUserSessions(search: string) {
  return useQuery({
    queryKey: ["user-sessions", search],
    queryFn: async () => {
      let query = supabase
        .from("user_sessions")
        .select("*")
        .order("logged_in_at", { ascending: false })
        .limit(200);
      if (search) {
        query = query.ilike("email", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

function useAccountLockouts() {
  return useQuery({
    queryKey: ["account-lockouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_lockouts")
        .select("*")
        .eq("is_active", true)
        .order("locked_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export default function SecurityMonitor() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const { data: alerts } = useSecurityAlerts();
  const { data: attempts } = useLoginAttempts(search);
  const { data: sessions } = useUserSessions(search);
  const { data: lockouts } = useAccountLockouts();

  const unlockMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.functions.invoke("login-security", {
        body: { action: "unlock_account", email },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account unlocked successfully");
      queryClient.invalidateQueries({ queryKey: ["account-lockouts"] });
      queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
    },
    onError: () => toast.error("Failed to unlock account"),
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("security_alerts")
        .update({ is_resolved: true, resolved_by: session?.user?.id, resolved_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert resolved");
      queryClient.invalidateQueries({ queryKey: ["security-alerts"] });
    },
  });

  const unresolvedAlerts = alerts?.filter((a) => !a.is_resolved) || [];
  const suspiciousSessions = sessions?.filter((s) => s.is_suspicious) || [];
  const failedAttempts = attempts?.filter((a) => !a.success) || [];

  return (
    <div className="space-y-4">
      {/* Header + Stats Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Security Monitor
          </h1>
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              {unresolvedAlerts.length} Active Alerts
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5">
              <Lock className="h-3 w-3 text-amber-600" />
              {lockouts?.length || 0} Locked
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5">
              <Monitor className="h-3 w-3 text-purple-600" />
              {suspiciousSessions.length} Suspicious
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5">
              <Activity className="h-3 w-3 text-red-600" />
              {failedAttempts.length} Failed
            </Badge>
          </div>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <Tabs defaultValue="alerts">
        <TabsList className="h-8">
          <TabsTrigger value="alerts" className="gap-1 text-xs h-7 px-3">
            <AlertTriangle className="h-3 w-3" />
            Alerts {unresolvedAlerts.length > 0 && <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[9px]">{unresolvedAlerts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="lockouts" className="gap-1 text-xs h-7 px-3">
            <Lock className="h-3 w-3" /> Lockouts
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1 text-xs h-7 px-3">
            <Monitor className="h-3 w-3" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="attempts" className="gap-1 text-xs h-7 px-3">
            <Shield className="h-3 w-3" /> Login Attempts
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs w-[70px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!alerts?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        No security alerts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {format(new Date(alert.created_at), "MM/dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            alert.severity === "high"
                              ? "text-destructive border-destructive/30"
                              : alert.severity === "medium"
                              ? "text-amber-600 border-amber-300"
                              : "text-blue-600 border-blue-300"
                          }`}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px]">{alert.alert_type.replace("_", " ")}</TableCell>
                        <TableCell className="text-[11px]">{alert.email || "—"}</TableCell>
                        <TableCell className="text-[11px] max-w-[200px] truncate text-muted-foreground">{alert.description}</TableCell>
                        <TableCell>
                          {alert.is_resolved ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-emerald-600 border-emerald-300">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!alert.is_resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveAlert.mutate(alert.id)}
                              className="text-[11px] h-6 px-2"
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lockouts Tab */}
        <TabsContent value="lockouts" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Locked At</TableHead>
                    <TableHead className="text-xs">Locked Until</TableHead>
                    <TableHead className="text-xs">Failures</TableHead>
                    <TableHead className="text-xs w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!lockouts?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No locked accounts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lockouts.map((lock) => (
                      <TableRow key={lock.id}>
                        <TableCell className="text-xs font-medium">{lock.email}</TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {format(new Date(lock.locked_at), "MM/dd HH:mm")}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {format(new Date(lock.locked_until), "MM/dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{lock.failure_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unlockMutation.mutate(lock.email)}
                            disabled={unlockMutation.isPending}
                            className="gap-1 text-[11px] h-6 px-2"
                          >
                            <Unlock className="h-3 w-3" /> Unlock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">Device</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!sessions?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No sessions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((s) => (
                      <TableRow key={s.id} className={s.is_suspicious ? "bg-destructive/5" : ""}>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {format(new Date(s.logged_in_at), "MM/dd HH:mm")}
                        </TableCell>
                        <TableCell className="text-xs">{s.email || "—"}</TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">{s.ip_address || "—"}</TableCell>
                        <TableCell className="text-[11px] max-w-[180px] truncate text-muted-foreground">{s.device_info || "—"}</TableCell>
                        <TableCell>
                          {s.is_suspicious ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-destructive border-destructive/30">
                              <AlertTriangle className="h-2.5 w-2.5" /> Suspicious
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Attempts Tab */}
        <TabsContent value="attempts" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">IP</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!attempts?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        No login attempts recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attempts.map((a) => (
                      <TableRow key={a.id} className={!a.success ? "bg-destructive/5" : ""}>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">
                          {format(new Date(a.created_at), "MM/dd HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-xs">{a.email}</TableCell>
                        <TableCell className="text-[11px] font-mono text-muted-foreground">{a.ip_address || "—"}</TableCell>
                        <TableCell>
                          {a.success ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">Success</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {a.failure_reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
