import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const SCREENSHOT_OPTIONS = [
  { value: "poll", title: "Poll (Every 500ms)", note: "Takes a screenshot every 500ms. Best for full visual replay." },
  { value: "key_steps", title: "Key steps", note: "Best for debugging: login page, username, password, and after-submit." },
  { value: "failures", title: "Failures only", note: "Recommended: keeps screenshots only when a credential fails or errors." },
  { value: "final", title: "Final only", note: "Stores just the after-submit screen for every credential." },
  { value: "off", title: "Off", note: "No screenshot files are stored." },
];

const RECORDING_OPTIONS = [
  { value: "none", title: "Off", note: "Fastest. Uses Browserless function sessions without WebSocket recording." },
  { value: "replay", title: "Session replay", note: "Uses Browserless WebSocket replay for dashboard playback." },
  { value: "video", title: "WebM video", note: "Uses Browserless WebSocket recording and stores video in this app." },
];

export default function RunEvidenceOptions({ form, onChange }) {
  const update = (patch) => onChange({ ...form, ...patch });

  const selectedScreenshot = SCREENSHOT_OPTIONS.find((option) => option.value === form.screenshot_mode) || SCREENSHOT_OPTIONS[0];
  const selectedRecording = RECORDING_OPTIONS.find((option) => option.value === form.recording_mode) || RECORDING_OPTIONS[0];

  return (
    <div className="rounded-xl border border-border bg-secondary/25 p-3 space-y-4">
      <div className="grid gap-2">
        <Label>Screenshot evidence</Label>
        <Select value={form.screenshot_mode} onValueChange={(v) => update({ screenshot_mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SCREENSHOT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="rounded-lg border border-border/70 bg-background/50 p-2">
          <div className="text-xs font-medium">{selectedScreenshot.title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{selectedScreenshot.note}</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Browserless recording</Label>
        <Select value={form.recording_mode} onValueChange={(v) => update({ recording_mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECORDING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="rounded-lg border border-border/70 bg-background/50 p-2">
          <div className="text-xs font-medium">{selectedRecording.title}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{selectedRecording.note}</p>
        </div>
        {form.recording_mode !== "none" && (
          <p className="text-[11px] text-amber-300">WebSocket recording is slower and automatically limited to 1 browser session at a time.</p>
        )}
      </div>
    </div>
  );
}