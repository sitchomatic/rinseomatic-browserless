import React from "react";
import { cn } from "@/lib/utils";
import { siteStyle } from "@/lib/sites";

export default function SiteChip({ siteKey, label, className, size = "md" }) {
  const style = siteStyle(siteKey);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        style.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label || siteKey}
    </span>
  );
}