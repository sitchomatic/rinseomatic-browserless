import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import SiteChip from "@/components/shared/SiteChip";
import { format } from "date-fns";

export default function CredentialsTable({ items, sites, selected, onToggle, onToggleAll, onDelete }) {
  const [visible, setVisible] = React.useState({});
  const siteByKey = React.useMemo(
    () => Object.fromEntries((sites || []).map((s) => [s.key, s])),
    [sites]
  );

  const allChecked = items.length > 0 && items.every((item) => selected.has(item.id));

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
        No credentials yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[32px_minmax(0,2fr)_minmax(0,2fr)_120px_110px_140px_48px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Checkbox checked={allChecked} onCheckedChange={onToggleAll} />
        <div>Username</div>
        <div>Password</div>
        <div>Site</div>
        <div>Status</div>
        <div>Last tested</div>
        <div></div>
      </div>
      <div className="divide-y divide-border/60">
        {items.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[32px_minmax(0,2fr)_minmax(0,2fr)_120px_110px_140px_48px] gap-3 px-4 py-2.5 items-center text-sm"
          >
            <Checkbox checked={selected.has(c.id)} onCheckedChange={() => onToggle(c.id)} />
            <div className="truncate font-mono text-xs">{c.username}</div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate font-mono text-xs">
                {visible[c.id] ? c.password : "••••••••"}
              </span>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setVisible((v) => ({ ...v, [c.id]: !v[c.id] }))}
              >
                {visible[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
            <div><SiteChip siteKey={c.site_key} label={siteByKey[c.site_key]?.label} size="sm" /></div>
            <div><StatusPill status={c.status || "untested"} /></div>
            <div className="text-xs text-muted-foreground font-mono">
              {c.last_tested ? format(new Date(c.last_tested), "MMM d HH:mm") : "—"}
            </div>
            <div className="text-right">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-400" onClick={() => onDelete(c)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}