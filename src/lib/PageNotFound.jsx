import { useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1) || '/';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.04]" />
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />

      <div className="relative max-w-md w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          <Zap className="h-3 w-3 text-primary" /> credential tester · error
        </div>

        <div>
          <div className="text-7xl font-semibold tracking-tight text-gradient">404</div>
          <div className="h-px w-12 bg-border mx-auto mt-4" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">Route not found</h2>
          <p className="text-sm text-muted-foreground font-mono">
            <span className="text-foreground">{pageName}</span>
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
        >
          Back to credentials
        </button>
      </div>
    </div>
  );
}