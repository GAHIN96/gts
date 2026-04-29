import { useEffect, useState, useRef } from "react";
import { Building2, Mail, Phone, MapPin, Percent, Shield, Calendar, Wallet, User, Camera, Save, Loader2, Settings2, Lock, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type AgencyInfo = {
  id: string;
  agency_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_person_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  license_number: string | null;
  credit_limit: number | null;
  used_credit: number | null;
  credit_limit_type: string | null;
  commission_rate: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  logo_url: string | null;
};

const AgencyProfile = () => {
  const { user } = useAuth();
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("agencies")
        .select("id, agency_name, contact_email, contact_phone, contact_person_name, address, city, country, license_number, credit_limit, used_credit, credit_limit_type, commission_rate, is_verified, is_active, created_at, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setAgency(data);
      if (data) {
        setEditName(data.agency_name);
        setEditPhone(data.contact_phone || "");
      }
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const handleSave = async () => {
    if (!agency) return;
    setSaving(true);
    const { error } = await supabase
      .from("agencies")
      .update({ agency_name: editName.trim(), contact_phone: editPhone.trim() || null })
      .eq("id", agency.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save changes");
    } else {
      setAgency(prev => prev ? { ...prev, agency_name: editName.trim(), contact_phone: editPhone.trim() || null } : null);
      toast.success("Profile updated");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agency) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${agency.id}/logo.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("settings-images").upload(path, file, { upsert: true });
    if (uploadErr) { setUploading(false); toast.error("Upload failed"); return; }

    const { data: urlData } = supabase.storage.from("settings-images").getPublicUrl(path);
    const logo_url = urlData.publicUrl + "?t=" + Date.now();

    const { error: updateErr } = await supabase.from("agencies").update({ logo_url }).eq("id", agency.id);
    setUploading(false);
    if (updateErr) { toast.error("Failed to update logo"); return; }
    setAgency(prev => prev ? { ...prev, logo_url } : null);
    toast.success("Logo updated");
  };

  const hasChanges = agency && (editName.trim() !== agency.agency_name || (editPhone.trim() || null) !== (agency.contact_phone || null));

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">No Agency Profile Found</h2>
        <p className="text-muted-foreground text-sm mt-2">Your account is not linked to an agency.</p>
      </div>
    );
  }

  const usedPct = agency.credit_limit ? Math.min(100, ((agency.used_credit || 0) / agency.credit_limit) * 100) : 0;
  const creditColor = usedPct >= 90 ? "bg-destructive" : usedPct >= 70 ? "bg-gold" : "bg-success";

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* Page Title */}
      <div className="flex items-center gap-2 mb-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Header with editable logo */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          {agency.logo_url ? (
            <img src={agency.logo_url} alt="Agency" className="h-16 w-16 rounded-xl object-cover border border-border" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{agency.agency_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {agency.is_verified && (
              <Badge className="bg-success/10 text-success border-success/20 text-xs gap-1">
                <Shield className="h-3 w-3" /> Verified
              </Badge>
            )}
            <Badge className={cn(
              "text-xs",
              agency.is_active ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
            )}>
              {agency.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Edit Profile</CardTitle>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving || !editName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Agency Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Agency name" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Contact Phone</label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-only Details */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Agency Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: User, label: "Contact Person", value: agency.contact_person_name },
              { icon: Mail, label: "Email", value: agency.contact_email },
              { icon: MapPin, label: "Location", value: [agency.city, agency.country].filter(Boolean).join(", ") || null },
              { icon: Building2, label: "Address", value: agency.address },
              { icon: Shield, label: "License", value: agency.license_number },
              { icon: Calendar, label: "Member Since", value: agency.created_at ? format(new Date(agency.created_at), "MMM dd, yyyy") : null },
            ].filter(item => item.value).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <ChangePasswordSection />

      {/* Financial Info (read-only) */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Financial Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {agency.commission_rate != null && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Commission Rate</p>
                <p className="text-lg font-bold">{agency.commission_rate}%</p>
              </div>
            </div>
          )}

          <Separator />

          {agency.credit_limit != null && agency.credit_limit > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Credit Usage</p>
                  <p className="text-xs text-muted-foreground">
                    {agency.credit_limit_type === "hard" ? "Hard limit — bookings blocked when exceeded" : "Soft limit — warnings only"}
                  </p>
                </div>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full transition-all", creditColor)} style={{ width: `${usedPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Used: <span className="font-bold text-foreground">${(agency.used_credit || 0).toLocaleString()}</span></span>
                <span className="text-muted-foreground">Limit: <span className="font-bold text-foreground">${agency.credit_limit.toLocaleString()}</span></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Change Password Section ───
const ChangePasswordSection = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to change password");
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully");
    }
  };

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">New Password</label>
          <div className="relative">
            <Input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Confirm Password</label>
          <div className="relative">
            <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button onClick={handleChangePassword} disabled={saving || !newPassword || !confirmPassword} className="w-full rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
};

export default AgencyProfile;
