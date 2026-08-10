import jsPDF from "jspdf";
import { format } from "date-fns";

export interface StatementTransaction {
  date: Date;
  reference: string;
  type: "booking" | "deposit" | "refund" | "credit_adjustment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementData {
  agencyName: string;
  licenseNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  statementPeriod: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  creditLimit: number;
  creditLimitType: "soft" | "hard";
  transactions: StatementTransaction[];
  companyName?: string;
  companyLogo?: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateStatementOfAccountPdf(data: StatementData): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const W = 210;
  const margin = 15;
  const contentW = W - margin * 2;
  let y = margin;

  const navy: [number, number, number] = [26, 35, 126];
  const gray: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [245, 247, 250];

  // ─── Header bar ───
  pdf.setFillColor(...navy);
  pdf.rect(0, 0, W, 40, "F");

  // Logo / Title
  if (data.companyLogo) {
    try {
      const img = await loadImage(data.companyLogo);
      const logoH = 14;
      const logoW = (img.width / img.height) * logoH;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin - 1, 6, logoW + 4, logoH + 4, 2, 2, "F");
      pdf.addImage(img, "PNG", margin + 1, 8, logoW, logoH);
    } catch {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(data.companyName || "GTS Systems", margin, 20);
    }
  } else {
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(data.companyName || "GTS Systems", margin, 20);
  }

  // Right Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("STATEMENT OF ACCOUNT", W - margin, 18, { align: "right" });

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(200, 200, 220);
  pdf.text(`Period: ${data.statementPeriod}`, W - margin, 26, { align: "right" });
  pdf.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, W - margin, 32, { align: "right" });

  y = 48;

  // ─── Agency Info & Summary Grid ───
  pdf.setFillColor(...lightGray);
  pdf.roundedRect(margin, y, contentW, 30, 3, 3, "F");

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(data.agencyName, margin + 6, y + 8);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...gray);
  if (data.licenseNumber) pdf.text(`Lic: ${data.licenseNumber}`, margin + 6, y + 14);
  if (data.contactEmail) pdf.text(`Email: ${data.contactEmail}`, margin + 6, y + 20);
  if (data.contactPhone) pdf.text(`Tel: ${data.contactPhone}`, margin + 6, y + 26);

  // Summary Metrics (Right Side of Grid)
  const rightX = W / 2 + 10;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...gray);

  pdf.text("Opening Balance:", rightX, y + 8);
  pdf.text("Total Debits (Bookings):", rightX, y + 14);
  pdf.text("Total Credits (Payments):", rightX, y + 20);
  pdf.text("Closing Balance:", rightX, y + 26);

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(`$${data.openingBalance.toLocaleString()}`, W - margin - 6, y + 8, { align: "right" });
  pdf.text(`$${data.totalDebits.toLocaleString()}`, W - margin - 6, y + 14, { align: "right" });
  pdf.text(`$${data.totalCredits.toLocaleString()}`, W - margin - 6, y + 20, { align: "right" });
  
  pdf.setTextColor(26, 35, 126);
  pdf.text(`$${data.closingBalance.toLocaleString()}`, W - margin - 6, y + 26, { align: "right" });

  y += 38;

  // ─── Table Header ───
  pdf.setFillColor(...navy);
  pdf.rect(margin, y, contentW, 8, "F");

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);

  pdf.text("Date", margin + 4, y + 5.5);
  pdf.text("Reference", margin + 30, y + 5.5);
  pdf.text("Description", margin + 65, y + 5.5);
  pdf.text("Debit ($)", margin + 125, y + 5.5, { align: "right" });
  pdf.text("Credit ($)", margin + 150, y + 5.5, { align: "right" });
  pdf.text("Balance ($)", W - margin - 4, y + 5.5, { align: "right" });

  y += 8;

  // ─── Table Rows ───
  pdf.setFontSize(7.5);

  data.transactions.forEach((tx, idx) => {
    if (y > 260) {
      pdf.addPage();
      y = margin;
      // Repeat header
      pdf.setFillColor(...navy);
      pdf.rect(margin, y, contentW, 8, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Date", margin + 4, y + 5.5);
      pdf.text("Reference", margin + 30, y + 5.5);
      pdf.text("Description", margin + 65, y + 5.5);
      pdf.text("Debit ($)", margin + 125, y + 5.5, { align: "right" });
      pdf.text("Credit ($)", margin + 150, y + 5.5, { align: "right" });
      pdf.text("Balance ($)", W - margin - 4, y + 5.5, { align: "right" });
      y += 8;
      pdf.setFontSize(7.5);
    }

    if (idx % 2 === 0) {
      pdf.setFillColor(250, 250, 252);
      pdf.rect(margin, y, contentW, 7, "F");
    }

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50, 50, 50);

    pdf.text(format(tx.date, "dd/MM/yyyy"), margin + 4, y + 5);
    pdf.text(tx.reference, margin + 30, y + 5);

    // Truncate long descriptions
    const desc = tx.description.length > 32 ? tx.description.substring(0, 30) + "..." : tx.description;
    pdf.text(desc, margin + 65, y + 5);

    pdf.text(tx.debit > 0 ? `$${tx.debit.toLocaleString()}` : "-", margin + 125, y + 5, { align: "right" });
    pdf.text(tx.credit > 0 ? `$${tx.credit.toLocaleString()}` : "-", margin + 150, y + 5, { align: "right" });
    
    pdf.setFont("helvetica", "bold");
    pdf.text(`$${tx.balance.toLocaleString()}`, W - margin - 4, y + 5, { align: "right" });

    y += 7;
  });

  y += 6;

  // ─── Footer Line ───
  pdf.setDrawColor(220, 220, 230);
  pdf.setLineWidth(0.3);
  pdf.line(margin, 275, W - margin, 275);

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(150, 150, 150);
  pdf.text("Confidential B2B Statement of Account • GTS Booking Systems", W / 2, 281, { align: "center" });

  const filename = `SOA-${data.agencyName.replace(/\s+/g, "_")}-${data.statementPeriod.replace(/\s+/g, "_")}.pdf`;
  pdf.save(filename);
}
