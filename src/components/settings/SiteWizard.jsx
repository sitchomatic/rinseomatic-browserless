import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { BLANK_SITE } from "./SiteFormPanel";

export default function SiteWizard({ open, onOpenChange }) {
  const qc = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [siteData, setSiteData] = React.useState(BLANK_SITE);
  const [testResult, setTestResult] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setSiteData(BLANK_SITE);
      setTestResult(null);
    }
  }, [open]);

  const update = (patch) => setSiteData({ ...siteData, ...patch });

  const validateMut = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("testSiteSelectors", {
        login_url: siteData.login_url,
        username_selector: siteData.username_selector,
        password_selector: siteData.password_selector,
        submit_selector: siteData.submit_selector,
        success_selector: siteData.success_selector
      });
      return res.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      toast.success("Validation complete");
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message)
  });

  const saveMut = useMutation({
    mutationFn: () => base44.entities.Site.create(siteData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success("Site added successfully");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e?.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Site Wizard</DialogTitle>
          <DialogDescription>Step {step} of 3: {step === 1 ? "Basic Info" : step === 2 ? "Configure & Test Selectors" : "Review & Save"}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Site Label</Label>
                <Input value={siteData.label} onChange={(e) => update({ label: e.target.value })} placeholder="e.g. Joe Fortune" />
              </div>
              <div className="space-y-2">
                <Label>Site Key (slug)</Label>
                <Input value={siteData.key} onChange={(e) => update({ key: e.target.value })} placeholder="e.g. joe" />
              </div>
              <div className="space-y-2">
                <Label>Login URL</Label>
                <Input value={siteData.login_url} onChange={(e) => update({ login_url: e.target.value })} placeholder="https://" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Username Selector</Label>
                  <Input value={siteData.username_selector} onChange={(e) => update({ username_selector: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Password Selector</Label>
                  <Input value={siteData.password_selector} onChange={(e) => update({ password_selector: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Submit Selector</Label>
                  <Input value={siteData.submit_selector} onChange={(e) => update({ submit_selector: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Success Selector (Optional)</Label>
                  <Input value={siteData.success_selector} onChange={(e) => update({ success_selector: e.target.value })} />
                </div>
                <Button 
                  className="w-full gap-2" 
                  onClick={() => validateMut.mutate()} 
                  disabled={validateMut.isPending || !siteData.login_url}
                >
                  {validateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Selectors Live"}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold">Validation Results</div>
                <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center border border-border overflow-hidden">
                  {testResult?.screenshot ? (
                    <img src={`data:image/png;base64,${testResult.screenshot}`} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                {testResult?.results && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(testResult.results).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 bg-secondary/30 p-2 rounded border border-border">
                        {v === true ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : v === false ? <XCircle className="h-4 w-4 text-rose-500" /> : <div className="h-4 w-4 rounded-full border border-dashed border-muted-foreground" />}
                        <span className="font-mono">{k}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 bg-secondary/20">
                <h3 className="text-sm font-semibold mb-2">{siteData.label} ({siteData.key})</h3>
                <p className="text-xs text-muted-foreground font-mono mb-4">{siteData.login_url}</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                  <div>User: <span className="text-foreground">{siteData.username_selector}</span></div>
                  <div>Pass: <span className="text-foreground">{siteData.password_selector}</span></div>
                  <div>Submit: <span className="text-foreground">{siteData.submit_selector}</span></div>
                  <div>Success: <span className="text-foreground">{siteData.success_selector || "none"}</span></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Additional proxy and stealth defaults will be automatically applied and can be changed later in the site settings panel.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && (!siteData.key || !siteData.label || !siteData.login_url)}>Next</Button>
          ) : (
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Save Site</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}