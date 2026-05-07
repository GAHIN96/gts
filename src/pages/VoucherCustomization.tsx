import { useState, useRef } from "react";
import { 
  FileText, 
  Palette, 
  Upload, 
  RotateCcw, 
  Save, 
  Eye,
  Phone,
  Mail,
  Globe,
  Type,
  Image as ImageIcon,
  Package,
  Plane,
  Hotel,
  Compass,
  Stamp,
  Car
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useVoucherSettings } from "@/hooks/useVoucherSettings";
import { UniversalVoucher, VoucherDetails } from "@/components/booking/UniversalVoucher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const voucherTypes = [
  { id: "general", label: "General", icon: FileText, description: "Settings for all voucher types" },
  { id: "package", label: "Group Package", icon: Package, description: "Travel packages with flights & hotels" },
  { id: "flight", label: "Flight", icon: Plane, description: "Flight booking vouchers" },
  { id: "hotel", label: "Hotel", icon: Hotel, description: "Hotel reservation vouchers" },
  { id: "tour", label: "Tour", icon: Compass, description: "Tour booking vouchers" },
  { id: "visa", label: "Visa", icon: Stamp, description: "Visa application vouchers" },
  { id: "transfer", label: "Transfer", icon: Car, description: "Transfer service vouchers" },
];

