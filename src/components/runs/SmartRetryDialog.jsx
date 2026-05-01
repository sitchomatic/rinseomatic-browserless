import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

export default function SmartRetryDialog({ open, onOpenChange, result, analysis, onConfirm }) {
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Smart Retry
          </DialogTitle>
          <DialogDescription>
            Testing <strong>{result.username}</strong> again based on diagnostics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          {analysis && (
            <div className="text-xs bg-secondary/30 p-3 rounded-md border border-border/50">
              <div className="font-semibold mb-1 text-foreground">Remediation Suggestion:</div>
              <div className="text-muted-foreground">{analysis.suggestion}</div>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label>Swap Credential (Password)</Label>
            <Input 
              type="password" 
              placeholder="Enter new password to rotate credentials" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              Leave blank to use the existing password. Proxy rotation is automatically applied if the site has multiple proxies configured.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onConfirm({ password }); onOpenChange(false); }}>
            Retry Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}