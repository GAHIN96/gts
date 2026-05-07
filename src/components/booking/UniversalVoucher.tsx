import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { 
  Download, 
  Mail, 
  CheckCircle2, 
  Plane, 
  Hotel, 
  Compass, 
  Stamp, 
  Car, 
  Calendar, 
  Users, 
  MapPin, 
  Clock,
  Phone,
  Globe,
  Loader2,
  Scissors,
  Shield,
  Briefcase,
  Star,
  CreditCard,
  FileText,
  Navigation,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useVoucherSettings } from "@/hooks/useVoucherSettings";
import { generatePDFFromElement, getVoucherFilename } from "@/utils/pdfGenerator";
import { GroupPackageVoucher, type GroupPackageVoucherDetails } from "./GroupPackageVoucher";

export type VoucherType = "package" | "flight" | "hotel" | "tour" | "visa" | "transfer" | "custom_group";

export interface CustomGroupVoucherDetails {
  outboundFlight?: {
    airline: string;
    flightNumber?: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    airlineLogo?: string | null;
  };
  returnFlight?: {
    airline: string;
    flightNumber?: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    airlineLogo?: string | null;
  };
  hotel?: {
    name: string;
    starRating?: number;
    address?: string;
  };
  transfer?: {
    name: string;
    vehicleType?: string;
    routeFrom?: string;
    routeTo?: string;
  };
  departureDate?: string;
  returnDate?: string;
  nights?: number;
}

export interface VoucherDetails {
  type: VoucherType;
  bookingId: string;
  bookingNumber: string;
  serviceName: string;
  totalAmount: number;
  passengerCount?: number;
  passengerNames?: string[];
  contactEmail?: string;
  contactPhone?: string;
  status?: "confirmed" | "pending";
  destination?: string;
  departureDate?: Date;
  returnDate?: Date;
  pickupTime?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  hotelName?: string;
  hotelStars?: number;
  hotelAddress?: string;
  checkIn?: Date;
  checkOut?: Date;
  checkInDate?: Date;
  checkOutDate?: Date;
  roomType?: string;
  roomCount?: number;
  flightNumber?: string;
  airline?: string;
  airlineLogo?: string | null;
  departureCity?: string;
  arrivalCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  flightClass?: string;
  visaCountry?: string;
  visaType?: string;
  processingDays?: number;
  tourDuration?: string;
  vehicleType?: string;
  transferType?: string;
  packageDetails?: GroupPackageVoucherDetails;
  customGroupDetails?: CustomGroupVoucherDetails;
  agencyName?: string;
  agencyLogo?: string | null;
  guideName?: string;
  guidePhone?: string;
  gateNumber?: string;
  groupPolicy?: string;
  fromCity?: string;
}

interface UniversalVoucherProps {
  details: VoucherDetails;
  onClose?: () => void;
  printMode?: boolean;
}

const typeLabels: Record<VoucherType, string> = {
  package: "TRAVEL PACKAGE",
  flight: "FLIGHT TICKET",
  hotel: "HOTEL VOUCHER",
  tour: "TOUR VOUCHER",
  visa: "VISA APPLICATION",
  transfer: "TRANSFER VOUCHER",
  custom_group: "CUSTOM GROUP TRIP",
};

const typeIcons: Record<VoucherType, React.ReactNode> = {
  flight: <Plane style={{ width: 15, height: 15 }} />,
  hotel: <Hotel style={{ width: 15, height: 15 }} />,
  tour: <Compass style={{ width: 15, height: 15 }} />,
  visa: <Shield style={{ width: 15, height: 15 }} />,
  transfer: <Navigation style={{ width: 15, height: 15 }} />,
  package: <Briefcase style={{ width: 15, height: 15 }} />,
  custom_group: <Briefcase style={{ width: 15, height: 15 }} />,
};

