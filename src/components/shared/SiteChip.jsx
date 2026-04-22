import React from "react";
import { cn } from "@/lib/utils";
import { getSite } from "@/lib/sites";

export default function SiteChip({ site, className, size = "md" }) {
  const s = getSite(site);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        s.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}