import type { GenerationJob, HistoryRecord } from "@voice-of-fish/shared";

export function RecentGenerations({
  history,
  completedJob,
}: {
  history: HistoryRecord[];
  completedJob?: GenerationJob | null;
}) {
  const items = completedJob
    ? [
        {
          id: completedJob.id,
          text: completedJob.text,
          modelId: completedJob.modelId,
          outputPath: completedJob.outputPath ?? "",
          createdAt: completedJob.createdAt,
          durationSeconds: completedJob.durationSeconds,
          status: "completed" as const,
        },
        ...history,
      ]
    : history;

  if (items.length === 0) {
    return (
      <p className="text-sm text-concrete-300">No recent generations recorded.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-brutal border border-glass-border bg-glass p-3"
        >
          <p className="text-sm text-concrete-50 line-clamp-1">
            {item.text}
          </p>
          <p className="mt-1 text-xs text-concrete-300">
            {item.modelId}
            {item.durationSeconds != null &&
              ` \u00b7 ${item.durationSeconds}s`}{" "}
            {"·"} {item.outputPath}
          </p>
        </article>
      ))}
    </div>
  );
}
