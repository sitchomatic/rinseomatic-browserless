import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Field, SelectField, ToggleRow, Section } from "./FieldRow";

export const BLANK_SITE = {
  key: "", label: "", login_url: "",
  username_selector: "#username",
  password_selector: "#password",
  submit_selector: "#loginSubmit",
  success_selector: ".ol-alert__content.ol-alert__content--status_success",
  login_url_marker: "/login",
  success_url_contains: "",
  wait_after_submit_ms: 3500,
  wait_until: "networkidle0",
  navigation_timeout_ms: 30000,
  selector_timeout_ms: 10000,
  type_delay_ms: 30,
  proxy_type: "residential",
  proxy_country: "au",
  proxy_city: "",
  proxy_sticky: true,
  proxy_locale_match: true,
  proxy_preset: "",
  external_proxy_url: "",
  stealth: true,
  humanlike: false,
  block_ads: true,
  block_consent_modals: false,
  headless: true,
  slow_mo_ms: 0,
  accept_insecure_certs: false,
  viewport_width: 1920,
  viewport_height: 1080,
  user_agent: "",
  accept_language: "en-AU,en;q=0.9",
  extra_chrome_args: [],
  supported_strategies: ["form"],
  enabled: true,
};

export default function SiteFormPanel({ draft, setDraft, editing, onSave, onCancel }) {
  const update = (patch) => setDraft({ ...draft, ...patch });

  const addArg = () => update({ extra_chrome_args: [...(draft.extra_chrome_args || []), ""] });
  const setArg = (i, v) => {
    const next = [...(draft.extra_chrome_args || [])]; next[i] = v;
    update({ extra_chrome_args: next });
  };
  const rmArg = (i) => update({ extra_chrome_args: (draft.extra_chrome_args || []).filter((_, idx) => idx !== i) });

  const toggleStrategy = (s) => {
    const cur = new Set(draft.supported_strategies || []);
    cur.has(s) ? cur.delete(s) : cur.add(s);
    update({ supported_strategies: Array.from(cur.size ? cur : ["form"]) });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 h-fit lg:sticky lg:top-6 max-h-[calc(100vh-3rem)] overflow-y-auto thin-scroll">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="h-4 w-4 text-primary" />
        <div className="text-sm font-medium">{editing ? "Edit site" : "Add site"}</div>
      </div>

      <Section title="Identity">
        <Field label="Key (slug)" value={draft.key} onChange={(v) => update({ key: v })} />
        <Field label="Label" value={draft.label} onChange={(v) => update({ label: v })} />
        <Field label="Login URL" value={draft.login_url} onChange={(v) => update({ login_url: v })} mono />
      </Section>

      <Section title="Selectors">
        <Field label="Username selector" mono value={draft.username_selector} onChange={(v) => update({ username_selector: v })} />
        <Field label="Password selector" mono value={draft.password_selector} onChange={(v) => update({ password_selector: v })} />
        <Field label="Submit selector" mono value={draft.submit_selector} onChange={(v) => update({ submit_selector: v })} />
        <Field label="Success selector" mono value={draft.success_selector} onChange={(v) => update({ success_selector: v })} />
      </Section>

      <Section title="Success / failure rules">
        <Field label="Login URL marker (fail if URL still contains)" mono value={draft.login_url_marker} onChange={(v) => update({ login_url_marker: v })} />
        <Field label="Success URL contains (optional)" mono value={draft.success_url_contains || ""} onChange={(v) => update({ success_url_contains: v })} />
      </Section>

      <Section title="Timing">
        <SelectField label="Wait until" value={draft.wait_until || "networkidle0"} onChange={(v) => update({ wait_until: v })}
          options={[
            { label: "networkidle0 (no traffic 500ms)", value: "networkidle0" },
            { label: "networkidle2 (≤2 conn 500ms)", value: "networkidle2" },
            { label: "domcontentloaded", value: "domcontentloaded" },
            { label: "load", value: "load" },
          ]}
        />
        <Field label="Wait after submit (ms)" type="number" value={draft.wait_after_submit_ms} onChange={(v) => update({ wait_after_submit_ms: v })} />
        <Field label="Navigation timeout (ms)" type="number" value={draft.navigation_timeout_ms} onChange={(v) => update({ navigation_timeout_ms: v })} />
        <Field label="Selector timeout (ms)" type="number" value={draft.selector_timeout_ms} onChange={(v) => update({ selector_timeout_ms: v })} />
        <Field label="Type delay per keystroke (ms)" type="number" value={draft.type_delay_ms} onChange={(v) => update({ type_delay_ms: v })} />
        <Field label="Slow-mo between actions (ms)" type="number" value={draft.slow_mo_ms} onChange={(v) => update({ slow_mo_ms: v })} hint="0 = off" />
      </Section>

      <Section title="Proxy">
        <SelectField label="Proxy type" value={draft.proxy_type || "none"}
          options={[
            { label: "None (datacenter IP)", value: "none" },
            { label: "Residential (Browserless)", value: "residential" },
            { label: "External proxy", value: "external" },
          ]}
          onChange={(v) => update({ proxy_type: v })}
        />
        {(draft.proxy_type || "none") === "residential" && (
          <>
            <Field label="Country (ISO code)" value={draft.proxy_country || ""} onChange={(v) => update({ proxy_country: v })} hint="e.g. au, us, gb" />
            <Field label="City (Scale plan only)" value={draft.proxy_city || ""} onChange={(v) => update({ proxy_city: v })} />
            <SelectField label="Preset" value={draft.proxy_preset || ""}
              options={[
                { label: "None", value: "" },
                { label: "Government sites (px_gov01)", value: "px_gov01" },
                { label: "Google domains (px_ipv6)", value: "px_ipv6" },
              ]}
              onChange={(v) => update({ proxy_preset: v })}
            />
            <ToggleRow label="Sticky IP" hint="Same exit node across session" checked={draft.proxy_sticky} onChange={(v) => update({ proxy_sticky: v })} />
            <ToggleRow label="Match locale to proxy" checked={draft.proxy_locale_match} onChange={(v) => update({ proxy_locale_match: v })} />
          </>
        )}
        {draft.proxy_type === "external" && (
          <Field label="Proxy URL" mono placeholder="http(s)://[user:pass@]host:port" value={draft.external_proxy_url || ""} onChange={(v) => update({ external_proxy_url: v })} />
        )}
      </Section>

      <Section title="Stealth & detection">
        <ToggleRow label="Stealth mode" hint="Reduces automation fingerprints" checked={draft.stealth} onChange={(v) => update({ stealth: v })} />
        <ToggleRow label="Block ads (uBlock)" checked={draft.block_ads} onChange={(v) => update({ block_ads: v })} />
        <ToggleRow label="Block consent modals" hint="Auto-dismiss GDPR/cookie banners" checked={draft.block_consent_modals} onChange={(v) => update({ block_consent_modals: v })} />
        <ToggleRow label="Headless" hint="Off = headful (more resources, harder to detect)" checked={draft.headless} onChange={(v) => update({ headless: v })} />
        <ToggleRow label="Humanlike (BQL only)" checked={draft.humanlike} onChange={(v) => update({ humanlike: v })} />
        <ToggleRow label="Accept insecure certs" checked={draft.accept_insecure_certs} onChange={(v) => update({ accept_insecure_certs: v })} />
      </Section>

      <Section title="Browser fingerprint">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Viewport width" type="number" value={draft.viewport_width} onChange={(v) => update({ viewport_width: v })} />
          <Field label="Viewport height" type="number" value={draft.viewport_height} onChange={(v) => update({ viewport_height: v })} />
        </div>
        <Field label="User-Agent (optional)" mono value={draft.user_agent || ""} onChange={(v) => update({ user_agent: v })} placeholder="Leave blank for default" />
        <Field label="Accept-Language" mono value={draft.accept_language || ""} onChange={(v) => update({ accept_language: v })} />
        <div className="grid gap-1">
          <div className="flex items-center justify-between">
            <div className="text-xs">Extra Chrome args</div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={addArg}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {(draft.extra_chrome_args || []).map((a, i) => (
            <div key={i} className="flex gap-1.5">
              <input className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 font-mono text-xs" placeholder="--lang=en-AU"
                value={a} onChange={(e) => setArg(i, e.target.value)} />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400" onClick={() => rmArg(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Login strategies">
        <div className="flex flex-wrap gap-2">
          {["form", "api", "custom"].map((s) => {
            const active = (draft.supported_strategies || ["form"]).includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStrategy(s)}
                className={`text-[11px] font-mono uppercase tracking-wider rounded px-2 py-1 border transition-colors ${active ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>

      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <ToggleRow label="Enabled" checked={!!draft.enabled} onChange={(v) => update({ enabled: v })} />
        <div className="flex gap-2">
          {editing && <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>}
          <Button size="sm" onClick={onSave} disabled={!draft.key || !draft.label || !draft.login_url}>
            {editing ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}