import { Progress } from "@/components/ui/progress";

interface GenerationStatusBarProps {
  status: string;
  progress: number;
  error?: string | null;
}

export function GenerationStatusBar({
  status,
  progress,
  error,
}: GenerationStatusBarProps) {
  if (status === "idle") return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-concrete-300">
        {error ?? status}
      </p>
      <Progress value={progress} aria-label="Generation progress" />
    </div>
  );
}
