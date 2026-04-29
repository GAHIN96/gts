import { format } from "date-fns";
import {
  Plane,
  Hotel,
  Users,
  MapPin,
  Calendar,
  AlertTriangle,
  Star,
  Navigation,
  Phone,
  Hash,
  ClipboardList,
} from "lucide-react";

export interface GroupPackageVoucherDetails {
  packageName: string;
  destination: string;
  nights: number;
  departureDate?: string;
  returnDate?: string;
  fromCity?: string;
  outboundFlight?: {
    airline: string;
    airlineLogo?: string | null;
    flightNumber?: string;
    departureCity: string;
    arrivalCity: string;
    departureAirportCode?: string | null;
    arrivalAirportCode?: string | null;
    departureDate: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    baggage?: string;
  };
  returnFlight?: {
    airline: string;
    airlineLogo?: string | null;
    flightNumber?: string;
    departureCity: string;
    arrivalCity: string;
    departureAirportCode?: string | null;
    arrivalAirportCode?: string | null;
    departureDate: string;
    departureTime?: string | null;
    arrivalTime?: string | null;
    baggage?: string;
  };
  hotel?: {
    name: string;
    starRating: number;
    address?: string;
    roomType?: string;
    checkIn: string;
    checkOut: string;
    nights?: number;
  };
  transfer?: {
    guideName?: string;
    phone?: string;
    gateNumber?: string;
  };
  itinerary?: Array<{
    day: number;
    title: string;
    description?: string;
    activities?: string[];
  }>;
  included?: string[];
  notIncluded?: string[];
  passengers?: Array<{
    name: string;
    birthDate?: string;
    passportNumber?: string;
    ageGroup?: string;
    roomType?: string;
  }>;
  groupPolicy?: string;
}

interface GroupPackageVoucherProps {
  details: GroupPackageVoucherDetails;
  primaryColor?: string;
}

const formatTime = (time: string | null | undefined) => {
  if (!time) return "";
  return time.substring(0, 5);
};

