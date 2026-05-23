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
      <p className="text-sm text-muted">No recent generations recorded.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-md border border-line bg-panel p-3"
        >
          <p className="text-sm text-studio-foreground line-clamp-1">
            {item.text}
          </p>
          <p className="mt-1 text-xs text-muted">
            {item.modelId}
            {item.durationSeconds != null &&
              ` \u00b7 ${item.durationSeconds}s`}{" "}
            \u00b7 {item.outputPath}
          </p>
        </article>
      ))}
    </div>
  );
}
