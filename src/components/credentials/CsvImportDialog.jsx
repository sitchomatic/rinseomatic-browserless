import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { parseCSV } from "@/lib/csv";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

function parseCredentialRows(text) {
  const parsed = parseCSV(text);
  if (parsed.length === 0) return [];
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const uIdx = header.findIndex((h) => ["username", "email", "user"].includes(h));
  const pIdx = header.findIndex((h) => ["password", "pass"].includes(h));
  const hasHeader = uIdx !== -1 && pIdx !== -1;
  const rows = hasHeader ? parsed.slice(1) : parsed;
  return rows.map((parts) => {
    if (hasHeader) {
      const customUrlIdx = header.findIndex((h) => ["custom_login_url", "login_url", "url"].includes(h));
      const strategyIdx = header.findIndex((h) => ["login_strategy", "strategy"].includes(h));
      const notesIdx = header.findIndex((h) => ["notes", "note"].includes(h));
      return {
        username: parts[uIdx]?.trim(),
        password: parts[pIdx]?.trim(),
        custom_login_url: customUrlIdx >= 0 ? parts[customUrlIdx]?.trim() : "",
        login_strategy: strategyIdx >= 0 ? parts[strategyIdx]?.trim() || "form" : "form",
        notes: notesIdx >= 0 ? parts[notesIdx]?.trim() : "",
      };
    }
    return { username: parts[0]?.trim(), password: parts[1]?.trim(), login_strategy: "form" };
  }).filter((r) => r.username && r.password);
}

export default function CsvImportDialog({ open, onOpenChange, onImport }) {
  const [rows, setRows] = React.useState([]);
  const [fileName, setFileName] = React.useState("");

  const { data: existing = [] } = useQuery({
    queryKey: ["credentials"],
    queryFn: () => base44.entities.Credential.list("-created_date", 5000),
    enabled: open
  });

  const existingUsernames = React.useMemo(() => new Set(existing.map(c => c.username)), [existing]);

  const validatedRows = React.useMemo(() => {
    const seen = new Set();
    return rows.map((r, index) => {
      let warning = null;
      let isError = false;
      if (!r.username || !r.password) {
        warning = "Missing username or password";
        isError = true;
      } else if (seen.has(r.username)) {
        warning = "Duplicate username in CSV";
      } else if (existingUsernames.has(r.username)) {
        warning = "Username already exists in vault";
      }
      if (r.username) seen.add(r.username);
      return { ...r, _warning: warning, _isError: isError, _index: index };
    });
  }, [rows, existingUsernames]);

  const validCount = validatedRows.filter(r => !r._isError).length;
  const warningCount = validatedRows.filter(r => r._warning && !r._isError).length;

  React.useEffect(() => {
    if (open) { setRows([]); setFileName(""); }
  }, [open]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setRows(parseCredentialRows(text));
  };

  const submit = () => {
    if (validCount === 0) return;
    onImport(validatedRows.filter(r => !r._isError).map(({ _warning, _isError, _index, ...r }) => ({ ...r, status: "untested" })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Upload reusable credentials. Supported columns: username,password,custom_login_url,login_strategy,notes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 px-3 py-6 rounded-lg border border-dashed border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 text-sm">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {fileName ? `${fileName} · ${rows.length} rows parsed` : "Click to upload CSV"}
            </span>
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>
          
          {rows.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden text-sm">
              <div className="px-3 py-2 bg-secondary/30 border-b border-border text-xs flex justify-between">
                <span>Preview ({Math.min(rows.length, 50)} of {rows.length})</span>
                <span className="text-muted-foreground">
                  {validCount} valid {warningCount > 0 ? ` · ${warningCount} warnings` : ""}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto thin-scroll">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/20 sticky top-0 backdrop-blur-sm border-b border-border z-10">
                    <tr>
                      <th className="px-3 py-2 font-medium">Username</th>
                      <th className="px-3 py-2 font-medium">Password</th>
                      <th className="px-3 py-2 font-medium">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {validatedRows.slice(0, 50).map((r) => (
                      <tr key={r._index} className={r._isError ? "bg-destructive/5 text-muted-foreground" : r._warning ? "bg-amber-500/5" : ""}>
                        <td className="px-3 py-2 font-mono truncate max-w-[120px]">{r.username || "—"}</td>
                        <td className="px-3 py-2 font-mono truncate max-w-[100px]">{r.password ? "••••••••" : "—"}</td>
                        <td className="px-3 py-2 flex items-center gap-1.5">
                          {r._isError ? (
                            <><AlertCircle className="h-3.5 w-3.5 text-destructive" /> <span className="text-destructive">{r._warning}</span></>
                          ) : r._warning ? (
                            <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /> <span className="text-amber-500">{r._warning}</span></>
                          ) : (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> <span className="text-emerald-500">Valid</span></>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={validCount === 0}>Import {validCount || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}