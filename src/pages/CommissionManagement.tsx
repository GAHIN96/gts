import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Percent, Save, Building2, History, TrendingUp,
  Search, Edit2, Check, X, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Skeleton } from "@/components/ui/skeleton";

interface AgencyWithCommission {
  id: string;
  agency_name: string;
  contact_person_name: string | null;
  contact_email: string | null;
  commission_rate: number | null;
  is_active: boolean | null;
  is_verified: boolean | null;
}

interface CommissionHistoryEntry {
  id: string;
  agency_id: string | null;
  old_rate: number;
  new_rate: number;
  changed_by: string | null;
  change_type: string;
  notes: string | null;
  created_at: string;
  agency_name?: string;
}

const CommissionManagement = () => {
  const { user } = useAuth();
  const [agencies, setAgencies] = useState<AgencyWithCommission[]>([]);
  const [history, setHistory] = useState<CommissionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [defaultRate, setDefaultRate] = useState(0);
  const [defaultRateInput, setDefaultRateInput] = useState("0");
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [applyDefaultOpen, setApplyDefaultOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch agencies
      const { data: agencyData } = await supabase
        .from("agencies")
        .select("id, agency_name, contact_person_name, contact_email, commission_rate, is_active, is_verified")
        .order("agency_name");

      if (agencyData) setAgencies(agencyData);

      // Fetch default rate from app_settings
      const { data: settingData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "default_commission_rate")
        .maybeSingle();

      if (settingData?.setting_value) {
        const rate = (settingData.setting_value as any).rate || 0;
        setDefaultRate(rate);
        setDefaultRateInput(String(rate));
      }

      // Fetch history
      const { data: historyData } = await supabase
        .from("commission_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (historyData && agencyData) {
        const enriched = historyData.map((h: any) => ({
          ...h,
          agency_name: h.agency_id
            ? agencyData.find((a) => a.id === h.agency_id)?.agency_name || "Unknown"
            : "Default Rate",
        }));
        setHistory(enriched);
      }
    } catch (error) {
      console.error("Error fetching commission data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveDefaultRate = async () => {
    const newRate = parseFloat(defaultRateInput) || 0;
    if (newRate < 0 || newRate > 100) {
      toast.error("Rate must be between 0 and 100");
      return;
    }

    try {
      // Save to app_settings
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("setting_key", "default_commission_rate")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ setting_value: { rate: newRate } })
          .eq("setting_key", "default_commission_rate");
      } else {
        await supabase.from("app_settings").insert({
          setting_key: "default_commission_rate",
          setting_value: { rate: newRate },
        });
      }

      // Log history
      await supabase.from("commission_history").insert({
        agency_id: null,
        old_rate: defaultRate,
        new_rate: newRate,
        changed_by: user?.id,
        change_type: "default",
        notes: `Default commission rate changed from ${defaultRate}% to ${newRate}%`,
      });

      setDefaultRate(newRate);
      toast.success(`Default commission rate set to ${newRate}%`);
      fetchData();
    } catch (error) {
      toast.error("Failed to save default rate");
    }
  };

  const applyDefaultToAll = async () => {
    try {
      const updates = agencies.map(async (agency) => {
        if (agency.commission_rate !== defaultRate) {
          await supabase.from("commission_history").insert({
            agency_id: agency.id,
            old_rate: agency.commission_rate || 0,
            new_rate: defaultRate,
            changed_by: user?.id,
            change_type: "per_agency",
            notes: `Applied default rate (${defaultRate}%)`,
          });
        }
      });
      await Promise.all(updates);

      await supabase
        .from("agencies")
        .update({ commission_rate: defaultRate })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // update all

      toast.success(`Applied ${defaultRate}% to all agencies`);
      setApplyDefaultOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to apply default rate");
    }
  };

  const saveAgencyRate = async (agencyId: string) => {
    const newRate = parseFloat(editRate) || 0;
    if (newRate < 0 || newRate > 100) {
      toast.error("Rate must be between 0 and 100");
      return;
    }

    const agency = agencies.find((a) => a.id === agencyId);
    if (!agency) return;

    try {
      await supabase
        .from("agencies")
        .update({ commission_rate: newRate })
        .eq("id", agencyId);

      await supabase.from("commission_history").insert({
        agency_id: agencyId,
        old_rate: agency.commission_rate || 0,
        new_rate: newRate,
        changed_by: user?.id,
        change_type: "per_agency",
        notes: editNotes || null,
      });

      toast.success(`Commission for ${agency.agency_name} updated to ${newRate}%`);
      setEditingAgencyId(null);
      setEditNotes("");
      fetchData();
    } catch (error) {
      toast.error("Failed to update commission");
    }
  };

  const filteredAgencies = agencies.filter((a) =>
    a.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.contact_person_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgRate = agencies.length > 0
    ? (agencies.reduce((sum, a) => sum + (a.commission_rate || 0), 0) / agencies.length).toFixed(1)
    : "0";

  const agenciesWithCommission = agencies.filter((a) => (a.commission_rate || 0) > 0).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Commission Management</h1>
        <p className="text-muted-foreground">Set default and per-agency commission rates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Default Rate</p>
                <p className="text-2xl font-bold">{defaultRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Rate</p>
                <p className="text-2xl font-bold">{avgRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Commission</p>
                <p className="text-2xl font-bold">{agenciesWithCommission}/{agencies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">History Entries</p>
                <p className="text-2xl font-bold">{history.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Default Rate + Agency Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5" />
                Default Commission Rate
              </CardTitle>
              <CardDescription>This rate is applied to new agencies automatically</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="space-y-2 flex-1 max-w-[200px]">
                  <Label>Rate (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={defaultRateInput}
                      onChange={(e) => setDefaultRateInput(e.target.value)}
                      className="text-lg font-bold"
                    />
                    <span className="text-lg font-bold text-muted-foreground">%</span>
                  </div>
                </div>
                <Button variant="navy" onClick={saveDefaultRate}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setApplyDefaultOpen(true)}>
                  Apply to All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agency Rates Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Per-Agency Rates
                  </CardTitle>
                  <CardDescription>Override commission for specific agencies</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agency</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgencies.map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">{agency.agency_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agency.contact_person_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            agency.is_active && agency.is_verified
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-amber-500/10 text-amber-600"
                          }
                        >
                          {agency.is_active && agency.is_verified ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingAgencyId === agency.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className="w-20 h-8 text-sm text-right"
                            />
                            <span className="text-xs">%</span>
                          </div>
                        ) : (
                          <span className="font-bold text-lg">
                            {agency.commission_rate || 0}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingAgencyId === agency.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-emerald-600"
                              onClick={() => saveAgencyRate(agency.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setEditingAgencyId(null);
                                setEditNotes("");
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingAgencyId(agency.id);
                              setEditRate(String(agency.commission_rate || 0));
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgencies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No agencies found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* Edit notes (shown when editing) */}
              {editingAgencyId && (
                <div className="mt-4 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                  <Label className="text-xs">Change Notes (optional)</Label>
                  <Textarea
                    placeholder="Reason for change..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: History Log */}
        <div>
          <Card className="sticky top-28">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Change History
              </CardTitle>
              <CardDescription>Recent commission rate changes</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No history yet</p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{entry.agency_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            entry.change_type === "default"
                              ? "text-primary border-primary/30"
                              : "text-foreground"
                          }
                        >
                          {entry.change_type === "default" ? "Default" : "Agency"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{entry.old_rate}%</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-bold text-primary">{entry.new_rate}%</span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60">
                        {format(new Date(entry.created_at), "dd/MM/yyyy · HH:mm")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Apply Default to All Dialog */}
      <Dialog open={applyDefaultOpen} onOpenChange={setApplyDefaultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Default Rate to All Agencies</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will set the commission rate to <span className="font-bold text-foreground">{defaultRate}%</span> for all{" "}
            <span className="font-bold text-foreground">{agencies.length}</span> agencies. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDefaultOpen(false)}>
              Cancel
            </Button>
            <Button variant="navy" onClick={applyDefaultToAll}>
              Apply {defaultRate}% to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommissionManagement;