export default function VoucherCustomization() {
  const { settings, isLoading, updateSettings, updateLogoFromFile, uploadBarcodeImage, resetSettings } = useVoucherSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<"package" | "flight" | "hotel" | "tour" | "visa" | "transfer">("package");
  const [activeTab, setActiveTab] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Local form state
  const [formData, setFormData] = useState({
    companyName: "",
    tagline: "",
    primaryColor: "",
    footerText: "",
    contactPhone: "",
    contactEmail: "",
    website: "",
    showQRCode: true,
  });

  // Sync form data with settings when loaded
  useState(() => {
    if (!isLoading && settings) {
      setFormData({
        companyName: settings.companyName,
        tagline: settings.tagline,
        primaryColor: settings.primaryColor,
        footerText: settings.footerText,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        website: settings.website,
        showQRCode: settings.showQRCode,
      });
    }
  });

  // Update form when settings change
  if (!isLoading && formData.companyName === "" && settings.companyName !== "") {
    setFormData({
      companyName: settings.companyName,
      tagline: settings.tagline,
      primaryColor: settings.primaryColor,
      footerText: settings.footerText,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      website: settings.website,
      showQRCode: settings.showQRCode,
    });
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      await updateLogoFromFile(file);
    }
  };

  const handleBarcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      await uploadBarcodeImage(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast.success("Voucher template saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    await resetSettings();
    setFormData({
      companyName: "GTS Travel",
      tagline: "Your Gateway to Amazing Adventures",
      primaryColor: "#1A237E",
      footerText: "Thank you for choosing GTS Travel. Have a safe journey!",
      contactPhone: "+964 770 123 4567",
      contactEmail: "info@gtstravel.com",
      website: "www.gtstravel.com",
      showQRCode: true,
    });
  };

  const openPreview = (type: typeof previewType) => {
    setPreviewType(type);
    setPreviewOpen(true);
  };

  // Sample voucher details for preview based on type
  const getSampleVoucherDetails = (): VoucherDetails => {
    const baseDetails = {
      bookingId: "preview-001",
      bookingNumber: "BK-PREVIEW-001",
      totalAmount: 1250,
      status: "confirmed" as const,
      passengerCount: 2,
      passengerNames: ["Ahmed Ali", "Sarah Hassan"],
      contactEmail: "customer@example.com",
      contactPhone: "+964 770 123 4567",
    };

    switch (previewType) {
      case "package":
        return {
          ...baseDetails,
          type: "package",
          serviceName: "Istanbul Discovery Package",
          destination: "Istanbul, Turkey",
          departureDate: new Date("2026-02-15"),
          returnDate: new Date("2026-02-22"),
          hotelName: "Grand Hyatt Istanbul",
          hotelStars: 5,
          hotelAddress: "Harbiye Mahallesi, Taskisla Caddesi No:1, Istanbul",
          packageDetails: {
            packageName: "Istanbul Discovery Package",
            destination: "Istanbul, Turkey",
            nights: 7,
            departureDate: "Feb 15, 2026",
            returnDate: "Feb 22, 2026",
            outboundFlight: {
              airline: "Turkish Airlines",
              flightNumber: "TK123",
              departureCity: "Erbil",
              arrivalCity: "Istanbul",
              departureDate: "Feb 15, 2026",
              departureTime: "09:00",
              arrivalTime: "12:30",
            },
            returnFlight: {
              airline: "Turkish Airlines",
              flightNumber: "TK456",
              departureCity: "Istanbul",
              arrivalCity: "Erbil",
              departureDate: "Feb 22, 2026",
              departureTime: "14:00",
              arrivalTime: "17:30",
            },
            hotel: {
              name: "Grand Hyatt Istanbul",
              starRating: 5,
              address: "Harbiye Mahallesi, Taskisla Caddesi No:1, Istanbul",
              roomType: "Deluxe King Room",
              checkIn: "Feb 15, 2026",
              checkOut: "Feb 22, 2026",
            },
            included: ["Round-trip Flights", "4-Star Hotel", "Daily Breakfast", "All Transfers", "City Tours", "English Guide"],
            notIncluded: ["Personal Expenses", "Optional Activities", "Travel Insurance"],
            passengers: [
              { name: "Ahmed Ali", birthDate: "1990-05-15" },
              { name: "Sarah Hassan", birthDate: "1992-08-22" },
            ],
          },
        };

      case "flight":
        return {
          ...baseDetails,
          type: "flight",
          serviceName: "Turkish Airlines TK123",
          departureCity: "Erbil",
          arrivalCity: "Istanbul",
          departureDate: new Date("2026-02-15"),
          departureTime: "09:00",
          arrivalTime: "12:30",
          airline: "Turkish Airlines",
          flightNumber: "TK123",
          flightClass: "Economy",
          totalAmount: 450,
        };

      case "hotel":
        return {
          ...baseDetails,
          type: "hotel",
          serviceName: "Grand Hyatt Istanbul",
          hotelName: "Grand Hyatt Istanbul",
          hotelStars: 5,
          hotelAddress: "Harbiye Mahallesi, Taskisla Caddesi No:1, Istanbul",
          destination: "Istanbul, Turkey",
          checkInDate: new Date("2026-02-15"),
          checkOutDate: new Date("2026-02-22"),
          roomType: "Deluxe King Room",
          roomCount: 1,
          totalAmount: 980,
        };

      case "tour":
        return {
          ...baseDetails,
          type: "tour",
          serviceName: "Old City Walking Tour",
          destination: "Istanbul, Turkey",
          departureDate: new Date("2026-02-16"),
          tourDuration: "6 hours",
          totalAmount: 85,
        };

      case "visa":
        return {
          ...baseDetails,
          type: "visa",
          serviceName: "Turkey Tourist Visa",
          visaCountry: "Turkey",
          visaType: "Tourist Visa",
          processingDays: 5,
          totalAmount: 150,
        };

      case "transfer":
        return {
          ...baseDetails,
          type: "transfer",
          serviceName: "Airport Transfer - Istanbul",
          destination: "Istanbul, Turkey",
          pickupLocation: "Istanbul Airport (IST)",
          dropoffLocation: "Grand Hyatt Istanbul",
          departureDate: new Date("2026-02-15"),
          pickupTime: "12:30",
          vehicleType: "Mercedes V-Class",
          transferType: "Private",
          totalAmount: 75,
        };

      default:
        return {
          ...baseDetails,
          type: "package",
          serviceName: "Istanbul Discovery Package",
          destination: "Istanbul, Turkey",
          departureDate: new Date("2026-02-15"),
          returnDate: new Date("2026-02-22"),
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Voucher Template Customization
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize the appearance of booking vouchers for different service types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Section-based Templates */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          {voucherTypes.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-1.5 text-xs">
              <type.icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{type.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branding Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Branding
                </CardTitle>
                <CardDescription>
                  Upload your logo and set your company identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                      {settings.logo ? (
                        <img 
                          src={settings.logo} 
                          alt="Company logo" 
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Recommended: 200x200px, PNG or JPG, max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>

                {/* Tagline */}
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => handleInputChange("tagline", e.target.value)}
                    placeholder="Your company slogan"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Colors Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Colors & Appearance
                </CardTitle>
                <CardDescription>
                  Customize the color scheme of your vouchers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-12 w-12 rounded-xl border-2 border-border cursor-pointer overflow-hidden"
                      style={{ backgroundColor: formData.primaryColor }}
                      onClick={() => document.getElementById("colorPicker")?.click()}
                    >
                      <input
                        id="colorPicker"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                        className="opacity-0 h-full w-full cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                        placeholder="#1A237E"
                        className="font-sans font-medium"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for headers, buttons, and accent elements
                  </p>
                </div>

                <Separator />

                {/* QR Code Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show QR / Barcode</Label>
                    <p className="text-xs text-muted-foreground">
                      Display a QR code or barcode on vouchers
                    </p>
                  </div>
                  <Switch
                    checked={formData.showQRCode}
                    onCheckedChange={(checked) => handleInputChange("showQRCode", checked)}
                  />
                </div>

                <Separator />

                {/* Barcode Upload - Replace QR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Use Barcode Instead of QR</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a custom barcode image to replace the auto-generated QR code
                      </p>
                    </div>
                    <Switch
                      checked={settings.useBarcodeInsteadOfQR}
                      onCheckedChange={(checked) => updateSettings({ useBarcodeInsteadOfQR: checked })}
                    />
                  </div>

                  {settings.useBarcodeInsteadOfQR && (
                    <div className="flex items-center gap-4 mt-3">
                      <div className="h-20 w-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                        {settings.barcodeImage ? (
                          <img 
                            src={settings.barcodeImage} 
                            alt="Barcode" 
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={barcodeInputRef}
                          onChange={handleBarcodeUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => barcodeInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Barcode
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG or JPG, max 5MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
                <CardDescription>
                  Contact details shown on vouchers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                    placeholder="+964 770 123 4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="info@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="www.company.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Footer Text */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Footer Message
                </CardTitle>
                <CardDescription>
                  Custom message displayed at the bottom of vouchers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Textarea
                    id="footerText"
                    value={formData.footerText}
                    onChange={(e) => handleInputChange("footerText", e.target.value)}
                    placeholder="Thank you for choosing us..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This message appears at the bottom of every voucher
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Section-specific Templates */}
        {voucherTypes.slice(1).map((type) => (
          <TabsContent key={type.id} value={type.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <type.icon className="h-5 w-5 text-primary" />
                  {type.label} Voucher Template
                </CardTitle>
                <CardDescription>
                  {type.description}. This section uses the general settings with specialized layout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div>
                    <p className="font-semibold text-foreground">Preview {type.label} Voucher</p>
                    <p className="text-sm text-muted-foreground">See how the voucher looks with sample data</p>
                  </div>
                  <Button onClick={() => openPreview(type.id as any)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Template features for this type */}
                  <div className="p-4 rounded-xl border border-border bg-card">
                    <h4 className="font-semibold text-foreground mb-3">Included Sections</h4>
                    <ul className="space-y-2 text-sm">
                      {type.id === "package" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Plane className="h-4 w-4 text-primary" />
                            Outbound & Return Flight Details
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Hotel className="h-4 w-4 text-primary" />
                            Hotel Info with Star Rating & Address
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Inclusions & Exclusions List
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Passenger Details with DOB
                          </li>
                        </>
                      )}
                      {type.id === "flight" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Plane className="h-4 w-4 text-primary" />
                            Flight Route Visualization
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Departure & Arrival Times
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Airline & Flight Number
                          </li>
                        </>
                      )}
                      {type.id === "hotel" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Hotel className="h-4 w-4 text-primary" />
                            Hotel Name & Star Rating
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Check-in / Check-out Dates
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Room Type & Count
                          </li>
                        </>
                      )}
                      {type.id === "tour" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Compass className="h-4 w-4 text-primary" />
                            Tour Name & Destination
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Tour Date & Duration
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Participant Count
                          </li>
                        </>
                      )}
                      {type.id === "visa" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Stamp className="h-4 w-4 text-primary" />
                            Country & Visa Type
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Processing Time
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Applicant Count
                          </li>
                        </>
                      )}
                      {type.id === "transfer" && (
                        <>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <Car className="h-4 w-4 text-primary" />
                            Pickup & Dropoff Locations
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Date & Pickup Time
                          </li>
                          <li className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Vehicle Type
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-card">
                    <h4 className="font-semibold text-foreground mb-3">Standard Elements</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Company Logo & Branding
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Booking Reference Number
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        QR Code for Verification
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Price Summary
                      </li>
                      <li className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Contact Information
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Custom Footer Message
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {previewType.charAt(0).toUpperCase() + previewType.slice(1)} Voucher Preview
            </DialogTitle>
          </DialogHeader>
          <UniversalVoucher 
            details={getSampleVoucherDetails()} 
            onClose={() => setPreviewOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
