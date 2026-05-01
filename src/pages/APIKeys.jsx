import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, Save, Trash2, Eye, EyeOff } from "lucide-react";

const KNOWN_KEYS = [
  { name: "BROWSERLESS_API_KEY", label: "Browserless API Key", description: "Used for headless browser testing." },
  { name: "NORDVPN_ACCESS_TOKEN", label: "NordVPN Access Token", description: "Used for proxy rotation and IP management." },
  { name: "SCRAPINGBEE_API_KEY", label: "ScrapingBee API Key", description: "Used for alternative scraping fallbacks." }
];

export default function APIKeys() {
  const qc = useQueryClient();
  const { data: secrets = [], isLoading } = useQuery({
    queryKey: ["appSecrets"],
    queryFn: () => base44.entities.AppSecret.list(),
  });

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1000px] mx-auto">
      <PageHeader
        eyebrow="06 · Security"
        title="API Keys"
        description="Manage API keys and access tokens for external services directly from the app."
      />

      <div className="grid gap-6">
        {KNOWN_KEYS.map((knownKey) => {
          const secretRecord = secrets.find(s => s.name === knownKey.name);
          return (
            <KeyRow 
              key={knownKey.name} 
              knownKey={knownKey} 
              secretRecord={secretRecord} 
              onSuccess={() => qc.invalidateQueries({ queryKey: ["appSecrets"] })} 
            />
          );
        })}
      </div>
    </div>
  );
}

function KeyRow({ knownKey, secretRecord, onSuccess }) {
  const [value, setValue] = useState(secretRecord?.value || "");
  const [show, setShow] = useState(false);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (secretRecord) {
        return base44.entities.AppSecret.update(secretRecord.id, { value });
      } else {
        return base44.entities.AppSecret.create({ name: knownKey.name, value });
      }
    },
    onSuccess: () => {
      toast.success(`${knownKey.label} saved`);
      onSuccess();
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to save API Key"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (secretRecord) {
        return base44.entities.AppSecret.delete(secretRecord.id);
      }
    },
    onSuccess: () => {
      setValue("");
      toast.success(`${knownKey.label} removed`);
      onSuccess();
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message || "Failed to remove API Key"),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Key className="h-4 w-4 text-primary" />
            {knownKey.label}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{knownKey.description}</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-2 uppercase tracking-wider">{knownKey.name}</div>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-96">
          <div className="relative">
            <Input 
              type={show ? "text" : "password"} 
              placeholder="Enter API Key..." 
              value={value} 
              onChange={(e) => setValue(e.target.value)} 
              className="pr-10 font-mono text-sm"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="flex gap-2 justify-end">
            {secretRecord && (
              <Button variant="outline" size="sm" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            )}
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !value || value === secretRecord?.value}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Key
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}