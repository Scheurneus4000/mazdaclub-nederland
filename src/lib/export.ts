import ExcelJS from "exceljs";

/**
 * Export naar CSV (Nederlandse Excel: UTF-8 met BOM en ";" als scheidingsteken) en naar
 * een echt .xlsx-bestand via exceljs.
 */
export type ExportCellValue = string | number | boolean | Date | null | undefined;

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => ExportCellValue;
  /** money = bedrag in centen; date/datetime = Date; boolean = Ja/Nee */
  type?: "text" | "number" | "money" | "date" | "datetime" | "boolean";
  width?: number;
};

const TZ = "Europe/Amsterdam";

function amsterdamParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

function formatCell<T>(col: ExportColumn<T>, raw: ExportCellValue): string {
  if (raw === null || raw === undefined || raw === "") return "";
  switch (col.type) {
    case "money":
      return (Number(raw) / 100).toFixed(2).replace(".", ",");
    case "number":
      return String(raw);
    case "boolean":
      return raw ? "Ja" : "Nee";
    case "date":
    case "datetime": {
      const d = raw instanceof Date ? raw : new Date(String(raw));
      if (Number.isNaN(d.getTime())) return "";
      const p = amsterdamParts(d);
      return col.type === "date" ? `${p.d}-${p.m}-${p.y}` : `${p.d}-${p.m}-${p.y} ${p.h}:${p.mi}`;
    }
    default:
      return String(raw);
  }
}

/** Voorkomt CSV-injectie (formules) zonder telefoonnummers als "+31 6 ..." te verminken. */
function neutralizeFormula(value: string): string {
  if (/^[=@\t\r]/.test(value)) return `'${value}`;
  if (/^[+-]/.test(value) && !/^[+-]?[\d\s().-]+$/.test(value)) return `'${value}`;
  return value;
}

function csvEscape(value: string): string {
  const safe = neutralizeFormula(value);
  if (/[";\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(";");
  const lines = rows.map((row) => columns.map((c) => csvEscape(formatCell(c, c.value(row)))).join(";"));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

/** Excel kent geen tijdzones: geef een Date mee waarvan de UTC-velden de Amsterdamse kloktijd zijn. */
function excelDate(d: Date): Date {
  const p = amsterdamParts(d);
  return new Date(Date.UTC(+p.y, +p.m - 1, +p.d, +p.h, +p.mi, +p.s));
}

export async function toXlsx<T>(rows: T[], columns: ExportColumn<T>[], sheetName: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MazdaClub Nederland";
  workbook.created = new Date();

  const name = sheetName.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Export";
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });

  sheet.columns = columns.map((c, i) => ({
    header: c.header,
    key: `c${i}`,
    width: c.width ?? Math.min(48, Math.max(12, c.header.length + 4)),
  }));

  for (const row of rows) {
    const record: Record<string, ExcelJS.CellValue> = {};
    columns.forEach((c, i) => {
      const raw = c.value(row);
      let value: ExcelJS.CellValue = null;
      if (raw === null || raw === undefined || raw === "") value = null;
      else if (c.type === "money") value = Number(raw) / 100;
      else if (c.type === "number") value = Number(raw);
      else if (c.type === "boolean") value = raw ? "Ja" : "Nee";
      else if (c.type === "date" || c.type === "datetime") {
        const d = raw instanceof Date ? raw : new Date(String(raw));
        value = Number.isNaN(d.getTime()) ? null : excelDate(d);
      } else value = String(raw);
      record[`c${i}`] = value;
    });
    sheet.addRow(record);
  }

  columns.forEach((c, i) => {
    const column = sheet.getColumn(i + 1);
    if (c.type === "money") column.numFmt = '"€" #,##0.00';
    if (c.type === "date") column.numFmt = "dd-mm-yyyy";
    if (c.type === "datetime") column.numFmt = "dd-mm-yyyy hh:mm";
  });

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC00000" } };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, columns.length) } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

/** Bestandsnaam als "mazdaclub-leden-2026-11-23.csv". */
export function exportFilename(base: string, ext: "csv" | "xlsx"): string {
  const p = amsterdamParts(new Date());
  return `mazdaclub-${base}-${p.y}-${p.m}-${p.d}.${ext}`;
}
