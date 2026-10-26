import ExcelJS from 'exceljs';
import type { Response } from 'express';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/** Trả file Excel (.xlsx) về trình duyệt */
export async function sendXlsx(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI SYT';
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 20 }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  await wb.xlsx.write(res);
  res.end();
}

/** Trả file CSV UTF-8 có BOM (Excel mở đúng tiếng Việt) */
export function sendCsv(res: Response, filename: string, columns: ExportColumn[], rows: Record<string, any>[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.header)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => esc(r[c.key])).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send('﻿' + lines.join('\r\n'));
}

/** Đọc sheet đầu tiên của file .xlsx thành mảng object theo dòng tiêu đề */
export async function readXlsx(path: string): Promise<Record<string, any>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => (headers[col] = String(cell.value ?? '').trim()));
  const rows: Record<string, any>[] = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return;
    const obj: Record<string, any> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const h = headers[col];
      if (!h) return;
      const v: any = cell.value;
      obj[h] = v && typeof v === 'object' && 'text' in v ? v.text : v && typeof v === 'object' && 'result' in v ? v.result : v;
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return rows;
}
