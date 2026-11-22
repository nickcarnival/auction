/**
 * RFC 4180-style CSV cell: quote if needed, escape internal quotes.
 */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvLine(fields: Array<string | number | boolean | null | undefined>): string {
  return fields.map(field => csvCell(field)).join(',');
}
