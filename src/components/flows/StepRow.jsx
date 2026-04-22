import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Trash2, MousePointerClick, Keyboard, Globe, Timer, Camera, CheckCircle2, AlertTriangle, Repeat, CircleSlash, ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import StepProfileBadge from "@/components/flows/StepProfileBadge";

const TYPES = {
  navigate: { label: "Navigate", icon: Globe, color: "text-sky-300", placeholder: "https://..." },
  type: { label: "Type", icon: Keyboard, color: "text-emerald-300", placeholder: "text to type" },
  click: { label: "Click", icon: MousePointerClick, color: "text-amber-300", placeholder: "—" },
  wait: { label: "Wait", icon: Timer, color: "text-fuchsia-300", placeholder: "ms" },
  screenshot: { label: "Screenshot", icon: Camera, color: "text-muted-foreground", placeholder: "label" },
  assert: { label: "Assert", icon: CheckCircle2, color: "text-emerald-300", placeholder: "expected text" },
};

const ON_ERROR = {
  retry: { label: "Retry", icon: Repeat, color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  abort: { label: "Abort", icon: CircleSlash, color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
  continue: { label: "Continue", icon: ArrowRightCircle, color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
};

export default function StepRow({ step, index, onChange, onRemove, profile, showProfile }) {
  const type = TYPES[step.type] || TYPES.click;
  const Icon = type.icon;
  const errCfg = step.on_error ? ON_ERROR[step.on_error] : null;
  const ErrIcon = errCfg?.icon || AlertTriangle;

  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5 hover:border-border/80 transition-colors relative",
      errCfg ? "border-l-2" : "border-border",
      errCfg && step.on_error === "retry" && "border-l-amber-400/70 border-r-border border-y-border",
      errCfg && step.on_error === "abort" && "border-l-rose-400/70 border-r-border border-y-border",
      errCfg && step.on_error === "continue" && "border-l-sky-400/70 border-r-border border-y-border",
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-[10px] font-mono tabular-nums w-6 text-right">{String(index + 1).padStart(2, "0")}</span>
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

      {showProfile && <StepProfileBadge profile={profile} />}

      <Select
        value={step.on_error || "none"}
        onValueChange={(v) => onChange({ ...step, on_error: v === "none" ? undefined : v })}
      >
        <SelectTrigger
          className={cn(
            "w-[120px] h-8 text-xs shrink-0",
            errCfg ? errCfg.color : "text-muted-foreground"
          )}
          title="On error behavior"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <ErrIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {errCfg ? errCfg.label : "on error"}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No handler</SelectItem>
          <SelectItem value="retry">Retry</SelectItem>
          <SelectItem value="abort">Abort</SelectItem>
          <SelectItem value="continue">Continue</SelectItem>
        </SelectContent>
      </Select>

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