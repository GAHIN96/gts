import { useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAirlines, Airline } from "@/hooks/useAirlines";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Plane, Upload, X } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Airlines() {
  const { airlines, isLoading, createAirline, updateAirline, deleteAirline } = useAirlines();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Airline | null>(null);
  const [form, setForm] = useState({ name: "", code: "", logo_url: "", is_active: true });
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = airlines.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", logo_url: "", is_active: true });
    setLogoPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (a: Airline) => {
    setEditing(a);
    setForm({ name: a.name, code: a.code, logo_url: a.logo_url || "", is_active: a.is_active });
    setLogoPreview(a.logo_url || null);
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage.from("airline-logos").upload(fileName, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("airline-logos").getPublicUrl(fileName);
    setForm((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
    setLogoPreview(urlData.publicUrl);
    setUploading(false);
    toast.success("Logo uploaded");
  };

  const removeLogo = () => {
    setForm((prev) => ({ ...prev, logo_url: "" }));
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = () => {
    const payload = { ...form, logo_url: form.logo_url || null };
    if (editing) {
      updateAirline.mutate({ id: editing.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createAirline.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2"><Plane className="h-6 w-6 text-primary" /> Airlines</h1>
          <p className="text-muted-foreground text-sm">Manage airline companies</p>
        </div>
        {isAdmin && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Airline</Button>}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search airlines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>IATA Code</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No airlines found</TableCell></TableRow>
            ) : filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.logo_url ? <img src={a.logo_url} alt={a.name} className="h-8 w-8 object-contain rounded" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">{a.code}</div>}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell><Badge variant="outline">{a.code}</Badge></TableCell>
                <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                      <ConfirmDelete itemName={`airline "${a.name}"`} onConfirm={() => deleteAirline.mutate(a.id)}>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </ConfirmDelete>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Airline" : "Add Airline"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>IATA Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={3} placeholder="e.g. TK" /></div>
            
            {/* Logo Upload */}
            <div>
              <Label>Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              {logoPreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 object-contain rounded-lg border bg-muted p-1" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />Change
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={removeLogo} className="text-destructive">
                      <X className="h-3.5 w-3.5 mr-1.5" />Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full h-20 border-dashed flex flex-col gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload logo (max 2MB)"}</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={!form.name || !form.code || uploading}>{editing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
