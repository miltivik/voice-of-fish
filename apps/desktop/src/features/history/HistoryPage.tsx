import { MOCK_HISTORY } from "@voice-of-fish/shared/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HistoryPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">History</h1>
        <p className="mt-1 text-sm text-muted">
          Generation history from local mock output.
        </p>
      </div>

      {MOCK_HISTORY.length === 0 ? (
        <p className="text-sm text-muted">No generation history recorded.</p>
      ) : (
        <div className="space-y-3">
          {MOCK_HISTORY.map((record) => (
            <Card key={record.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="line-clamp-1">{record.text}</CardTitle>
                <Badge
                  variant={
                    record.status === "completed" ? "default" : "warning"
                  }
                >
                  {record.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Model: {record.modelId}</span>
                  {record.voiceName && <span>Voice: {record.voiceName}</span>}
                  <span>Output: {record.outputPath}</span>
                </div>
                <p className="text-xs text-muted">
                  {new Date(record.createdAt).toLocaleString()}
                  {record.durationSeconds != null &&
                    ` \u00b7 ${record.durationSeconds}s`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
