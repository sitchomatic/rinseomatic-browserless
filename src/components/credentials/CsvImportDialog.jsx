import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { parseCSV } from "@/lib/csv";

function parseCredentialRows(text) {
  const parsed = parseCSV(text);
  if (parsed.length === 0) return [];
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const uIdx = header.findIndex((h) => ["username", "email", "user"].includes(h));
  const pIdx = header.findIndex((h) => ["password", "pass"].includes(h));
  const hasHeader = uIdx !== -1 && pIdx !== -1;
  const rows = hasHeader ? parsed.slice(1) : parsed;
  return rows.map((parts) => {
    if (hasHeader) return { username: parts[uIdx]?.trim(), password: parts[pIdx]?.trim() };
    return { username: parts[0]?.trim(), password: parts[1]?.trim() };
  }).filter((r) => r.username && r.password);
}

export default function CsvImportDialog({ open, onOpenChange, onImport }) {
  const [rows, setRows] = React.useState([]);
  const [fileName, setFileName] = React.useState("");

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
    if (rows.length === 0) return;
    onImport(rows.map((r) => ({ ...r, status: "untested" })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Upload reusable credentials. The target site is selected only when starting a run.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <Button onClick={submit} disabled={rows.length === 0}>Import {rows.length || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}