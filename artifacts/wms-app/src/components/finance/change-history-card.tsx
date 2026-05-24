import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, User, Clock, FileText } from "lucide-react";

interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  objectType: string;
  objectId: string;
  changes: Record<string, any> | null;
  reason: string | null;
  createdAt: string;
}

async function fetchAuditLog(objectType: string, objectId: string): Promise<AuditEntry[]> {
  const res = await fetch(`/api/finance/audit-log?objectType=${objectType}&objectId=${objectId}&limit=20`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 border-green-200",
  update: "bg-blue-100 text-blue-800 border-blue-200",
  delete: "bg-red-100 text-red-800 border-red-200",
  acknowledge: "bg-purple-100 text-purple-800 border-purple-200",
  bulk_update: "bg-amber-100 text-amber-800 border-amber-200",
};

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  acknowledge: "Acknowledged",
  bulk_update: "Bulk Update",
};

interface ChangeHistoryCardProps {
  objectType: string;
  objectId: string;
  title?: string;
  maxHeight?: string;
}

export function ChangeHistoryCard({ objectType, objectId, title, maxHeight }: ChangeHistoryCardProps) {
  const { data: auditLog, isLoading } = useQuery({
    queryKey: ["audit-log", objectType, objectId],
    queryFn: () => fetchAuditLog(objectType, objectId),
    enabled: !!objectType && !!objectId,
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          {title ?? "Change History"}
        </CardTitle>
      </CardHeader>
      <CardContent className={maxHeight ? `overflow-y-auto ${maxHeight}` : "max-h-72 overflow-y-auto"}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : auditLog?.length ? (
          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div key={entry.id} className="p-2.5 rounded-lg border bg-card/50 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[10px] ${actionColors[entry.action] ?? "bg-gray-100 text-gray-800"}`}>
                      {actionLabels[entry.action] ?? entry.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.userId.slice(0, 12)}...
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                {entry.reason && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                    {entry.reason}
                  </p>
                )}
                {entry.changes && (
                  <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded overflow-x-auto">
                    {JSON.stringify(entry.changes, null, 1).slice(0, 120)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <History className="w-6 h-6 mx-auto mb-1 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No change history</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
