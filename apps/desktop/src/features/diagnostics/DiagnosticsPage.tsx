import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessLogPanel } from "@/components/logs/ProcessLogPanel";
import { studioClient } from "@/lib/tauri";

export function DiagnosticsPage() {
  const info = useQuery({
    queryKey: ["system-info"],
    queryFn: studioClient.getSystemInfo,
  });
  const logs = useQuery({
    queryKey: ["generation-logs"],
    queryFn: () => studioClient.readGenerationLogs(),
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Diagnostics</h1>
        <p className="mt-1 text-sm text-muted">System and engine health.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {info.isLoading ? (
            <p className="text-sm text-muted">Loading system info…</p>
          ) : info.isError ? (
            <p className="text-sm text-danger">Failed to load system info.</p>
          ) : (
            <>
              <p className="text-sm text-studio-foreground">
                {info.data?.os} / {info.data?.cpu} / {info.data?.ramLabel}
              </p>
              <p className="text-sm text-muted">
                GPU: {info.data?.gpu ?? "Not detected"}
              </p>
              <p className="text-sm text-muted">
                App: {info.data?.appVersion}
                {info.data?.engineVersion &&
                  ` / Engine: ${info.data.engineVersion}`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last command</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm text-muted">
            &lt;binary&gt; -o &lt;path&gt;
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-studio-foreground">
            No generation error recorded.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? (
            <p className="text-sm text-muted">Loading logs…</p>
          ) : logs.isError ? (
            <p className="text-sm text-danger">Failed to load process logs.</p>
          ) : (
            <ProcessLogPanel lines={logs.data ?? []} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
