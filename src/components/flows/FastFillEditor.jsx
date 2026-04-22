import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Zap, Globe, User, KeyRound, MousePointerClick, Shield, Timer } from "lucide-react";

const DEFAULT_FF = {
  target_url: "",
  domain: "",
  username_selector: 'input[type="email"], input[name="username"]',
  password_selector: 'input[type="password"]',
  submit_selector: 'button[type="submit"]',
  totp_field_selector: "",
  credential_id: "",
  auto_submit: true,
  wait_after_load_ms: 400,
};

function domainFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export default function FastFillEditor({ value, onChange, credentials = [], site }) {
  const ff = { ...DEFAULT_FF, ...(value || {}) };
  const update = (patch) => onChange({ ...ff, ...patch });

  const matching = credentials.filter((c) => !site || c.site === site);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-medium">Fast fill configuration</div>
          <div className="text-[11px] text-muted-foreground">
            One-shot inject & submit — no step recorder needed.
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field icon={Globe} label="Target URL">
          <Input
            value={ff.target_url}
            onChange={(e) => {
              const v = e.target.value;
              update({ target_url: v, domain: ff.domain || domainFromUrl(v) });
            }}
            placeholder="https://example.com/login"
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={Globe} label="Domain">
          <Input
            value={ff.domain}
            onChange={(e) => update({ domain: e.target.value })}
            placeholder="example.com"
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={KeyRound} label="Credential">
          <Select
            value={ff.credential_id || "none"}
            onValueChange={(v) => update({ credential_id: v === "none" ? "" : v })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Pick a credential" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (prompt at runtime)</SelectItem>
              {matching.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.username} · {c.site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field icon={Timer} label="Wait after load (ms)">
          <Input
            type="number"
            value={ff.wait_after_load_ms}
            onChange={(e) => update({ wait_after_load_ms: Number(e.target.value) || 0 })}
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={User} label="Username selector" full>
          <Input
            value={ff.username_selector}
            onChange={(e) => update({ username_selector: e.target.value })}
            placeholder='input[name="username"]'
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={KeyRound} label="Password selector" full>
          <Input
            value={ff.password_selector}
            onChange={(e) => update({ password_selector: e.target.value })}
            placeholder='input[type="password"]'
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={Shield} label="TOTP field selector (optional)" full>
          <Input
            value={ff.totp_field_selector}
            onChange={(e) => update({ totp_field_selector: e.target.value })}
            placeholder='input[name="otp"]'
            className="font-mono text-xs h-9"
          />
        </Field>

        <Field icon={MousePointerClick} label="Submit button selector" full>
          <Input
            value={ff.submit_selector}
            onChange={(e) => update({ submit_selector: e.target.value })}
            placeholder='button[type="submit"]'
            className="font-mono text-xs h-9"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3">
        <div>
          <div className="text-sm font-medium">Auto-submit after fill</div>
          <div className="text-[11px] text-muted-foreground">
            Click the submit button automatically once both fields are filled.
          </div>
        </div>
        <Switch checked={!!ff.auto_submit} onCheckedChange={(v) => update({ auto_submit: v })} />
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children, full }) {
  return (
    <div className={full ? "md:col-span-2 grid gap-1.5" : "grid gap-1.5"}>
      <Label className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </Label>
      {children}
    </div>
  );
}