import type { ReactNode } from 'react';
import { Card } from './card';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  emptyState,
}: {
  columns: TableColumn<T>[];
  data: T[];
  emptyState: ReactNode;
}) {
  if (!data.length) {
    return <>{emptyState}</>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-muted/80">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 bg-white">
            {data.map((item, index) => (
              <tr key={index} className="align-top hover:bg-slate-50/90">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-5 py-4 text-sm text-foreground"
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
