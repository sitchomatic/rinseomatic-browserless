import React from "react";
import { Button } from "@/components/ui/button";
import { Wrench, RefreshCw, AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";

function analyzeError(err) {
  if (!err) return null;
  const msg = err.toLowerCase();
  if (msg.includes('captcha') || msg.includes('cloudflare') || msg.includes('hcaptcha') || msg.includes('robot') || msg.includes('security check')) {
    return { type: 'CAPTCHA/Anti-Bot', suggestion: 'Rotate Session Credentials or use a Premium Proxy', icon: ShieldAlert, color: 'text-amber-500' };
  }
  if (msg.includes('429') || msg.includes('too many') || msg.includes('rate limit')) {
    return { type: 'Rate Limit (429)', suggestion: 'Switch to Residential Proxy or increase delay', icon: AlertTriangle, color: 'text-orange-500' };
  }
  if (msg.includes('timeout') || msg.includes('404') || msg.includes('navigation') || msg.includes('selector')) {
    return { type: 'Structural Change', suggestion: 'Update Selectors or verify login URL', icon: Clock, color: 'text-blue-500' };
  }
  if (msg.includes('forbidden') || msg.includes('403') || msg.includes('access denied') || msg.includes('blocked')) {
    return { type: 'Proxy Failure (403)', suggestion: 'Rotate Proxy IP or switch region', icon: ShieldAlert, color: 'text-rose-500' };
  }
  return { type: 'Unknown Error', suggestion: 'Review screenshots and manual testing', icon: AlertTriangle, color: 'text-muted-foreground' };
}

export default function DiagnosticsPanel({ results, onSmartRetry }) {
  const failedResults = (results || []).filter(r => r.status === 'failed' || r.status === 'error');

  if (failedResults.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-14 text-center text-sm text-muted-foreground">
        No failed runs to diagnose. Great job!
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/70 bg-secondary/20 flex items-center gap-2">
        <Wrench className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Self-Healing Diagnostics Engine</h2>
      </div>
      <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto thin-scroll">
        {failedResults.map((r) => {
          const analysis = analyzeError(r.error_message || r.final_url || 'Unknown');
          const Icon = analysis ? analysis.icon : AlertTriangle;
          return (
            <div key={r.id} className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-fade-in hover:bg-secondary/10 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium truncate">{r.username}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground font-mono truncate mb-2">
                  Signature: {r.error_message || "Unknown error"}
                </div>
                {analysis && (
                  <div className="flex items-center gap-2 text-xs bg-secondary/30 p-2 rounded-md border border-border/50">
                    <Icon className={`h-3.5 w-3.5 ${analysis.color}`} />
                    <span className="font-semibold">{analysis.type}</span>
                    <span className="text-muted-foreground">→ Remediation: {analysis.suggestion}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => onSmartRetry(r, analysis)}>
                <RefreshCw className="h-3.5 w-3.5" /> Smart Retry
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}