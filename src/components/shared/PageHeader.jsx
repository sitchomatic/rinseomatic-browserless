import React from "react";
import { cn } from "@/lib/utils";

export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6 border-b border-border/60 mb-8", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gradient">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}