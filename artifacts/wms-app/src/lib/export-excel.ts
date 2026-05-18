import * as XLSX from "xlsx";

/**
 * Export tabular data to an Excel (.xlsx) file and trigger download.
 *
 * @param data   - Array of objects (rows). Each key becomes a column header.
 * @param filename - Output filename without extension (default: "export").
 * @param sheetName - Worksheet name (default: "Sheet1").
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename = "export",
  sheetName = "Sheet1"
): void {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns based on content
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxContentLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(maxContentLen + 2, 40) };
  });
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Fetch JSON from an API endpoint and export to Excel.
 * Preserves the current query params from the URL.
 */
export async function fetchAndExportExcel(
  baseUrl: string,
  filename?: string,
  queryParams?: URLSearchParams
): Promise<void> {
  const qs = queryParams?.toString();
  const url = qs ? `${baseUrl}?${qs}` : baseUrl;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items ?? data.data ?? [];
  exportToExcel(items, filename);
}
