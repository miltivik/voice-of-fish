import type { ProcessLogLine } from "@voice-of-fish/shared";

export function ProcessLogPanel({ lines }: { lines: ProcessLogLine[] }) {
  if (lines.length === 0) {
    return <p className="text-sm text-concrete-300">No process logs recorded.</p>;
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div
          key={line.id}
          className="flex items-start gap-3 rounded-brutal border border-glass-border bg-concrete-800 p-2 text-xs"
        >
          <span className="mt-px shrink-0 rounded px-1 py-px font-mono text-[10px] uppercase ring-1 ring-inset ring-glass-border-strong text-concrete-300">
            {line.stream}
          </span>
          {/*
           * Defense-in-depth: log messages are sanitized server-side (ANSI strip + length limit),
           * and here we render as JSX text content (not dangerouslySetInnerHTML), so any
           * residual control characters or malicious content cannot execute as HTML/script.
           */}
          <span className="text-concrete-50">{line.message}</span>
          <span className="ml-auto shrink-0 text-concrete-300">
            {new Date(line.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}