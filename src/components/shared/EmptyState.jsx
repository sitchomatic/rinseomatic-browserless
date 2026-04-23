import React from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border bg-card/40 py-16 text-center px-6", className)}>
      {Icon && (
        <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-secondary/60 border border-border flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {title && <div className="text-sm font-medium">{title}</div>}
      {description && <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}