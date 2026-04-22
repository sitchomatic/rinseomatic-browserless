import React from "react";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle2, AlertTriangle, Loader2, XCircle, Zap } from "lucide-react";
import { runFastFillSequence } from "@/lib/fast-fill/sequence";
import { cn } from "@/lib/utils";

// A tiny sandbox with a generic login form so you can smoke-test selectors
// without leaving the app. Same structure as the scripts expect.
const SANDBOX_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:14px -apple-system,system-ui,sans-serif;background:#0b0d10;color:#e7e9ee;margin:0;padding:32px;display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 64px)}
.card{background:#12151a;border:1px solid #232833;border-radius:12px;padding:24px;max-width:360px;width:100%}
h2{margin:0 0 4px;font-size:16px}.sub{color:#7b8294;font-size:12px;margin-bottom:16px}
label{display:block;font-size:11px;color:#7b8294;margin:10px 0 6px}
input{width:100%;box-sizing:border-box;background:#0b0d10;border:1px solid #232833;color:#e7e9ee;padding:9px 11px;border-radius:8px;font:13px ui-monospace,monospace}
button{margin-top:16px;width:100%;background:#3aa8ff;color:#0a0f1e;border:0;padding:10px;border-radius:8px;font-weight:600;cursor:pointer}
.ok{margin-top:16px;color:#34d399;font-size:12px}
</style></head><body>
<form id="f" class="card" onsubmit="event.preventDefault();document.getElementById('ok').textContent='✓ Submitted as '+document.querySelector('input[name=username]').value;">
  <h2>Fast Fill sandbox</h2>
  <div class="sub">Generic login form — fields match every default selector.</div>
  <label>Email</label>
  <input type="email" name="username" autocomplete="username" placeholder="you@example.com">
  <label>Password</label>
  <input type="password" name="password" autocomplete="current-password">
  <button type="submit">Sign in</button>
  <div id="ok" class="ok"></div>
</form>
</body></html>`;

const STATUS_ICON = {
  running: Loader2,
  done: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};
const STATUS_COLOR = {
  running: "text-sky-300",
  done: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300",
};

export default function FastFillPreview({ fastFill, credentials }) {
  const iframeRef = React.useRef(null);
  const [timeline, setTimeline] = React.useState([]);
  const [running, setRunning] = React.useState(false);

  const credential = React.useMemo(() => {
    if (!fastFill?.credential_id) return null;
    return credentials.find((c) => c.id === fastFill.credential_id) || null;
  }, [credentials, fastFill?.credential_id]);

  // Runs a JS string inside the sandbox iframe and returns its return value.
  const executeScript = React.useCallback((src) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) throw new Error("Sandbox not ready");
    // Wrap so we can capture the return value of non-IIFE helper blocks too.
    const win = iframe.contentWindow;
    // eslint-disable-next-line no-new-func
    const fn = new win.Function(src.includes("return ") ? src : src + "; return undefined;");
    return fn();
  }, []);

  const run = async () => {
    if (!credential) return;
    setRunning(true);
    setTimeline([]);
    // Reload sandbox for a clean state
    const iframe = iframeRef.current;
    iframe.srcdoc = SANDBOX_HTML;
    await new Promise((r) => {
      const onLoad = () => { iframe.removeEventListener("load", onLoad); r(); };
      iframe.addEventListener("load", onLoad);
    });

    const entries = [];
    await runFastFillSequence({
      executeScript,
      credential: { username: credential.username, password: credential.password },
      fastFill,
      logger: (e) => { entries.push(e); setTimeline([...entries]); },
    });
    setRunning(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <div className="text-sm font-medium">Live sequence preview</div>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={run}
          disabled={running || !credential}
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run sequence
        </Button>
      </div>

      {!credential && (
        <div className="text-[11px] text-muted-foreground">
          Pick a credential above to enable the preview run.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <iframe
          ref={iframeRef}
          title="fast-fill-sandbox"
          srcDoc={SANDBOX_HTML}
          sandbox="allow-scripts allow-forms allow-same-origin"
          className="w-full h-64 rounded-lg border border-border bg-black"
        />

        <div className="rounded-lg border border-border bg-background/40 p-3 h-64 overflow-y-auto thin-scroll font-mono text-[11px]">
          {timeline.length === 0 && (
            <div className="text-muted-foreground">Run to see the step-by-step sequence…</div>
          )}
          {timeline.map((e, i) => {
            const Icon = STATUS_ICON[e.status] || AlertTriangle;
            return (
              <div key={i} className="flex items-start gap-2 py-1 border-b border-border/30 last:border-0">
                <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", STATUS_COLOR[e.status], e.status === "running" && "animate-spin")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{e.step}</span>
                    <span className="text-muted-foreground uppercase text-[9px] tracking-wider">{e.status}</span>
                  </div>
                  <div className="text-muted-foreground truncate">
                    {formatPayload(e)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatPayload(e) {
  const { step, status, at, ...rest } = e;
  const keys = Object.keys(rest);
  if (keys.length === 0) return "—";
  return keys.map((k) => `${k}=${JSON.stringify(rest[k])}`).join(" · ");
}