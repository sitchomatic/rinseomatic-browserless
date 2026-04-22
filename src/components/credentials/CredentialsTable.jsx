import React from "react";
import { format } from "date-fns";
import { MoreHorizontal, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusPill from "../shared/StatusPill";
import SiteChip from "../shared/SiteChip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function CredentialsTable({ items = [], onTest, onToggleBurn, onDelete }) {
  const [revealed, setRevealed] = React.useState({});

  const toggle = (id) => setRevealed((r) => ({ ...r, [id]: !r[id] }));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono border-b border-border/60">
        <div className="col-span-3">Username</div>
        <div className="col-span-3">Password</div>
        <div className="col-span-1">Site</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Last tested</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {items.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">No credentials yet.</div>
      )}

      {items.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-border/30 last:border-0 hover:bg-secondary/30 transition-colors"
        >
          <div className="col-span-3 min-w-0">
            <div className="flex items-center gap-2">
              {c.burn_protected && <Shield className="h-3 w-3 text-amber-400 shrink-0" />}
              <span className="font-mono text-sm truncate">{c.username}</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {c.attempts || 0} attempts
            </div>
          </div>

          <div className="col-span-3 flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm truncate">
              {revealed[c.id] ? c.password : "••••••••••"}
            </span>
            <button
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => toggle(c.id)}
              aria-label="toggle password"
            >
              {revealed[c.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="col-span-1">
            <SiteChip site={c.site} size="sm" />
          </div>

          <div className="col-span-2">
            <StatusPill status={c.status} />
          </div>

          <div className="col-span-2 text-xs text-muted-foreground font-mono">
            {c.last_tested ? format(new Date(c.last_tested), "MMM d · HH:mm") : "never"}
          </div>

          <div className="col-span-1 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onTest?.(c)}>Test credential</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleBurn?.(c)}>
                  {c.burn_protected ? "Remove burn protection" : "Enable burn protection"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-400" onClick={() => onDelete?.(c)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}