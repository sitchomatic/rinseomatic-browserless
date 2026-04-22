import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { GripVertical, Trash2, MousePointerClick, Keyboard, Globe, Timer, Camera, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = {
  navigate: { label: "Navigate", icon: Globe, color: "text-sky-300", placeholder: "https://..." },
  type: { label: "Type", icon: Keyboard, color: "text-emerald-300", placeholder: "text to type" },
  click: { label: "Click", icon: MousePointerClick, color: "text-amber-300", placeholder: "—" },
  wait: { label: "Wait", icon: Timer, color: "text-fuchsia-300", placeholder: "ms" },
  screenshot: { label: "Screenshot", icon: Camera, color: "text-muted-foreground", placeholder: "label" },
  assert: { label: "Assert", icon: CheckCircle2, color: "text-emerald-300", placeholder: "expected text" },
};

export default function StepRow({ step, index, onChange, onRemove }) {
  const type = TYPES[step.type] || TYPES.click;
  const Icon = type.icon;

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2.5 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-2 text-muted-foreground">
        <GripVertical className="h-4 w-4 cursor-grab" />
        <span className="text-[10px] font-mono tabular-nums w-5 text-right">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <div className={cn("h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0", type.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <Select value={step.type} onValueChange={(v) => onChange({ ...step, type: v })}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TYPES).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {step.type !== "wait" && step.type !== "navigate" && step.type !== "screenshot" && (
        <Input
          value={step.selector || ""}
          onChange={(e) => onChange({ ...step, selector: e.target.value })}
          placeholder="#selector"
          className="font-mono text-xs h-8 flex-1"
        />
      )}

      <Input
        value={step.value || ""}
        onChange={(e) => onChange({ ...step, value: e.target.value })}
        placeholder={type.placeholder}
        className="font-mono text-xs h-8 flex-1"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}