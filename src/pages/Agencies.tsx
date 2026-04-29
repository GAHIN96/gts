import { useState } from "react";
import { format } from "date-fns";
import {
  Plus, Search, Building2, Mail, Phone, MapPin, Eye, Edit,
  MoreVertical, CheckCircle, XCircle, Shield, ShieldOff, Key,
  Trash2, Landmark, Loader2, User, CreditCard, ShieldCheck, Upload, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useAgencies, useVerifyAgency, useToggleAgencyStatus,
  useUpdateAgency, useDeleteAgency, useToggleMfaRequired,
  useUpdateAgencyCredit, type Agency,
} from "@/hooks/useAgencies";
import { useAuth } from "@/contexts/AuthContext";
import { AdminAgencyForm } from "@/components/admin/AdminAgencyForm";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { supabase } from "@/integrations/supabase/client";

const getStatusBadge = (agency: Agency) => {
  if (!agency.is_active) {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">Blocked</Badge>;
  }
  if (!agency.is_verified) {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">Pending</Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-300">Active</Badge>;
};

const Agencies = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const { data: agencies, isLoading } = useAgencies();
  const verifyAgency = useVerifyAgency();
  const toggleStatus = useToggleAgencyStatus();
  const updateAgency = useUpdateAgency();
  const deleteAgency = useDeleteAgency();
  const toggleMfa = useToggleMfaRequired();
  const updateCredit = useUpdateAgencyCredit();

  const [searchTerm, setSearchTerm] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    agency_name: "",
    license_number: "",
    commission_rate: 0,
    address: "",
    city: "",
    country: "",
    contact_person_name: "",
    contact_email: "",
    contact_phone: "",
    credit_limit: 0,
    credit_limit_type: "soft" as "soft" | "hard",
    mfa_required: false,
    logo_url: "" as string,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return; }
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `agency-logo-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("settings-images").upload(`agency-logos/${fileName}`, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("settings-images").getPublicUrl(`agency-logos/${fileName}`);
      setEditForm(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success("Logo uploaded");
    } catch { toast.error("Failed to upload logo"); }
    finally { setUploadingLogo(false); }
  };

  const filteredAgencies = agencies?.filter((agency) => {
    const search = searchTerm.toLowerCase();
    return (
      agency.agency_name.toLowerCase().includes(search) ||
      agency.profiles?.email?.toLowerCase().includes(search) ||
      agency.city?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: agencies?.length || 0,
    active: agencies?.filter((a) => a.is_active && a.is_verified).length || 0,
    pending: agencies?.filter((a) => !a.is_verified).length || 0,
    blocked: agencies?.filter((a) => !a.is_active).length || 0,
  };

  const handleVerify = async (agency: Agency) => {
    try {
      await verifyAgency.mutateAsync({ id: agency.id, isVerified: true });
      if (agency.profiles?.email) {
        await supabase.functions.invoke("booking-status-notification", {
          body: {
            bookingId: agency.id,
            newStatus: "agency_verified",
            bookingNumber: agency.agency_name,
            bookingType: "Agency Verification",
            userEmail: agency.profiles.email,
            totalAmount: 0,
          },
        });
      }
      toast.success(`${agency.agency_name} verified`);
    } catch {
      toast.error("Failed to verify agency");
    }
  };

  const handleToggleStatus = async (agency: Agency) => {
    try {
      await toggleStatus.mutateAsync({ id: agency.id, isActive: !agency.is_active });
      toast.success(`Agency ${agency.is_active ? "blocked" : "activated"}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleToggleMfa = async (agency: Agency) => {
    try {
      const mfaRequired = !(agency as any).mfa_required;
      await toggleMfa.mutateAsync({ id: agency.id, mfaRequired });
      toast.success(`2FA ${mfaRequired ? "required" : "not required"} for ${agency.agency_name}`);
    } catch {
      toast.error("Failed to update 2FA requirement");
    }
  };

  const openEdit = (agency: Agency) => {
    setSelectedAgency(agency);
    setEditForm({
      agency_name: agency.agency_name,
      license_number: agency.license_number || "",
      commission_rate: agency.commission_rate || 0,
      address: agency.address || "",
      city: agency.city || "",
      country: agency.country || "",
      contact_person_name: agency.contact_person_name || "",
      contact_email: agency.contact_email || "",
      contact_phone: agency.contact_phone || "",
      credit_limit: (agency as any).credit_limit || 0,
      credit_limit_type: (agency as any).credit_limit_type || "soft",
      mfa_required: (agency as any).mfa_required || false,
      logo_url: agency.logo_url || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAgency) return;
    try {
      await updateAgency.mutateAsync({
        id: selectedAgency.id,
        agency_name: editForm.agency_name,
        license_number: editForm.license_number,
        commission_rate: editForm.commission_rate,
        address: editForm.address,
        city: editForm.city,
        country: editForm.country,
        contact_person_name: editForm.contact_person_name,
        contact_email: editForm.contact_email,
        contact_phone: editForm.contact_phone,
        logo_url: editForm.logo_url || null,
      });
      // Update credit separately
      await updateCredit.mutateAsync({
        id: selectedAgency.id,
        creditLimit: editForm.credit_limit,
        creditLimitType: editForm.credit_limit_type,
      });
      // Update MFA
      await toggleMfa.mutateAsync({
        id: selectedAgency.id,
        mfaRequired: editForm.mfa_required,
      });
      toast.success("Agency updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update agency");
    }
  };

  const handleDelete = async () => {
    if (!selectedAgency) return;
    try {
      await deleteAgency.mutateAsync(selectedAgency.id);
      toast.success("Agency deleted");
      setDeleteOpen(false);
      setSelectedAgency(null);
    } catch {
      toast.error("Failed to delete agency");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Agencies
          </h1>
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5">
              <Building2 className="h-3 w-3 text-primary" />
              {stats.total} Total
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-emerald-600 border-emerald-300">
              <CheckCircle className="h-3 w-3" />
              {stats.active} Active
            </Badge>
            {stats.pending > 0 && (
              <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-amber-600 border-amber-300">
                {stats.pending} Pending
              </Badge>
            )}
            {stats.blocked > 0 && (
              <Badge variant="outline" className="gap-1 text-[11px] font-medium px-2 py-0.5 text-destructive border-destructive/30">
                {stats.blocked} Blocked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search agencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button size="sm" onClick={() => setRegisterOpen(true)} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Agency
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Agency</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Credit</TableHead>
                <TableHead className="text-xs">2FA</TableHead>
                <TableHead className="text-xs">Bookings</TableHead>
                <TableHead className="text-xs">Revenue</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!filteredAgencies?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                    No agencies found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencies.map((agency) => {
                  const creditLimit = (agency as any).credit_limit || 0;
                  const usedCredit = (agency as any).used_credit || 0;
                  const creditUsage = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;
                  const mfaRequired = (agency as any).mfa_required || false;
                  
                  return (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{agency.agency_name}</p>
                          <p className="text-[10px] text-muted-foreground">{agency.license_number || "No license"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-[11px] flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5 text-muted-foreground" />
                            {agency.profiles?.email || "—"}
                          </p>
                          <p className="text-[11px] flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />
                            {agency.profiles?.phone || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 w-[100px]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span>${usedCredit.toLocaleString()}</span>
                            <span className="text-muted-foreground">/ ${creditLimit.toLocaleString()}</span>
                          </div>
                          <Progress value={Math.min(creditUsage, 100)} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={mfaRequired}
                          onCheckedChange={() => handleToggleMfa(agency)}
                          className="scale-75"
                        />
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {agency.bookingStats?.totalBookings || 0}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        ${(agency.bookingStats?.totalRevenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(agency)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => { setSelectedAgency(agency); setDetailsOpen(true); }} className="text-xs">
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(agency)} className="text-xs">
                              <Edit className="h-3.5 w-3.5 mr-2" /> Edit Agency
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedAgency(agency); setResetPasswordOpen(true); }} className="text-xs">
                              <Key className="h-3.5 w-3.5 mr-2" /> Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!agency.is_verified && (
                              <DropdownMenuItem onClick={() => handleVerify(agency)} className="text-xs text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5 mr-2" /> Verify Agency
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(agency)}
                              className={`text-xs ${agency.is_active ? "text-destructive" : "text-emerald-600"}`}
                            >
                              {agency.is_active ? (
                                <><ShieldOff className="h-3.5 w-3.5 mr-2" /> Block Agency</>
                              ) : (
                                <><Shield className="h-3.5 w-3.5 mr-2" /> Unblock Agency</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelectedAgency(agency); setDeleteOpen(true); }}
                              className="text-xs text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Agency
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" /> Agency Details
            </DialogTitle>
          </DialogHeader>
          {selectedAgency && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Agency Name</p>
                  <p className="text-xs font-medium">{selectedAgency.agency_name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
                  {getStatusBadge(selectedAgency)}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">License</p>
                  <p className="text-xs">{selectedAgency.license_number || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Commission</p>
                  <p className="text-xs font-medium">{selectedAgency.commission_rate || 0}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Credit Limit</p>
                  <p className="text-xs font-medium">
                    ${((selectedAgency as any).credit_limit || 0).toLocaleString()} 
                    <span className="text-muted-foreground ml-1">({(selectedAgency as any).credit_limit_type || "soft"})</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">2FA Required</p>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${(selectedAgency as any).mfa_required ? "text-emerald-600 border-emerald-300" : "text-muted-foreground"}`}>
                    {(selectedAgency as any).mfa_required ? "Yes" : "No"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-xs">{selectedAgency.profiles?.email || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Phone</p>
                  <p className="text-xs">{selectedAgency.profiles?.phone || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-xs">{[selectedAgency.address, selectedAgency.city, selectedAgency.country].filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Bookings</p>
                  <p className="text-xs font-bold">{selectedAgency.bookingStats?.totalBookings || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Revenue</p>
                  <p className="text-xs font-bold text-primary">${(selectedAgency.bookingStats?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Agency Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Edit className="h-4 w-4 text-primary" /> Edit Agency
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="h-8 w-full">
              <TabsTrigger value="details" className="text-xs h-7 flex-1">Details</TabsTrigger>
              <TabsTrigger value="credit" className="text-xs h-7 flex-1">Credit & Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Agency Logo */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" /> Agency Logo
                </h3>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                    {editForm.logo_url ? (
                      <img src={editForm.logo_url} alt="Agency logo" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="agency-logo-upload" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs w-full"
                      disabled={uploadingLogo}
                      onClick={() => document.getElementById("agency-logo-upload")?.click()}
                    >
                      {uploadingLogo ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Upload className="h-3 w-3 mr-1.5" />}
                      {editForm.logo_url ? "Change Logo" : "Upload Logo"}
                    </Button>
                    {editForm.logo_url && (
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive w-full" onClick={() => setEditForm(prev => ({ ...prev, logo_url: "" }))}>
                        Remove
                      </Button>
                    )}
                    <p className="text-[10px] text-muted-foreground">This logo appears on booking vouchers</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Agency Details */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Agency Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Agency Name *</Label>
                    <Input
                      value={editForm.agency_name}
                      onChange={(e) => setEditForm({ ...editForm, agency_name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">License Number</Label>
                    <Input
                      value={editForm.license_number}
                      onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Commission Rate (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.commission_rate}
                      onChange={(e) => setEditForm({ ...editForm, commission_rate: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Address
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">City</Label>
                    <Input
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Country</Label>
                    <Input
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">Full Address</Label>
                    <Textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="text-xs mt-1 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Person */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Contact Person
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px]">Name</Label>
                    <Input
                      value={editForm.contact_person_name}
                      onChange={(e) => setEditForm({ ...editForm, contact_person_name: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Email</Label>
                    <Input
                      value={editForm.contact_email}
                      onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Phone</Label>
                    <Input
                      value={editForm.contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credit" className="space-y-4 mt-4">
              {/* Credit Limit */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Credit Limit
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Credit Limit ($)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.credit_limit}
                      onChange={(e) => setEditForm({ ...editForm, credit_limit: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Limit Type</Label>
                    <Select
                      value={editForm.credit_limit_type}
                      onValueChange={(v) => setEditForm({ ...editForm, credit_limit_type: v as "soft" | "hard" })}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft">Soft (warn only)</SelectItem>
                        <SelectItem value="hard">Hard (block bookings)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {editForm.credit_limit_type === "hard" 
                    ? "Agency will be blocked from creating new bookings when limit is exceeded."
                    : "Agency will see warnings but can still create bookings over the limit."}
                </p>
              </div>

              <Separator />

              {/* 2FA Settings */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Security Settings
                </h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-xs font-medium">Require Two-Factor Authentication</p>
                    <p className="text-[10px] text-muted-foreground">
                      Agency must set up TOTP-based 2FA on their next login
                    </p>
                  </div>
                  <Switch
                    checked={editForm.mfa_required}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, mfa_required: checked })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} className="text-xs h-8">Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={updateAgency.isPending} className="text-xs h-8">
              {updateAgency.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Agency</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete <strong>{selectedAgency?.agency_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs h-8"
            >
              {deleteAgency.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Agency Form */}
      <AdminAgencyForm open={registerOpen} onOpenChange={setRegisterOpen} />

      {/* Reset Password Dialog */}
      {selectedAgency && (
        <ResetPasswordDialog
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          userId={selectedAgency.user_id}
          userName={selectedAgency.agency_name}
        />
      )}
    </div>
  );
};

export default Agencies;
