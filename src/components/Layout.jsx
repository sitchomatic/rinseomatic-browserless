import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity, KeyRound, GitBranch, Terminal, Images,
  Shield, Wand2, Settings, Zap, Circle, CalendarClock,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Command Center", icon: Activity, end: true },
  { to: "/credentials", label: "Credentials", icon: KeyRound },
  { to: "/flows", label: "Flow Studio", icon: GitBranch },
  { to: "/scheduling", label: "Scheduling", icon: CalendarClock },
  { to: "/telemetry", label: "Telemetry", icon: Terminal },
  { to: "/screenshots", label: "Screenshots", icon: Images },
  { to: "/proxy", label: "Proxy & VPN", icon: Shield },
  { to: "/ai-repair", label: "AI Repair", icon: Wand2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-r bg-primary transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient background flourish */}
      <div className="pointer-events-none fixed inset-0 bg-radial-fade -z-10" />
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-[0.04] -z-10" />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
          <div className="px-5 py-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="relative">
                <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" strokeWidth={2.25} />
                </div>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 live-dot text-emerald-400" />
              </div>
              <div>
                <div className="font-semibold tracking-tight text-[15px] leading-none">Sitchomatic</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.15em] mt-1">v2.0 · web</div>
              </div>
            </Link>
          </div>

          <nav className="px-3 space-y-0.5 flex-1">
            <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">Workspace</div>
            {NAV.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </nav>

          <div className="p-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
              <span className="font-mono">all systems nominal</span>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">Sitchomatic</span>
          </Link>
          <MobileNav />
        </div>

        <main className="flex-1 min-w-0 pt-14 md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-md border border-border text-muted-foreground"
        aria-label="Toggle menu"
      >
        <div className="space-y-1">
          <div className="h-0.5 w-4 bg-current" />
          <div className="h-0.5 w-4 bg-current" />
        </div>
      </button>
      {open && (
        <div className="fixed inset-0 top-14 bg-background/95 backdrop-blur-xl z-40 p-4">
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm",
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground"
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}