// ═══ Refined styles ═══
const sectionHeaderStyle = (color: string, iconBg?: string): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${color}08, ${color}04)`,
  borderLeft: `4px solid ${color}`,
  padding: "10px 16px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#1e293b",
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginTop: "18px",
});

const tableHeaderStyle: React.CSSProperties = {
  background: "#f8fafc",
  borderBottom: "2px solid #e8ecf1",
};

const thCellStyle: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: "9px",
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.7px",
  textAlign: "left",
};

const tdCellStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: "11px",
  color: "#1e293b",
  fontWeight: 500,
  borderBottom: "1px solid #f1f5f9",
};

export function GroupPackageVoucher({ details, primaryColor = "#1A237E" }: GroupPackageVoucherProps) {
  const flightRows: Array<{ destination: string; date: string; flightNum: string; departure: string; arrival: string; baggage: string }> = [];

  if (details.outboundFlight) {
    const f = details.outboundFlight;
    const depCode = f.departureAirportCode || f.departureCity.substring(0, 3).toUpperCase();
    const arrCode = f.arrivalAirportCode || f.arrivalCity.substring(0, 3).toUpperCase();
    flightRows.push({
      destination: `${f.departureCity} (${depCode}) — ${f.arrivalCity} (${arrCode})`,
      date: f.departureDate,
      flightNum: f.flightNumber || "",
      departure: formatTime(f.departureTime),
      arrival: formatTime(f.arrivalTime),
      baggage: f.baggage || "",
    });
  }
  if (details.returnFlight) {
    const f = details.returnFlight;
    const depCode = f.departureAirportCode || f.departureCity.substring(0, 3).toUpperCase();
    const arrCode = f.arrivalAirportCode || f.arrivalCity.substring(0, 3).toUpperCase();
    flightRows.push({
      destination: `${f.departureCity} (${depCode}) — ${f.arrivalCity} (${arrCode})`,
      date: f.departureDate,
      flightNum: f.flightNumber || "",
      departure: formatTime(f.departureTime),
      arrival: formatTime(f.arrivalTime),
      baggage: f.baggage || "",
    });
  }

  const hotelNights = details.hotel?.nights || details.nights || (
    details.hotel?.checkIn && details.hotel?.checkOut
      ? Math.round((new Date(details.hotel.checkOut).getTime() - new Date(details.hotel.checkIn).getTime()) / 86400000)
      : 0
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif" }}>

      {/* ═══ PASSENGERS TABLE ═══ */}
      {details.passengers && details.passengers.length > 0 && (
        <>
          <div style={sectionHeaderStyle(primaryColor)}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 2px 6px ${primaryColor}25`,
            }}>
              <Users style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            Passengers
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e8ecf1", borderTop: "none" }}>
            <thead>
              <tr style={tableHeaderStyle}>
                <th style={{ ...thCellStyle, width: "40px", textAlign: "center" }}>No</th>
                <th style={thCellStyle}>Names</th>
                <th style={thCellStyle}>Passport #</th>
                <th style={thCellStyle}>Age Group</th>
                <th style={thCellStyle}>Birth Date</th>
                <th style={thCellStyle}>Room Type</th>
              </tr>
            </thead>
            <tbody>
              {details.passengers.map((p, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ ...tdCellStyle, textAlign: "center", fontWeight: 700, color: "#94a3b8", fontSize: "11px" }}>
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    {p.name}
                  </td>
                  <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", letterSpacing: "0.5px", fontWeight: 600 }}>
                    {p.passportNumber || "—"}
                  </td>
                  <td style={tdCellStyle}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      background: (p.ageGroup || "ADULT").toLowerCase() === "adult" ? `${primaryColor}10` : (p.ageGroup || "").toLowerCase() === "child" ? "#f0fdf4" : "#fefce8",
                      color: (p.ageGroup || "ADULT").toLowerCase() === "adult" ? primaryColor : (p.ageGroup || "").toLowerCase() === "child" ? "#16a34a" : "#ca8a04",
                      border: `1px solid ${(p.ageGroup || "ADULT").toLowerCase() === "adult" ? `${primaryColor}20` : (p.ageGroup || "").toLowerCase() === "child" ? "#bbf7d0" : "#fde68a"}`,
                    }}>
                      {p.ageGroup || "ADULT"}
                    </span>
                  </td>
                  <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontSize: "11px" }}>
                    {p.birthDate || "—"}
                  </td>
                  <td style={{ ...tdCellStyle, fontWeight: 700, color: primaryColor }}>
                    {p.roomType || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ═══ FLIGHT TABLE ═══ */}
      {flightRows.length > 0 && (
        <>
          <div style={sectionHeaderStyle("#2563eb")}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
            }}>
              <Plane style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            Flight
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e8ecf1", borderTop: "none" }}>
            <thead>
              <tr style={tableHeaderStyle}>
                <th style={thCellStyle}>Destination</th>
                <th style={thCellStyle}>Flight Date</th>
                <th style={thCellStyle}>Flight #</th>
                <th style={thCellStyle}>Departure</th>
                <th style={thCellStyle}>Arrival</th>
                <th style={thCellStyle}>Baggage</th>
              </tr>
            </thead>
            <tbody>
              {flightRows.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ ...tdCellStyle, fontWeight: 700, color: "#0f172a" }}>{row.destination}</td>
                  <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontWeight: 600 }}>{row.date}</td>
                  <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontWeight: 800, color: "#2563eb" }}>{row.flightNum || "—"}</td>
                  <td style={{ ...tdCellStyle, fontWeight: 600 }}>{row.departure || "—"}</td>
                  <td style={{ ...tdCellStyle, fontWeight: 600 }}>{row.arrival || "—"}</td>
                  <td style={tdCellStyle}>{row.baggage || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ═══ HOTEL TABLE ═══ */}
      {details.hotel && (
        <>
          <div style={sectionHeaderStyle("#7c3aed")}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(124,58,237,0.25)",
            }}>
              <Hotel style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            Hotel
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e8ecf1", borderTop: "none" }}>
            <thead>
              <tr style={tableHeaderStyle}>
                <th style={thCellStyle}>Name</th>
                <th style={thCellStyle}>Check-In</th>
                <th style={thCellStyle}>Check-Out</th>
                <th style={thCellStyle}>Nights</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#fff" }}>
                <td style={{ ...tdCellStyle, fontWeight: 800, color: "#0f172a" }}>
                  {details.hotel.name}
                  {details.hotel.starRating > 0 && (
                    <span style={{ marginLeft: "8px" }}>
                      {Array.from({ length: details.hotel.starRating }).map((_, i) => (
                        <span key={i} style={{ color: "#f59e0b", fontSize: "12px" }}>★</span>
                      ))}
                    </span>
                  )}
                </td>
                <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontWeight: 700 }}>{details.hotel.checkIn}</td>
                <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontWeight: 700 }}>{details.hotel.checkOut}</td>
                <td style={{ ...tdCellStyle, fontWeight: 800, color: "#7c3aed" }}>
                  {hotelNights} Night{hotelNights !== 1 ? "s" : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ═══ TRANSFER TABLE ═══ */}
      {details.transfer && (details.transfer.guideName || details.transfer.phone || details.transfer.gateNumber) && (
        <>
          <div style={sectionHeaderStyle("#059669")}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #059669, #10b981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(5,150,105,0.25)",
            }}>
              <Navigation style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            Transfer & Guide
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e8ecf1", borderTop: "none" }}>
            <thead>
              <tr style={tableHeaderStyle}>
                <th style={thCellStyle}>Guide Name</th>
                <th style={thCellStyle}>Phone #</th>
                <th style={thCellStyle}>Gate #</th>
                <th style={thCellStyle}>Sign</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "#fff" }}>
                <td style={{ ...tdCellStyle, fontWeight: 700, color: "#0f172a" }}>{details.transfer.guideName || "—"}</td>
                <td style={{ ...tdCellStyle, fontFamily: "'Courier New', monospace", fontWeight: 600 }}>{details.transfer.phone || "—"}</td>
                <td style={{ ...tdCellStyle, fontWeight: 800, color: "#059669", fontSize: "14px" }}>{details.transfer.gateNumber || "—"}</td>
                <td style={tdCellStyle}></td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ═══ IMPORTANT NOTES ═══ */}
      {(details.groupPolicy || true) && (
        <>
          <div style={sectionHeaderStyle("#dc2626")}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #dc2626, #ef4444)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 6px rgba(220,38,38,0.25)",
            }}>
              <AlertTriangle style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            Important Notes
          </div>
          <div style={{
            border: "1px solid #fde68a",
            borderTop: "none",
            padding: "18px 22px",
            background: "linear-gradient(135deg, #fffbeb, #fefce8)",
            fontSize: "12px",
            color: "#78350f",
            lineHeight: "1.8",
            borderRadius: "0 0 8px 8px",
          }}>
            {details.groupPolicy && (
              <div style={{ marginBottom: "12px", whiteSpace: "pre-wrap" }}>{details.groupPolicy}</div>
            )}
            <div style={{ fontWeight: 700, fontStyle: "italic", borderTop: "1px solid #fde68a", paddingTop: "12px" }}>
              Dear Agencies, Kindly be noted that after the booking is confirmed there is no cancellation, it means that after confirmation the group is non-refundable and non-changeable.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
