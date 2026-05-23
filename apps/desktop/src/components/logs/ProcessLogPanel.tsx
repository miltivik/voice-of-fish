import type { ProcessLogLine } from "@voice-of-fish/shared";

export function ProcessLogPanel({ lines }: { lines: ProcessLogLine[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted">No process logs recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div
          key={line.id}
          className="flex items-start gap-3 rounded-md border border-line bg-studio p-2 text-xs"
        >
          <span className="mt-px shrink-0 rounded px-1 py-px font-mono text-[10px] uppercase ring-1 ring-inset ring-line text-muted">
            {line.stream}
          </span>
          <span className="text-studio-foreground">{line.message}</span>
          <span className="ml-auto shrink-0 text-muted">
            {new Date(line.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
