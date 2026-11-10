import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
  /** Points the chart plots, of which `rows` shows a readable number. */
  total: number;
}

interface ChartDataTableProps {
  caption: string;
  table: ChartTable;
  /** Says how many of the points are shown. */
  note: string;
}

/** The numbers a chart draws, as a table, for whoever cannot or does not want to read the curve. */
export function ChartDataTable({ caption, table, note }: ChartDataTableProps) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <Table>
        <TableCaption>{`${caption}. ${note}`}</TableCaption>
        <TableHeader>
          <TableRow>
            {table.columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => (
                <TableCell key={j}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
