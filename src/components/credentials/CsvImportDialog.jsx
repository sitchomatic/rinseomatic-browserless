import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { parseCSV, detectSite } from "@/lib/csv";
import { SITES } from "@/lib/sites";
import SiteChip from "@/components/shared/SiteChip";
import { cn } from "@/lib/utils";

function normalizeHeader(h) {
  return (h || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export default function CsvImportDialog({ open, onOpenChange, existingCredentials = [], onImport }) {
  const fileRef = React.useRef(null);
  const [rows, setRows] = React.useState([]);
  const [fileName, setFileName] = React.useState("");
  const [importing, setImporting] = React.useState(false);

  const existingKeys = React.useMemo(() => {
    const s = new Set();
    existingCredentials.forEach((c) => s.add(`${c.site}:${(c.username || "").toLowerCase()}`));
    return s;
  }, [existingCredentials]);

  const reset = () => {
    setRows([]);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) { setRows([]); return; }

    const [headerRow, ...body] = parsed;
    const headers = headerRow.map(normalizeHeader);
    const idx = {
      username: headers.findIndex((h) => ["username", "user", "email", "login"].includes(h)),
      password: headers.findIndex((h) => ["password", "pass", "pwd"].includes(h)),
      site: headers.findIndex((h) => ["site", "platform"].includes(h)),
      url: headers.findIndex((h) => ["url", "domain", "host"].includes(h)),
      notes: headers.findIndex((h) => ["notes", "note", "comment"].includes(h)),
    };

    // If no header detected for username, assume columns are [username, password, site?]
    const hasHeader = idx.username !== -1;
    const dataRows = hasHeader ? body : parsed;

    const seen = new Set();
    const validated = dataRows.map((r, i) => {
      const username = (hasHeader ? r[idx.username] : r[0] || "").trim();
      const password = (hasHeader ? (idx.password !== -1 ? r[idx.password] : "") : r[1] || "").trim();
      const siteCol = hasHeader ? (idx.site !== -1 ? r[idx.site] : "") : r[2] || "";
      const urlCol = hasHeader && idx.url !== -1 ? r[idx.url] : "";
      const notes = hasHeader && idx.notes !== -1 ? r[idx.notes] : "";

      const site = detectSite(siteCol, urlCol, username);
      const key = site ? `${site}:${username.toLowerCase()}` : null;

      const errors = [];
      if (!username) errors.push("missing username");
      if (!site) errors.push("unknown site");
      let dup = false;
      if (key) {
        if (existingKeys.has(key)) { errors.push("already in vault"); dup = true; }
        if (seen.has(key)) { errors.push("duplicate in file"); dup = true; }
        else seen.add(key);
      }

      return {
        rowIndex: i + 1,
        username,
        password,
        site,
        notes,
        errors,
        duplicate: dup,
        valid: errors.length === 0,
      };
    });

    setRows(validated);
  };

  const validRows = rows.filter((r) => r.valid);
  const skipped = rows.length - validRows.length;

  const runImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      await onImport(validRows.map((r) => ({
        username: r.username,
        password: r.password,
        site: r.site,
        notes: r.notes,
        status: "untested",
        attempts: 0,
      })));
      reset();
      onOpenChange(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import credentials from CSV</DialogTitle>
          <DialogDescription>
            Auto-detects site from columns or URL hints. Duplicates & invalid rows are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-dashed border-border bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-pointer py-8 text-center"
          >
            <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm">{fileName || "Drop or click to select a CSV file"}</div>
            <div className="text-[11px] text-muted-foreground font-mono mt-1">
              columns: username, password, site (or url/domain), notes
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {validRows.length} valid
                </span>
                <span className="flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> {skipped} skipped
                </span>
                <span className="text-muted-foreground ml-auto">
                  {Object.keys(SITES).map((k) => {
                    const n = validRows.filter((r) => r.site === k).length;
                    return n ? <span key={k} className="ml-3">{SITES[k].label}: {n}</span> : null;
                  })}
                </span>
              </div>

              <div className="rounded-lg border border-border max-h-72 overflow-y-auto thin-scroll">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border/60 sticky top-0 bg-card">
                  <div className="w-8">#</div>
                  <div>Username</div>
                  <div>Site</div>
                  <div className="w-24">Status</div>
                </div>
                {rows.map((r) => (
                  <div
                    key={r.rowIndex}
                    className={cn(
                      "grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-1.5 items-center text-xs border-b border-border/30 last:border-0",
                      !r.valid && "bg-rose-500/5"
                    )}
                  >
                    <div className="w-8 font-mono text-muted-foreground tabular-nums">{r.rowIndex}</div>
                    <div className="font-mono truncate">{r.username || <em className="text-muted-foreground">empty</em>}</div>
                    <div>{r.site ? <SiteChip site={r.site} size="sm" /> : <span className="text-rose-300 text-[10px] font-mono">unknown</span>}</div>
                    <div className="w-24 text-[10px] font-mono">
                      {r.valid ? (
                        <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> ok</span>
                      ) : (
                        <span className="text-amber-300 flex items-center gap-1" title={r.errors.join(", ")}>
                          <XCircle className="h-3 w-3" /> {r.errors[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={runImport} disabled={importing || validRows.length === 0}>
            {importing ? "Importing..." : `Import ${validRows.length} credential${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}