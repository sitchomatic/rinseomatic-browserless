import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Upload, Play, KeyRound, Settings as SettingsIcon } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import CredentialsTable from "@/components/credentials/CredentialsTable";
import CredentialDialog from "@/components/credentials/CredentialDialog";
import CsvImportDialog from "@/components/credentials/CsvImportDialog";
import NewRunDialog from "@/components/runs/NewRunDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { analyzeCredentials } from "@/lib/credentialMetrics";
import { credentialsForRun, normalizeRunForm } from "@/lib/runPlanning";
import { runInBatches } from "@/lib/batches";

export default function Credentials() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingCredential, setEditingCredential] = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [runOpen, setRunOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState(new Set());
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("-created_date", 100),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["credentials"],
    queryFn: () => base44.entities.Credential.list("-created_date", 5000),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Credential.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credentials"] }); toast.success("Credential added"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Credential.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credentials"] }); toast.success("Credential updated"); },
  });
  const bulkMut = useMutation({
    mutationFn: (rows) => runInBatches(rows, 500, (chunk) => base44.entities.Credential.bulkCreate(chunk)),
    onSuccess: (_, rows) => { qc.invalidateQueries({ queryKey: ["credentials"] }); toast.success(`Imported ${rows.length}`); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const {
    filtered,
    selectedItems,
    canRunSelected,
    firstSiteWithCredentials,
    currentFilterHasCredentials,
  } = React.useMemo(
    () => analyzeCredentials(items, sites, selected, statusFilter, search),
    [items, sites, selected, statusFilter, search]
  );

  React.useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;
      const validIds = new Set(items.map((item) => item.id));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected((s) => {
    const allFilteredSelected = filtered.length > 0 && filtered.every((c) => s.has(c.id));
    if (allFilteredSelected) {
      const next = new Set(s);
      filtered.forEach((c) => next.delete(c.id));
      return next;
    }
    return new Set([...s, ...filtered.map((c) => c.id)]);
  });

  const runDisabledReason = !currentFilterHasCredentials ? "No credentials available" : undefined;

  const startRun = async (rawForm) => {
    const { site_key, concurrency, max_retries, screenshot_mode, recording_mode, label } = normalizeRunForm(rawForm);
    const creds = credentialsForRun(items, selectedItems, site_key);
    if (creds.length === 0) return toast.error("No credentials available");

    const run = await base44.entities.TestRun.create({
      label: label || `${creds.length} × ${site_key}`,
      site_key, concurrency, max_retries,
      screenshot_mode,
      recording_mode,
      recording_dashboard_url: recording_mode === "replay" ? "https://account.browserless.io/" : null,
      status: "queued",
      total_count: creds.length,
      pending_count: creds.length,
    });

    await runInBatches(creds, 500, (chunk) => base44.entities.TestResult.bulkCreate(
      chunk.map((c) => ({
        run_id: run.id,
        credential_id: c.id,
        site_key,
        username: c.username,
        status: "queued",
      }))
    ));
    toast.success(`Run started · ${creds.length} credentials`);
    navigate(`/runs/${run.id}`);
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="01 · vault"
        title="Credentials"
        description="Stored credentials tested against real sites via Browserless."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            <Button size="sm" className="gap-2"
              onClick={() => setRunOpen(true)}
              disabled={items.length === 0 || !!runDisabledReason}
              title={runDisabledReason || "Open a test run dialog for the selected site or selected credentials"}
            >
              <Play className="h-3.5 w-3.5" />
              {canRunSelected ? `Test ${selected.size} selected` : "Test all"}
            </Button>
          </>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{items.length} reusable credentials</div>
        <div className="relative flex-1 max-w-sm md:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search username..." className="pl-9 font-mono h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-44 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="working">Working</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="untested">Untested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sitesLoading || itemsLoading ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : sites.length === 0 ? (
        <EmptyState
          icon={SettingsIcon}
          title="No sites configured yet"
          description="Add the sites you want to test credentials against, including login URL and success markers."
          action={<Button size="sm" onClick={() => navigate("/settings")}>Go to settings</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Your vault is empty"
          description="Add a single credential or import a CSV to get started."
          action={
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Import CSV
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add credential
              </Button>
            </div>
          }
        />
      ) : (
        <CredentialsTable
          items={filtered}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onDelete={(c) => setConfirmDelete(c)}
          onEdit={(c) => { setEditingCredential(c); setAddOpen(true); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete credential?"
        description={confirmDelete ? `${confirmDelete.username} will be permanently removed.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}
      />

      <CredentialDialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingCredential(null); }}
        credential={editingCredential}
        onSubmit={(data) => editingCredential ? updateMut.mutate({ id: editingCredential.id, data }) : createMut.mutate(data)}
      />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={(rows) => bulkMut.mutate(rows)} />
      <NewRunDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        sites={sites}
        defaultSiteKey={firstSiteWithCredentials || sites[0]?.key}
        credentials={selectedItems.length > 0 ? selectedItems : items}
        onCreate={startRun}
      />
    </div>
  );
}