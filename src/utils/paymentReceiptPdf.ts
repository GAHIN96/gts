import jsPDF from "jspdf";
import { format } from "date-fns";

interface ReceiptData {
  bookingNumber: string;
  paymentMethod: string;
  amount: number;
  transactionRef?: string;
  status: "approved" | "proof_uploaded";
  paidAt: Date;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  companyLogo?: string | null;
}

const METHOD_LABELS: Record<string, string> = {
  qicard: "QiCard",
  first_iraqi_bank: "First Iraqi Bank (FIB)",
  pay_by_card: "Mastercard / Visa",
  bank_transfer: "Bank Transfer",
  rasheed_bank: "Rasheed Bank",
  trade_bank_iraq: "Trade Bank of Iraq (TBI)",
  national_bank_iraq: "National Bank of Iraq",
  kurdistan_intl_bank: "Kurdistan International Bank",
  agency_credit: "Agency Credit",
  pay_in_office: "Pay in Office",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generatePaymentReceiptPdf(data: ReceiptData): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const W = 210;
  const margin = 15;
  const contentW = W - margin * 2;
  let y = margin;

  const navy: [number, number, number] = [26, 35, 126];
  const coral: [number, number, number] = [255, 111, 97];
  const gray: [number, number, number] = [100, 100, 100];
  const lightGray: [number, number, number] = [240, 240, 245];

  // ─── Header bar ───
  pdf.setFillColor(...navy);
  pdf.rect(0, 0, W, 42, "F");

  // Company logo
  if (data.companyLogo) {
    try {
      const img = await loadImage(data.companyLogo);
      const logoH = 14;
      const logoW = (img.width / img.height) * logoH;
      // White background box behind logo
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin - 1, 6, logoW + 4, logoH + 4, 2, 2, "F");
      pdf.addImage(img, "PNG", margin + 1, 8, logoW, logoH);
    } catch {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(data.companyName || "GTS Booking", margin, 20);
    }
  } else {
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(data.companyName || "GTS Booking", margin, 20);
  }

  // "PAYMENT RECEIPT" title right-aligned
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("PAYMENT RECEIPT", W - margin, 18, { align: "right" });

  // Sub-line
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(200, 200, 220);
  pdf.text(
    `Generated ${format(new Date(), "dd/MM/yyyy 'at' HH:mm")}`,
    W - margin,
    26,
    { align: "right" }
  );

  // Status badge
  const statusLabel = data.status === "approved" ? "CONFIRMED" : "UNDER REVIEW";
  const badgeColor: [number, number, number] = data.status === "approved" ? [34, 197, 94] : [245, 158, 11];
  const badgeW = pdf.getTextWidth(statusLabel) + 10;
  pdf.setFillColor(...badgeColor);
  pdf.roundedRect(W - margin - badgeW, 30, badgeW, 7, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  pdf.text(statusLabel, W - margin - badgeW / 2, 35, { align: "center" });

  y = 52;

  // ─── Receipt number & date row ───
  pdf.setFillColor(...lightGray);
  pdf.roundedRect(margin, y, contentW, 18, 3, 3, "F");

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...gray);
  pdf.text("Receipt No.", margin + 6, y + 7);
  pdf.text("Date & Time", W / 2 + 6, y + 7);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(`RCP-${data.bookingNumber}`, margin + 6, y + 14);
  pdf.text(format(data.paidAt, "dd/MM/yyyy • HH:mm"), W / 2 + 6, y + 14);

  y += 26;

  // ─── Payment details table ───
  const drawRow = (label: string, value: string, isHighlight = false) => {
    if (isHighlight) {
      pdf.setFillColor(...navy);
      pdf.roundedRect(margin, y - 1, contentW, 14, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
    } else {
      if (Math.floor((y - 78) / 14) % 2 === 0) {
        pdf.setFillColor(250, 250, 252);
        pdf.rect(margin, y - 1, contentW, 14, "F");
      }
      pdf.setTextColor(...gray);
    }

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, margin + 6, y + 8);

    pdf.setFont("helvetica", "bold");
    if (isHighlight) {
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
    }
    pdf.text(value, W - margin - 6, y + 8, { align: "right" });

    y += 14;
  };

  drawRow("Booking Number", data.bookingNumber);
  drawRow("Payment Method", METHOD_LABELS[data.paymentMethod] || data.paymentMethod);
  if (data.transactionRef) {
    drawRow("Transaction Reference", data.transactionRef);
  }
  drawRow("Payment Status", data.status === "approved" ? "Confirmed" : "Under Review");
  drawRow("Payment Date", format(data.paidAt, "dd/MM/yyyy"));

  y += 4;
  drawRow("Total Amount Paid", `$${data.amount.toLocaleString()}`, true);

  y += 10;

  // ─── Divider ───
  pdf.setDrawColor(220, 220, 230);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, W - margin, y);
  y += 8;

  // ─── Notes section ───
  pdf.setFillColor(255, 249, 245);
  pdf.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  pdf.setDrawColor(...coral);
  pdf.setLineWidth(0.5);
  pdf.line(margin + 1, y + 4, margin + 1, y + 24);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...coral);
  pdf.text("Important Notice", margin + 6, y + 9);

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...gray);
  pdf.setFontSize(7.5);
  if (data.status === "approved") {
    pdf.text("This receipt confirms your payment has been verified and your booking is confirmed.", margin + 6, y + 16);
    pdf.text("Please keep this receipt for your records.", margin + 6, y + 22);
  } else {
    pdf.text("Your payment proof has been submitted and is under review by our finance team.", margin + 6, y + 16);
    pdf.text("You will receive a confirmation notification once your payment is verified.", margin + 6, y + 22);
  }

  y += 38;

  // ─── Footer ───
  pdf.setDrawColor(220, 220, 230);
  pdf.setLineWidth(0.2);
  pdf.line(margin, 275, W - margin, 275);

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(160, 160, 170);

  const footerParts = [
    data.companyName || "GTS Booking",
    data.companyPhone,
    data.companyEmail,
    data.companyAddress,
  ].filter(Boolean);

  pdf.text(footerParts.join("  •  "), W / 2, 280, { align: "center" });
  pdf.text("This is a computer-generated receipt and does not require a signature.", W / 2, 285, { align: "center" });

  // ─── Save ───
  const filename = `receipt-${data.bookingNumber}-${format(data.paidAt, "yyyyMMdd")}.pdf`;
  pdf.save(filename);
}
