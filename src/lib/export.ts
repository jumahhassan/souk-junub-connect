/** Browser-side export helpers: CSV / Excel-compatible download and print-to-PDF. */

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  // BOM keeps Excel happy with UTF-8 (Arabic / Juba Arabic names).
  const blob = new Blob(["\uFEFF" + toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Excel-readable .xls (HTML table flavour) — opens natively in Excel and LibreOffice. */
export function downloadExcel(filename: string, headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr>${headers
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Print the current report view — the browser's "Save as PDF" gives a clean PDF. */
export function printReport() {
  window.print();
}
