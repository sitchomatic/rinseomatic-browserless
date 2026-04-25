import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, PlayCircle, Trash2 } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { format } from "date-fns";

const PAGE_SIZE = 250;

export default function CredentialsTable({ items, selected, onToggle, onToggleAll, onDelete, onEdit, onTest, testingId }) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const visibleItems = React.useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [items]);

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
      <div className="grid grid-cols-[32px_minmax(0,2fr)_minmax(0,1.3fr)_110px_110px_140px_100px_100px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Checkbox checked={allChecked} onCheckedChange={onToggleAll} />
        <div>Username</div>
        <div>Password</div>
        <div>Strategy</div>
        <div>Status</div>
        <div>Last tested</div>
        <div>Test</div>
        <div></div>
      </div>
      <div className="divide-y divide-border/60 max-h-[640px] overflow-y-auto thin-scroll">
        {visibleItems.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[32px_minmax(0,2fr)_minmax(0,1.3fr)_110px_110px_140px_100px_100px] gap-3 px-4 py-2.5 items-center text-sm animate-fade-in"
          >
            <Checkbox checked={selected.has(c.id)} onCheckedChange={() => onToggle(c.id)} />
            <div className="truncate font-mono text-xs" title={c.custom_login_url || c.notes || ""}>{c.username}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">••••••••{(c.password_variants || []).length ? ` +${c.password_variants.length}` : ""}</div>
            <div className="text-xs font-mono text-muted-foreground uppercase">{c.login_strategy || "form"}</div>
            <div><StatusPill status={c.status || "untested"} /></div>
            <div className="text-xs text-muted-foreground font-mono">
              {c.last_tested ? format(new Date(c.last_tested), "MMM d HH:mm") : "—"}
            </div>
            <div>
              <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => onTest(c)} disabled={testingId === c.id}>
                <PlayCircle className={`h-3.5 w-3.5 ${testingId === c.id ? "animate-spin" : ""}`} /> Test
              </Button>
            </div>
            <div className="text-right flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(c)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-400" onClick={() => onDelete(c)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-4 py-3 text-center bg-secondary/20">
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((count) => Math.min(items.length, count + PAGE_SIZE))}>
              Show {Math.min(PAGE_SIZE, hiddenCount)} more · {hiddenCount} hidden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}