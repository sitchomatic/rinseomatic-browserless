import React from "react";
import { cn } from "@/lib/utils";

export default function MeasuredChartFrame({ className, children }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!ref.current) return;

    const updateSize = () => {
      const rect = ref.current.getBoundingClientRect();
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const isReady = size.width > 0 && size.height > 0;

  return (
    <div ref={ref} className={cn("relative h-48 w-full min-w-[1px]", className)}>
      {isReady ? children : <div className="h-full w-full rounded-xl bg-secondary/20 animate-pulse" />}
    </div>
  );
}