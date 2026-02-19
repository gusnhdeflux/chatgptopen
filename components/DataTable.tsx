'use client';

import { useMemo } from 'react';

type DataTableProps = {
  rows: Record<string, unknown>[];
};

export default function DataTable({ rows }: DataTableProps) {
  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
    return Array.from(set);
  }, [rows]);

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
  };

  if (!rows.length) {
    return <p className="text-sm text-slate-400">Нет данных.</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/80 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-border/80 px-3 py-2">
        <p className="text-xs uppercase tracking-wider text-emerald-300">Sources: Supabase</p>
        <button
          onClick={copyJson}
          className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
        >
          Copy JSON
        </button>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap border-b border-border/70 px-3 py-2 font-medium text-slate-200">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border/40 align-top hover:bg-slate-900/40">
                {columns.map((column) => (
                  <td key={column} className="max-w-[280px] whitespace-pre-wrap break-words px-3 py-2 text-slate-300">
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
