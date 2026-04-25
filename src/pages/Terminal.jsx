import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import TerminalLiveLog from "@/components/terminal/TerminalLiveLog";

export default function Terminal() {
  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="99 · live stream"
        title="Terminal"
        description="A terminal-style live stream of app activity, outgoing requests, and incoming responses with sensitive values redacted."
      />
      <TerminalLiveLog />
    </div>
  );
}