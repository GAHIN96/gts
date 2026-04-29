import { useState, useRef, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  Building,
  Globe,
  CreditCard,
  Shield,
  Palette,
  Mail,
  Save,
  Upload,
  X,
  Check,
  Image,
  RotateCcw,
  PlaneTakeoff,
  Hotel,
  Compass,
  Stamp,
  Star,
  Car,
  FileText,
  Eye,
  QrCode,
  Plus,
  Trash2,
  Images,
  BadgePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBannerSettings, type ModuleKey, defaultBanners } from "@/hooks/useBannerSettings";
import { useVoucherSettings } from "@/hooks/useVoucherSettings";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UniversalVoucher } from "@/components/booking/UniversalVoucher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTermsConditions } from "@/hooks/useTermsConditions";

const TermsConditionsEditor = () => {
  const { settings: tcSettings, saveSettings: saveTcSettings } = useTermsConditions();
  const [content, setContent] = useState(tcSettings.content);
  const [enabled, setEnabled] = useState(tcSettings.isEnabled);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && tcSettings.content !== undefined) {
      setContent(tcSettings.content);
      setEnabled(tcSettings.isEnabled);
      setInitialized(true);
    }
  }, [tcSettings, initialized]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Terms & Conditions
            </CardTitle>
            <CardDescription>Set terms that users must accept before booking</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="tc-enabled" className="text-sm">Enabled</Label>
              <Switch
                id="tc-enabled"
                checked={enabled}
                onCheckedChange={(checked) => {
                  setEnabled(checked);
                  saveTcSettings({ isEnabled: checked, content });
                }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your terms and conditions here..."
          rows={8}
          className="resize-y"
        />
        <Button
          variant="navy"
          size="sm"
          onClick={() => saveTcSettings({ content, isEnabled: enabled })}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Terms
        </Button>
      </CardContent>
    </Card>
  );
};

const bannerModules: { key: ModuleKey; label: string; icon: React.ReactNode }[] = [
  { key: "flights", label: "Flights", icon: <PlaneTakeoff className="h-4 w-4" /> },
  { key: "hotels", label: "Hotels", icon: <Hotel className="h-4 w-4" /> },
  { key: "tours", label: "Tours", icon: <Compass className="h-4 w-4" /> },
  { key: "visas", label: "Visas", icon: <Stamp className="h-4 w-4" /> },
  { key: "specialRequests", label: "Special Requests", icon: <Star className="h-4 w-4" /> },
  { key: "transfers", label: "Transfers", icon: <Car className="h-4 w-4" /> },
  { key: "additionalServices", label: "Additional Services", icon: <BadgePlus className="h-4 w-4" /> },
  { key: "flightsPromo", label: "Flights Promo (below hero)", icon: <PlaneTakeoff className="h-4 w-4" /> },
  { key: "hotelsPromo", label: "Hotels Promo (below hero)", icon: <Hotel className="h-4 w-4" /> },
];

