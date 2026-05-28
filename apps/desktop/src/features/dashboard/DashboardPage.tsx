import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { studioClient } from "@/lib/tauri";

export function DashboardPage() {
  const diagnostics = useQuery({
    queryKey: ["system-info"],
    queryFn: studioClient.getSystemInfo,
  });
  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });
  const history = useQuery({
    queryKey: ["history", 1],
    queryFn: () => studioClient.listGenerationHistory(1),
  });

  const installed =
    models.data?.filter((model) => model.state === "installed").length ?? 0;

  const lastRecord = history.data?.[0];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Studio overview for local voice generation.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Engine readiness</CardTitle>
          <Badge>{installed > 0 ? "Ready" : "No models installed"}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {diagnostics.isLoading || models.isLoading ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
            </>
          ) : diagnostics.isError || models.isError ? (
            <p className="text-sm text-danger">Failed to load engine data.</p>
          ) : diagnostics.data && models.data ? (
            <>
              <p className="text-sm text-muted">
                {diagnostics.data?.os ?? "?"} /{" "}
                {diagnostics.data?.ramLabel ?? "?"}
              </p>
              <p className="text-sm text-muted">
                {installed} model quant{installed === 1 ? "" : "s"} installed.
              </p>
              <Progress value={installed * 25} aria-label="Engine readiness" />
            </>
          ) : (
            <p className="text-sm text-muted">Loading system status…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last generation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lastRecord ? (
            <>
              <p className="text-sm text-muted">{lastRecord.outputPath}</p>
              <p className="text-xs text-muted">
                Model: {lastRecord.modelId}
                {lastRecord.durationSeconds != null &&
                  ` · ${lastRecord.durationSeconds}s`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              No generations recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/generate"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-studio transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
        >
          Generate
        </Link>
        <Link
          to="/models"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
        >
          Models
        </Link>
        <Link
          to="/settings"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
        >
          Settings
        </Link>
        <Link
          to="/diagnostics"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
        >
          Diagnostics
        </Link>
      </div>
    </section>
  );
}