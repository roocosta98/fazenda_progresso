import type { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, keyExtractor, onRowClick, emptyMessage = 'Nenhum registro encontrado' }: DataTableProps<T>) {
  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr 
                  key={keyExtractor(row)} 
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-slate-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-6 py-4 text-sm text-slate-700 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.render ? col.render(row) : String(row[col.accessor as keyof T])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