const Settings = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  const { 
    bannerImages, 
    addBannerImage, 
    removeBannerImage, 
    resetModuleBanners, 
    resetAllBanners,
    isLoading: bannersLoading 
  } = useBannerSettings();
  
  const { 
    settings: voucherSettings, 
    updateSettings: updateVoucherSettings, 
    updateLogoFromFile: updateVoucherLogo,
    resetSettings: resetVoucherSettings 
  } = useVoucherSettings();
  
  const {
    settings: companySettings,
    updateSettings: updateCompanySettings,
    updateLogoFromFile: updateCompanyLogo,
    removeLogo: removeCompanyLogo,
    saveSettings: saveCompanySettings,
  } = useCompanySettings();

  const voucherLogoRef = useRef<HTMLInputElement>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("flights");
  const [uploadingModule, setUploadingModule] = useState<ModuleKey | null>(null);

  const handleCompanyLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error("Logo must be less than 500KB");
        return;
      }
      updateCompanyLogo(file);
    }
  };

  const handleBannerUpload = async (key: ModuleKey, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2000000) {
        toast.error("Banner must be less than 2MB");
        return;
      }
      setUploadingModule(key);
      await addBannerImage(key, file);
      setUploadingModule(null);
      // Reset input
      if (bannerInputRefs.current[key]) {
        bannerInputRefs.current[key]!.value = "";
      }
    }
  };

  const handleVoucherLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error("Logo must be less than 500KB");
        return;
      }
      updateVoucherLogo(file);
    }
  };

  const handleSaveSettings = async () => {
    await saveCompanySettings();
  };

  const selectedModuleImages = bannerImages[selectedModule] || [];
  const isDefaultImages = selectedModuleImages.length === 1 && 
    selectedModuleImages[0] === defaultBanners[selectedModule];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your platform configuration</p>
        </div>
        <Button variant="navy" onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Slideshow Management - Admin Only */}
          {isAdmin && (
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Images className="h-5 w-5" />
                      Hero Slideshow Management
                    </CardTitle>
                    <CardDescription>Manage multiple hero images for each module</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetAllBanners}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Module Selector */}
                <div className="flex flex-wrap gap-2">
                  {bannerModules.map((module) => (
                    <Button
                      key={module.key}
                      variant={selectedModule === module.key ? "navy" : "outline"}
                      size="sm"
                      onClick={() => setSelectedModule(module.key)}
                      className="gap-2"
                    >
                      {module.icon}
                      {module.label}
                    </Button>
                  ))}
                </div>

                <Separator />

                {/* Selected Module Images */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">
                      {bannerModules.find(m => m.key === selectedModule)?.label} Images
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={(el) => bannerInputRefs.current[selectedModule] = el}
                        onChange={(e) => handleBannerUpload(selectedModule, e)}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => bannerInputRefs.current[selectedModule]?.click()}
                        disabled={uploadingModule === selectedModule}
                      >
                        {uploadingModule === selectedModule ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Add Image
                      </Button>
                      {!isDefaultImages && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetModuleBanners(selectedModule)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>

                  {bannersLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ScrollArea className="w-full">
                      <div className="flex gap-3 pb-2">
                        {selectedModuleImages.map((imageUrl, index) => (
                          <div 
                            key={index} 
                            className="relative group flex-shrink-0 w-48"
                          >
                            <div className="relative h-28 rounded-lg overflow-hidden border-2 border-border">
                              <img 
                                src={imageUrl} 
                                alt={`Banner ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {!isDefaultImages && (
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removeBannerImage(selectedModule, imageUrl)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {isDefaultImages ? "Default" : `Image ${index + 1}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Upload multiple images to create a slideshow. PNG, JPG up to 2MB. Recommended: 1920x1080px.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voucher Customization - Admin Only */}
          {isAdmin && (
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Voucher Customization
                    </CardTitle>
                    <CardDescription>Customize vouchers for all booking types</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Voucher Preview</DialogTitle>
                        </DialogHeader>
                        <UniversalVoucher
                          details={{
                            type: "transfer",
                            bookingId: "preview-123",
                            bookingNumber: "GTS-20260111-0001",
                            serviceName: "Airport Transfer - Sedan",
                            totalAmount: 75,
                            passengerCount: 2,
                            passengerNames: ["John Doe", "Jane Doe"],
                            contactEmail: "john@example.com",
                            contactPhone: "+964 770 123 4567",
                            pickupTime: "14:30",
                            pickupLocation: "Hotel Babylon",
                            dropoffLocation: "Baghdad International Airport",
                            departureDate: new Date(),
                            vehicleType: "sedan",
                            destination: "Baghdad",
                            status: "confirmed",
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetVoucherSettings}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voucher Logo */}
                <div className="space-y-3">
                  <Label>Voucher Logo</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={voucherLogoRef}
                      onChange={handleVoucherLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="relative group">
                      <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 cursor-pointer"
                           onClick={() => voucherLogoRef.current?.click()}>
                        <img src={voucherSettings.logo} alt="Voucher Logo" className="h-full w-full object-contain p-2" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer"
                           onClick={() => voucherLogoRef.current?.click()}>
                        <Upload className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      <p>Logo shown on all vouchers</p>
                      <p className="text-xs">PNG, JPG up to 500KB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      value={voucherSettings.companyName}
                      onChange={(e) => updateVoucherSettings({ companyName: e.target.value })}
                      placeholder="Your Company Name"
                    />
                  </div>

                  {/* Primary Color */}
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={voucherSettings.primaryColor}
                        onChange={(e) => updateVoucherSettings({ primaryColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                      />
                      <Input 
                        value={voucherSettings.primaryColor}
                        onChange={(e) => updateVoucherSettings({ primaryColor: e.target.value })}
                        className="font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input 
                    value={voucherSettings.tagline}
                    onChange={(e) => updateVoucherSettings({ tagline: e.target.value })}
                    placeholder="Your Gateway to Amazing Adventures"
                  />
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input 
                      value={voucherSettings.contactPhone}
                      onChange={(e) => updateVoucherSettings({ contactPhone: e.target.value })}
                      placeholder="+964 xxx xxx xxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input 
                      value={voucherSettings.contactEmail}
                      onChange={(e) => updateVoucherSettings({ contactEmail: e.target.value })}
                      placeholder="info@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      value={voucherSettings.website}
                      onChange={(e) => updateVoucherSettings({ website: e.target.value })}
                      placeholder="www.company.com"
                    />
                  </div>
                </div>

                {/* Footer Text */}
                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Textarea 
                    value={voucherSettings.footerText}
                    onChange={(e) => updateVoucherSettings({ footerText: e.target.value })}
                    placeholder="Thank you message..."
                    rows={2}
                  />
                </div>

                {/* Show QR Code */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Show QR Code</p>
                      <p className="text-xs text-muted-foreground">Display verification QR on vouchers</p>
                    </div>
                  </div>
                  <Switch 
                    checked={voucherSettings.showQRCode}
                    onCheckedChange={(checked) => updateVoucherSettings({ showQRCode: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terms & Conditions - Admin Only */}
          {isAdmin && (
            <TermsConditionsEditor />
          )}

          {/* Company Branding - Admin Only */}
          {isAdmin && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Company Branding
                </CardTitle>
                <CardDescription>Configure your company logo, name, and brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleCompanyLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    {companySettings.logo ? (
                      <div className="relative group">
                        <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                          <img src={companySettings.logo} alt="Logo" className="h-full w-full object-contain p-2" />
                        </div>
                        <button
                          onClick={removeCompanyLogo}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-20 w-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-muted/30"
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Upload</span>
                      </button>
                    )}
                    <div className="flex-1 text-sm text-muted-foreground">
                      <p>Upload your company logo</p>
                      <p className="text-xs">PNG, JPG up to 500KB. Square format recommended.</p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={companySettings.companyName}
                    onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>

                {/* Brand Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={companySettings.primaryColor}
                        onChange={(e) => updateCompanySettings({ primaryColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                      />
                      <Input 
                        value={companySettings.primaryColor}
                        onChange={(e) => updateCompanySettings({ primaryColor: e.target.value })}
                        className="font-mono flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={companySettings.accentColor}
                        onChange={(e) => updateCompanySettings({ accentColor: e.target.value })}
                        className="h-10 w-10 rounded-lg border border-border cursor-pointer"
                      />
                      <Input 
                        value={companySettings.accentColor}
                        onChange={(e) => updateCompanySettings({ accentColor: e.target.value })}
                        className="font-mono flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Info */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Basic details about your travel company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={companySettings.contactEmail}
                    onChange={(e) => updateCompanySettings({ contactEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={companySettings.phone}
                    onChange={(e) => updateCompanySettings({ phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={companySettings.address}
                    onChange={(e) => updateCompanySettings({ address: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localization */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Localization
              </CardTitle>
              <CardDescription>Language and regional settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (LTR)</SelectItem>
                      <SelectItem value="ar">العربية (RTL)</SelectItem>
                      <SelectItem value="ku">کوردی (RTL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="iqd">IQD (د.ع)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Configure accepted payment options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">QiCard</p>
                  <p className="text-sm text-muted-foreground">Accept QiCard payments</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">First Iraqi Bank</p>
                  <p className="text-sm text-muted-foreground">Bank transfer via FIB</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pay in Office</p>
                  <p className="text-sm text-muted-foreground">Cash payment at office</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Security */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Two-Factor Auth</p>
                  <p className="text-xs text-muted-foreground">Require 2FA for admins</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Session Timeout</p>
                  <p className="text-xs text-muted-foreground">Auto logout after 30min</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SMTP Server</Label>
                <Input defaultValue="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Input defaultValue="587" />
              </div>
              <Button variant="outline" className="w-full">
                <Check className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
