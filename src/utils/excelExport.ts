import ExcelJS from "exceljs";

/**
 * Export an array of objects to an Excel (.xlsx) file and trigger download.
 */
export async function exportToExcel(
  data: Record<string, any>[],
  sheetName: string,
  filename: string
) {
  if (data.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add header row
  const columns = Object.keys(data[0]);
  worksheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: Math.max(key.length + 2, 15),
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center" };

  // Add data rows
  data.forEach((row) => worksheet.addRow(row));

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
