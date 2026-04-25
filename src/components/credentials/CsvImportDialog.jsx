import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const uIdx = header.findIndex((h) => ["username", "email", "user"].includes(h));
  const pIdx = header.findIndex((h) => ["password", "pass"].includes(h));
  const hasHeader = uIdx !== -1 && pIdx !== -1;
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows.map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    if (hasHeader) return { username: parts[uIdx], password: parts[pIdx] };
    return { username: parts[0], password: parts[1] };
  }).filter((r) => r.username && r.password);
}

export default function CsvImportDialog({ open, onOpenChange, sites, onImport }) {
  const [siteKey, setSiteKey] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [fileName, setFileName] = React.useState("");

  React.useEffect(() => {
    if (open) { setSiteKey(sites?.[0]?.key || ""); setRows([]); setFileName(""); }
  }, [open, sites]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setRows(parseCsv(text));
  };

  const submit = () => {
    if (!siteKey || rows.length === 0) return;
    onImport(rows.map((r) => ({ ...r, site_key: siteKey, status: "untested" })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Upload a CSV with username and password columns, then assign all rows to one site.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Site (applied to all rows)</Label>
            <Select value={siteKey} onValueChange={setSiteKey}>
              <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
              <SelectContent>
                {(sites || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 px-3 py-6 rounded-lg border border-dashed border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 text-sm">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {fileName ? `${fileName} · ${rows.length} rows` : "Click to upload CSV (columns: username,password)"}
            </span>
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!siteKey || rows.length === 0}>Import {rows.length || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}