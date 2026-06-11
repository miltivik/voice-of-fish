import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { studioClient } from "@/lib/tauri";
import { useGenerationStore } from "@/stores/useGenerationStore";

type StatusFilter = "all" | "completed" | "failed" | "cancelled";

export function HistoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patchDraft = useGenerationStore((s) => s.patchDraft);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => studioClient.listGenerationHistory(),
  });

  const filtered = useMemo(() => {
    if (!history.data) return [];
    const q = search.toLowerCase().trim();
    return history.data.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.text.toLowerCase().includes(q) ||
        r.modelId.toLowerCase().includes(q) ||
        r.voiceName?.toLowerCase().includes(q)
      );
    });
  }, [history.data, search, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this history record?")) return;
    try {
      await studioClient.deleteHistoryRecord(id);
      queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all history records?")) return;
    try {
      await studioClient.clearHistory();
      queryClient.invalidateQueries({ queryKey: ["history"] });
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const handleRetry = (record: (typeof filtered)[number]) => {
    patchDraft({
      text: record.text,
      modelId: record.modelId,
    });
    navigate("/generate");
  };

  const statusVariant = (s: string) => {
    if (s === "completed") return "default" as const;
    if (s === "failed") return "danger" as const;
    return "secondary" as const;
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">History</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Generation history from local output.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search by text, model, or voice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-9 rounded-brutal border-2 border-glass-border-strong bg-concrete-800 px-3 py-1 text-sm font-mono text-concrete-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
        >
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex-1" />
        {(history.data?.length ?? 0) > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      {history.isLoading ? (
        <p className="text-sm text-concrete-300">Loading history…</p>
      ) : history.isError ? (
        <p className="text-sm text-ember">Failed to load history.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-concrete-300">
          {history.data?.length === 0
            ? "No generation history recorded."
            : "No matching records."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <Card key={record.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="line-clamp-1">{record.text}</CardTitle>
                <Badge variant={statusVariant(record.status)}>
                  {record.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {record.error && (
                  <p className="text-xs text-ember/80">{record.error}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-concrete-300">
                  <span>Model: {record.modelId}</span>
                  {record.voiceName && <span>Voice: {record.voiceName}</span>}
                  <span>Output: {record.outputPath}</span>
                </div>
                <p className="text-xs text-concrete-300">
                  {new Date(record.createdAt).toLocaleString()}
                  {record.durationSeconds != null &&
                    ` \u00b7 ${record.durationSeconds}s`}
                  {record.completedAt &&
                    ` \u00b7 completed ${new Date(record.completedAt).toLocaleString()}`}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {record.outputPath && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => studioClient.openOutputFile(record.outputPath)}
                      >
                        Open WAV
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const dir = record.outputPath.replace(/[/\\][^/\\]+$/, "");
                          if (dir) studioClient.openOutputFolder(dir);
                        }}
                      >
                        Open folder
                      </Button>
                    </>
                  )}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry(record)}
                  >
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(record.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}