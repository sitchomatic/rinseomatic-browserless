import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StatusPill from "@/components/shared/StatusPill";

export default function ProxyHealthDashboard() {
  const { data: proxiesData, isLoading } = useQuery({
    queryKey: ["proxy-health"],
    queryFn: async () => {
      const res = await base44.functions.invoke("pingProxies", {});
      return res.data;
    },
    refetchInterval: 15000,
  });

  const proxies = proxiesData?.proxies || [];

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Proxy Health & Latency
        </CardTitle>
        <CardDescription>Real-time telemetry for configured proxy exit nodes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Pinging proxies...</div>
        ) : proxies.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground bg-secondary/20 rounded-lg border border-border">No proxies configured.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proxies.map(p => (
              <div key={p.id} className={`p-3 rounded-lg border flex items-center justify-between ${p.latency_ms > 500 ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-secondary/20'}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.host}:{p.port}</div>
                  <div className="text-xs font-mono mt-1 text-muted-foreground flex items-center gap-1">
                    {p.latency_ms > 500 ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {p.latency_ms} ms
                  </div>
                </div>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}