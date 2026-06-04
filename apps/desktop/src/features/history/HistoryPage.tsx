import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studioClient } from "@/lib/tauri";
export function HistoryPage() {
  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => studioClient.listGenerationHistory(),
  });
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">History</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Generation history from local output.
        </p>
      </div>
      {history.isLoading ? (
        <p className="text-sm text-concrete-300">Loading history…</p>
      ) : history.isError ? (
        <p className="text-sm text-ember">Failed to load history.</p>
      ) : (history.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-concrete-300">No generation history recorded.</p>
      ) : (
        <div className="space-y-3">
          {history.data!.map((record) => (
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
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-concrete-300">
                  <span>Model: {record.modelId}</span>
                  {record.voiceName && <span>Voice: {record.voiceName}</span>}
                  <span>Output: {record.outputPath}</span>
                </div>
                <p className="text-xs text-concrete-300">
                  {new Date(record.createdAt).toLocaleString()}
                  {record.durationSeconds != null &&
                    ` \u00b7 ${record.durationSeconds}s`}
                </p>
                {record.outputPath && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => studioClient.openOutputFile(record.outputPath ?? "")}
                    >
                      Abrir WAV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const dir = record.outputPath.replace(/[/\\][^/\\]+$/, "");
                        if (dir) studioClient.openOutputFolder(dir);
                      }}
                    >
                      Abrir carpeta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}