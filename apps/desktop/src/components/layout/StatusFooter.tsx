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

  return (
    <footer className="flex h-9 items-center justify-between border-t border-line bg-panel px-6 text-xs text-muted">
      <span>Global status: {statusLabels[footerStatus] ?? footerStatus}</span>
      <span>Local engine</span>
    </footer>
  );
}
