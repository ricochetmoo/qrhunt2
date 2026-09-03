import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TableColumn<Row> {
  key: string;
  header: ReactNode;
  numeric?: boolean;
  render?: (row: Row) => ReactNode;
}

export function DataTable<Row extends object>({
  caption,
  columns,
  rows,
  getRowKey,
  className,
}: {
  caption: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey?: (row: Row, index: number) => string;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[32rem] border-collapse text-left", className)}>
        <caption className="mb-2 text-left text-xl font-extrabold text-scouts-text">{caption}</caption>
        <thead>
            <tr className="border-y-2 border-scouts-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("px-3 py-3 font-extrabold text-scouts-text", column.numeric && "text-right")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey?.(row, index) ?? String(index)} className="border-b border-scouts-border-muted">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-3 py-3 text-scouts-text", column.numeric && "text-right tabular-nums")}>
                  {column.render ? column.render(row) : String(row[column.key as keyof Row] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
