import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 8;
const FIT_TO_ONE_PAGE_THRESHOLD = 1.1;

export async function generatePDFFromElement(
  element: HTMLElement,
  filename: string = 'voucher.pdf'
): Promise<void> {
  const originalOverflow = element.style.overflow;
  const originalMaxHeight = element.style.maxHeight;

  try {
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: Math.ceil(element.scrollWidth + 40),
      windowHeight: Math.ceil(element.scrollHeight + 40),
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: Math.ceil(element.scrollWidth),
      height: Math.ceil(element.scrollHeight),
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png', 1.0);
    const contentWidth = A4_WIDTH_MM - MARGIN_MM * 2;
    const contentHeight = A4_HEIGHT_MM - MARGIN_MM * 2;
    const imgAspectRatio = canvas.height / canvas.width;
    const widthFitHeight = contentHeight / imgAspectRatio;
    const heightFitWidth = contentWidth * imgAspectRatio;

    if (heightFitWidth <= contentHeight) {
      pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, contentWidth, heightFitWidth);
      pdf.save(filename);
      return;
    }

    if (heightFitWidth <= contentHeight * FIT_TO_ONE_PAGE_THRESHOLD) {
      const fittedWidth = widthFitHeight;
      const xOffset = (A4_WIDTH_MM - fittedWidth) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, MARGIN_MM, fittedWidth, contentHeight);
      pdf.save(filename);
      return;
    }

    const pageCanvasHeight = Math.max(1, Math.floor((contentHeight / heightFitWidth) * canvas.height));
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

    for (let i = 0; i < totalPages; i++) {
      const sliceStartY = i * pageCanvasHeight;
      const remainingHeight = canvas.height - sliceStartY;
      const sliceHeight = Math.min(pageCanvasHeight, remainingHeight);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to create PDF page canvas');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        sliceStartY,
        canvas.width,
        sliceHeight,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height
      );

      const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
      const pageImgHeight = (pageCanvas.height / canvas.width) * contentWidth;
      const isLastShortPage = i === totalPages - 1 && pageImgHeight + MARGIN_MM * 2 < A4_HEIGHT_MM - 1;

      if (i > 0) {
        if (isLastShortPage) {
          pdf.addPage([A4_WIDTH_MM, pageImgHeight + MARGIN_MM * 2], 'p');
        } else {
          pdf.addPage('a4', 'p');
        }
      }

      pdf.addImage(pageImgData, 'PNG', MARGIN_MM, MARGIN_MM, contentWidth, pageImgHeight);
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;
  }
}

export function getVoucherFilename(bookingNumber: string, type: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `voucher-${type}-${bookingNumber}-${date}.pdf`;
}
