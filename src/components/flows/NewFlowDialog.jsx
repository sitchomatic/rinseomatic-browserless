import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { GitBranch, Zap } from "lucide-react";
import { SITES } from "@/lib/sites";
import { cn } from "@/lib/utils";

export default function NewFlowDialog({ open, onOpenChange, onCreate }) {
  const [mode, setMode] = React.useState("recorder");
  const [name, setName] = React.useState("");
  const [site, setSite] = React.useState("joe");

  React.useEffect(() => {
    if (open) { setMode("recorder"); setName(""); setSite("joe"); }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), site, mode });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New flow</DialogTitle>
          <DialogDescription>Pick an authoring mode — recorder or Fast Fill.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <ModeCard
            active={mode === "recorder"}
            onClick={() => setMode("recorder")}
            icon={GitBranch}
            title="Recorder"
            desc="Build step-by-step: navigate, type, click, assert."
          />
          <ModeCard
            active={mode === "fast_fill"}
            onClick={() => setMode("fast_fill")}
            icon={Zap}
            title="Fast Fill"
            desc="One-shot inject & submit using a saved credential."
          />
        </div>

        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Joe admin login" />
          </div>
          <div className="grid gap-1.5">
            <Label>Site</Label>
            <Select value={site} onValueChange={setSite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SITES).map(([k, s]) => (
                  <SelectItem key={k} value={k}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()}>Create flow</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border p-4 transition-colors",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"
      )}
    >
      <div className={cn(
        "h-8 w-8 rounded-md flex items-center justify-center mb-2 border",
        active ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}