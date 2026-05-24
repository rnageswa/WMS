import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CostHistoryPoint {
  date: string;
  avgCost: number;
  totalQty: number;
  sourceType: string;
}

interface CostHistoryChartProps {
  data: CostHistoryPoint[];
  isLoading?: boolean;
  currency?: string;
  formatMoney?: (val: number) => string;
  height?: number;
  title?: string;
}

export function CostHistoryChart({
  data,
  isLoading,
  currency = "$",
  formatMoney,
  height = 260,
  title = "Cost History (30 snapshots)",
}: CostHistoryChartProps) {
  const formatter = formatMoney ?? ((v: number) => `${currency} ${v.toFixed(2)}`);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data?.length ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={[...data].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => currency + " " + v.toFixed(2)} />
              <Tooltip formatter={(val: number) => formatter(val)} />
              <Line type="monotone" dataKey="avgCost" stroke="#E8622A" strokeWidth={2} name="Avg Cost (MAC)" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            No cost history available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CostHistoryTable({
  data,
  isLoading,
  formatMoney,
}: {
  data: CostHistoryPoint[];
  isLoading?: boolean;
  formatMoney: (val: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost History Log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Avg Cost</th>
                  <th className="text-right py-2 px-3">Total Qty</th>
                  <th className="text-left py-2 px-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.map((h, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3">{h.date}</td>
                    <td className="py-2 px-3 text-right font-medium">{formatMoney(h.avgCost)}</td>
                    <td className="py-2 px-3 text-right">{h.totalQty.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {h.sourceType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">No cost history records</p>
        )}
      </CardContent>
    </Card>
  );
}