// A4 dimensions: 210mm x 297mm at 96dpi = 794px x 1123px
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export function UniversalVoucher({ details, onClose, printMode = false }: UniversalVoucherProps) {
  const voucherRef = useRef<HTMLDivElement>(null);
  const { settings } = useVoucherSettings();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleSendEmail = () => {
    toast.success(`Voucher sent to ${details.contactEmail || "your email"}`, {
      description: "Check your inbox for the booking confirmation",
      icon: <Mail className="h-5 w-5" />,
    });
  };

  const handleDownload = async () => {
    if (!voucherRef.current) return;
    
    setIsDownloading(true);
    try {
      const filename = getVoucherFilename(details.bookingNumber, details.type);
      await generatePDFFromElement(voucherRef.current, filename);
      toast.success("PDF Downloaded", {
        description: `Voucher saved as ${filename}`,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF", {
        description: "Please try again",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const baseUrl = window.location.origin;
  const qrValue = `${baseUrl}/bookings/${details.bookingId}`;
  const primaryColor = settings.primaryColor || "#1A237E";
  const accentColor = "#2563eb";

  return (
    <div className={printMode ? "" : "space-y-6"}>
      {/* Success Message - hidden in print mode */}
      {!printMode && (
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {details.status === "pending" ? "Booking Submitted!" : "Booking Confirmed!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {details.status === "pending" 
              ? "Your booking is pending payment confirmation." 
              : "Your voucher is ready for download."}
          </p>
        </div>
      )}

      {/* A4 Voucher Container */}
      <div className={printMode ? "" : "overflow-auto bg-muted/30 p-4 rounded-lg"}>
        <div 
          ref={printMode ? undefined : voucherRef}
          className={printMode ? "bg-white" : "mx-auto bg-white shadow-xl"}
          style={{ 
            width: `${A4_WIDTH}px`, 
            minHeight: printMode ? 'auto' : `${A4_HEIGHT}px`,
            fontFamily: "'Segoe UI', -apple-system, system-ui, sans-serif",
          }}
        >
          {/* ══════════ ELITE COMMAND HEADER ══════════ */}
            <div 
              style={{ 
                background: `#1A237E`,
                padding: "48px 60px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "relative",
                overflow: "hidden",
                borderBottom: `2px solid ${primaryColor}`,
              }}
            >
            {/* Luminous accents */}
            <div style={{
              position: "absolute", top: "0", left: "0", right: "0", height: "1px",
              background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
              opacity: 0.5,
            }} />
            <div style={{
              position: "absolute", top: "0", right: "0", bottom: "0", width: "40%",
              background: `linear-gradient(135deg, transparent 0%, ${primaryColor}05 100%)`,
            }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "24px", position: "relative", zIndex: 1 }}>
              {settings.logo ? (
                <div style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "20px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}>
                  <img 
                    src={settings.logo} 
                    alt="Logo" 
                    style={{ height: "64px", width: "64px", objectFit: "contain" }} 
                  />
                </div>
              ) : (
                <div style={{
                  width: "64px", height: "64px", borderRadius: "20px",
                  background: primaryColor,
                  display: "flex", alignItems: "center", justifyItems: "center",
                  fontSize: "24px", fontWeight: 900, color: "#fff",
                }}>
                  GTS
                </div>
              )}
              <div>
                <div style={{ color: "#fff", fontSize: "28px", fontWeight: 900, letterSpacing: "-0.5px", textTransform: "uppercase" }}>
                  {settings.companyName || "GTS_SYSTEMS"}
                </div>
                <div style={{ color: primaryColor, fontSize: "10px", marginTop: "6px", letterSpacing: "4px", fontWeight: 900, textTransform: "uppercase" }}>
                  {settings.tagline || "Premium Travel Logistics"}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
              <div style={{ 
                color: "rgba(255,255,255,0.2)", fontSize: "10px", textTransform: "uppercase", 
                letterSpacing: "3px", fontWeight: 900,
              }}>
                Reference Number
              </div>
              <div style={{ 
                color: "#fff", fontSize: "24px", fontWeight: 900, fontFamily: "monospace",
                letterSpacing: "4px", marginTop: "8px", textShadow: `0 0 20px ${primaryColor}40`,
              }}>
                {details.bookingNumber}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700, fontFamily: "monospace", letterSpacing: "1px" }}>
                ISSUED: {format(new Date(), "dd.MM.yyyy / HH:mm")}
              </div>
            </div>
          </div>

          {/* ══════════ TYPE BANNER ══════════ */}
          <div style={{ 
            background: "#f8fafc", 
            borderBottom: "1px solid #e2e8f0",
            padding: "20px 60px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px",
                background: `${primaryColor}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: primaryColor,
                border: `1px solid ${primaryColor}20`,
              }}>
                {typeIcons[details.type]}
              </div>
              <div style={{ 
                fontSize: "14px", fontWeight: 900, color: "#1a237e",
                textTransform: "uppercase", letterSpacing: "4px",
              }}>
                {typeLabels[details.type]}
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "10px",
              padding: "8px 20px", borderRadius: "12px",
              background: details.status === "pending" ? "rgba(245,158,11,0.05)" : "rgba(34,197,94,0.05)",
              border: `1px solid ${details.status === "pending" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}`,
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: details.status === "pending" ? "#f59e0b" : "#22c55e",
                boxShadow: `0 0 12px ${details.status === "pending" ? "#f59e0b" : "#22c55e"}`,
              }} />
              <span style={{ 
                fontSize: "10px", fontWeight: 900, 
                color: details.status === "pending" ? "#f59e0b" : "#22c55e",
                textTransform: "uppercase", letterSpacing: "2px",
              }}>
                {details.status === "pending" ? "Under Review" : "Confirmed"}
              </span>
            </div>
          </div>

          {/* ══════════ MAIN CONTENT ══════════ */}
          <div style={{ padding: "28px 36px" }}>
            {details.type === "flight" && <FlightSection details={details} primaryColor={primaryColor} />}
            {details.type === "transfer" && <TransferSection details={details} primaryColor={primaryColor} />}
            {details.type === "hotel" && <HotelSection details={details} primaryColor={primaryColor} />}
            {details.type === "tour" && <TourSection details={details} primaryColor={primaryColor} />}
            {details.type === "visa" && <VisaSection details={details} primaryColor={primaryColor} />}
            {details.type === "package" && <PackageSection details={details} primaryColor={primaryColor} passengers={details.passengerNames} />}
            {details.type === "custom_group" && <CustomGroupSection details={details} primaryColor={primaryColor} />}

            {/* ══════════ PASSENGER TABLE ══════════ */}
            {details.passengerNames && details.passengerNames.length > 0 && !details.packageDetails?.passengers?.length && (
              <div style={{ marginTop: "40px", pageBreakInside: "avoid" }}>
                <SectionHeader title="Passenger List" icon={<Users style={{ width: 14, height: 14 }} />} color={primaryColor} />
                <div style={{ borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)", marginTop: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.02)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        <th style={{ ...thStyle, color: "rgba(0,0,0,0.3)", borderBottom: "none" }}>ID</th>
                        <th style={{ ...thStyle, textAlign: "left", color: "#1a237e", borderBottom: "none" }}>Passenger Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.passengerNames.map((name, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
                          <td style={{ ...tdStyle, fontWeight: 900, color: primaryColor, width: "80px", fontFamily: "monospace", fontSize: "11px" }}>
                            [{(idx + 1).toString().padStart(2, "0")}]
                          </td>
                          <td style={{ ...tdStyle, textAlign: "left", fontWeight: 900, color: "#1A237E", textTransform: "uppercase", letterSpacing: "1px", fontSize: "13px" }}>
                            {name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Agency Branding */}
            {details.agencyName && (
              <div style={{ 
                marginTop: "28px", padding: "20px 24px", 
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                border: "1px solid #e2e8f0",
                borderLeft: `4px solid ${primaryColor}`,
                borderRadius: "0 10px 10px 0",
                display: "flex", alignItems: "center", gap: "18px",
              }}>
                {details.agencyLogo ? (
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "14px",
                    border: "1px solid #e2e8f0", background: "#fff", padding: "6px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}>
                    <img src={details.agencyLogo} alt={details.agencyName} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }} />
                  </div>
                ) : (
                  <div style={{
                    width: "56px", height: "56px", borderRadius: "14px",
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: "#fff", fontSize: "20px", fontWeight: 800,
                    letterSpacing: "1px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}>
                    {details.agencyName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
                    BOOKED BY AGENCY
                  </div>
                  <div style={{ fontSize: "17px", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>
                    {details.agencyName}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════ TEAR-OFF ══════════ */}
          <div style={{ margin: "8px 28px 0", borderTop: "2px dashed #cbd5e1", position: "relative" }}>
            <div style={{
              position: "absolute", top: "-10px", left: "-8px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#f3f4f6", border: "1px solid #e2e8f0",
            }} />
            <div style={{
              position: "absolute", top: "-10px", right: "-8px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#f3f4f6", border: "1px solid #e2e8f0",
            }} />
            <div style={{
              position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
              background: "#fff", padding: "0 14px",
              display: "flex", alignItems: "center", gap: "5px",
              color: "#94a3b8", fontSize: "9px", fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase",
            }}>
              <Scissors style={{ width: 11, height: 11 }} />
              <span>Detach here</span>
            </div>
          </div>

          {/* ══════════ STUB / QR ══════════ */}
          <div style={{ 
            padding: "32px 36px",
            display: "grid", gridTemplateColumns: "1fr auto", gap: "32px", alignItems: "center",
          }}>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                <InfoBox label="BOOKING REF" value={details.bookingNumber} icon={<FileText style={{ width: 14, height: 14 }} />} />
                <InfoBox label="TOTAL AMOUNT" value={`$${details.totalAmount.toLocaleString()}`} icon={<CreditCard style={{ width: 14, height: 14 }} />} highlight />
                <InfoBox label="PASSENGERS" value={String(details.passengerCount || details.passengerNames?.length || 1)} icon={<Users style={{ width: 14, height: 14 }} />} />
              </div>
              
              <div style={{ 
                marginTop: "18px", padding: "14px 18px", background: "#f8fafc",
                borderRadius: "10px", border: "1px solid #f1f5f9",
                display: "flex", flexWrap: "wrap", gap: "24px",
                fontSize: "11px", color: "#64748b",
              }}>
                {settings.contactPhone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone style={{ width: 12, height: 12, color: primaryColor }} />
                    {settings.contactPhone}
                  </span>
                )}
                {settings.contactEmail && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail style={{ width: 12, height: 12, color: primaryColor }} />
                    {settings.contactEmail}
                  </span>
                )}
                {settings.website && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe style={{ width: 12, height: 12, color: primaryColor }} />
                    {settings.website}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ══════════ FOOTER ══════════ */}
          <div style={{
            background: `linear-gradient(135deg, ${primaryColor}06, ${primaryColor}12, ${primaryColor}06)`,
            borderTop: "1px solid #e8ecf1",
            padding: "20px 36px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
              {settings.footerText || "Thank you for choosing us. Have a safe journey!"}
            </div>
            <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "7px", letterSpacing: "0.5px" }}>
              This voucher is electronically generated and valid without signature • {settings.companyName || "GTS Travel"}
            </div>
          </div>
        </div>
      </div>

      {/* Actions - hidden in print mode */}
      {!printMode && (
        <div className="flex gap-3">
          <Button onClick={handleSendEmail} className="flex-1 h-12" style={{ backgroundColor: primaryColor }}>
            <Mail className="h-4 w-4 mr-2" />
            Send to Email
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="h-12 px-6">
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

const thStyle: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: "10px",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  textAlign: "center",
  borderBottom: "2px solid #e8ecf1",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: "12px",
  color: "#1e293b",
  textAlign: "center",
};

function SectionHeader({ title, icon, color }: { title: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ 
      display: "flex", alignItems: "center", gap: "12px",
      marginBottom: "16px",
    }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "10px",
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",
        boxShadow: `0 3px 8px ${color}25`,
      }}>
        {icon}
      </div>
      <span style={{ 
        fontSize: "13px", fontWeight: 800, color: "#1e293b",
        textTransform: "uppercase", letterSpacing: "1.2px",
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(to right, ${color}20, transparent)` }} />
    </div>
  );
}

function InfoBox({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  const isLongValue = value.length > 14;

  return (
    <div style={{
      padding: isLongValue ? "14px 16px" : "16px 18px",
      background: highlight ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)" : "#f8fafc",
      border: `1.5px solid ${highlight ? "#bbf7d0" : "#e8ecf1"}`,
      borderRadius: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        {icon && <span style={{ color: highlight ? "#16a34a" : "#94a3b8" }}>{icon}</span>}
        <span style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <div style={{ 
        fontSize: isLongValue ? "15px" : "18px",
        fontWeight: 800,
        color: highlight ? "#166534" : "#1e293b",
        fontFamily: "'Courier New', monospace",
        letterSpacing: isLongValue ? "0.3px" : "1px",
        lineHeight: isLongValue ? "1.25" : "1.15",
        whiteSpace: isLongValue ? "normal" : "nowrap",
        overflowWrap: isLongValue ? "anywhere" : "normal",
      }}>
        {value}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ════════════════════════════════════════════════════════════

function FlightSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      <SectionHeader title="FLIGHT DETAILS" icon={<Plane style={{ width: 14, height: 14 }} />} color={primaryColor} />
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        padding: "28px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px",
        gap: "28px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
            {details.departureCity || "---"}
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Departure</div>
          {details.departureTime && (
            <div style={{ fontSize: "20px", fontWeight: 700, color: primaryColor, marginTop: "10px" }}>
              {String(details.departureTime).substring(0, 5)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          {details.airlineLogo ? (
            <img src={details.airlineLogo} alt={details.airline || "Airline"} 
              style={{ width: "52px", height: "52px", objectFit: "contain", borderRadius: "10px", border: "1.5px solid #e8ecf1", padding: "5px", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to right, transparent, #cbd5e1)" }} />
              <Plane style={{ width: 26, height: 26, color: primaryColor, transform: "rotate(90deg)" }} />
              <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to left, transparent, #cbd5e1)" }} />
            </div>
          )}
          {details.airline && <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{details.airline}</div>}
          {details.flightNumber && <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e293b", fontFamily: "monospace" }}>{details.flightNumber}</div>}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", fontWeight: 800, color: primaryColor, letterSpacing: "-0.5px" }}>
            {details.arrivalCity || "---"}
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "6px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Arrival</div>
          {details.arrivalTime && (
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginTop: "10px" }}>
              {String(details.arrivalTime).substring(0, 5)}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {details.departureDate && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Date" value={format(details.departureDate, "dd/MM/yyyy")} />
        )}
        {details.flightClass && (
          <MetaCell icon={<Star style={{ width: 12, height: 12 }} />} label="Class" value={details.flightClass} />
        )}
        {details.passengerCount && (
          <MetaCell icon={<Users style={{ width: 12, height: 12 }} />} label="Passengers" value={String(details.passengerCount)} />
        )}
      </div>
    </div>
  );
}

function TransferSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      <SectionHeader title="TRANSFER DETAILS" icon={<Navigation style={{ width: 14, height: 14 }} />} color="#059669" />
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        padding: "28px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px",
        gap: "28px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>{details.pickupLocation || "Pickup"}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "5px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Pickup</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to right, transparent, #cbd5e1)" }} />
            <ArrowLeftRight style={{ width: 24, height: 24, color: "#059669" }} />
            <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to left, transparent, #cbd5e1)" }} />
          </div>
          {details.vehicleType && <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>{details.vehicleType}</div>}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#059669" }}>{details.dropoffLocation || details.destination || "Dropoff"}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "5px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Dropoff</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {details.departureDate && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Date" value={format(details.departureDate, "dd/MM/yyyy")} />
        )}
        {details.pickupTime && (
          <MetaCell icon={<Clock style={{ width: 12, height: 12 }} />} label="Pickup Time" value={details.pickupTime} />
        )}
        {details.transferType && (
          <MetaCell icon={<Navigation style={{ width: 12, height: 12 }} />} label="Type" value={details.transferType} />
        )}
      </div>
    </div>
  );
}

function HotelSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      <SectionHeader title="HOTEL RESERVATION" icon={<Hotel style={{ width: 14, height: 14 }} />} color="#7c3aed" />
      <div style={{ padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>
          {details.hotelName || details.serviceName}
        </div>
        {details.hotelStars && (
          <div style={{ display: "flex", gap: "2px", marginTop: "6px" }}>
            {Array.from({ length: details.hotelStars }).map((_, i) => (
              <Star key={i} style={{ width: 14, height: 14, color: "#f59e0b", fill: "#f59e0b" }} />
            ))}
          </div>
        )}
        {(details.destination || details.hotelAddress) && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            <MapPin style={{ width: 13, height: 13, color: "#7c3aed" }} />
            {details.hotelAddress || details.destination}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {details.checkInDate && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Check-in" value={format(details.checkInDate, "dd/MM/yyyy")} />
        )}
        {details.checkOutDate && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Check-out" value={format(details.checkOutDate, "dd/MM/yyyy")} />
        )}
        {details.roomType && (
          <MetaCell icon={<Hotel style={{ width: 12, height: 12 }} />} label="Room Type" value={details.roomType} />
        )}
        {details.roomCount && (
          <MetaCell icon={<Users style={{ width: 12, height: 12 }} />} label="Rooms" value={String(details.roomCount)} />
        )}
      </div>
    </div>
  );
}

function TourSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      <SectionHeader title="TOUR DETAILS" icon={<Compass style={{ width: 14, height: 14 }} />} color="#0891b2" />
      <div style={{ padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>{details.serviceName}</div>
        {details.destination && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
            <MapPin style={{ width: 13, height: 13, color: "#0891b2" }} />
            {details.destination}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {details.departureDate && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Tour Date" value={format(details.departureDate, "dd/MM/yyyy")} />
        )}
        {details.tourDuration && (
          <MetaCell icon={<Clock style={{ width: 12, height: 12 }} />} label="Duration" value={details.tourDuration} />
        )}
        {details.passengerCount && (
          <MetaCell icon={<Users style={{ width: 12, height: 12 }} />} label="Participants" value={String(details.passengerCount)} />
        )}
      </div>
    </div>
  );
}

function VisaSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      <SectionHeader title="VISA APPLICATION" icon={<Shield style={{ width: 14, height: 14 }} />} color="#dc2626" />
      <div style={{ padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px" }}>
        <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>
          {details.visaCountry} — {details.visaType}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {details.processingDays && (
          <MetaCell icon={<Clock style={{ width: 12, height: 12 }} />} label="Processing Time" value={`${details.processingDays} days`} />
        )}
        {details.passengerCount && (
          <MetaCell icon={<Users style={{ width: 12, height: 12 }} />} label="Applicants" value={String(details.passengerCount)} />
        )}
      </div>
    </div>
  );
}

function PackageSection({ details, primaryColor, passengers }: { details: VoucherDetails; primaryColor: string; passengers?: string[] }) {
  return (
    <div style={{ pageBreakInside: "avoid" }}>
      {details.packageDetails && (
        <GroupPackageVoucher details={details.packageDetails} primaryColor={primaryColor} />
      )}
    </div>
  );
}

function CustomGroupSection({ details, primaryColor }: { details: VoucherDetails; primaryColor: string }) {
  const cg = details.customGroupDetails;
  
  return (
    <div>
      <SectionHeader title="CUSTOM GROUP TRIP" icon={<Briefcase style={{ width: 14, height: 14 }} />} color={primaryColor} />
      
      {/* Route Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        padding: "28px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px",
        gap: "28px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>FROM</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>
            {cg?.outboundFlight?.departureCity?.toUpperCase() || details.departureCity?.toUpperCase() || "---"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to right, transparent, #cbd5e1)" }} />
            <Plane style={{ width: 26, height: 26, color: primaryColor, transform: "rotate(90deg)" }} />
            <div style={{ width: "44px", height: "1.5px", background: "linear-gradient(to left, transparent, #cbd5e1)" }} />
          </div>
          {cg?.nights != null && (
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", fontWeight: 500 }}>{cg.nights} nights</div>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>TO</div>
          <div style={{ fontSize: "26px", fontWeight: 800, color: primaryColor, letterSpacing: "-0.5px" }}>
            {cg?.outboundFlight?.arrivalCity?.toUpperCase() || details.arrivalCity?.toUpperCase() || "---"}
          </div>
        </div>
      </div>

      {/* Dates Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        {(cg?.departureDate || details.departureDate) && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Departure" value={cg?.departureDate || (details.departureDate ? format(details.departureDate, "dd/MM/yyyy") : "")} />
        )}
        {(cg?.returnDate || details.returnDate) && (
          <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Return" value={cg?.returnDate || (details.returnDate ? format(details.returnDate, "dd/MM/yyyy") : "")} />
        )}
        {details.passengerCount && (
          <MetaCell icon={<Users style={{ width: 12, height: 12 }} />} label="Passengers" value={String(details.passengerCount)} />
        )}
      </div>

      {/* Flights */}
      {cg?.outboundFlight && (
        <div style={{ marginTop: "28px", pageBreakInside: "avoid" }}>
          <SectionHeader title="OUTBOUND FLIGHT" icon={<Plane style={{ width: 14, height: 14 }} />} color="#2563eb" />
          <CustomFlightCard flight={cg.outboundFlight} primaryColor={primaryColor} />
        </div>
      )}
      {cg?.returnFlight && (
        <div style={{ marginTop: "24px", pageBreakInside: "avoid" }}>
          <SectionHeader title="RETURN FLIGHT" icon={<Plane style={{ width: 14, height: 14, transform: "scaleX(-1)" }} />} color="#2563eb" />
          <CustomFlightCard flight={cg.returnFlight} primaryColor={primaryColor} />
        </div>
      )}

      {/* Hotel */}
      {cg?.hotel && (
        <div style={{ marginTop: "24px", pageBreakInside: "avoid" }}>
          <SectionHeader title="HOTEL ACCOMMODATION" icon={<Hotel style={{ width: 14, height: 14 }} />} color="#7c3aed" />
          <div style={{ padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px" }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>{cg.hotel.name}</div>
            {cg.hotel.starRating && (
              <div style={{ display: "flex", gap: "2px", marginTop: "6px" }}>
                {Array.from({ length: cg.hotel.starRating }).map((_, i) => (
                  <Star key={i} style={{ width: 14, height: 14, color: "#f59e0b", fill: "#f59e0b" }} />
                ))}
              </div>
            )}
            {cg.hotel.address && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
                <MapPin style={{ width: 13, height: 13, color: "#7c3aed" }} />
                {cg.hotel.address}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
            {cg.departureDate && (
              <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Check-in" value={cg.departureDate} />
            )}
            {cg.returnDate && (
              <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Check-out" value={cg.returnDate} />
            )}
          </div>
        </div>
      )}

      {/* Transfer */}
      {cg?.transfer && (
        <div style={{ marginTop: "24px", pageBreakInside: "avoid" }}>
          <SectionHeader title="TRANSFER" icon={<ArrowLeftRight style={{ width: 14, height: 14 }} />} color="#059669" />
          <div style={{
            display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
            padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px",
            gap: "20px",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>{cg.transfer.routeFrom || "Pickup"}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>PICKUP</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "34px", height: "1.5px", background: "linear-gradient(to right, transparent, #cbd5e1)" }} />
              <ArrowLeftRight style={{ width: 22, height: 22, color: "#059669" }} />
              <div style={{ width: "34px", height: "1.5px", background: "linear-gradient(to left, transparent, #cbd5e1)" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#059669" }}>{cg.transfer.routeTo || "Dropoff"}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>DROPOFF</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
            <MetaCell icon={<Car style={{ width: 12, height: 12 }} />} label="Vehicle" value={cg.transfer.vehicleType || "Standard"} />
            <MetaCell icon={<Navigation style={{ width: 12, height: 12 }} />} label="Service" value={cg.transfer.name} />
          </div>
        </div>
      )}
    </div>
  );
}

function CustomFlightCard({ flight, primaryColor }: { 
  flight: NonNullable<CustomGroupVoucherDetails["outboundFlight"]>; 
  primaryColor: string; 
}) {
  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
        padding: "24px", background: "#f8fafc", border: "1px solid #e8ecf1", borderRadius: "10px",
        gap: "24px",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px" }}>{flight.departureCity}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Departure</div>
          {flight.departureTime && (
            <div style={{ fontSize: "18px", fontWeight: 700, color: primaryColor, marginTop: "8px" }}>
              {String(flight.departureTime).substring(0, 5)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          {flight.airlineLogo ? (
            <img src={flight.airlineLogo} alt={flight.airline} 
              style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "8px", border: "1.5px solid #e8ecf1", padding: "4px", background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "34px", height: "1.5px", background: "linear-gradient(to right, transparent, #cbd5e1)" }} />
              <Plane style={{ width: 22, height: 22, color: "#2563eb", transform: "rotate(90deg)" }} />
              <div style={{ width: "34px", height: "1.5px", background: "linear-gradient(to left, transparent, #cbd5e1)" }} />
            </div>
          )}
          <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>{flight.airline}</div>
          {flight.flightNumber && <div style={{ fontSize: "13px", fontWeight: 800, color: "#1e293b", fontFamily: "monospace" }}>{flight.flightNumber}</div>}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "26px", fontWeight: 800, color: primaryColor, letterSpacing: "-0.5px" }}>{flight.arrivalCity}</div>
          <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>Arrival</div>
          {flight.arrivalTime && (
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", marginTop: "8px" }}>
              {String(flight.arrivalTime).substring(0, 5)}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1px", background: "#e8ecf1", marginTop: "2px", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        <MetaCell icon={<Calendar style={{ width: 12, height: 12 }} />} label="Date" value={flight.departureDate} />
      </div>
    </div>
  );
}

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: "#fff", padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
        <span style={{ color: "#94a3b8" }}>{icon}</span>
        <span style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>{value}</div>
    </div>
  );
}
