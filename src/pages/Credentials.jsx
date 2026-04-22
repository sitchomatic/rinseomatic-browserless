import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, Ban } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import CredentialsTable from "@/components/credentials/CredentialsTable";
import CredentialDialog from "@/components/credentials/CredentialDialog";
import CsvImportDialog from "@/components/credentials/CsvImportDialog";
import ExcludeList from "@/components/credentials/ExcludeList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SITES } from "@/lib/sites";
import { toast } from "sonner";

export default function Credentials() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [siteFilter, setSiteFilter] = React.useState("all");
  const [view, setView] = React.useState("active");

  const { data: items = [] } = useQuery({
    queryKey: ["credentials"],
    queryFn: () => base44.entities.Credential.list("-created_date", 500),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Credential.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Credential.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Credential.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const bulkCreateMut = useMutation({
    mutationFn: (rows) => base44.entities.Credential.bulkCreate(rows),
    onSuccess: (_, rows) => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast.success(`Imported ${rows.length} credential${rows.length === 1 ? "" : "s"}`);
    },
  });

  const isExcluded = (c) => c.excluded || c.status === "disabled" || c.status === "no_account";

  const active = items.filter((c) => !isExcluded(c));
  const excluded = items.filter(isExcluded);

  const filtered = active.filter((c) => {
    if (siteFilter !== "all" && c.site !== siteFilter) return false;
    if (search && !(c.username || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: active.length,
    ...Object.keys(SITES).reduce((acc, k) => {
      acc[k] = active.filter((i) => i.site === k).length;
      return acc;
    }, {}),
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="02 · credential vault"
        title="Credentials"
        description="Vaulted credential pairs with burn protection and test history."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add credential
            </Button>
          </>
        }
      />

      <Tabs value={view} onValueChange={setView} className="mb-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="active">
            Active <span className="ml-2 text-muted-foreground font-mono">{active.length}</span>
          </TabsTrigger>
          <TabsTrigger value="excluded" className="gap-1.5">
            <Ban className="h-3 w-3" /> Exclude list
            <span className="ml-1 text-muted-foreground font-mono">{excluded.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
            <Tabs value={siteFilter} onValueChange={setSiteFilter}>
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="all">
                  All <span className="ml-2 text-muted-foreground font-mono">{counts.all}</span>
                </TabsTrigger>
                {Object.entries(SITES).map(([k, s]) => (
                  <TabsTrigger key={k} value={k}>
                    {s.label} <span className="ml-2 text-muted-foreground font-mono">{counts[k]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative flex-1 max-w-sm md:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search username..."
                className="pl-9 font-mono h-9"
              />
            </div>
          </div>

          <CredentialsTable
            items={filtered}
            onToggleBurn={(c) => updateMut.mutate({ id: c.id, data: { burn_protected: !c.burn_protected } })}
            onTest={(c) => {
              const r = Math.random();
              const status = r < 0.7 ? "working" : r < 0.9 ? "failed" : "rate_limited";
              updateMut.mutate({ id: c.id, data: { status, last_tested: new Date().toISOString(), attempts: (c.attempts || 0) + 1 } });
            }}
            onDelete={(c) => deleteMut.mutate(c.id)}
            onExclude={(c, reason) => updateMut.mutate({
              id: c.id,
              data: {
                excluded: true,
                excluded_reason: reason,
                excluded_at: new Date().toISOString(),
                status: reason,
              },
            })}
          />
        </TabsContent>

        <TabsContent value="excluded" className="mt-4">
          <ExcludeList
            items={excluded}
            onRestore={(c) => updateMut.mutate({
              id: c.id,
              data: { excluded: false, excluded_reason: null, excluded_at: null, status: "untested" },
            })}
          />
        </TabsContent>
      </Tabs>

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(data) => createMut.mutate(data)}
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingCredentials={items}
        onImport={(rows) => bulkCreateMut.mutateAsync(rows)}
      />
    </div>
  );
}