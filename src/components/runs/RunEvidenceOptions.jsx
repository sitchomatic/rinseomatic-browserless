import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const RECORDING_HELP = {
  none: "Fastest option. Uses Browserless function sessions only.",
  replay: "Opens a Browserless WebSocket session with replay=true. Replay is viewed in Browserless dashboard.",
  video: "Records WebM via Browserless WebSocket and stores the video here. Slowest and most expensive.",
};

const SCREENSHOT_HELP = {
  off: "No screenshot files are stored.",
  final: "Stores only the after-submit screenshot.",
  key_steps: "Stores login page, username, password, and after-submit screenshots.",
};

export default function RunEvidenceOptions({ form, onChange }) {
  const update = (patch) => onChange({ ...form, ...patch });

  return (
    <div className="rounded-xl border border-border bg-secondary/25 p-3 space-y-3">
      <div className="grid gap-2">
        <Label>Screenshot evidence</Label>
        <Select value={form.screenshot_mode} onValueChange={(v) => update({ screenshot_mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="key_steps">Key steps</SelectItem>
            <SelectItem value="final">Final screen only</SelectItem>
            <SelectItem value="off">Off</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{SCREENSHOT_HELP[form.screenshot_mode] || SCREENSHOT_HELP.key_steps}</p>
      </div>

      <div className="grid gap-2">
        <Label>Browserless recording</Label>
        <Select value={form.recording_mode} onValueChange={(v) => update({ recording_mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Off</SelectItem>
            <SelectItem value="replay">Session replay</SelectItem>
            <SelectItem value="video">WebM video</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{RECORDING_HELP[form.recording_mode] || RECORDING_HELP.none}</p>
        {form.recording_mode !== "none" && (
          <p className="text-[11px] text-amber-300">Recording runs are automatically limited to 1 browser session at a time for reliability.</p>
        )}
      </div>
    </div>
  );
}