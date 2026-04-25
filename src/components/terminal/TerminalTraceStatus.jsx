import React from "react";
import { Activity, ArrowLeftRight, ShieldCheck, Terminal } from "lucide-react";

const ITEMS = [
  { icon: ArrowLeftRight, label: "Frontend traffic", detail: "fetch + XHR requests and responses" },
  { icon: Terminal, label: "Backend commands", detail: "worker, credential, diagnostics, NordLynx steps" },
  { icon: ShieldCheck, label: "Safe output", detail: "tokens, passwords, keys and cookies are redacted" },
];

export default function TerminalTraceStatus() {
  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-center">
          <Activity className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Full live trace is integrated</h2>
          <p className="text-xs text-muted-foreground mt-1">The terminal shows both directions: commands being processed and sanitized responses coming back.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {ITEMS.map(({ icon: Icon, label, detail }) => (
          <div key={label} className="rounded-xl border border-border/70 bg-secondary/25 p-3">
            <Icon className="h-4 w-4 text-primary mb-2" />
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}