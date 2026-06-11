import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";

const statusLabels = {
  ready: "Ready",
  idle: "Idle",
  preparing: "Preparing",
  generating: "Generating",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  error: "Error",
} as const;

export function StatusFooter() {
  const footerStatus = useAppStore((state) => state.footerStatus);
  const activeJobId = useAppStore((state) => state.activeJobId);
  const cancelGeneration = useAppStore((state) => state.cancelGeneration);

  const showCancel =
    (footerStatus === "preparing" || footerStatus === "generating") &&
    activeJobId != null;

  return (
    <footer className="flex h-9 items-center justify-between border-t-2 border-glass-border-strong bg-glass-heavy px-6 font-mono text-[10px] uppercase tracking-wider text-concrete-300">
      <span>Global status: {statusLabels[footerStatus] ?? footerStatus}</span>
      <div className="flex items-center gap-3">
        {showCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-[9px]"
            onClick={() => cancelGeneration()}
          >
            Cancel
          </Button>
        )}
        <span>Local engine</span>
      </div>
    </footer>
  );
}
