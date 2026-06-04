import { useAppStore } from "@/stores/useAppStore";

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

    <footer className="flex h-9 items-center justify-between border-t-2 border-glass-border-strong bg-glass-heavy px-6 font-mono text-[10px] uppercase tracking-wider text-concrete-300">
      <span>Global status: {statusLabels[footerStatus] ?? footerStatus}</span>
      <span>Local engine</span>
    </footer>
}
