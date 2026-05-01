import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, PlayCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { format } from "date-fns";

const PAGE_SIZE = 100;

export default function CredentialsTable({ items, selected, onToggle, onToggleAll, onDelete, onEdit, onTest, testingId }) {
  const [page, setPage] = React.useState(1);
  
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = React.useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  React.useEffect(() => {
    setPage(1);
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
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between bg-secondary/20 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, items.length)} of {items.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="gap-1 h-8">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Button>
              <div className="text-xs font-mono px-2 text-muted-foreground">Page {page} of {totalPages}</div>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="gap-1 h-8">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}