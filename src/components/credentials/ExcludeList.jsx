import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { RotateCcw, Ban } from "lucide-react";
import SiteChip from "@/components/shared/SiteChip";
import StatusPill from "@/components/shared/StatusPill";

export default function ExcludeList({ items = [], onRestore }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
        <Ban className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">No excluded credentials.</div>
        <div className="text-xs text-muted-foreground mt-1">
          Credentials marked as disabled or no-account automatically appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono border-b border-border/60">
        <div className="col-span-4">Username</div>
        <div className="col-span-2">Site</div>
        <div className="col-span-2">Reason</div>
        <div className="col-span-3">Excluded at</div>
        <div className="col-span-1 text-right">Action</div>
      </div>

      {items.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-border/30 last:border-0 hover:bg-secondary/30"
        >
          <div className="col-span-4 min-w-0">
            <div className="font-mono text-sm truncate">{c.username}</div>
            {c.notes && <div className="text-[11px] text-muted-foreground truncate">{c.notes}</div>}
          </div>
          <div className="col-span-2"><SiteChip site={c.site} size="sm" /></div>
          <div className="col-span-2">
            <StatusPill status={c.status === "no_account" ? "failed" : c.status}>
              {c.excluded_reason || c.status?.replace(/_/g, " ")}
            </StatusPill>
          </div>
          <div className="col-span-3 text-xs text-muted-foreground font-mono">
            {c.excluded_at ? format(new Date(c.excluded_at), "MMM d · HH:mm") : "—"}
          </div>
          <div className="col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => onRestore?.(c)}
              title="Restore credential"
            >
              <RotateCcw className="h-3 w-3" /> Restore
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}